import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';
import dotenv from 'dotenv';
dotenv.config();

import checkAuth from './checkAuth.js';

import { validationResult } from 'express-validator';
import { regVal } from './auth.js';

const port = process.env.port || 3007;
const serverPassword = process.env.serverPassword;
const jwt_key = process.env.jwt_key;
const app = express();

app.use(express.json());
app.use(cors());

app.get('/', async (req, res) => {
    res.send('BRUH');
});

app.post('/reg', regVal, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors.array());
        }
        await db.query('SELECT * FROM `schools` WHERE name=?', [req.body.name])
        .then(async result => {
            if(result[0].length === 0) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(req.body.password, salt); 
                await db.query('INSERT INTO `schools`(`name`, `address`, `passwordHash`) VALUES (?,?,?)', [req.body.name, req.body.address, hashedPassword])
                .then(async result => {
                    res.status(200).json({
                        success: true
                    });
                })
                .catch(async err => {
                    if (err) {
                        console.log('!!!POST /reg INSERT query ERROR!!!: ' + err);
                        res.status(400).json(err);
                    }
                })
            }
            else {
                res.status(400).json({
                    msg: 'School with such name already exists'
                });
            }
        })
    } catch (err) {
        console.log('!!!POST /reg ERROR!!!: ' + err);
    } 
})

app.post('/login', async (req, res) => {
    try {
        await db.query('SELECT id, passwordHash FROM `schools` WHERE id=?', [req.body.id])
        .then(async result => {
            if(await bcrypt.compare(req.body.password, result[0][0].passwordHash)) {
                const token = jwt.sign({
                    id: result[0][0].id
                },
                jwt_key,
                {
                    expiresIn: '1d'
                })
                res.status(200).json({
                    token: token,
                    success: true
                });
            }
            else {
                res.status(401).json({
                    msg: 'Wrong password'
                });
            }
        })
        .catch(async err => {
            if (err) {
                console.log('!!!POST /login query ERROR!!!:' + err);
                res.status(400).json(err);
            }
        })
    } catch (err) {
        console.log('!!!POST /login ERROR!!!:' + err);
    }
});

app.delete('/edit_request/:editid/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('DELETE FROM `edit_requests` WHERE id=?', [req.params.editid])
            .then(async result => {
                res.status(200).json(result);
            })
            .catch(async err => {
                if (err) {
                    console.log('!!!DELETE /edit_requests query ERROR!!!:' + err);
                    res.status(400).json(err);
                }
            })
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!DELETE /edit_requests ERROR!!!:' + err);
    }
});

app.get('/edit_requests/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('SELECT * FROM `edit_requests`')
            .then(async result => {
                res.json(result[0]);
            })
            .catch(async err => {
                if (err) {
                    res.status(400).json(err);
                    console.log('!!!GET /edit_requests query ERROR!!!:' + err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!GET /edit_requests ERROR!!!:' + err);
    }
});

app.patch('/edit/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('UPDATE `schools` SET `name`=?,`address`=? WHERE id=?', [req.body.new_name, req.body.new_address, req.body.id])
            .then(async result => {
                if (result[0].affectedRows === 1) {
                    await db.query('UPDATE `edit_requests` SET `done`=? WHERE id=?', [1, req.body.editid])
                    .then(async result => {
                        res.status(200).json(result);
                    })
                    .catch(async err => {
                        if (err) {
                            res.status(400).json(err);
                        }
                    })
                }
            })
            .catch(async err => {
                if (err) {
                    console.log('!!!POST /edit query ERROR!!!:'+ err);
                    res.status(400).json(err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!POST /edit ERROR!!!:'+ err);
    }
});

app.post('/request_edit', checkAuth, async (req, res) => {
    try {
        await db.query('INSERT INTO `edit_requests`(`school_id`, `new_name`, `new_address`) VALUES (?,?,?)', [req.body.id, req.body.new_name, req.body.new_address])
        .then(async result => {
            console.log(result);
            res.status(200).json(result);
        })
        .catch(async err => {
            if (err) {
                console.log('!!!POST /request_edit query ERROR!!!:'+ err);
            }
        });
    } catch (err) {
        console.log('!!!POST /request_edit ERROR!!!:'+ err);
    }
});

app.post('/verify_auth', checkAuth, async (req, res) => {
    try {
        await db.query('SELECT * FROM `schools` WHERE id=?', [req.body.id])
        .then(async result => {
            res.status(200).json(result[0][0]);
        })
        .catch(async err => {
            if (err) {
                res.status(400).json(err);
                console.log('!!!POST /verify_auth query ERROR!!!: ' + err);
            }
        })
    } catch (err) {
        console.log('!!!POST /verify_auth ERROR!!!: ' + err);
    }
});

app.get('/school/:school_id/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('SELECT id, name, address FROM `schools` WHERE id=?', [req.params.school_id])
            .then(async result =>  {
                if (result[0].length === 0) {
                    res.status(400).json({
                        msg: 'No such school exists or it was deleted'
                    });
                }
                else {
                    res.json(result[0][0]);
                }
            })
            .catch(async err => {

            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!GET /school ERROR!!!: ' + err);
    }
})

app.get('/schools/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('SELECT * FROM `schools`')
            .then(async result => {
                if (result[0].length == 0) {
                    res.status(204).json({
                    msg: 'No data'
                    });
                }
                else {
                    res.status(200).json(result[0]);
                }
            })
            .catch(async err => {
                if (err) {
                    console.log(err);
                    res.status(500).json(err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!GET /schools ERROR!!!: ' + err);
    }
});

app.patch('/verify/:school_id/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('UPDATE `schools` SET `verified`=? WHERE id=?', [1, req.params.school_id])
            .then(async result => {
                res.json(result);
            })
            .catch(async err => {
                if (err) {
                    console.log(err);
                    res.status(400).json(err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!GET /verify/:school_id&:password ERROR!!!: ' + err);
    }
});

app.patch('/unverify/:school_id/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('UPDATE `schools` SET `verified`=? WHERE id=?', [0, req.params.school_id])
            .then(async result => {
                res.json(result);
            })
            .catch(async err => {
                if (err) {
                    console.log(err);
                    res.status(400).json(err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!GET /verify/:school_id&:password ERROR!!!: ' + err);
    }
});

app.delete('/schools/:school_id/:password', async (req, res) => {
    try {
        if (req.params.password === serverPassword) {
            await db.query('DELETE FROM `schools` where id=?', [req.params.school_id])
            .then(async result => {
                res.json(result);
            })
            .catch(async err => {
                if (err) {
                    console.log('!!!DELETE /schools/:school_id&:password query ERROR!!!: ' + err);
                    res.status(400).json(err);
                }
            });
        }
        else {
            res.status(401).json({
                msg: 'Wrong server password'
            });
        }
    } catch (err) {
        console.log('!!!DELETE /schools/:school_id&:password ERROR!!!: ' + err);
    }
});

app.listen(port,  err => {
    if (err) {
        return console.log(err);
    }
    else {
        console.log(`Server: http://localhost:${port}`)
    }
});
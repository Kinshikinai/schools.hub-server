import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const jwt_key = process.env.jwt_key;

export default (req, res, next) => {
    const token = req.body.token || '';

    if (token) {
        try {
            const decoded = jwt.verify(token, jwt_key);
            req.body.id = decoded.id;
            next();
        } catch (err) {
            return res.status(403).json({
                msg: 'Forbidden'
            });
        }
    }
    else {
        return res.status(403).json({
            msg: 'Forbidden'
        });
    }
}
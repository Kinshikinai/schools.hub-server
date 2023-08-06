import { body } from 'express-validator';

export const regVal = [
    body('password', 'Password length must be at least 8').isLength({min: 8})
]
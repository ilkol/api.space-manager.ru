import { Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';

export class UserController extends AbstractController
{
    
    getUsers(req: Request, res: Response): void {
        res.json({ message: 'CORS настроен!' });
    };
    
    getUserById(req: Request, res: Response): void {
        const userId = req.params.id;
        res.json({ userId });
    };
}

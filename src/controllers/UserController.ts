import { Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';

export class UserController extends AbstractController
{
    constructor(db: DB)
    {
        super(db);
    }

    getUsers(req: Request, res: Response): void {
        res.json({ message: 'CORS настроен!' });
    };
    
    getUserById(req: Request, res: Response): void {
        const userId = req.params.id;
        res.json({ userId });
    };

    async getActiveChatsList(req: Request, res: Response)
    {
        const userId = req.params.id;
        
        const query = `
            SELECT u.chat_id AS id, c.title AS title 
            FROM users u 
            LEFT JOIN chats c USING(chat_id) 
            WHERE user_id = ? AND in_chat = 1
        `;

        const results = await this.db.query(query, [userId]);
        res.json(results);
    }
}

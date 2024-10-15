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
            SELECT u.chat_id id, 
				c.title title, 
				count_table.count count
			FROM users u
			LEFT JOIN chats c USING(chat_id)
			LEFT JOIN (
				SELECT u.chat_id, COUNT(*) AS count
				FROM users u
				WHERE u.in_chat = 1
				GROUP BY u.chat_id
			) count_table USING(chat_id)
			WHERE u.user_id = ?
			AND u.in_chat = 1
        `;

        const results = await this.db.query(query, [userId]);
        res.json(results);
    }

	async getTodayActivityStatistics(req: Request, res: Response)
	{
		const userId = req.params.id;
		
		const query = `
			SELECT 
				COUNT(*) AS messages
			FROM users_statistics
			WHERE user_id = ?
			AND DATE(FROM_UNIXTIME(time)) = CURDATE();
		`;
		const [results]: any = await this.db.query(query, [userId]);

		// Если результат существует и не пустой, отправляем первый элемент массива
		if (results) {
			res.json(results);
		} else {
			res.json({ messages: 0 });
		}
	}
}

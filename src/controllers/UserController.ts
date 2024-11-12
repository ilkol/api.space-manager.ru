import { Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';

export class UserController extends AbstractController
{
    constructor(private db: DB)
    {
        super();
    }

    getUsers(req: Request, res: Response): void {
        res.json({ message: 'CORS настроен!' });
    };
    
    getUserById(req: Request, res: Response): void {
        const userId = req.params.id;
        res.json({ userId });
    };

	private validateActiveChatsList(req: Request) {
        const schema = Joi.object({
            id: Joi.number().integer().required(),
        });

        const { error, value } = schema.validate({ 
            id: req.params.id, 
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }

	async getActiveChatsList(req: Request, res: Response) {
        const validationResult = this.validateActiveChatsList(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        const { id } = validationResult.value;

		const query = `
			SELECT 
				c.chat_uid id, 
				c.title title, 
				c.photo_link avatar,
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
		const queryParams = [id];

        const results = await this.db.query(query, queryParams);
        
        res.json(results);
    }

	async getTodayActivityStatistics(req: Request, res: Response)
	{
		const userId = req.params.id;
		
		const query = `
			SELECT 
				COUNT(*) AS messages
			FROM usersStatistics
			WHERE user_id = ?
			AND DATE(FROM_UNIXTIME(time)) = CURDATE();
		`;
		const [results]: any = await this.db.query(query, [userId]);

		if (results) {
			res.json(results);
		} else {
			res.json({ messages: 0 });
		}
	}

}

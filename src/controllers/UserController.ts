import { Request, Response } from 'express';
import { DB } from '../DB/DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { UserStatistic } from '../DB/Entities/UserStatistic';
import { Between } from 'typeorm';

export class UserController extends AbstractController
{
    constructor(private db: DB)
    {
        super();
    }
    
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

		const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Начало дня в UNIX
    	const endOfDay = Math.floor(new Date().setHours(23, 59, 59, 999) / 1000); // Конец дня в UNIX

		const count = await this.db.db
			.getRepository(UserStatistic)
			.count({
				where: {
					user_id: +userId,
					time: Between(startOfDay, endOfDay),
				},
			});
		
		res.json({
			messages: count
		});
	}

}

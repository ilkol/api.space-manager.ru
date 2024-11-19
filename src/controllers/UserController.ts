import { Request, Response } from 'express';
import { DB } from '../DB/DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { UserStatistic } from '../DB/Entities/UserStatistic';
import { Between } from 'typeorm';
import { ChatMember } from '../DB/Entities/ChatMember';
import { Chat } from '../DB/Entities/Chat';

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

		const queryBuilder = this.db.db.getRepository(ChatMember).createQueryBuilder('u');

		const result = await queryBuilder
			.select('c.chat_uid', 'id')
			.addSelect('c.title', 'title')
			.addSelect('c.photo_link', 'avatar')
			.addSelect(
				subQuery => {
					return subQuery
						.select('COUNT(u.chat_id)', 'count')
						.from(ChatMember, 'u')
						.where('u.in_chat = 1')
						.andWhere('u.chat_id = c.chat_id')
						.groupBy('u.chat_id');
				},
				'count'
			)
			.leftJoin(Chat, 'c', 'u.chat_id = c.chat_id')
			.where('u.user_id = :userId', { userId: id })
			.andWhere('u.in_chat = 1')
			.getRawMany();
		
        res.json(result);
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

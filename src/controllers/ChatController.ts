import { Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';

export class ChatController extends AbstractController
{
    constructor(db: DB)
    {
        super(db);
    }

	private validateInfo(req: Request) {
		const schema = Joi.object({
            id: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required()
        });

        const { error, value } = schema.validate({ 
            id: req.params.id, 
            type: req.query.type 
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }

	async getInfo(req: Request, res: Response) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        const { id, type } = validationResult.value;

		let query: string;
		if(type === "peer_id") {
			query = `
				SELECT * FROM chats c
				WHERE c.chat_id = ?
				LIMIT 1;
			`;
		} else {
			query = `
				SELECT * FROM chats c
				WHERE c.chat_uid = ?
				LIMIT 1;
			`;
		}

		const queryParams = [id];

        const results = await this.db.query(query, queryParams);
        
        res.json(results);
    }
}

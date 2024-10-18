import { Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { App } from '../Application';
import axios from 'axios';

interface defaultUserInfo
{
	id: number;
	avatar?: string;
	name: string;
}

interface UserInfo extends defaultUserInfo
{
	role: number;
	roleName: string|null;
	nick: string|null;
}


function user(data: any): UserInfo
{
	return {
		id: data.user_id,
		role: data.role,
		name: "",
		roleName: data.roleName,
		nick: data.nick
	};
}

interface BanInfo extends defaultUserInfo
{
	admin: number;
	unban: number;
	bantime: number;
	reason: string|null;
}
function bannedUser(data: any): BanInfo
{
	return {
		id: data.user_id,
		name: "",
		admin: data.admin_id,
		unban: data.unban_time,
		bantime: data.ban_time,
		reason: data.reason
	};
}

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
				SELECT 
					c.chat_id uid,
					c.status 'status',
					c.title title,
					c.photo_link avatar,
					c.messages messages,
					
					count_table.count membersCount,
					ban_count_table.count bannedUsersCount
				FROM chats c
				LEFT JOIN (
					SELECT u.chat_id, COUNT(*) AS count
					FROM users u
					WHERE u.in_chat = 1
					GROUP BY u.chat_id
				) count_table USING(chat_id)
				LEFT JOIN (
					SELECT b.chat_id, COUNT(*) AS count
					FROM banlist b
					GROUP BY b.chat_id
				) ban_count_table USING(chat_id)

				WHERE c.chat_id = ?
				LIMIT 1;
			`;
		} else {
			query = `
				SELECT 
					c.chat_uid uid,
					c.status 'status',
					c.title title,
					c.photo_link avatar,
					c.messages messages,
					
					count_table.count membersCount,
					ban_count_table.count bannedUsersCount
				FROM chats c
				LEFT JOIN (
					SELECT u.chat_id, COUNT(*) AS count
					FROM users u
					WHERE u.in_chat = 1
					GROUP BY u.chat_id
				) count_table USING(chat_id)
				LEFT JOIN (
					SELECT b.chat_id, COUNT(*) AS count
					FROM banlist b
					GROUP BY b.chat_id
				) ban_count_table USING(chat_id)
				WHERE c.chat_uid = ?
				LIMIT 1;
			`;
		}

		const queryParams = [id];

        const [results]: any = await this.db.query(query, queryParams);

		if (results) {
			res.json(results);
		} else {
			res.json({ error: "Данные чата не найдены" });
		}
    }

	async getMembers(req: Request, res: Response) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { id, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				u.*,
				r.name roleName,
				n.nick
			FROM users u
			LEFT JOIN roles r on r.chat_id = u.chat_id and r.level=u.role
			LEFT JOIN nicks n on n.chat_id = u.chat_id and n.user_id = u.user_id
			WHERE u.chat_id =
		`;
		if(type === "peer_id") {
			query += "?";
		} else {
			query += `
				(
					SELECT
						chat_id
					FROM chats
					WHERE chat_uid = ?
					LIMIT 1
				)
			`;
		}

		const queryParams = [id];

        const results: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Пользователей в чате не найдено" });
		}
		
		const usersArray: UserInfo[] = results.map(user);
		id = results[0].chat_id;
		
		const error = await this.updatePhotoInInfo(id, usersArray);
		if(error) {
			res.json(error);
			return;
		}

		const roles: Map<number, string> = new Map([
			[0, "Участник"],
			[20, "Модератор"],
			[40, "Ст. Модератор"],
			[60, "Администратор"],
			[80, "Ст. Администратор"],
			[100, "Создатель"]
		]);
		usersArray.map(user => {
			if(user.roleName === null) {
				user.roleName = roles.get(user.role) ?? "Ошибка";
			} 
		});
		
		res.json(usersArray);
    }

	async getBannedUsers(req: Request, res: Response) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { id, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				b.*
			FROM banlist b
			WHERE b.chat_id =
		`;
		if(type === "peer_id") {
			query += "?";
		} else {
			query += `
				(
					SELECT
						chat_id
					FROM chats
					WHERE chat_uid = ?
					LIMIT 1
				)
			`;
		}

		const queryParams = [id];

        const results: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Заблокированных пользователей в чате не найдено" });
		}
		
		const usersArray: BanInfo[] = results.map(bannedUser);
		
		id = results[0].chat_id;
		const error = await this.updatePhotoInInfo(id, usersArray);
		if(error) {
			res.json(error);
			return;
		}
		
		res.json(usersArray);
    }


	private async updatePhotoInInfo(id: number, users: defaultUserInfo[]): Promise<any|undefined>
	{
		
		const messageUrl = `https://api.vk.com/method/messages.getConversationMembers?peer_id=${id}&fields=photo_50&access_token=${App.vkToken}&v=5.199`;

		try {
			let response = await axios.get(messageUrl) 
			if(response.data.error) {
				const error = response.data.error;
				return {
					error: error.error_code,
					message: error.error_msg
				};	
			}
			let reponse = response.data.response;
			reponse.profiles.forEach((el: any) => {
				const user = users.find(u => u.id === el.id);
				if (user) {
					user.avatar = el.photo_50;
					user.name = `${el.first_name} ${el.last_name}`;
				}
			});
			reponse.groups.forEach((el: any) => {
				const user = users.find(u => u.id === -el.id);
				if (user) {
					user.avatar = el.photo_50;
					user.name = el.name;
				}
			});
			
		} catch(e) {
			return e;
		}
	}
}

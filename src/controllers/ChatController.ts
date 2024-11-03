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

interface Role
{
	name: string;
	level: number;
	emoji: string;
}

function rolesArrayFromDB(results: any[])
{
	const roles = new Map<number, Role>();
	results.forEach(row => {
		roles.set(row.level, row);
	});
	return roles;
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

interface ChatMemberStatistics extends UserInfo
{
	immunity: number;
	immunityRole: string|null;
	
}

const defaultRolesName: Map<number, string> = new Map([
	[0, "Участник"],
	[20, "Модератор"],
	[40, "Старший Модератор"],
	[60, "Администратор"],
	[80, "Старший Администратор"],
	[100, "Создатель чата"]
]);

function checkDefaultRole(user: UserInfo)
{
	if(user.roleName === null) {
		user.roleName = defaultRolesName.get(user.role) ?? "Ошибка";
	} 
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
			WHERE u.in_chat = 1 AND u.chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const results: any = await this.db.query(query, queryParams);
		if(!results || results.length === 0) {
			res.json({ error: "Пользователей в чате не найдено" });
		}
		
		const usersArray: UserInfo[] = results.map(user);
		id = results[0].chat_id;
		
		const error = await this.updatePhotoInInfo(id, usersArray);
		if(error) {
			res.json(error);
			return;
		}

		usersArray.map(checkDefaultRole);
		
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
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const results: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Прозиошла ошибка при выполнении запроса." });
			return;
		}
		if(results.length === 0) {
			res.json([]);
			return;
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
	async getSettings(req: Request, res: Response) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { id, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				chat_id uid,
				togglefeed toggleFeed,
				kickmenu kickMenu,
				leavemenu leaveMenu,
				hideusers hideUsers,
				nameType nameType,
				unPunishNotify unPunishNotify,
				unRoleAfterKick unRoleAfterKick,
				autounban autounban,
				roleLevelStats roleLevelStats
			FROM settings s
			WHERE s.chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const [results]: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Прозошла ошибка при получении настроек чата" });
		}
		
		res.json(results);
    }
	async getRoles(req: Request, res: Response) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { id, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				name,
				level,
				emoji
			FROM roles
			WHERE chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const results: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Прозошла ошибка при получении ролей чата" });
		}
		const roles: Map<number, Role> = rolesArrayFromDB(results);
		defaultRolesName.forEach((name, level) => {
			if(!roles.has(level)) {
			  roles.set(level, {
				name: name,
				level: level,
				emoji: ""
			  });
			}
		});
		
		res.json(Array.from(roles.values()).sort((a, b) => b.level - a.level));
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

			let profiles = response.data.response.profiles;
			let groups = response.data.response.groups;

			await Promise.all(users.map(async (user) => {
				const profile = profiles.find((el: any) => el.id === user.id);
				const group = groups.find((el: any) => el.id === -user.id);

				if (profile) {
					user.avatar = profile.photo_50;
					user.name = `${profile.first_name} ${profile.last_name}`;
				}
				if (group) {
					user.avatar = group.photo_50;
					user.name = group.name;
				}
			}));

			/* 
			// Оставил старый код, мало ли вернуть захочу			
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
			}); */
			
		} catch(e) {
			return e;
		}
	}

	private validateMemberStats(req: Request) {
		const schema = Joi.object({
            chat: Joi.alternatives().try(
				Joi.number().integer().min(2000000001).message("Chat ID should be a number starting from 2000000001"),
				Joi.string().min(3).message("Chat ID should be a string with at least 3 characters")
			).required().messages({
				'any.required': 'Chat ID is required'
			}),
			type: Joi.string().valid('peer_id', 'uid').required().messages({
				'any.only': "Type must be either 'peer_id' or 'uid'",
				'any.required': 'Type is required'
			}),
			user: Joi.number().integer().required().messages({
				'any.required': 'user ID is required'
			})
        });
	
		const { error, value } = schema.validate({ 
			chat: req.params.chat, 
			user: req.params.user, 
			type: req.query.type 
		});
	
		if (error) {
			console.error("Validation error:", error.details[0].message);
			return { error: error.details[0].message };
		}
	
		return { value };
    }

	async getMemberStats(req: Request, res: Response) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { chat, user, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				u.user_id id,
				u.role,
				warns, 
				mute,
				togglenotify,
				immunity,
				join_date,
				messages,
				smilies,
				stickers,
				reply,
				reposts,
				audio,
				photo,
				video, 
				files,
				mats,

				r.name roleName,
				r_immunity.name immunityRole,
				n.nick
			FROM users u
			LEFT JOIN roles r on r.chat_id = u.chat_id and r.level=u.role
			LEFT JOIN roles r_immunity ON r_immunity.chat_id = u.chat_id AND r_immunity.level = u.immunity
			LEFT JOIN nicks n on n.chat_id = u.chat_id and n.user_id = u.user_id
			WHERE u.user_id = ? AND u.chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [user, chat];

        const [results]: any = await this.db.query(query, queryParams);
		if(!results) {
			res.json({ error: "Статистика участника чата не найдена" });
		}
		
		const info = <ChatMemberStatistics>results;
		const id = results.id;

		const error = await this.updatePhotoInInfo(id, [info]);
		if(error) {
			res.json(error);
			return;
		}

		checkDefaultRole(info);
		if(info.immunity !== 0 && info.immunityRole === null) {
			info.immunityRole = defaultRolesName.get(info.immunity) ?? "Ошибка";
		} 

		res.json(info);
    }
	async getMemberRights(req: Request, res: Response) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
            res.status(400).json({ error: validationResult.error });
			return;
        }

        let { chat, user, type } = validationResult.value;
		
		
		let query: string = `
			SELECT 
				c.*
			FROM commands c
			WHERE c.chat_id = 
		`;
		query = this.buildChatQuery(query, type);
		query += ' LIMIT 1';
		

        const [commandsAccess]: any = await this.db.query(query, [chat]);

		if(!commandsAccess) {
			res.json({ error: "Не найдены права на использование команд в чате." });
		}

		query = `
			SELECT 
				role
			FROM users
			WHERE user_id = ? AND chat_id = 
		`;
		query = this.buildChatQuery(query, type);
		query += ' LIMIT 1';
		

        const [userInfo]: any = await this.db.query(query, [user, chat]);
		if(!userInfo) {
			res.json({ error: "Участник чата не найден." });
		}
		
		const result: { user_id: number; chat_id: number; [key: string]: any } = {
			user_id: user,
			chat_id: chat,
		};

		const role = userInfo.role;
		for (const key in commandsAccess) {
			if(key === 'id' || key === 'chat_id') continue;
			const value = commandsAccess[key as keyof typeof commandsAccess];
			const [minRole, additionalParam1, additionalParam2] = value.split('|').map(Number);
			result[key] = role >= minRole;
		}

		res.json(result);
    }

	private buildChatQuery(baseQuery: string, type: string): string {
		if (type === "peer_id") {
			return baseQuery + "?";
		} else {
			return baseQuery + `
				(
					SELECT chat_id
					FROM chats
					WHERE chat_uid = ?
					LIMIT 1
				)
			`;
		}
	}
}

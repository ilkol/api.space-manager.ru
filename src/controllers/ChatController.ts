import { NextFunction, Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { App } from '../Application';
import axios from 'axios';
import { CommandRights } from '../utils/CommandRights';
import { Errors } from '../Exceptions';

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
                Joi.number().integer().min(2000000001).messages({
					'number.base': 'ID должно быть числом.',
					'number.integer': 'ID должно быть целым числом.',
					'number.min': 'ID должен быть больше или равен 2000000001.'
				}),
                Joi.string().min(3).messages({
					'string.base': 'ID должно бытьстрокой.',
          	  		'string.min': 'ID должно содержать как минимум 3 символа.'
				})
            ).required().messages({
				'alternatives.match': 'ID должен быть либо числом, либо строкой.',
				'any.required': 'ID обязательный параметр.'
			}),
            type: Joi.string().valid('peer_id', 'uid').required().messages({
				'string.base': 'Type должно быть строкой.',
				'any.only': 'Type принимает значения: peer_id, uid.',
				'any.required': 'Type обязательный параметр.'
			})
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
	private validateSetSettings(req: Request) {
		const schema = Joi.object({
            id: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required(),
			setting: Joi.string().valid(
				'togglefeed',
				'kickmenu',
				'leavemenu',
				'hideusers',
				'nameType',
				'unPunishNotify',
				'unRoleAfterKick',
				'autounban',
				'roleLevelStats',
				'muteType',
				'si_messages',
				'si_smilies',
				'si_stickers',
				'si_reply',
				'si_photo',
				'si_video',
				'si_files',
				'si_audio',
				'si_reposts',
				'si_mats'
			).required(),
			value: Joi.bool().required(),
			user_id: Joi.number().integer().min(1).max(2000000000).required()
        });

        const { error, value } = schema.validate({ 
            id: req.params.id, 
            type: req.body.type,
			setting: req.body.setting,
			value: req.body.value,
			user_id: req.body.user_id
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }
	

	async getInfo(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
			next(new Errors.QueryError("Данные чата не найдены"));
		}
    }

	async getMembers(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
		if(!results) {
			next(new Errors.QueryError("Данные о пользователях в чате не найдены"));
			return;
		}
		if(results.length === 0) {
			res.json([]);
			return;
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

	async getBannedUsers(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
			next(new Errors.QueryError("Заблокированные пользователи не найдены"));
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
	async getSettings(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
				roleLevelStats roleLevelStats,
				si_messages,
				si_smilies,
				si_stickers,
				si_reply,
				si_photo,
				si_video,
				si_files,
				si_audio,
				si_reposts,
				si_mats
			FROM settings s
			WHERE s.chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const [results]: any = await this.db.query(query, queryParams);
		if(!results) {
			next(new Errors.QueryError("Настройки чата не найдены"));
			return;
		}
		
		res.json(results);
    }
	async setSetting(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateSetSettings(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type, setting, value, user_id } = validationResult.value;
		
		try {
			if(!(await this.checkMemberRight(user_id, id, type, CommandRights.settings))) {
				next(new Errors.NoPermissions());	
				return;
			}
		} catch(e) {
			next(e);
			return;
		}
		
		let query: string = `
			UPDATE settings
			SET 
				${setting} = ${value ? 1 : 0}
			WHERE chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
		const queryParams = [id];

        const results = await this.db.query(query, queryParams);
		if(!results) {
			next(new Errors.QueryError("Не удалось изменить настройки"));
			return;
		}
		
		res.json(true);
    }
	async getRoles(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
			next(new Errors.QueryError("Не удалось запросить роли в чате"));
			return;
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

	async getMemberStats(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
			next(new Errors.QueryError("Статистика участника чата не найдена"));
			return;
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
	async checkMemberRight(user: number, chat: string, chatIDType: string, setting: CommandRights): Promise<boolean>
	{
		let query: string = `
			SELECT 
				${setting}
			FROM commands c
			WHERE c.chat_id = 
		`;
		query = this.buildChatQuery(query, chatIDType);
		query += ' LIMIT 1';

		const [result]: any = await this.db.query(query, [chat]);

		if(!result) {
			throw new Errors.QueryError('Не найдены права для этого чата');
		}

		query = `
			SELECT 
				role
			FROM users
			WHERE user_id = ? AND chat_id = 
		`;
		query = this.buildChatQuery(query, chatIDType);
		query += ' LIMIT 1';
		

        const [userInfo]: any = await this.db.query(query, [user, chat]);
		if(!userInfo) {
			throw new Errors.QueryError('Не найдены информация о пользователе чата');
		}

		const value = result[setting];
		const [minRole] = value.split('|').map(Number);

		return userInfo.role >= minRole;
	}
	async getMemberRights(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
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
			next(new Errors.QueryError("Не найдены права на использование команд в чате."));
			return;
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
			next(new Errors.QueryError("Не найдены данные об участнике чата"));
			return;
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

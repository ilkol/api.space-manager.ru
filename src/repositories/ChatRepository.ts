import { Repository } from "./Repository";
import { CommandRights } from '../utils/CommandRights';
import { Errors } from "../Exceptions";
import { VKAPI } from "../VK/API";
import { Returns } from "../controllers/ChatController";

export interface defaultUserInfo
{
	id: number;
	avatar?: string;
	name: string;
}

export interface UserInfo extends defaultUserInfo
{
	role: number;
	roleName: string|null;
	nick: string|null;
}
interface ChatMemberStatistics extends UserInfo
{
	immunity: number;
	immunityRole: string|null;
	
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


export class ChatRepository extends Repository
{
	async checkMemberRight(user: number, chat: string, chatIDType: string, setting: CommandRights): Promise<boolean> {
		let query: string = `
			SELECT a.*, u.role
			FROM commandsAccess a
			LEFT JOIN commands c ON c.id = a.command
			JOIN users u ON u.chat_id = a.chat_id AND u.user_id = ?
			WHERE c.name = '${setting}' AND a.chat_id = 
		`;
		query = this.buildChatQuery(query, chatIDType);
		query += ' LIMIT 1';
	
		const [result]: any = await this.db.query(query, [user, chat]);
	
		if (!result) {
			throw new Errors.QueryError('Не найдены права или информация о пользователе для этого чата');
		}
	
		console.log(result);
		// const value = result[setting];
		const minRole = result.role;
	
		return result.role >= minRole;
	}

	public async kickUser(chat: number, user: number): Promise<void> {
		const result = await this.kickUserFromChatAPI(chat, user);
	
		if (!result.success) {
			const errorMessage = result.error?.error_msg || 'Неизвестная ошибка при попытке исключить пользователя';
			throw new Errors.VKAccessDenied(errorMessage);
		}
	
		await this.kickedUserUpdateInfo(chat, user);
	}

	public async getRoles(chat: string, type: string) {
		let query: string = `
			SELECT 
				name,
				level,
				emoji
			FROM roles
			WHERE chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
        const results: any = await this.db.query(query, [chat]);
		if(!results) {
			throw new Errors.QueryError("Не удалось запросить роли в чате");
		}
		const roles: Map<number, Role> = rolesArrayFromDB(results);
		return roles;
	}
	public async setSetting(chat: string, type: string, setting: string, value: boolean) {
		let query: string = `
			UPDATE settings
			SET 
				${setting} = ?
			WHERE chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
        const results = await this.db.query(query, [(value ? 1 : 0), chat]);
		if(!results) {
			throw new Errors.QueryError("Не удалось изменить настройки");
		}
	}
	public async getSettings(chat: string, type: string)
	{
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
				muteType,
				
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
		
        const [results]: any = await this.db.query(query, [chat]);
		if(!results) {
			throw new Errors.QueryError("Настройки чата не найдены");
		}
		return results;
	}
	public async getBannedUsers(chat: string, type: string) {
		let query: string = `
			SELECT 
				b.*
			FROM banlist b
			WHERE b.chat_id =
		`;
		query = this.buildChatQuery(query, type);
		
        const results: any = await this.db.query(query, [chat]);
		if(!results) {
			throw new Errors.QueryError("Заблокированные пользователи не найдены");
		}
		const usersArray: BanInfo[] = results.map(bannedUser);
		return usersArray;		
	}
	public async getMembers(chat: string, type: string)
	{	
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
		
        const results: any = await this.db.query(query, [chat]);
		if(!results) {
			throw new Errors.QueryError("Данные о пользователях в чате не найдены");
		}

		const usersArray: UserInfo[] = results.map(user);
		return usersArray;
	}
	public async getInfo(chat: string|number, type: string): Promise<Returns<'getInfo'>>
	{
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

        const [results]: any = await this.db.query(query, [chat]);

		if (!results) {
			throw new Errors.QueryError("Данные чата не найдены");
		}
		return results;
	}

	private async kickUserFromChatAPI(chat: number, user: number) {
		const response = await VKAPI.kickUser({
			chat_id: chat - 2000000000,
			member_id: user
		});
		if (response.error) {
			return { success: false, error: response.error };
		}
		return { success: true };
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

	private async kickedUserUpdateInfo(chat: number, user: number): Promise<void> {
		let query = `
			UPDATE users
			SET
				in_chat = 0,
				invited_by = 0,
				last_message = 0,
				role = CASE
					WHEN (SELECT unRoleAfterKick FROM settings WHERE chat_id = ?) = 1
					THEN (SELECT inviterole FROM chats WHERE chat_id = ?)
					ELSE role
				END
			WHERE user_id = ? AND chat_id = ? LIMIT 1
		`;
	
		const [result]: any = await this.db.query(query, [chat, chat, user, chat]);
	
		if (result.affectedRows === 0) {
			throw new Errors.QueryError("Не удалось обновить информацию о пользователе чата");
		}
	}

	public async getChatIdFromUid(chat: string): Promise<number> {
		let query = `
			SELECT 
				chat_id
			FROM chats
			WHERE chat_uid = ?
			LIMIT 1
		`;
		

		const results: any = await this.db.query(query, [chat]);
		if(!results) {
			throw new Errors.QueryError("Не удалось найти чат.");
		}
		const [res] = results;
		return res.chat_id;
	}
	public async getMemberStats(chat: string, user: number, type: string): Promise<ChatMemberStatistics>
	{
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
			throw new Errors.QueryError("Статистика участника чата не найдена");
		}
		return results;
	}

	public async getChatCommandAccess(chat: string, type: string)
	{
		let query: string = `
			SELECT 
				a.*,
				c.name
			FROM commandsAccess a
			LEFT JOIN commands c ON c.id = a.command
			WHERE a.chat_id = 
		`;
		query = this.buildChatQuery(query, type);
		

        const commandsAccess: any = await this.db.query(query, [chat]);

		if(!commandsAccess) {
			throw new Errors.QueryError();
		}
		if(commandsAccess.length === 0) {
			throw new Errors.QueryError("Не найдены права на использование команд в чате.");
		}
		return commandsAccess;
	}
	public async getMemberRole(chat: string, user: number, type: string)
	{
		let query = `
			SELECT 
				role
			FROM users
			WHERE user_id = ? AND chat_id = 
		`;
		query = this.buildChatQuery(query, type);
		query += ' LIMIT 1';
		

        const userInfoRes: any = await this.db.query(query, [user, chat]);
		if(!userInfoRes) {
			throw new Errors.QueryError("Не найдены данные об участнике чата");
		}
		const [userInfo] = userInfoRes;
		return userInfo;
	}
}
import { Errors } from "../Exceptions";
import { Logger, LogType } from "../Logger";
import { Phrases } from "../Phrases";
import { ChatRepository, defaultUserInfo, UserInfo } from "../repositories/ChatRepository";
import { UserRepository } from "../repositories/UserRepository";
import { CommandRights } from "../utils/CommandRights";
import { VKAPI } from "../VK/API";
import { Service } from "./Services";

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

export class ChatService extends Service {
	constructor(private readonly chatRepo: ChatRepository, private readonly userRepo: UserRepository) {
		super();
	}

	public async leaveChat(chat: string, user: number, type: string) {
        const hasRight = await this.chatRepo.checkMemberRight(user, chat, type, CommandRights.selfKick);
        if (!hasRight) {
            throw new Errors.NoPermissions();
        }

        const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;
        await this.logLeaveEvent(chatId, user);
        
        await VKAPI.sendMessage({
            peer_id: chatId,
            message: `[id${user}|Пользователь] пожелал покинуть чат.`,
        });

        return true;
    }

    public async kickMember(chat: string, user: number, punisher: number, reason: string, type: string) {
        const hasRight = await this.chatRepo.checkMemberRight(punisher, chat, type, CommandRights.kick);
        if (!hasRight) {
            throw new Errors.NoPermissions();
        }

        const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;
        await this.chatRepo.kickUser(chatId, user);
        
        const logText = await this.generateKickLog(punisher, user, reason);
		Logger.logText(chatId, logText);
        await VKAPI.sendMessage({
            peer_id: chatId,
            message: logText,
        });

        return true;
    }
	public async getMemberRights(chat: string, user: number, type: string) {
        const commandsAccess = await this.chatRepo.getChatCommandAccess(chat, type);
		const userInfo = await this.chatRepo.getMemberRole(chat, user, type);

		
		const result: { user_id: number; chat_id: number; [key: string]: any } = {
			user_id: user,
			chat_id: commandsAccess.chat_id,
		};

		const role = userInfo.role;
		commandsAccess.forEach((element: {chat_id: number, command: number, role: number, limitTime: number, limitCount: number, name: string}) => {
			const cmd = element.name;
			result[cmd] = role >= element.role;
			
		});

		return result;
    }
	public async getMemberStats(chat: string, user: number, type: string)
	{
		
		
		const info = await this.chatRepo.getMemberStats(chat, user, type);
		const id = info.id;

		const error = await this.updatePhotoInInfo(id, [info]);
		if(error) {
			return error;
		}

		checkDefaultRole(info);
		if(info.immunity !== 0 && info.immunityRole === null) {
			info.immunityRole = defaultRolesName.get(info.immunity) ?? "Ошибка";
		} 

		return info;

	}
	public async getRoles({chat, type}: {chat: string, type: string}) {
		
		const roles = await this.chatRepo.getRoles(chat, type);
		defaultRolesName.forEach((name, level) => {
			if(!roles.has(level)) {
			  roles.set(level, {
				name: name,
				level: level,
				emoji: ""
			  });
			}
		});
		
		return Array.from(roles.values()).sort((a, b) => b.level - a.level);
	}
	public async setSetting(chat: string, type: string, setting: string, value: boolean, user: number)
	{
		const hasRight = await this.chatRepo.checkMemberRight(user, chat, type, CommandRights.settings);
        if (!hasRight) {
            throw new Errors.NoPermissions();
        }
		
		await this.chatRepo.setSetting(chat, type, setting, value);		
	}
	public async getSettings({chat, type}: {chat: string, type: string})
	{
		const results = await this.chatRepo.getSettings(chat, type);
		return results;
	}

	public async getBannedUsers({chat, type}: {chat: string, type: string}) {
		const bannedUser = await this.chatRepo.getBannedUsers(chat, type);
		
		const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;		
		const error = await this.updatePhotoInInfo(chatId, bannedUser);
		if(error) {
			return error;
		}
		return bannedUser;
	}
	public async getMembers({chat, type}: {chat: string, type: string})
	{
		const usersArray = await this.chatRepo.getMembers(chat, type);
		const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;		
		
		const error = await this.updatePhotoInInfo(chatId, usersArray);
		if(error) {
			return error;
		}

		usersArray.map(checkDefaultRole);
		return usersArray;
	}
	public async getInfo({chat, type}: any)
	{
		return await this.chatRepo.getInfo(chat, type);
	}

	private async updatePhotoInInfo(id: number, users: defaultUserInfo[]): Promise<any|undefined>
	{
		try {
			const result = await VKAPI.getConversationMembers({
				peer_id: id,
				fields: "photo_50"
			});

			if(result.error) {
				const error = result.error;
				console.error("Ошибка при выполнении запроса к VK API");
				console.log(error);
				
				return {
					error: error.error_code,
					message: error.error_msg
				};	
			}

			let profiles = result.response.profiles;
			let groups = result.response.groups;

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
		} catch(e) {
			return e;
		}
	}

	private async logLeaveEvent(chat: number, user: number) {
		const userInfo = await this.getUserInfo(user);
		Logger.log(chat, LogType.userLeave, { 
			user:userInfo.formattedName,
			gender: userInfo.genderLabel,
		});
	}
    private async generateKickLog(punisher: number, user: number, reason?: string) {
        const name = await this.userRepo.getMemberNameInfo(user);
		const panisherInfo = await this.getUserInfo(punisher);
		const logText = Phrases.f(Phrases.List.kickUser, { 
			user: Phrases.formatMentionName(user, name.acc),
			punisher: panisherInfo.formattedName,
			gender: panisherInfo.genderLabel,
			reason: reason
		})
		return logText;
    }

	private async getUserInfo(userId: number) {
		const name = await this.userRepo.getMemberNameInfo(userId);
		return {
			formattedName: Phrases.formatMentionName(userId, name.nom),
			genderLabel: Phrases.getGenderLabel(name.sex),
		};
	}
}
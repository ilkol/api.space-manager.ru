import { Args, Returns } from "../controllers/ChatController";
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

	public async leaveChat({chat, user, type}: {chat: string, user: number, type: string}) {
        const hasRight = await this.chatRepo.checkMemberRight(user, chat, type, CommandRights.selfKick);
        if (!hasRight) {
            throw new Errors.NoPermissions();
        }

        const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;
		await this.chatRepo.kickUser(chatId, user);
        await this.logLeaveEvent(chatId, user);

        return true;
    }

    public async kickMember({chat, user, punisher, reason, type}: {chat: string, user: number, punisher: number, reason: string, type: string}) {
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
	public async getMemberRights({chat, user, type}: {chat: string, user: number, type: string}) {
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
	public async getMemberStats({chat, user, type}: {chat: string, user: number, type: string})
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
	public async setSetting({chat, type, setting, value, user}: {chat: string, type: string, setting: string, value: boolean, user: number})
	{
		const hasRight = await this.chatRepo.checkMemberRight(user, chat, type, CommandRights.settings);
        if (!hasRight) {
            throw new Errors.NoPermissions();
        }
		
		await this.chatRepo.setSetting(chat, type, setting, value);		
		const chatId: number = type === 'uid' ? await this.chatRepo.getChatIdFromUid(chat) : +chat;		
		await this.logSetSetting(chatId, user, setting, value);

		return true;
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
	public async getInfo({chat, type}: Args<'getInfo'>): Promise<Returns<'getInfo'>>
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

		const nick = await this.chatRepo.getUserNick(chat, user);
		const logText = Phrases.f(Phrases.List.userLeave, {
			user: nick ? Phrases.formatMentionName(user, nick) : userInfo.formattedName,
			gender: userInfo.genderLabel,
		})
		VKAPI.sendMessage({
            peer_id: chat,
            message: logText,
        })
	}

	private static settings: Record<string, string> = {
		'togglefeed': 'оповещение чата о важных обновлениях',
		'kickmenu': 'отображение меню с действиями после исключения участника из чата',
		'leavemenu': 'отображение меню с действиями после выхода участника из чата',
		'hideusers': 'скрытие бывших участников чата из топа',
		'nameType': 'замену имени и фамилии участников на ник',
		'unPunishNotify': 'оповещение чата об окончании срока блокировки, блокировки чата участника',
		'unRoleAfterKick': 'выдачу роли по умолчанию участнику после исключения его из чата',
		'autounban': 'разбан участника, если его пригласил в чат старший администратор',
		'roleLevelStats': 'отображение уровня роли участника в статистике',
		'muteType': 'блокировку чата участникам с помощью новой системы от ВК',
	
		'si_messages': 'отображение сообщений на графике',
		'si_smilies': 'отображение смайлов на графике',
		'si_stickers': 'отображение стикеров на графике',
		'si_reply': 'отображение пересланных сообщений на графике',
		'si_photo': 'отображение фото на графике',
		'si_video': 'отображение видео на графике',
		'si_files': 'отображение файлов на графике',
		'si_audio': 'отображение голосовых сообщений на графике',
		'si_reposts': 'отображение репостов на графике',
		'si_mats': 'отображение сообщений с матом на графике'
	};

	private async logSetSetting(chat: number, user: number, setting: string, state: boolean) {
		const userInfo = await this.getUserInfo(user);
		const stateLabel = state ? "в" : "вы";

		const settingName = ChatService.settings[setting];

		Logger.log(chat, LogType.changeSetting, { 
			user:userInfo.formattedName,
			gender: userInfo.genderLabel,
			setting: settingName,
			state: stateLabel
		});

		const nick = await this.chatRepo.getUserNick(chat, user);
		const logText = Phrases.f(Phrases.List.changeSetting, {
			user: nick ? Phrases.formatMentionName(user, nick) : userInfo.formattedName,
			gender: userInfo.genderLabel,
			setting: settingName,
			state: stateLabel
		})
		VKAPI.sendMessage({
            peer_id: chat,
            message: logText,
        })
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
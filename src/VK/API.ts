import axios from "axios";
import { App } from "../Application";
import { VKError } from "./Errors";

interface BaseParams
{

}

export interface VKResponse
{
	error?: VKError;
	response?: any;
}

export class VKAPI
{
	private static readonly VK_API_VERSION = '5.199';

	private static async query<T extends BaseParams>(method: string, methodParams?: T): Promise<VKResponse>
	{
		const messageUrl = `https://api.vk.com/method/${method}`;

		const params = new URLSearchParams({
            v: VKAPI.VK_API_VERSION,
            ...methodParams
        } as Record<string, string>);

		try {
			const response = await axios.post(messageUrl, params, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Bearer ${App.vkToken}`
				}
			});
			return response.data;
		} catch(e) {
			throw e;
		}
	}

	/**
	 * Исключает из мультидиалога пользователя, если текущий пользователь или сообщество является администратором беседы либо текущий пользователь пригласил исключаемого пользователя.
	 */
	public static async kickUser(args: RemoveUserParams)
	{	
		return this.query<RemoveUserParams>('messages.removeUser', args);
	}
	public static async getConversationMembers(args: GetConversationMembersParams)
	{
		return this.query<GetConversationMembersParams>('messages.getConversationMembers', args);
	}
}

interface RemoveUserParams
{
	/**
	 * Идентификатор беседы
	 * @required
	 */
	chat_id: number;
	/**
	 * Идентификатор пользователя, которого необходимо исключить из беседы.
	 * То есть, принимает только пользователе, не сообщества.
	 */
	user_id?: number;
	/**
	 * Идентификатор участника, которого необходимо исключить из беседы. Для сообществ — идентификатор сообщества со знаком «минус».
	 */
	member_id?: number;
}

interface GetConversationMembersParams
{
	peer_id: number;
	offset?: number;
	count?: number;
	extended?: 0|1;
	fields?: string;
	group_id?: number;
}
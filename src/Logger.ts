import { DB } from "./DB";
import { Errors } from "./Exceptions";
import { Phrases, PhrasesList, PhrasesParams } from "./Phrases";

export enum LogType {
    userLeave = PhrasesList.userLeave,
    kickUser = PhrasesList.kickUser,
    banUser = PhrasesList.banUser,
}
type LogTypeToParams = {
    [LogType.userLeave]: PhrasesParams[PhrasesList.userLeave];
    [LogType.kickUser]: PhrasesParams[PhrasesList.kickUser];
    [LogType.banUser]: PhrasesParams[PhrasesList.banUser];
};

export class Logger
{
	private static instance: Logger;

	private constructor(private readonly db: DB) {

	}

	public static init(db: DB)
	{
		if(!Logger.instance) {
			Logger.instance = new Logger(db);
		}
	}

	public static async log<T extends LogType>(chat: number, type: T, params: LogTypeToParams[T])
	{
		const text = Phrases.f(type as unknown as PhrasesList, params);
		Logger.logText(chat, text);
	}
	public static async logText(chat: number, text: string)
	{
		this.instance.makeLog(chat, text);
	}

	private async makeLog(chat: number, text: string)
	{
		let query = `
			INSERT INTO logs_actions 
				(chat_id, text, dateunix)
			VALUES
				(?, ?, ?)
		`;
		

		const result: any = await this.db.query(query, [chat, text, Math.floor((new Date()).getTime() / 1000)]);
		if(!result) {
			throw new Errors.QueryError("");
		}
	}
}
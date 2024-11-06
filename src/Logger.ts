import { DB } from "./DB";
import { Errors } from "./Exceptions";

export enum LogType {
    userLeave,
	kickUser,
}

// Интерфейсы параметров для каждого типа сообщения
interface LogMessageParams {
    [LogType.userLeave]: { user: number; userName: string; };
    [LogType.kickUser]: { user: number; userName: string; punisher: number; punisherName: string; reason?: string};
}

export class Logger
{
	private static instance: Logger;
	private static readonly templates = {
        [LogType.userLeave]: "[id{user}|{userName}}] покинул чат",
        [LogType.kickUser]: "[id{punisher}|{punisherName}] исключил [id{user}|{userName}] из чата",
    };

	private constructor(private readonly db: DB) {

	}

	public static init(db: DB)
	{
		if(!Logger.instance) {
			Logger.instance = new Logger(db);
		}
	}

	public static async log<T extends LogType>(chat: number, type: T, params: LogMessageParams[T])
	{
		const template = Logger.templates[type];
		const text = this.instance.formatMessage(("reason" in params && params.reason) ? (template + `. Причина: ${params.reason}`) : template, params);
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
		

		const result: any = await this.db.query(query, [chat, text, (new Date()).getTime()]);
		if(!result) {
			throw new Errors.QueryError("");
		}
	}
	private formatMessage(template: string, params: Record<string, any>): string {
        return template.replace(/{(\w+)}/g, (_, key) => {
            return params[key] !== undefined ? params[key] : `{${key}}`;
        });
    }
}
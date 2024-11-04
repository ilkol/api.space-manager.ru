import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class QueryError extends Exception
{
	constructor(message: string = "Пользователь не найден") {
		super(ErrorCode.queryError, message);
	}
}
import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class QueryError extends Exception
{
	constructor(message: string = "Ошибка при выполнении запроса к базе данных") {
		super(ErrorCode.queryError, message);
	}
}
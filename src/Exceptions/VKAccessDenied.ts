import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class VKAccessDenied extends Exception
{
	constructor(message: string = "Нет прав для выполнения действия") {
		super(ErrorCode.vkAccessDenied, message);
	}
}
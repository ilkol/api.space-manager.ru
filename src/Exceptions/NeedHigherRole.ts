import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class NeedHigherRole extends Exception
{
	constructor(message: string = "Ваш уровень прав ниже уровня прав изменяемого пользователя.") {
		super(ErrorCode.NeedHigherRole, message);
	}
}
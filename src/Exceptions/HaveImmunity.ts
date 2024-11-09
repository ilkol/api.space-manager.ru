import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class HaveImmunity extends Exception
{
	constructor(message: string = "У пользователя есть иммунитет от наказаний") {
		super(ErrorCode.HaveImmunity, message);
	}
}
import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class NoPermissions extends Exception
{
	constructor(message: string = "Нет прав для вызова метода") {
		super(ErrorCode.noPermissions, message);
	}
}
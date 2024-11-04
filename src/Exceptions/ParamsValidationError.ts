import { ErrorCode } from "./ErrorCodes";
import { Exception } from "./Exception";

export class ParamsValidationError extends Exception
{
	constructor(message: string) {
		super(ErrorCode.paramsValidation, message);
	}
}
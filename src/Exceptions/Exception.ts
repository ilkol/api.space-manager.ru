import { ErrorCode } from "./ErrorCodes";

export abstract class Exception extends Error
{
	constructor(public readonly code: ErrorCode, public readonly message: string)
	{
		super(message);
	}
}
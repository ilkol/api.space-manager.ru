import { QueryError } from "./QueryError";
import { NoPermissions } from "./NoPermissions";
import { ParamsValidationError } from "./ParamsValidationError";
import { VKAccessDenied } from './VKAccessDenied';

// Экспортируем ошибки под псевдонимом Errors
export const Errors = {
    ParamsValidationError,
	QueryError,
	NoPermissions,
	VKAccessDenied
};
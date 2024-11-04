import { QueryError } from "./QueryError";
import { NoPermissions } from "./NoPermissions";
import { ParamsValidationError } from "./ParamsValidationError";


// Экспортируем ошибки под псевдонимом Errors
export const Errors = {
    ParamsValidationError,
	QueryError,
	NoPermissions
};
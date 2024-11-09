import { QueryError } from "./QueryError";
import { NoPermissions } from "./NoPermissions";
import { ParamsValidationError } from "./ParamsValidationError";
import { VKAccessDenied } from './VKAccessDenied';
import { NeedHigherRole } from "./NeedHigherRole";
import { HaveImmunity } from "./HaveImmunity";

// Экспортируем ошибки под псевдонимом Errors
export const Errors = {
    ParamsValidationError,
	QueryError,
	NoPermissions,
	VKAccessDenied,
	NeedHigherRole,
	HaveImmunity,
};
export enum ErrorCode
{
	undefinded,				// неизвестнаяошибка
	queryError,				// не удалось найти пользователя
	paramsValidation,		// ошибка при валдиации параметров
	noPermissions,			// нет прав для выполнения действия
	vkAccessDenied,			// ВК запретила доступ
	NeedHigherRole,			// не может наказать вышестоящего
	HaveImmunity,			// у пользователя есть иммнитет
}
export enum ErrorCode
{
	undefinded,				// неизвестнаяошибка
	queryError,				// не удалось найти пользователя
	paramsValidation,		// ошибка при валдиации параметров
	noPermissions,			// нет прав для выполнения действия
	vkAccessDenied,
}
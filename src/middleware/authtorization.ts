import { NextFunction, Request, Response } from "express";

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('Authorization')?.split(' ')[1]; // Извлечение ключа из заголовка
    if (!apiKey) {
         res.status(401).json({ error: 'API ключ не предоставлен' });
    }
	else {
		if (!checkApiKey(apiKey)) {
			res.status(403).json({ error: 'Недопустимый API ключ' });
		}
		next();
	}

};

function checkApiKey(apiKey: string): boolean
{
	return apiKey === process.env.SECRET_API_KEY;
}
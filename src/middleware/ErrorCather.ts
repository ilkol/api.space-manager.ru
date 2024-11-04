import { NextFunction, Request, Response } from "express";
import { Exception } from "../Exceptions/Exception";

export const ErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Exception) {
        res.status(400).json({ error: {
			code: err.code,
			message: err.message
		} });
    } else {
        res.status(500).json({ error: {
			code: 0,
			message: "Неизвестная ошибка"
		}});
    }
};
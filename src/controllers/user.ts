import { Request, Response } from 'express';

export const getUsers = (req: Request, res: Response) => {
    res.json({ message: 'CORS настроен!' });
};

export const getUserById = (req: Request, res: Response) => {
    const userId = req.params.id;
    res.json({ userId });
};
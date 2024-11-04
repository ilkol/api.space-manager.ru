import express, { Request, Response, Application, NextFunction } from 'express';
import cors from 'cors';

import { DB } from "./DB";
import { PoolOptions } from 'mysql2';
import { AuthMiddleware } from './middleware/authtorization';

import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import { ErrorMiddleware } from './middleware/ErrorCather';

export class App
{
    private app: Application;
    private readonly port: number = 3000;
    private db: DB;
	private static _vkToken: string = "";

	static get vkToken(): string
	{
		return App._vkToken;
	}

    constructor(dbConfig: PoolOptions)
    {
		App._vkToken = process.env.VK_TOKEN ?? "";
        this.app = express();
        this.db = this.createDBConnection(dbConfig);

        this.middlewares();
        this.routes();
        this.errorHandling();
    }

    private createDBConnection(dbConfig: PoolOptions): DB
    {
        return new DB(dbConfig);
    }

    private middlewares(): void {
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));
		this.app.use(AuthMiddleware);
    }

    private routes(): void {
        this.app.use('/user', userRoutes(this.db));
        this.app.use('/chat', chatRoutes(this.db));
    }

    private errorHandling(): void {
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Метод не найден!' });
        });
    }

    public start(): void {
		this.app.use(ErrorMiddleware);
        this.app.listen(this.port, () => {
            console.log(`Запуск API сервера на порту ${this.port}`);
        });
    }
}
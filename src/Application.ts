import express, { Request, Response, Application, NextFunction } from 'express';
import multer from 'multer';
import cors from 'cors';

import { DB } from "./DB";
import { PoolOptions } from 'mysql2';
import { AuthMiddleware } from './middleware/authtorization';

import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import { ErrorMiddleware } from './middleware/ErrorCather';
import { Logger } from './Logger';
import { ChatRepository } from './repositories/ChatRepository';
import { UserRepository } from './repositories/UserRepository';
import { ChatService } from './services/ChatService';
import { DataSourceOptions } from 'typeorm';

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
	
	private chatRepo: ChatRepository;
	private userRepo: UserRepository;

	private chatService: ChatService;

    constructor(dbConfig: DataSourceOptions)
    {
		App._vkToken = process.env.VK_TOKEN ?? "";
        this.app = express();
        this.db = this.createDBConnection(dbConfig);
		this.chatRepo = new ChatRepository(this.db);
		this.userRepo = new UserRepository(this.db);
		
		this.chatService = new ChatService(this.chatRepo, this.userRepo);

		Logger.init(this.db);

        this.middlewares();
        this.routes();
        this.errorHandling();
    }


    private createDBConnection(dbConfig: DataSourceOptions): DB
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
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
		const upload = multer();
		this.app.use(upload.none());
    }

    private routes(): void {
        this.app.use('/user', userRoutes(this.db));
        this.app.use('/chat', chatRoutes(this.chatService));
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
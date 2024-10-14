import express, { Request, Response, Application } from 'express';
import cors from 'cors';

import { DB } from "./DB";
import userRoutes from './routes/user';
import { PoolOptions } from 'mysql2';

export class App
{
    private app: Application;
    private readonly port: number = 3000;
    private db: DB;

    constructor(dbConfig: PoolOptions)
    {
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
    }

    private routes(): void {
        this.app.use('/user', userRoutes(this.db)); // Передаем экземпляр DB в роуты
    }

    private errorHandling(): void {
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Метод не найден!' });
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Запуск API сервера на порту ${this.port}`);
        });
    }
}
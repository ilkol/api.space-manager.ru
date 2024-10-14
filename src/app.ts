import express, { Request, Response } from 'express';
import cors from 'cors';
import userRoutes from './routes/user';
import { DB } from './DB';


const db = new DB({
    charset  : 'utf8mb4_unicode_ci',
    host     : 'localhost',
    user     : 'api',
    password : 'l1Bs6j5MOBHhYMA1',
    database : 'bot'
});

const app = express();
const port = 3000;

// Настройка CORS
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Использование маршрутов
app.use('/user', userRoutes);

// Обработка несуществующих маршрутов
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Метод не найден!' });
});
  
app.listen(port, () => {
    console.log(`Запуск API сервера на порту ${port}`);
});
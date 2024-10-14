import { App } from "./Application";
import dotenv from 'dotenv';

dotenv.config();

const app = new App({
    charset  : process.env.DB_CHARSET,
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_BOT_DB
});

app.start();
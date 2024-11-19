import { App } from "./Application";
import "reflect-metadata";
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const app = new App({
    type: "mysql",
    host: process.env.DB_HOST,
    // port: 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_BOT_DB,
});

app.start();
import { App } from "./Application";

const app = new App({
    charset  : 'utf8mb4_unicode_ci',
    host     : 'localhost',
    user     : 'api',
    password : 'l1Bs6j5MOBHhYMA1',
    database : 'bot'
});

app.start();
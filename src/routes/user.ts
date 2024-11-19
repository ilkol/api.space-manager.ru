import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/UserController';
import { DB } from '../DB/DB';

interface Route
{
    path: string;
    controller: RequestHandler;
}

function route(path: string, controller: RequestHandler): Route
{
    return {path, controller};
}

export default (db: DB) => {

    const router = Router();
    const controller = new UserController(db);
    
    const routes: Route[] = [
        route('/:id/getActiveChatsList', controller.getActiveChatsList.bind(controller)),
        route('/:id/getTodayActivityStatistics', controller.getTodayActivityStatistics.bind(controller)),
    ];

    routes.forEach((route) => {
        router.get(route.path, route.controller);
    })

    return router;
}
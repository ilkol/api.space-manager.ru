import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/UserController';
import { DB } from '../DB';
import { ChatController } from '../controllers/ChatController';

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
    const controller = new ChatController(db);
    
    const routes: Route[] = [
        route('/:id/getInfo', controller.getInfo.bind(controller)),
		route('/:id/getMembers', controller.getMembers.bind(controller)),
		route('/:id/getBannedUsers', controller.getBannedUsers.bind(controller)),
		route('/:chat/user/:user/getStats', controller.getMemberStats.bind(controller)),
    ];

    routes.forEach((route) => {
        router.get(route.path, route.controller);
    })

    return router;
}
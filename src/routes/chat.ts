import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/UserController';
import { DB } from '../DB';
import { ChatController } from '../controllers/ChatController';
import { ChatService } from '../services/ChatService';

enum Method {
	get,
	post
}

interface Route
{
    path: string;
    controller: RequestHandler;
	method: Method
}

function route(path: string, controller: RequestHandler, method: Method = Method.get): Route
{
    return {path, controller, method};
}

export default (chatService: ChatService) => {

    const router = Router();
    const controller = new ChatController(chatService);
    
    const routes: Route[] = [
        route('/:chat/getInfo', controller.getInfo.bind(controller)),
		route('/:chat/getMembers', controller.getMembers.bind(controller)),
		route('/:chat/getBannedUsers', controller.getBannedUsers.bind(controller)),

		route('/:chat/getSettings', controller.getSettings.bind(controller)),
		route('/:chat/setSetting', controller.setSetting.bind(controller), Method.post),

		route('/:chat/getRoles', controller.getRoles.bind(controller)),
		route('/:chat/leave', controller.leave.bind(controller), Method.post),
		route('/:chat/kick', controller.kick.bind(controller), Method.post),
		
		route('/:chat/user/:user/getStats', controller.getMemberStats.bind(controller)),
		route('/:chat/user/:user/getRights', controller.getMemberRights.bind(controller)),
		
    ];

    routes.forEach((route) => {
		if(route.method === Method.get) {
			router.get(route.path, route.controller);
		}
		else {
			router.post(route.path, route.controller);
		}
    })

    return router;
}
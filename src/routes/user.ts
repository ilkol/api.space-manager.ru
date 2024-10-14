import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { DB } from '../DB';

export default (db: DB) => {

    const router = Router();
    const controller = new UserController(db);
    
    router.get('/', controller.getUsers);
    router.get('/:id', controller.getUserById);

    return router;
}
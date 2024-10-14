import { DB } from "../DB";

export abstract class AbstractController
{
    constructor(protected db: DB)
    {
        
    }
}
import { DB } from "../DB/DB";

export abstract class Repository
{
	constructor(protected db: DB)
    {
        
    }
}
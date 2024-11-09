import { DB } from "../DB";

export abstract class Repository
{
	constructor(protected db: DB)
    {
        
    }
}
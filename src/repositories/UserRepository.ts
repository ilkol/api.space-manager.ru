import { Repository } from "./Repository";
import { CommandRights } from '../utils/CommandRights';
import { Errors } from "../Exceptions";

export enum Sex {
	club = 0,
	female = 1,
	male = 2,
}
interface UserNameInfo
{
	id: number;
	sex: Sex;
	nom: string;
	gen: string;
	dat: string;
	acc: string;
}

export class UserRepository extends Repository
{
	public async getMemberNameInfo(user: number): Promise<UserNameInfo> {
        let query: string = `
			SELECT 
				*
			FROM names
			WHERE user_id = ?
			LIMIT 1
		`;

		const [result]: any = await this.db.query(query, [user]);

		if(!result) {
			throw new Errors.QueryError();
		}

		if( user < 0) {
			return {
				id: user,
				sex: result.sex,
				nom: result.name,
				gen: result.nameDat,
				dat: result.name,
				acc: result.name,
			}

		}
		else {
			return {
				id: user,
				sex: result.sex,
				nom: result.name,
				gen: result.nameGen,
				dat: result.nameDat,
				acc: result.nameAcc,
			}
		}
    }
}
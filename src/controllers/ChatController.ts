import { NextFunction, Request, Response } from 'express';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { Errors } from '../Exceptions';
import { ChatService } from '../services/ChatService';

export class ChatController extends AbstractController
{
    constructor(private readonly service: ChatService)
    {
        super();
    }

	private async handleRequest(schema: Joi.ObjectSchema, serviceMethod: Function, params: Object, res: Response, next: NextFunction)
	{
		try {
			const { error, value } = schema.validate(params);
			if (error) {
				next(new Errors.ParamsValidationError(error.details[0].message));
				return;
			}			
			const results = await serviceMethod(value);
			res.json(results);
		} catch(e) {
			next(e);
		}
	}

	private validateInfo() {
		return Joi.object({
            chat: Joi.alternatives().try(
                Joi.number().integer().min(2000000001).messages({
					'number.base': 'ID должно быть числом.',
					'number.integer': 'ID должно быть целым числом.',
					'number.min': 'ID должен быть больше или равен 2000000001.'
				}),
                Joi.string().min(3).messages({
					'string.base': 'ID должно бытьстрокой.',
          	  		'string.min': 'ID должно содержать как минимум 3 символа.'
				})
            ).required().messages({
				'alternatives.match': 'ID должен быть либо числом, либо строкой.',
				'any.required': 'ID обязательный параметр.'
			}),
            type: Joi.string().valid('peer_id', 'uid').required().messages({
				'string.base': 'Type должно быть строкой.',
				'any.only': 'Type принимает значения: peer_id, uid.',
				'any.required': 'Type обязательный параметр.'
			})
        });
    }
	private validateSetSettings() {
		return Joi.object({
            chat: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required(),
			setting: Joi.string().valid(
				'togglefeed',
				'kickmenu',
				'leavemenu',
				'hideusers',
				'nameType',
				'unPunishNotify',
				'unRoleAfterKick',
				'autounban',
				'roleLevelStats',
				'muteType',
				'si_messages',
				'si_smilies',
				'si_stickers',
				'si_reply',
				'si_photo',
				'si_video',
				'si_files',
				'si_audio',
				'si_reposts',
				'si_mats'
			).required(),
			value: Joi.bool().required(),
			user: Joi.number().integer().max(2000000000).required()
        });
    }

	private async needOnlyChatIDMethod(method: Function, req: Request, res: Response, next: NextFunction)
	{
		await this.handleRequest(this.validateInfo(), method.bind(this.service), { 
            chat: req.params.id, 
            type: req.query.type 
        }, res, next);
	}
	
	public async getInfo(req: Request, res: Response, next: NextFunction) {
		await this.needOnlyChatIDMethod(this.service.getInfo, req, res, next);
    }

	public async getMembers(req: Request, res: Response, next: NextFunction) {
		await this.needOnlyChatIDMethod(this.service.getMembers, req, res, next);
    }

	public async getBannedUsers(req: Request, res: Response, next: NextFunction) {
		await this.needOnlyChatIDMethod(this.service.getBannedUsers, req, res, next);
    }
	public async getSettings(req: Request, res: Response, next: NextFunction) {
		await this.needOnlyChatIDMethod(this.service.getSettings, req, res, next);
    }
	public async setSetting(req: Request, res: Response, next: NextFunction) {
		await this.handleRequest(this.validateSetSettings(), this.service.setSetting.bind(this.service), { 
            chat: req.params.id, 
            type: req.body.type,
			setting: req.body.setting,
			value: req.body.value,
			user: req.body.user_id
        }, res, next);
    }
	public async getRoles(req: Request, res: Response, next: NextFunction) {
		await this.needOnlyChatIDMethod(this.service.getRoles, req, res, next);
    }
	private validateMemberStats() {
		return Joi.object({
            chat: Joi.alternatives().try(
				Joi.number().integer().min(2000000001).message("Chat ID should be a number starting from 2000000001"),
				Joi.string().min(3).message("Chat ID should be a string with at least 3 characters")
			).required().messages({
				'any.required': 'Chat ID is required'
			}),
			type: Joi.string().valid('peer_id', 'uid').required().messages({
				'any.only': "Type must be either 'peer_id' or 'uid'",
				'any.required': 'Type is required'
			}),
			user: Joi.number().integer().required().messages({
				'any.required': 'user ID is required'
			})
        });
    }

	private async needMemberInfo(method: Function, req: Request, res: Response, next: NextFunction)
	{
		await this.handleRequest(this.validateMemberStats(), method.bind(this.service), { 
			chat: req.params.chat, 
			user: req.params.user, 
			type: req.query.type 
		}, res, next);
	}

	public async getMemberStats(req: Request, res: Response, next: NextFunction) {
		await this.needMemberInfo(this.service.getMemberStats, req, res, next);
    }

	public async getMemberRights(req: Request, res: Response, next: NextFunction) {
		await this.needMemberInfo(this.service.getMemberRights, req, res, next);
    }
		
	public async leave(req: Request, res: Response, next: NextFunction) {
		await this.needMemberInfo(this.service.leaveChat, req, res, next);
	}

	private async needPunisher(method: Function, req: Request, res: Response, next: NextFunction) {
		await this.handleRequest(this.validateKick(), method.bind(this.service), { 
            chat: req.params.id, 
            type: req.body.type,
			user: req.body.user,
			punisher: req.body.punisher,
			reason: req.body.reason
        }, res, next);
	}

	private validateKick() {
		return Joi.object({
            chat: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required(),
        	punisher: Joi.number().integer().max(2000000000).required(),
			user: Joi.number().integer().max(2000000000).required(),
            reason: Joi.string(),
        });
    }
	
	public async kick(req: Request, res: Response, next: NextFunction) {
		await this.needPunisher(this.service.kickMember, req, res, next);
	}

}

export type Args<M extends keyof API> = Argsa[M];
export type Returns<M extends keyof API> = ReturnsArray[M];

type Params<M extends keyof API> = Parameters<API[M]>;
type Return<M extends keyof API> = ReturnType<API[M]>;

type Argsa = {
	[M in keyof API]: Params<M>[0] extends undefined ? {} : NonNullable<Params<M>[0]>;
}	
type ReturnsArray = {
	[M in keyof API]: Return<M> extends undefined ? {} : NonNullable<Return<M>>;
}	

export type AvatarURL = string;
export enum ChatIDType {
	peer = 'peer_id',
	uid = 'uid'
}
export type API = {
	getInfo(args: {chat: string|number; type: ChatIDType}): {uid: string; status: number; title: string; avatar: AvatarURL; messages: string; membersCount: number; bannedUsersCount: number;}
}


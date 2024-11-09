import { NextFunction, Request, Response } from 'express';
import { DB } from '../DB';
import { AbstractController } from './AbstractController';
import Joi from 'joi';
import { CommandRights } from '../utils/CommandRights';
import { Errors } from '../Exceptions';
import { VKAPI } from '../VK/API';
import { Logger, LogType } from '../Logger';
import { Phrases } from '../Phrases';
import { ChatService } from '../services/ChatService';




export class ChatController extends AbstractController
{
    constructor(private readonly service: ChatService)
    {
        super();
    }

	private validateInfo(req: Request) {
		const schema = Joi.object({
            id: Joi.alternatives().try(
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

        const { error, value } = schema.validate({ 
            id: req.params.id, 
            type: req.query.type 
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }
	private validateSetSettings(req: Request) {
		const schema = Joi.object({
            id: Joi.alternatives().try(
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
			user_id: Joi.number().integer().max(2000000000).required()
        });

        const { error, value } = schema.validate({ 
            id: req.params.id, 
            type: req.body.type,
			setting: req.body.setting,
			value: req.body.value,
			user_id: req.body.user_id
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }
	

	public async getInfo(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        const { id, type } = validationResult.value;

		try {
			const results = await this.service.getInfo(id, type);
			res.json(results);
		} catch(e) {
			next(e);
		}
    }

	public async getMembers(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type } = validationResult.value;
		
		try {
			const results = await this.service.getMembers(id, type);
			res.json(results);
		} catch(e) {
			next(e);
		}
    }

	public async getBannedUsers(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type } = validationResult.value;
		
		try {
			const results = await this.service.getBannedUsers(id, type);
			res.json(results);
		} catch(e) {
			next(e);
		}
		
    }
	public async getSettings(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type } = validationResult.value;
		
		try {
			const results = await this.service.getSettings(id, type);
			res.json(results);
		} catch(e) {
			next(e);
		}
		
    }
	public async setSetting(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateSetSettings(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type, setting, value, user_id } = validationResult.value;
		
		try {
			await this.service.setSetting(id, type, setting, value, user_id);
			res.json(true);
		} catch(e) {
			next(e);
		}
		
    }
	public async getRoles(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateInfo(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { id, type } = validationResult.value;
		
		try {
			const result = await this.service.getRoles(id, type);
			res.json(result);
		}
		catch(e) {
			next(e);
		}		
    }
	private validateMemberStats(req: Request) {
		const schema = Joi.object({
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
	
		const { error, value } = schema.validate({ 
			chat: req.params.chat, 
			user: req.params.user, 
			type: req.query.type 
		});
	
		if (error) {
			console.error("Validation error:", error.details[0].message);
			return { error: error.details[0].message };
		}
	
		return { value };
    }

	public async getMemberStats(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { chat, user, type } = validationResult.value;
		
		
		try {
			const result = await this.service.getMemberStats(chat, user, type);
			res.json(result);
		} catch(e) {
			next(e);
		}
    }

	public async getMemberRights(req: Request, res: Response, next: NextFunction) {
        const validationResult = this.validateMemberStats(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { chat, user, type } = validationResult.value;
		
		try {
			const result = await this.service.getMemberRights(chat, user, type);	
			res.json(result);
		} catch(e) {
			next(e);
		}

    }

	private buildChatQuery(baseQuery: string, type: string): string {
		if (type === "peer_id") {
			return baseQuery + "?";
		} else {
			return baseQuery + `
				(
					SELECT chat_id
					FROM chats
					WHERE chat_uid = ?
					LIMIT 1
				)
			`;
		}
	}


	private validateLeave(req: Request) {
		const schema = Joi.object({
            chat: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required(),
			user: Joi.number().integer().max(2000000000).required()
        });

        const { error, value } = schema.validate({ 
            chat: req.params.id, 
            type: req.body.type,
			user: req.body.user
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }
		
	public async leave(req: Request, res: Response, next: NextFunction) {
		const validationResult = this.validateLeave(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { chat, user, type } = validationResult.value;

		try {
			await this.service.leaveChat(chat, user, type);
			res.json(true);
		} catch(e) {
			next(e);
		}
	}

	private validateKick(req: Request) {
		const schema = Joi.object({
            chat: Joi.alternatives().try(
                Joi.number().integer().min(2000000001),
                Joi.string().min(3)
            ).required(),
            type: Joi.string().valid('peer_id', 'uid').required(),
        	punisher: Joi.number().integer().max(2000000000).required(),
			user: Joi.number().integer().max(2000000000).required(),
            reason: Joi.string(),
        });

        const { error, value } = schema.validate({ 
            chat: req.params.id, 
            type: req.body.type,
			user: req.body.user,
			punisher: req.body.punisher,
			reason: req.body.reason
        });

        if (error) {
            return { error: error.details[0].message };
        }

        return { value };
    }
	
	public async kick(req: Request, res: Response, next: NextFunction) {
		const validationResult = this.validateKick(req);

        if (validationResult.error) {
			next(new Errors.ParamsValidationError(validationResult.error));
			return;
        }

        let { chat, user, punisher, reason, type } = validationResult.value;

		try {
			await this.service.kickMember(chat, user, punisher, reason, type);
			res.json(true);
		} catch(e) {
			next(e);
		}

	}

}

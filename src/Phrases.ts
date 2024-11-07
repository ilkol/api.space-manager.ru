import { Sex } from "./controllers/ChatController";

export enum PhrasesList {
	userLeave,
	kickUser,
	banUser
}

export interface PhrasesParams {
    [PhrasesList.userLeave]: { user: string; gender: WordGender };
    [PhrasesList.kickUser]: { user: string; gender: WordGender; punisher: string; reason?: string};
	[PhrasesList.banUser]: { user: string; gender: WordGender; punisher: string; reason?: string};
}

const pharses = {
	[PhrasesList.userLeave]: "{user} покинул{gender} чат",
	[PhrasesList.kickUser]: "{punisher} исключил{gender} {user} из чата",
	[PhrasesList.banUser]: "{punisher} заблокировал{gender} {time} {user}",
};


const formatPhrase = <T extends PhrasesList>(phrase: T, params: PhrasesParams[T]) => {
	const template = pharses[phrase];
	const text = formatMessage(("reason" in params && params.reason) ? (template + `. Причина: ${params.reason}`) : template, params);
	return text;
};

const formatMessage = (phrase: string, params: Record<string, any>): string => {
	return phrase.replace(/{(\w+)}/g, (_, key) => {
		return params[key] !== undefined ? params[key] : `{${key}}`;
	});
}

type WordGender = ''|'а'|'о';

const getGenderLabel = (gender: Sex): WordGender => {
	switch(gender) {
		case Sex.club: return 'о';
		case Sex.male: return '';
		case Sex.female: return 'а';
	}
}

/**
 * Форматирование упоминание любым текстом
 * @param user id упоминаемого пользователя
 * @param label имя пользователя
 * @returns отформатированное упоминание
 */
const formatMentionName = (user: number, name: string): string => {
	return formatMentionLabel(user, user < 0 ? `Сообщество «${name}»` : name);
}
/**
 * Форматирование упоминание любым текстом
 * @param user id упоминаемого пользователя
 * @param label текст упоминания
 * @returns отформатированное упоминание
 */
const formatMentionLabel = (user: number, label: string): string => {
	return user < 0 ? `[club${(user * -1)}|${label}]` : `[id${user}|${label}]`;
}

export const Phrases = {
	f: formatPhrase,
	List: PhrasesList,
	getGenderLabel,
	formatMentionName,
	formatMentionLabel
};

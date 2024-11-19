import { DataSource, DataSourceOptions } from 'typeorm';
import { UserStatistic } from './Entities/UserStatistic';
import { Chat } from './Entities/Chat';
import { ChatMember } from './Entities/ChatMember';

export class DB {
    private connection: DataSource;

    constructor(connectData: DataSourceOptions) {
        this.connection = new DataSource({
            ...connectData,
            entities: [
                UserStatistic,
                ChatMember,
                Chat
            ]
        });
        this.connection.initialize()
        .then(() => {
            console.log('База данных успешно подключена!');
        })
        .catch((error) => {
            console.error('Ошибка подключения к базе данных:', error);
        });
    }

	/**
	 * Асинхронный запрос к базе данных
	 * @param query запрос
	 * @param params параметры для подстановки в запрос
	 * @returns результат при успешном выполнении и null при выброшенном исключении
	 */
    public async query(query: string, params?: any): Promise<any> {
        try {
            const results = await this.connection.query(query, params);
            return results;
        } catch (error) {
            console.error('Ошибка выполнения запроса:', error);
            return null;
        }
    }

    public get db(): DataSource {
        return this.connection;
    }
}
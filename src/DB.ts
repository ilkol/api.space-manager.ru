import mysql from 'mysql2/promise'; // Используем promise API

export class DB {
    private connection: mysql.Pool;

    constructor(connectData: mysql.PoolOptions) {
        this.connection = mysql.createPool(connectData);

        // Проверка подключения
        this.connection.getConnection()
            .then(() => {
                console.log('[Logs:Mysql] Успешное подключение к базе данных.');
            })
            .catch((err: any) => {
                console.error('[Logs:Mysql] Ошибка при подключении к базе данных:', err.message);
            });
    }

	/**
	 * Асинхронный запрос к базе данных
	 * @param query запрос
	 * @param params параметры для подстановки в запрос
	 * @returns результат при успешном выполнении и null при выброшенном исключении
	 */
    public async query(query: string, params?: any[]): Promise<mysql.QueryResult|null> {
        try {
            const [results] = await this.connection.query(query, params);
            return results;
        } catch (error) {
            console.error('Ошибка выполнения запроса:', error);
            return null;
        }
    }
}
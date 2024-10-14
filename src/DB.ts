import mysql from 'mysql';

export class DB
{
    private connection: mysql.Pool;

    constructor(connectData: mysql.PoolConfig)
    {
        this.connection = mysql.createPool(connectData)

        this.connection.getConnection(function(err: any) {
            if (err) {
            console.error('[Logs:Mysql] Ошибка при подключении к базе данных.');
            return true;
            }
            else console.log('[Logs:Mysql] Успешное подключение к базе данных.');
        });

    }

    public query(query: string)
    {
        this.connection.query(query, (error, results) => {
            if (error) {
              console.error('Ошибка выполнения запроса:', error.stack);
              return;
            }
            console.log('Результаты запроса:', results);
        });
    }

}
const monthNames = [
    'янв.',
    'февр.',
    'марта',
    'апр.', 
    'мая',
    'июня', 
    'июля',
    'авг.', 
    'сент.',
    'окт.', 
    'нояб.',
    'дек.'
]


export class CustomDate
{
    private static TIMEZONE_MOSCOW = 3;

    constructor(private date: Date, private timezone = CustomDate.TIMEZONE_MOSCOW)
    {
        this.updateTimeZone();
    }

    public getFormatedGMTDate()
    {
        

        const
            day = this.date.getDate(),
            month = this.getMonthName(this.date.getMonth()),
            year = this.date.getFullYear(),
            hours = this.date.getHours(),
            minutes = this.date.getMinutes(),
            timeZoneStr = this.getTimeZoneString()
        ;
        
        return `${day} ${month} ${year}, ${hours}:${minutes} ${timeZoneStr}`;
    }
    private  updateTimeZone(): void
    {
        this.date.setSeconds(this.date.getSeconds() + 3600 * (this.timezone - CustomDate.TIMEZONE_MOSCOW));
    }

    private getTimeZoneString(): string
    {
        return `GMT${this.timezone > 0 ? ('+' + this.timezone) : this.timezone}`;
    }
    private getMonthName(month: number): string
    {
        return monthNames[month];
    }

}
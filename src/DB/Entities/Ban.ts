import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('banlist')
export class Ban
{
    @PrimaryColumn()
    chat_id!: number;
    @PrimaryColumn()
    user_id!: number;
    
    @Column()
    admin_id!: number;

    @Column()
    unban_time!: number;
    @Column()
    ban_time!: number;
    @Column({
        length: 128
    })
    reason!: string;

}
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('usersStatistics')
export class UserStatistic
{
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Column()
    chat_id!: number;

    @Column()
    user_id!: number;

    @Column()
    message_id!: number;
    
    @Column()
    time!: number;

    @Column()
    smilies!: number;
    @Column()
    stickers!: number;
    @Column()
    reply!: number;
    @Column()
    reposts!: number;
    @Column()
    audio!: number;
    @Column()
    photo!: number;
    @Column()
    video!: number;
    @Column()
    files!: number;
    @Column()
    mats!: number;
    @Column()
    deleted!: number;
}
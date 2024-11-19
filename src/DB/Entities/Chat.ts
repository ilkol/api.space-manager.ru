import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('chats')
export class Chat
{
    @PrimaryGeneratedColumn()
    chat_id!: number;

    @Column({
        length: 32
    })
    chat_uid!: string;
    @Column()
    status!: number;
    @Column({
        length: 256
    })
    title!: string;
    @Column()
    messages!: number;
    @Column()
    smiles!: number;
    @Column()
    stickers!: number;
    @Column()
    reply!: number;
    @Column()
    pin_message!: number;
    @Column()
    reposts!: number;
    @Column()
    audio!: number;
    @Column()
    motd_owner!: number;
    @Column()
    motd_message!: number;
    @Column()
    rules_owner!: number;
    @Column()
    rules_message!: number;
    @Column()
    photo!: number;
    @Column()
    video!: number;
    @Column()
    files!: number;
    @Column()
    protection!: number;
    @Column()
    warnlimit!: number;
    @Column({
        length: 128
    })
    warncommand!: string;
    @Column()
    mats!: number;
    @Column()
    timezone!: number;
    @Column({
        length: 128
    })
    mutecommand!: string;
    @Column()
    iviterole!: number;
    @Column({
        length: 512
    })
    photo_link!: string;

}
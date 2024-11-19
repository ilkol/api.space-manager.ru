import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { ChatMember } from "./ChatMember";

@Entity('nicks')
export class Nick
{
    @PrimaryColumn()
    chat_id!: number;
    @PrimaryColumn()
    user_id!: number;

    @Column({
        length: 32
    })
    nick!: string;

    @OneToOne(() => ChatMember, (chatMember) => chatMember.nick)
    @JoinColumn([ { name: 'chat_id' }, { name: 'user_id' } ])
    user!: ChatMember;
}
import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from "typeorm";
import { ChatMember } from "./ChatMember";

@Entity('roles')
export class Role
{
    @PrimaryColumn()
    chat_id!: number;

    @PrimaryColumn()
    level!: number;

    @Column({
        length: 32
    })
    name!: string;

    @Column({
        length: 16
    })
    emoji!: string;

    @OneToMany(() => ChatMember, (chatMember) => chatMember.role)   
    @JoinColumn([
        {name: "chat_id"},
        {name: "level"}
    ]) 
    users!: ChatMember[];
}
import { Column, Entity, IsNull, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { Chat } from "./Chat";
import { Role } from "./Role";
import { Nick } from "./Nick";

@Entity('users')
export class ChatMember
{
    @PrimaryColumn()
    user_id!: number;

    @PrimaryColumn()
    chat_id!: number;
    

    @Column({
        name: 'role'
    })
    roleLevel!: number;

    @Column()
    messages!: number;
    
    @Column()
    last_message!: number;
    
    @Column()
    warns!: number;
    @Column()
    mute!: number;
    @Column()
    smilies!: number;
    @Column()
    stickers!: number;
    @Column()
    reply!: number;
    @Column()
    togglenotify!: number;
    @Column()
    in_chat!: number;
    @Column()
    protection_time!: number;
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
    join_date!: number;
    @Column({
        length: 160
    })
    muteinfo!: string;
    @Column()
    mats!: number;
    @Column({
        nullable: true
    })
    immunity!: number;
    @Column()
    invited_by!: number;
    @Column()
    seeMotd!: number;


    @ManyToOne(() => Chat, (chat) => chat.users)
    @JoinColumn({ name: 'chat_id' })
    chat!: Chat;

    @ManyToOne(() => Role, (role) => role.users)
    @JoinColumn([
        { name: 'chat_id', referencedColumnName: 'chat_id' },
        { name: 'role', referencedColumnName: 'level' },
    ])
    role!: Role;

    @OneToOne(() => Nick, (nick) => nick.user)
    @JoinColumn([{ name: 'chat_id' }, { name: 'user_id' }])
    nick!: Nick;
}
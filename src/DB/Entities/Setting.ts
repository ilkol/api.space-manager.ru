import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('settings')
export class Setting
{
    @PrimaryColumn()
    chat_id!: number;

    @Column()
    togglefeed!: boolean;
    @Column()
    kickmenu!: boolean;
    @Column()
    leavemenu!: boolean;
    @Column()
    hideusers!: boolean;
    @Column()
    nameType!: boolean;
    @Column()
    unPunishNotify!: boolean;
    @Column()
    unRoleAfterKick!: boolean;
    @Column()
    autounban!: boolean;
    @Column()
    roleLevelStats!: boolean;
    @Column()
    muteType!: boolean;
    @Column()
    si_messages!: boolean;
    @Column()
    si_smilies!: boolean;
    @Column()
    si_stickers!: boolean;
    @Column()
    si_reply!: boolean;
    @Column()
    si_photo!: boolean;
    @Column()
    si_video!: boolean;
    @Column()
    si_files!: boolean;
    @Column()
    si_audio!: boolean;
    @Column()
    si_reposts!: boolean;
    @Column()
    si_mats!: boolean;
}
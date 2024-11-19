import { Column, Entity, PrimaryColumn } from "typeorm";

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
}
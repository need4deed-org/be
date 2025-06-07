import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Avatar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  avatarType: string;

  @Column()
  scrambledPic: string;
}

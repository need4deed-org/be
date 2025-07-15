import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import ProfileSkill from "../m2m/profile-skill";

@Entity()
export default class Skill {
  constructor(title: string) {
    this.title = title;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(() => ProfileSkill, (profileSkill) => profileSkill.skill)
  profileSkill: ProfileSkill[];
}

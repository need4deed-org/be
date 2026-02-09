import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { TranslatedIntoType } from "need4deed-sdk";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Profile from "../profile/profile.entity";

@Entity()
export default class Accompanying {
  constructor(accompanying?: Partial<Accompanying>) {
    if (accompanying) {
      Object.assign(this, accompanying);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString()
  address: string;

  @Column()
  @IsString()
  name: string;

  @Column()
  @IsString()
  @IsOptional()
  phone?: string;

  @Column()
  @IsString()
  @IsOptional()
  email?: string;

  @Column({ type: "timestamptz" })
  @IsDate()
  date: Date;

  @Column({ type: "enum", enum: TranslatedIntoType, nullable: true })
  @IsOptional()
  @IsEnum(TranslatedIntoType)
  languageToTranslate: TranslatedIntoType;

  @OneToMany(() => Profile, (profile) => profile.accompanying)
  profile: Profile;
}

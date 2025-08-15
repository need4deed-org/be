import { LangProficiency } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Language from "../profile/language.entity";
import Profile from "../profile/profile.entity";

@Entity()
export default class ProfileLanguage {
  constructor(profileLanguage?: Partial<ProfileLanguage>) {
    if (profileLanguage) {
      Object.assign(this, profileLanguage);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
    type: "enum",
    enum: LangProficiency,
    default: LangProficiency.ADVANCED,
  })
  proficiency: LangProficiency;

  @ManyToOne(() => Profile, (profile) => profile.profileLanguage, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;

  @Column()
  profileId: number;

  @ManyToOne(() => Language, (language) => language.profileLanguage, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "language_id" })
  language: Language;

  @Column()
  languageId: number;
}

import { IsOptional, IsString } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import ProfileActivity from "../m2m/profile-activity";
import ProfileLanguage from "../m2m/profile-language";
import ProfileSkill from "../m2m/profile-skill";
import Category from "./category.entity";

@Entity()
export default class Profile {
  constructor(profile?: Partial<Profile>) {
    if (profile) {
      Object.assign(this, profile);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsOptional()
  @IsString()
  info: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ nullable: true })
  categoryId: number;

  @OneToMany(
    () => ProfileActivity,
    (profileActivity) => profileActivity.profile,
  )
  profileActivity: ProfileActivity[];

  @OneToMany(() => ProfileSkill, (profileSkill) => profileSkill.profile)
  profileSkill: ProfileActivity[];

  @OneToMany(
    () => ProfileLanguage,
    (profileLanguage) => profileLanguage.profile,
  )
  profileLanguage: ProfileLanguage[];
}

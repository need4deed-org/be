import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProfileVolunteeringType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Deal from "../deal.entity";
import ProfileActivity from "../m2m/profile-activity";
import ProfileLanguage from "../m2m/profile-language";
import ProfileSkill from "../m2m/profile-skill";
import Accompanying from "../opportunity/accompanying.entity";
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

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info?: string;

  @Column({ type: "enum", enum: ProfileVolunteeringType, nullable: true })
  @IsOptional()
  @IsEnum(ProfileVolunteeringType)
  volunteeringType?: ProfileVolunteeringType;

  @ManyToOne(() => Accompanying, (accompanying) => accompanying.profile, {
    nullable: true,
  })
  @JoinColumn({ name: "accompanying_id" })
  accompanying?: Accompanying;

  @Column({ nullable: true })
  accompanyingId: number;

  @ManyToOne(() => Category, (category) => category.profile, {
    nullable: true,
  })
  @JoinColumn({ name: "category_id" })
  category?: Category;

  @Column({ nullable: true })
  categoryId: number;

  @OneToMany(
    () => ProfileActivity,
    (profileActivity) => profileActivity.profile,
  )
  profileActivity: ProfileActivity[];

  @OneToMany(() => ProfileSkill, (profileSkill) => profileSkill.profile)
  profileSkill: ProfileSkill[];

  @OneToMany(
    () => ProfileLanguage,
    (profileLanguage) => profileLanguage.profile,
  )
  profileLanguage: ProfileLanguage[];

  @OneToMany(() => Deal, (deal) => deal.profile)
  deal: Deal[];
}

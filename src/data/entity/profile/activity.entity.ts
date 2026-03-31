import { IsNotEmpty, IsString, Length } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import ProfileActivity from "../m2m/profile-activity";
import Category from "./category.entity";

@Entity()
export default class Activity {
  constructor(activity?: Partial<Activity>) {
    if (activity) {
      Object.assign(this, activity);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @ManyToOne(() => Category, (category) => category.activities, {
    nullable: true,
  })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ nullable: true })
  categoryId: number;

  @OneToMany(
    () => ProfileActivity,
    (profileActivity) => profileActivity.activity,
  )
  profileActivity: ProfileActivity[];

  translation: string;
}

import { IsNotEmpty, IsString, Length } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import DealActivity from "../m2m/deal-activity";
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

  @OneToMany(() => DealActivity, (dealActivity) => dealActivity.activity)
  dealActivity: DealActivity[];

  translation: string;
}

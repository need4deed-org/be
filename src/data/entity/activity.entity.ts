import { IsNotEmpty, IsString, Length } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Category from "./category.entity";

@Entity()
export default class Activity {
  constructor(title: string) {
    this.title = title;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
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
}

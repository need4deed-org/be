import { IsOptional, IsString } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
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
}

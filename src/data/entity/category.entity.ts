import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Activity from "./activity.entity";

@Entity()
export default class Category {
  constructor(category?: Partial<Category>) {
    if (category) {
      Object.assign(this, category);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(512)
  description: string;

  @OneToMany(() => Activity, (activity) => activity.category)
  activities: Activity[];
}

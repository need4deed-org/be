import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import Activity from "./activity.entity";
import Profile from "./profile.entity";

@Entity()
export default class Category {
  constructor(category?: Partial<Category>) {
    if (category) {
      Object.assign(this, category);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(() => Activity, (activity) => activity.category)
  activities: Activity[];

  @OneToMany(() => Profile, (profile) => profile.category)
  profile: Profile[];
}

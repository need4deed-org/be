import { IsNotEmpty, IsNumber, IsString, Length } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class LeadFrom {
  constructor(lead?: Partial<LeadFrom>) {
    if (lead) {
      Object.assign(this, lead);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  @IsNotEmpty()
  @IsNumber()
  count: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;
}

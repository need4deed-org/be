import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Language {
  constructor(isoCode: string, title: string) {
    this.isoCode = isoCode;
    this.title = title;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(2, 3)
  isoCode: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;
}

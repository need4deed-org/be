import { IsEnum } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TranslationEntityType } from "../types";

@Entity()
export default class Option {
  constructor(option?: Partial<Option>) {
    if (option) {
      Object.assign(this, option);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: TranslationEntityType })
  @IsEnum(TranslationEntityType)
  itemType: TranslationEntityType;

  @Column()
  itemId: number;
}

import { IsEnum } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EntityTableName } from "../types";

@Entity()
export default class Option {
  constructor(option?: Partial<Option>) {
    if (option) {
      Object.assign(this, option);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: EntityTableName })
  @IsEnum(EntityTableName)
  itemType: EntityTableName;

  @Column()
  itemId: number;
}

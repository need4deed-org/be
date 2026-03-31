import { IsEnum } from "class-validator";
import { EntityTableName } from "need4deed-sdk";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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

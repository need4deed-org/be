import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { EntityTableName } from "need4deed-sdk";
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(["hostNid", "tenantNid"])
export default class NotionRelation {
  constructor(notionRelation?: Partial<NotionRelation>) {
    if (notionRelation) {
      Object.assign(this, notionRelation);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  payroll: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  hostNid: string;

  @Column({
    type: "enum",
    enum: EntityTableName,
  })
  @IsNotEmpty()
  @IsEnum(EntityTableName)
  hostType: EntityTableName;

  @Column()
  @IsNotEmpty()
  @IsInt()
  hostId: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  tenantNid: string;

  @Column({
    type: "enum",
    enum: EntityTableName,
  })
  @IsNotEmpty()
  @IsEnum(EntityTableName)
  tenantType: EntityTableName;

  @Column({ nullable: true })
  @IsOptional()
  @IsInt()
  tenantId?: number;
}

import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EntityTableName, TimedTextType } from "need4deed-sdk";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
@Index(["targetEntityType", "targetEntityId", "timestamp"], {
  unique: true,
})
export default class Timeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: EntityTableName, nullable: true })
  @IsOptional()
  @IsEnum(EntityTableName)
  sourceEntityType: EntityTableName;

  @Column({ nullable: true })
  @IsOptional()
  sourceEntityId: number;

  @Column({ type: "enum", enum: EntityTableName })
  @IsNotEmpty()
  @IsEnum(EntityTableName)
  targetEntityType: EntityTableName;

  @Column()
  @IsNotEmpty()
  targetEntityId: number;

  @Column({ type: "enum", enum: EntityTableName })
  @IsNotEmpty()
  @IsEnum(EntityTableName)
  contentEntityType: EntityTableName;

  @Column()
  @IsNotEmpty()
  contentEntityId: number;

  @Column({ type: "enum", enum: TimedTextType })
  @IsNotEmpty()
  @IsEnum(TimedTextType)
  contentType: TimedTextType;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  content: string;
}

import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { EntityTableName } from "need4deed-sdk";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
@Index(["entityType", "entityId", "timestamp", "fieldName"], {
  unique: true,
})
export default class Timeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  entityType: EntityTableName;

  @Column()
  @IsNotEmpty()
  entityId: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  fieldName: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  @Column({ type: "text" })
  @IsNotEmpty()
  @IsString()
  info: string;
}

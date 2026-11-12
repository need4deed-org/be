import { IsNotEmpty, IsString } from "class-validator";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import User from "./user.entity";

@Entity()
export default class ApiKey {
  constructor(apiKey?: Partial<ApiKey>) {
    if (apiKey) {
      Object.assign(this, apiKey);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  @IsNotEmpty()
  @IsString()
  label: string;

  @Index({ unique: true })
  @Column()
  @IsNotEmpty()
  @IsString()
  keyHash: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  userId: number;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

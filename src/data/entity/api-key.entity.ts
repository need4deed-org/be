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

// Direct (non-login) API access for bot/automation consumers. Each key is
// tied to a dedicated service User (role fixed at coordinator, no Person
// attached) so the existing role-based authenticate() checks apply unchanged.
// No self-service endpoints yet — minted/revoked via CLI (see
// src/data/scripts/create-api-key.ts, revoke-api-key.ts).
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

  @Column()
  @IsNotEmpty()
  @IsString()
  keyHash: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  userId: number;

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

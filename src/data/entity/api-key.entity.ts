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
// tied to a dedicated service User minted with one of admin/coordinator/agent
// as its role, so the existing role-based authenticate() checks apply
// unchanged. An agent-role service user also gets a Person + AgentPerson
// membership (see create-api-key.ts) since agent-scoped write routes check
// membership, not just role.
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

  // SHA-256 hex digest of the raw key (see data/utils/hash-token.ts), not
  // bcrypt: the raw key is a high-entropy random token, not a human
  // password, so a fast deterministic hash is safe here and lets
  // authenticate() resolve a key via an indexed exact match instead of a
  // linear bcrypt.compare scan over every active key.
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

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

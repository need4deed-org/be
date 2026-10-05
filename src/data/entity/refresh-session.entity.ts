import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import User from "./user.entity";

// Server-side rotation state for refresh tokens (be#1073). One row per
// login — a "token family": every refresh token issued from that login
// carries the row's id as `sid` and a per-issue `jti`. Only the token whose
// jti is currentJti may rotate; presenting any older one revokes the whole
// family (see server/utils/data/refresh-session.ts). Sessions on different
// devices are separate rows and rotate independently.
@Entity()
export default class RefreshSession {
  constructor(session?: Partial<RefreshSession>) {
    if (session) {
      Object.assign(this, session);
    }
  }

  @PrimaryColumn({ type: "uuid" })
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Index()
  @Column()
  userId: number;

  @Column({ type: "uuid" })
  currentJti: string;

  // The jti rotated away from most recently, still honoured for a short
  // grace window so concurrent refreshes from the same browser (several
  // tabs sharing one cookie) don't look like token theft.
  @Column({ type: "uuid", nullable: true })
  previousJti: string | null;

  @Column({ type: "timestamp", nullable: true })
  rotatedAt: Date | null;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

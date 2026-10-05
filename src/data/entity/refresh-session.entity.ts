import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import User from "./user.entity";

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

  // Honoured briefly so tabs sharing one cookie can refresh concurrently.
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

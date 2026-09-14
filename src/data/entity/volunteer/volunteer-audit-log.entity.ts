import { VolunteerAuditLogType as SdkVolunteerAuditLogType } from "need4deed-sdk";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import User from "../user.entity";
import Volunteer from "./volunteer.entity";

// Distinct from ../m2m/activity-log.entity.ts (ActivityLog), which is an
// hours-worked ledger per opportunity-volunteer pairing — a different
// feature that happens to share a name (be#919). This one is a read-only
// audit trail of things that changed on a volunteer's record.
//
// Kept as its own string-literal union (rather than the SDK's TS enum
// directly) so plain string literals stay assignable at the write-hook call
// sites without casts. The assertion below fails to compile if this drifts
// from the SDK's VolunteerAuditLogType (be#984).
export const VOLUNTEER_AUDIT_LOG_TYPES = [
  "contact_details_changed",
  "availability_changed",
  "opportunity_status_changed",
] as const;
export type VolunteerAuditLogType = (typeof VOLUNTEER_AUDIT_LOG_TYPES)[number];

type AssertSameStringValues<A extends string, B extends string> = [A] extends [
  B,
]
  ? [B] extends [A]
    ? true
    : never
  : never;
type _AuditLogTypeInSyncWithSdk = AssertSameStringValues<
  VolunteerAuditLogType,
  `${SdkVolunteerAuditLogType}`
>;

@Entity()
export default class VolunteerAuditLog {
  constructor(partial?: Partial<VolunteerAuditLog>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Volunteer, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Index()
  @Column()
  volunteerId: number;

  @Column({ type: "varchar" })
  type: VolunteerAuditLogType;

  // Human-readable, pre-rendered description (e.g. "Status changed from
  // Active to Temporarily unavailable") rather than structured before/after
  // values — this is a read-only trail, not something the fe needs to
  // reconstruct diffs from.
  @Column({ type: "text" })
  detail: string;

  // Who made the change. Nullable + SET NULL (not CASCADE): deleting the
  // acting user's account must not silently erase the volunteer's audit
  // history, unlike Appreciation/Comment rows that belong to that user.
  @ManyToOne(() => User, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "actor_user_id" })
  actorUser?: User;

  @Column({ nullable: true })
  actorUserId?: number;

  @Column({ type: "timestamp" })
  occurredAt: Date;
}

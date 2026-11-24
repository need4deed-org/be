import { OpportunityAuditLogType as SdkOpportunityAuditLogType } from "need4deed-sdk";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AssertSameStringValues } from "../../lib/assert-same-string-values";
import User from "../user.entity";
import Opportunity from "./opportunity.entity";

export const OPPORTUNITY_AUDIT_LOG_TYPES = [
  "status-changed",
  "details-changed",
  "contact-changed",
  "ngo-changed",
  "match-changed",
] as const;
export type OpportunityAuditLogType =
  (typeof OPPORTUNITY_AUDIT_LOG_TYPES)[number];

type _AuditLogTypeInSyncWithSdk = AssertSameStringValues<
  OpportunityAuditLogType,
  `${SdkOpportunityAuditLogType}`
>;

@Entity()
export default class OpportunityAuditLog {
  constructor(partial?: Partial<OpportunityAuditLog>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Opportunity, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunity_id" })
  opportunity: Opportunity;

  @Index()
  @Column()
  opportunityId: number;

  @Column({ type: "varchar" })
  type: OpportunityAuditLogType;

  @Column({ type: "text" })
  detail: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "actor_user_id" })
  actorUser?: User;

  @Column({ nullable: true })
  actorUserId?: number;

  @Column({ type: "timestamptz" })
  occurredAt: Date;
}

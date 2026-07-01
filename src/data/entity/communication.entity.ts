import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Agent from "./opportunity/agent.entity";
import Opportunity from "./opportunity/opportunity.entity";
import User from "./user.entity";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
@Check(`
  (CASE WHEN "volunteer_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "agent_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "opportunity_id" IS NOT NULL THEN 1 ELSE 0 END) >= 1
`)
export default class Communication {
  constructor(communication?: Partial<Communication>) {
    if (communication) {
      Object.assign(this, communication);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ContactType })
  contactType: ContactType;

  @Column({ type: "enum", enum: ContactMethodType })
  contactMethod: ContactMethodType;

  @Column({ type: "enum", enum: CommunicationType, nullable: true })
  communicationType?: CommunicationType;

  @CreateDateColumn()
  date: Date;

  @ManyToOne(() => Volunteer, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer?: Volunteer;

  @Column({ nullable: true })
  volunteerId?: number;

  @ManyToOne(() => Agent, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent?: Agent;

  @Column({ nullable: true })
  agentId?: number;

  @ManyToOne(() => Opportunity, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "opportunity_id" })
  opportunity?: Opportunity;

  @Column({ nullable: true })
  opportunityId?: number;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ nullable: true })
  userId?: number;
}

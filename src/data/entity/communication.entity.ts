import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Agent from "./opportunity/agent.entity";
import User from "./user.entity";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
@Check(`
  (CASE WHEN "volunteer_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "agent_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
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

  @Column({ type: "timestamp" })
  date: Date;

  @ManyToOne(() => Volunteer, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Column({ nullable: true })
  volunteerId: number;

  @ManyToOne(() => Agent, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column({ nullable: true })
  agentId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  userId: number;
}

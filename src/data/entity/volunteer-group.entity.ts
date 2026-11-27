import { IsNotEmpty, IsString } from "class-validator";
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
import Organization from "./organization.entity";

@Entity()
@Check(`("organization_id" IS NULL) <> ("agent_id" IS NULL)`)
export default class VolunteerGroup {
  constructor(group?: Partial<VolunteerGroup>) {
    if (group) {
      Object.assign(this, group);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization | null;

  @Column({ type: "integer", nullable: true, unique: true })
  organizationId: number | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "agent_id" })
  agent: Agent | null;

  @Column({ type: "integer", nullable: true, unique: true })
  agentId: number | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}

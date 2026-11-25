import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import Agent from "../opportunity/agent.entity";
import Volunteer from "./volunteer.entity";

@Entity()
export default class VolunteerAgentLink {
  constructor(link?: Partial<VolunteerAgentLink>) {
    if (link) {
      Object.assign(this, link);
    }
  }

  @PrimaryColumn()
  volunteerId: number;

  @Index("IDX_volunteer_agent_link_agent")
  @PrimaryColumn()
  agentId: number;

  @ManyToOne(() => Volunteer, { onDelete: "CASCADE" })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @ManyToOne(() => Agent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}

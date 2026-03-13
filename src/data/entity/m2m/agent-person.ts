import { AgentRoleType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Agent from "../opportunity/agent.entity";
import Person from "../person.entity";

@Entity()
export default class AgentPerson {
  constructor(agentPerson?: Partial<AgentPerson>) {
    if (agentPerson) {
      Object.assign(this, agentPerson);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: AgentRoleType,
    default: AgentRoleType.OTHER,
  })
  role: AgentRoleType;

  @ManyToOne(() => Agent, (agent) => agent.agentPerson, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column()
  agentId: number;

  @ManyToOne(() => Person, (person) => person.agentPerson, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column()
  personId: number;
}

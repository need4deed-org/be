import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import Postcode from "../location/postcode.entity";
import Agent from "../opportunity/agent.entity";

@Entity()
export default class AgentPostcode {
  constructor(agentPostcode?: Partial<AgentPostcode>) {
    if (agentPostcode) {
      Object.assign(this, agentPostcode);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Agent, (agent) => agent.agentPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column()
  agentId: number;

  @ManyToOne(() => Postcode, (postcode) => postcode.districtPostcode, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column()
  postcodeId: number;
}

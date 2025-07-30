import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Opportunity from "./opportunity.entity";

@Entity()
export default class Agent {
  constructor(agent?: Partial<Agent>) {
    if (agent) {
      Object.assign(this, agent);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.agent)
  opportunity: Opportunity[];
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Organization from "../organization.entity";
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

  @ManyToOne(() => Organization, (organization) => organization.agent, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  organization: Organization;

  @Column()
  organizationId: number;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.agent)
  opportunity: Opportunity[];
}

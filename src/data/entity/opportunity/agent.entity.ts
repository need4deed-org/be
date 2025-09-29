import { IsEnum } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AgentOperatorType, AgentType } from "../../types";
import Postcode from "../location/postcode.entity";
import AgentPostcode from "../m2m/agent-postcode";
import Person from "../person.entity";
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

  @Column({ unique: true })
  title: string;

  @Column({
    type: "enum",
    enum: AgentType,
    nullable: false,
    default: AgentType.RAC,
  })
  @IsEnum(AgentType)
  type: AgentType;

  @Column()
  operatorType: AgentOperatorType;

  @Column()
  operatorId: number;

  @ManyToOne(() => Person)
  @JoinColumn({ name: "person_id" })
  representative: Person;

  @Column({ nullable: true })
  personId: number;

  @ManyToOne(() => Postcode)
  @JoinColumn({ name: "postcode_id" })
  postcode: Postcode;

  @Column({ nullable: true })
  postcodeId: number;

  @OneToMany(() => AgentPostcode, (agentPostcode) => agentPostcode.agent)
  agentPostcode: AgentPostcode[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.agent)
  opportunity: Opportunity[];
}

import { IsEnum } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AgentOperatorType, AgentType } from "../../types";
import AgentPostcode from "../m2m/agent-postcode";
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

  @Column()
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

  @OneToMany(() => AgentPostcode, (agentPostcode) => agentPostcode.agent)
  agentPostcode: AgentPostcode[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.agent)
  opportunity: Opportunity[];
}

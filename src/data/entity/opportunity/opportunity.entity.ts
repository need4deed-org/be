import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { OpportunityType } from "../../types";
import Deal from "../deal.entity";
import Agent from "./agent.entity";

@Entity()
export default class Opportunity {
  constructor(opportunity?: Partial<Opportunity>) {
    if (opportunity) {
      Object.assign(this, opportunity);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: OpportunityType,
    nullable: false,
  })
  @IsEnum(OpportunityType)
  type: OpportunityType;

  @Column()
  @IsOptional()
  @IsString()
  info: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column({ nullable: true })
  dealId: number;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: "agent_id" })
  agent: Agent;

  @Column({ nullable: true })
  agentId: number;
}

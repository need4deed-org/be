import { IsEnum, IsOptional, IsString } from "class-validator";
import { OpportunityType, TranslatedIntoType } from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Deal from "../deal.entity";
import OpportunityVolunteer from "../m2m/opportunity-volunteer";
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

  @Column()
  @IsString()
  title: string;

  @Column({
    type: "enum",
    enum: OpportunityType,
    nullable: false,
  })
  @IsEnum(OpportunityType)
  type: OpportunityType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  info?: string;

  @Column({
    type: "enum",
    enum: TranslatedIntoType,
    nullable: true,
  })
  @IsEnum(TranslatedIntoType)
  translationType: TranslatedIntoType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  infoConfidential?: string;

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

  @OneToMany(
    () => OpportunityVolunteer,
    (opportunityVolunteer) => opportunityVolunteer.opportunity,
  )
  opportunityVolunteer: OpportunityVolunteer[];
}

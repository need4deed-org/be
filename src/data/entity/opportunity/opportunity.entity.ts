import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import {
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityType,
  TranslatedIntoType,
} from "need4deed-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import Deal from "../deal.entity";
import OpportunityVolunteer from "../m2m/opportunity-volunteer";
import Appreciation from "../volunteer/appreciation.entity";
import Accompanying from "./accompanying.entity";
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

  @Column({
    type: "enum",
    enum: OpportunityStatusType,
    default: OpportunityStatusType.NEW,
  })
  @IsEnum(OpportunityStatusType)
  status: OpportunityStatusType;

  @Column({
    type: "enum",
    enum: OpportunityMatchStatusType,
    default: OpportunityMatchStatusType.NO_MATCHES,
  })
  @IsEnum(OpportunityMatchStatusType)
  statusMatch: OpportunityMatchStatusType;

  @Column({ default: 1 })
  @IsInt()
  numberVolunteers: number;

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

  @Column({
    type: "enum",
    enum: OpportunityMatchStatusType,
    default: OpportunityMatchStatusType.NO_MATCHES,
  })
  @IsEnum(OpportunityMatchStatusType)
  statusMatch: OpportunityMatchStatusType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  infoConfidential?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Accompanying, (accompanying) => accompanying.opportunity, {
    nullable: true,
  })
  @JoinColumn({ name: "accompanying_id" })
  accompanying?: Accompanying;

  @Column({ nullable: true })
  accompanyingId: number;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column({ nullable: true })
  dealId: number;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: "agent_id" })
  agent?: Agent;

  @Column({ nullable: true })
  agentId: number;

  @OneToMany(
    () => OpportunityVolunteer,
    (opportunityVolunteer) => opportunityVolunteer.opportunity,
  )
  opportunityVolunteer: OpportunityVolunteer[];

  @OneToMany(() => Appreciation, (appreciation) => appreciation.opportunity)
  appreciations: Appreciation[];

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  nid?: string;
}

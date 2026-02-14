import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import {
  AgentOperatorType,
  AgentServiceType,
  AgentTrustType,
  AgentType,
  AgentVolunteerSearchType,
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

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Column({
    type: "enum",
    enum: AgentType,
    nullable: false,
    default: AgentType.RAC,
  })
  @IsEnum(AgentType)
  type: AgentType;

  @Column({
    type: "enum",
    enum: AgentTrustType,
    default: AgentTrustType.UNKNOWN,
  })
  trustLevel: AgentTrustType;

  @Column({
    type: "enum",
    enum: AgentVolunteerSearchType,
    default: AgentVolunteerSearchType.NOT_NEEDED,
  })
  searchStatus: AgentVolunteerSearchType;

  @Column({
    type: "text",
    array: true,
    transformer: {
      to: (value: AgentServiceType[]) => value,
      from: (value: unknown) => value as AgentServiceType[],
    },
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AgentServiceType, { each: true })
  services: AgentServiceType[];

  @Column({
    type: "enum",
    enum: AgentOperatorType,
    default: AgentOperatorType.ORGANIZATION,
  })
  operatorType: AgentOperatorType;

  @Column()
  operatorId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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

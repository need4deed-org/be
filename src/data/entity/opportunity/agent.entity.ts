import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import {
  AgentEngagementStatusType,
  AgentRoleType,
  AgentServiceType,
  AgentTrustType,
  AgentType,
  AgentVolunteerSearchType,
  OpportunityVolunteerStatusType,
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
import Address from "../location/address.entity";
import District from "../location/district.entity";
import AgentLanguage from "../m2m/agent-language";
import AgentPerson from "../m2m/agent-person";
import AgentPostcode from "../m2m/agent-postcode";
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

  @Column({ unique: true })
  title: string;

  @Column({ nullable: true })
  info?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Column({
    type: "enum",
    enum: AgentType,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

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
    type: "enum",
    enum: AgentEngagementStatusType,
    default: AgentEngagementStatusType.NEW,
  })
  engagementStatus: AgentEngagementStatusType;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ nullable: true })
  organizationId: number;

  @ManyToOne(() => Address)
  @JoinColumn({ name: "address_id" })
  address: Address;

  @Column({ nullable: true })
  addressId: number;

  @ManyToOne(() => District)
  @JoinColumn({ name: "district_id" })
  district: District;

  @Column({ nullable: true })
  districtId: number;

  @OneToMany(() => AgentPostcode, (agentPostcode) => agentPostcode.agent)
  agentPostcode: AgentPostcode[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.agent)
  opportunity: Opportunity[];

  @OneToMany(() => AgentPerson, (agentPerson) => agentPerson.agent)
  agentPerson: AgentPerson[];

  @OneToMany(() => AgentLanguage, (agentLanguage) => agentLanguage.agent)
  agentLanguage: AgentLanguage[];

  get representative(): AgentPerson {
    let representative = this.agentPerson?.find(
      ({ role }) => role === AgentRoleType.VOLUNTEER_COORDINATOR,
    );
    if (!representative) {
      representative = this.agentPerson?.[0];
    }
    return representative;
  }

  get activeVolunteers(): number {
    return this.opportunity.reduce((numVolunteers, opportunity) => {
      return (
        numVolunteers +
        opportunity.opportunityVolunteer.reduce(
          (activeVolunteers, opportunityVolunteer) => {
            return (
              activeVolunteers +
              (opportunityVolunteer.status ===
              OpportunityVolunteerStatusType.ACTIVE
                ? 1
                : 0)
            );
          },
          0,
        )
      );
    }, 0);
  }
}

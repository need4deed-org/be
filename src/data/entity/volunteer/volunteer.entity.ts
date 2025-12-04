import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  DocumentStatusType,
  VolunteerStateAppreciationType,
  VolunteerStateCGCType,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
  VolunteerStateMatchType,
  VolunteerStateType,
  VolunteerStateTypeType,
} from "need4deed-sdk";
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
import Person from "../person.entity";

@Entity()
export default class Volunteer {
  constructor(volunteer?: Partial<Volunteer>) {
    if (volunteer) {
      Object.assign(this, volunteer);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  infoAbout: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  infoExperience: string;

  @Column({
    type: "enum",
    enum: VolunteerStateType,
    default: VolunteerStateType.NEW,
  })
  @IsEnum(VolunteerStateType)
  status: VolunteerStateType;

  @Column({
    type: "enum",
    enum: VolunteerStateEngagementType,
    nullable: true,
  })
  @IsEnum(VolunteerStateEngagementType)
  statusEngagement: VolunteerStateEngagementType;

  @Column({
    type: "enum",
    enum: VolunteerStateCommunicationType,
    nullable: true,
  })
  @IsEnum(VolunteerStateCommunicationType)
  statusCommunication: VolunteerStateCommunicationType;

  @Column({
    type: "enum",
    enum: VolunteerStateAppreciationType,
    nullable: true,
  })
  @IsEnum(VolunteerStateAppreciationType)
  statusAppreciation: VolunteerStateAppreciationType;

  @Column({
    type: "enum",
    enum: VolunteerStateTypeType,
    nullable: true,
  })
  @IsEnum(VolunteerStateTypeType)
  statusType: VolunteerStateTypeType;

  @Column({
    type: "enum",
    enum: VolunteerStateMatchType,
    nullable: true,
  })
  @IsEnum(VolunteerStateMatchType)
  statusMatch: VolunteerStateMatchType;

  @Column({
    type: "enum",
    enum: VolunteerStateCGCType,
    nullable: true,
  })
  @IsEnum(VolunteerStateCGCType)
  statusCgcProcess: VolunteerStateCGCType;

  @Column({
    type: "enum",
    enum: DocumentStatusType,
    default: DocumentStatusType.UNDEFINED,
  })
  @IsEnum(DocumentStatusType)
  statusVaccination: DocumentStatusType;

  @Column({
    type: "enum",
    enum: DocumentStatusType,
    default: DocumentStatusType.UNDEFINED,
  })
  @IsEnum(DocumentStatusType)
  statusCGC: DocumentStatusType;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @ManyToOne(() => Deal)
  @JoinColumn({ name: "deal_id" })
  deal: Deal;

  @Column({ nullable: true })
  dealId: number;

  @ManyToOne(() => Person)
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column({ nullable: true })
  personId: number;

  @OneToMany(
    () => OpportunityVolunteer,
    (opportunityVolunteer) => opportunityVolunteer.volunteer,
  )
  opportunityVolunteer: OpportunityVolunteer[];
}

import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  DocumentStatusType,
  VolunteerCommunicationType,
  VolunteerStateAppreciationType,
  VolunteerStateCGCType,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
  VolunteerStateMatchType,
  VolunteerStateTypeType,
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
import Document from "../document.entity";
import OpportunityVolunteer from "../m2m/opportunity-volunteer";
import Person from "../person.entity";
import Appreciation from "./appreciation.entity";
import Communication from "./communication.entity";

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
    enum: VolunteerStateEngagementType,
    default: VolunteerStateEngagementType.NEW,
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
    default: VolunteerStateMatchType.NO_MATCHES,
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

  @Column({
    type: "text",
    array: true,
    default: () => "ARRAY['mobilePhone']",
    transformer: {
      to: (value: VolunteerCommunicationType[]) => value,
      from: (value: unknown) => value as VolunteerCommunicationType[],
    },
  })
  preferredCommunicationType: VolunteerCommunicationType[];

  @Column({ nullable: true })
  @IsOptional()
  dateReturn: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
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

  @OneToMany(() => Document, (document) => document.volunteer)
  documents: Document[];

  @OneToMany(() => Communication, (communication) => communication.volunteer)
  communications: Communication[];

  @OneToMany(() => Appreciation, (appreciation) => appreciation.volunteer)
  appreciations: Appreciation[];
}

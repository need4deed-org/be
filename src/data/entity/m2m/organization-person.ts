import { AgentMembershipStatus, AgentRoleType } from "need4deed-sdk";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Organization from "../organization.entity";
import Person from "../person.entity";

@Entity()
@Index(["organizationId", "personId", "role"], { unique: true })
export default class OrganizationPerson {
  constructor(organizationPerson?: Partial<OrganizationPerson>) {
    if (organizationPerson) {
      Object.assign(this, organizationPerson);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: AgentRoleType,
    default: AgentRoleType.OTHER,
  })
  role: AgentRoleType;

  @Column({
    type: "enum",
    enum: AgentMembershipStatus,
    default: AgentMembershipStatus.ACTIVE,
  })
  status: AgentMembershipStatus;

  @ManyToOne(
    () => Organization,
    (organization) => organization.organizationPerson,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column()
  organizationId: number;

  @ManyToOne(() => Person, (person) => person.organizationPerson, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "person_id" })
  person: Person;

  @Column()
  personId: number;
}

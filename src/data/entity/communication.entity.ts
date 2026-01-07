import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import User from "./user.entity";
import Volunteer from "./volunteer/volunteer.entity";

@Entity()
export default class Communication {
  constructor(communication?: Partial<Communication>) {
    if (communication) {
      Object.assign(this, communication);
    }
  }
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ContactType })
  contactType: ContactType;

  @Column({ type: "enum", enum: ContactMethodType })
  contactMethod: ContactMethodType;

  @Column({ type: "enum", enum: CommunicationType, nullable: true })
  communicationType?: CommunicationType;

  @Column({ type: "timestamp" })
  date: Date;

  @ManyToOne(() => Volunteer, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "volunteer_id" })
  volunteer: Volunteer;

  @Column({ nullable: true })
  volunteerId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  userId: number;
}

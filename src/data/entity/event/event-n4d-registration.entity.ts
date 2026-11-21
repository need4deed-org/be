import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { EVENT_SIGN_UP_ANSWER_MAX_LENGTH, VolunteerType } from "need4deed-sdk";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Volunteer from "../volunteer/volunteer.entity";
import EventN4D from "./event.entity";

@Entity({ name: "event_n4d_registration" })
export default class EventN4DRegistration {
  constructor(registration?: Partial<EventN4DRegistration>) {
    if (registration) {
      Object.assign(this, registration);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EventN4D, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: EventN4D;

  @Column()
  eventId: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column({ default: 1 })
  @IsInt()
  @Min(1)
  numberOfPeople: number;

  @Column({
    type: "varchar",
    length: EVENT_SIGN_UP_ANSWER_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(EVENT_SIGN_UP_ANSWER_MAX_LENGTH)
  signUpAnswer?: string | null;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ default: false })
  isVolunteer: boolean;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  volunteerTypes: VolunteerType[];

  // Matched by the email the person typed, so it is self-reported: staff only.
  @ManyToOne(() => Volunteer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "volunteer_id" })
  volunteer?: Volunteer;

  @Column({ nullable: true })
  volunteerId?: number | null;

  @Column({ default: false })
  attended: boolean;
}

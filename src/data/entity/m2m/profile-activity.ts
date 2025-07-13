import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Activity from "../profile/activity.entity";
import Profile from "../profile/profile.entity";

@Entity()
export default class ProfileActivity {
  constructor(profileActivity?: Partial<ProfileActivity>) {
    if (profileActivity) {
      Object.assign(this, profileActivity);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Profile, (profile) => profile.profileActivities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;

  @Column()
  profileId: number;

  @ManyToOne(() => Activity, (activity) => activity.profileActivities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "activity_id" })
  activity: Activity;
  @Column()
  activityId: number;
}

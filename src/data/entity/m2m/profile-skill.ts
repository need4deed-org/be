import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Profile from "../profile/profile.entity";
import Skill from "../profile/skill.entity";

@Entity()
export default class ProfileSkill {
  constructor(profileSkill?: Partial<ProfileSkill>) {
    if (profileSkill) {
      Object.assign(this, profileSkill);
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Profile, (profile) => profile.profileSkill, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "profile_id" })
  profile: Profile;

  @Column()
  profileId: number;

  @ManyToOne(() => Skill, (skill) => skill.profileSkill, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "skill_id" })
  skill: Skill;

  @Column()
  skillId: number;
}

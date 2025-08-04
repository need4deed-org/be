import { IsNotEmpty, IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import EventN4D from "../event/event.entity";
import EventTranslation from "../event/event_translation.entity";
import ProfileLanguage from "../m2m/profile-language";

@Entity()
export default class Language {
  constructor(isoCode: string, title: string) {
    this.isoCode = isoCode;
    this.title = title;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(2, 3)
  isoCode: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @Length(100)
  title: string;

  @OneToMany(
    () => ProfileLanguage,
    (profileLanguage) => profileLanguage.language,
  )
  profileLanguage: ProfileLanguage[];

  @OneToMany(() => EventN4D, (eventn4d) => eventn4d.language)
  eventn4d: EventN4D[];

  @OneToMany(
    () => EventTranslation,
    (eventTranslation) => eventTranslation.language,
  )
  eventTranslation: EventTranslation[];
}

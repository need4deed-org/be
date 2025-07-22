import "reflect-metadata";
import { DataSource } from "typeorm";

import Deal from "./entity/deal.entity";
import FieldTranslation from "./entity/field_translation.entity";
import Address from "./entity/location/address.entity";
import District from "./entity/location/district.entity";
import Location from "./entity/location/location.entity";
import Postcode from "./entity/location/postcode.entity";
import DistrictPostcode from "./entity/m2m/district-postcode";
import LocationAddress from "./entity/m2m/location-address";
import LocationDistrict from "./entity/m2m/location-district";
import LocationPostcode from "./entity/m2m/location-postcode";
import ProfileActivity from "./entity/m2m/profile-activity";
import ProfileLanguage from "./entity/m2m/profile-language";
import ProfileSkill from "./entity/m2m/profile-skill";
import TimeTimeslot from "./entity/m2m/time-timeslot";
import Person from "./entity/person.entity";
import Activity from "./entity/profile/activity.entity";
import Category from "./entity/profile/category.entity";
import Language from "./entity/profile/language.entity";
import Profile from "./entity/profile/profile.entity";
import Skill from "./entity/profile/skill.entity";
import Time from "./entity/time/time.entity";
import Timeslot from "./entity/time/timeslot.entity";
import User from "./entity/user.entity";
import SnakeCaseNamingStrategy from "./lib/snake-case";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  username: "postgres",
  password: "postgres",
  database: "postgres",
  synchronize: true,
  logging: false,
  entities: [
    User,
    Person,
    Language,
    FieldTranslation,
    Category,
    Activity,
    Skill,
    Deal,
    Profile,
    ProfileActivity,
    ProfileSkill,
    ProfileLanguage,
    Time,
    Timeslot,
    TimeTimeslot,
    Location,
    Postcode,
    District,
    Address,
    DistrictPostcode,
    LocationPostcode,
    LocationDistrict,
    LocationAddress,
  ],
  migrations: [],
  subscribers: [],
  namingStrategy: new SnakeCaseNamingStrategy(),
});

import * as fs from "fs";
import "reflect-metadata";
import { DataSource } from "typeorm";

import Deal from "./entity/deal.entity";
import EventN4D from "./entity/event/event.entity";
import EventTranslation from "./entity/event/event_translation.entity";
import FieldTranslation from "./entity/field_translation.entity";
import LeadFrom from "./entity/lead.entity";
import Address from "./entity/location/address.entity";
import District from "./entity/location/district.entity";
import Location from "./entity/location/location.entity";
import Postcode from "./entity/location/postcode.entity";
import AgentPostcode from "./entity/m2m/agent-postcode";
import DistrictPostcode from "./entity/m2m/district-postcode";
import LocationAddress from "./entity/m2m/location-address";
import LocationDistrict from "./entity/m2m/location-district";
import LocationPostcode from "./entity/m2m/location-postcode";
import ProfileActivity from "./entity/m2m/profile-activity";
import ProfileLanguage from "./entity/m2m/profile-language";
import ProfileSkill from "./entity/m2m/profile-skill";
import TimeTimeslot from "./entity/m2m/time-timeslot";
import Agent from "./entity/opportunity/agent.entity";
import Opportunity from "./entity/opportunity/opportunity.entity";
import Option from "./entity/option.entity";
import Organization from "./entity/organization.entity";
import Person from "./entity/person.entity";
import Activity from "./entity/profile/activity.entity";
import Category from "./entity/profile/category.entity";
import Language from "./entity/profile/language.entity";
import Profile from "./entity/profile/profile.entity";
import Skill from "./entity/profile/skill.entity";
import Testimonial from "./entity/testimonial.entity";
import Time from "./entity/time/time.entity";
import Timeslot from "./entity/time/timeslot.entity";
import Timeline from "./entity/timeline.entity";
import User from "./entity/user.entity";
import VolunteerListMV from "./entity/volunteer/volunteer-list-mv.entity";
import Volunteer from "./entity/volunteer/volunteer.entity";
import SnakeCaseNamingStrategy from "./lib/snake-case";
import { getLoggingForDataSource } from "./utils";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  schema: process.env.DB_SCHEMA || "public",
  synchronize: false,
  migrationsRun: true,
  entities: [
    Activity,
    Address,
    Agent,
    AgentPostcode,
    Category,
    Deal,
    District,
    DistrictPostcode,
    EventN4D,
    EventTranslation,
    FieldTranslation,
    Language,
    LeadFrom,
    Location,
    LocationAddress,
    LocationDistrict,
    LocationPostcode,
    Opportunity,
    Organization,
    Person,
    Profile,
    ProfileActivity,
    ProfileLanguage,
    ProfileSkill,
    Postcode,
    Option,
    Skill,
    Testimonial,
    Time,
    Timeline,
    TimeTimeslot,
    Timeslot,
    User,
    Volunteer,
    VolunteerListMV,
  ],
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: true,
          ca: fs
            .readFileSync("/app/certificates/eu-central-1-bundle.pem")
            .toString(),
        }
      : false,
  migrations:
    process.env.NODE_ENV === "production"
      ? [__dirname + "/migrations/**/*.js"]
      : [__dirname + "/migrations/**/*.ts"],
  migrationsTableName: "be_migrations",
  subscribers: [],
  namingStrategy: new SnakeCaseNamingStrategy(),
  logging: getLoggingForDataSource(process.env.NODE_ENV),
  logger: "advanced-console",
});

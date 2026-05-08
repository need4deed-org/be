import * as fs from "fs";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { isProd, isTest } from "../config";
import Comment from "./entity/comment.entity";
import Communication from "./entity/communication.entity";
import Config from "./entity/config.entity";
import Deal from "./entity/deal.entity";
import Document from "./entity/document.entity";
import EventTranslation from "./entity/event/event_translation.entity";
import EventN4D from "./entity/event/event.entity";
import FieldTranslation from "./entity/field_translation.entity";
import LeadFrom from "./entity/lead.entity";
import Address from "./entity/location/address.entity";
import District from "./entity/location/district.entity";
import Location from "./entity/location/location.entity";
import Postcode from "./entity/location/postcode.entity";
import AgentLanguage from "./entity/m2m/agent-language";
import AgentPerson from "./entity/m2m/agent-person";
import AgentPostcode from "./entity/m2m/agent-postcode";
import DistrictPostcode from "./entity/m2m/district-postcode";
import LocationAddress from "./entity/m2m/location-address";
import LocationDistrict from "./entity/m2m/location-district";
import LocationPostcode from "./entity/m2m/location-postcode";
import DealActivity from "./entity/m2m/deal-activity";
import DealLanguage from "./entity/m2m/deal-language";
import DealSkill from "./entity/m2m/deal-skill";
import OpportunityVolunteer from "./entity/m2m/opportunity-volunteer";
import TimeTimeslot from "./entity/m2m/time-timeslot";
import NotionRelation from "./entity/notion-relation.entity";
import Accompanying from "./entity/opportunity/accompanying.entity";
import Agent from "./entity/opportunity/agent.entity";
import Opportunity from "./entity/opportunity/opportunity.entity";
import Option from "./entity/option.entity";
import Organization from "./entity/organization.entity";
import Person from "./entity/person.entity";
import Activity from "./entity/profile/activity.entity";
import Category from "./entity/profile/category.entity";
import Language from "./entity/profile/language.entity";
import Skill from "./entity/profile/skill.entity";
import Testimonial from "./entity/testimonial.entity";
import Time from "./entity/time/time.entity";
import Timeslot from "./entity/time/timeslot.entity";
import Timeline from "./entity/timeline.entity";
import User from "./entity/user.entity";
import Appreciation from "./entity/volunteer/appreciation.entity";
import VolunteerListMV from "./entity/volunteer/volunteer-list-mv.entity";
import Volunteer from "./entity/volunteer/volunteer.entity";
import SnakeCaseNamingStrategy from "./lib/snake-case";
import { getLoggingForDataSource } from "./utils";

export const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  schema: process.env.DB_SCHEMA || "public",
  synchronize: false,
  migrationsRun: false,
  entities: [
    Accompanying,
    Activity,
    Address,
    Agent,
    AgentLanguage,
    AgentPerson,
    AgentPostcode,
    Appreciation,
    Category,
    Comment,
    Communication,
    Config,
    Deal,
    DealActivity,
    DealLanguage,
    DealSkill,
    District,
    DistrictPostcode,
    Document,
    EventN4D,
    EventTranslation,
    FieldTranslation,
    Language,
    LeadFrom,
    Location,
    LocationAddress,
    LocationDistrict,
    LocationPostcode,
    NotionRelation,
    Opportunity,
    OpportunityVolunteer,
    Organization,
    Person,
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
  ssl: isProd
    ? {
        rejectUnauthorized: true,
        ca: fs
          .readFileSync("/app/certificates/eu-central-1-bundle.pem")
          .toString(),
      }
    : false,
  migrations: isTest ? [] : [__dirname + "/migrations/**/*{.ts,.js}"],
  migrationsTableName: "be_migrations",
  subscribers: [],
  namingStrategy: new SnakeCaseNamingStrategy(),
  logging: getLoggingForDataSource(process.env.NODE_ENV),
  logger: "advanced-console",
});

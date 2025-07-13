import "reflect-metadata";
import { DataSource } from "typeorm";

import FieldTranslation from "./entity/field_translation.entity";
import Language from "./entity/language.entity";
import ProfileActivity from "./entity/m2m/profile-activity";
import Person from "./entity/person.entity";
import Activity from "./entity/profile/activity.entity";
import Category from "./entity/profile/category.entity";
import Profile from "./entity/profile/profile.entity";
import Skill from "./entity/profile/skill.entity";
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
    Profile,
    ProfileActivity,
  ],
  migrations: [],
  subscribers: [],
  namingStrategy: new SnakeCaseNamingStrategy(),
});

import { snakeCase } from "change-case";
import "reflect-metadata";
import { DataSource, DefaultNamingStrategy } from "typeorm";

import { Avatar } from "./entity/Avatar";
import { User } from "./entity/User";

class SnakeCaseNamingStrategy extends DefaultNamingStrategy {
  tableName(className: string, customTableName: string | undefined): string {
    return customTableName ? customTableName : snakeCase(className);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    if (customName) {
      return customName;
    }

    return snakeCase(propertyName);
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(relationName + "_" + referencedColumnName);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string,
  ): string {
    return snakeCase(
      firstTableName +
        "_" +
        secondTableName +
        "_" +
        firstPropertyName +
        "_" +
        secondPropertyName,
    );
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(
      tableName + "_" + (columnName ? columnName : propertyName),
    );
  }

  classTableInheritanceParentColumnName(
    parentTableName: any,
    parentTableIdPropertyName: any,
  ): string {
    return snakeCase(`${parentTableName}_${parentTableIdPropertyName}`);
  }
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  username: "postgres",
  password: "postgres",
  database: "postgres",
  synchronize: true,
  logging: false,
  entities: [User, Avatar],
  migrations: [],
  subscribers: [],
  namingStrategy: new SnakeCaseNamingStrategy(),
});

import { DataSource } from "typeorm";

import Person from "../entity/person.entity";
import User from "../entity/user.entity";
import { getCount } from "./utils";

export async function seedUser(dataSource: DataSource) {
  const personAdmin = new Person({
    firstName: "John",
    middleName: "Admin",
    lastName: "Doe",
  });

  const userAdmin = new User({
    email: "john.doe@need4deed.org",
    password: "no_password",
    role: "admin",
    isActive: true,
    person: personAdmin,
  });

  const personUser = new Person({
    firstName: "Anna",
    middleName: "User",
    lastName: "Doe",
  });

  const userUser = new User({
    email: "anna.doe@need4deed.org",
    password: "no_password",
    role: "user",
    isActive: true,
    person: personUser,
  });

  const userRepository = dataSource.getRepository(User);
  if (!userRepository) {
    throw new Error("Skill entity is not initialized.");
  }

  const count = await getCount(userRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding users.");
    return;
  }

  try {
    userRepository.save([userAdmin, userUser]);
  } catch (error) {
    dataSource.logger.log(
      "log",
      "Skipping seeding users as they already seeded.",
    );
  }
}

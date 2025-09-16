import { DataSource } from "typeorm";

import Person from "../entity/person.entity";
import User from "../entity/user.entity";

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

  userRepository.save([userAdmin, userUser]);
}

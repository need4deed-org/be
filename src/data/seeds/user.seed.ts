import { DataSource } from "typeorm";

import Address from "../entity/location/address.entity";
import Postcode from "../entity/location/postcode.entity";
import Person from "../entity/person.entity";
import User from "../entity/user.entity";
import { Role } from "../types";
import { hashPassword } from "../utils";
import { getCount, getRepository } from "./utils";

export async function seedUser(dataSource: DataSource) {
  const userRepository = getRepository(dataSource, User);
  const postcodeRepository = getRepository(dataSource, Postcode);
  const addressRepository = getRepository(dataSource, Address);

  const count = await getCount(userRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding users.");
    return;
  }

  const personAdmin = new Person({
    firstName: "John",
    middleName: "Admin",
    lastName: "Doe",
  });

  const userAdmin = new User({
    email: "john.doe@need4deed.org",
    password: await hashPassword("no_password"),
    role: Role.ADMIN,
    isActive: true,
    person: personAdmin,
  });

  const personCoordinator = new Person({
    firstName: "Sarah",
    middleName: "Coordinator",
    lastName: "Doe",
  });

  const coordinatorUser = new User({
    email: "sarah.doe@need4deed.org",
    password: await hashPassword("no_password"),
    role: Role.COORDINATOR,
    isActive: true,
    person: personCoordinator,
  });

  const postcode12345 = await postcodeRepository.findOne({
    where: { value: "12345" },
  });
  const address = new Address({ postcode: postcode12345, title: "Dummy" });
  await addressRepository.save(address);
  const personUser = new Person({
    firstName: "Anna",
    middleName: "User",
    lastName: "Doe",
    email: "anna.doe@need4deed.org",
    address,
  });

  const userUser = new User({
    email: "anna.doe@need4deed.org",
    password: await hashPassword("no_password"),
    role: Role.USER,
    isActive: true,
    person: personUser,
  });

  try {
    await userRepository.save([userAdmin, coordinatorUser, userUser]);
  } catch (error) {
    dataSource.logger.log(
      "log",
      "Skipping seeding users as they already seeded.",
    );
  }
}

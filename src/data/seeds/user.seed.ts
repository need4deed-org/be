import { UserRole } from "need4deed-sdk";
import { DataSource } from "typeorm";
import { NotFoundError } from "../../config/error/fastify";
import Address from "../entity/location/address.entity";
import Postcode from "../entity/location/postcode.entity";
import Person from "../entity/person.entity";
import User from "../entity/user.entity";
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
    role: UserRole.ADMIN,
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
    role: UserRole.COORDINATOR,
    isActive: true,
    person: personCoordinator,
  });

  const postcode12345 = await postcodeRepository.findOne({
    where: { value: "12345" },
  });
  let address = await addressRepository.findOne({
    where: { title: "Dummy" },
  });
  if (!postcode12345) {
    throw new NotFoundError(
      "Postcode 12345 not found. Please seed postcodes first.",
    );
  }
  if (!address) {
    address = new Address({ postcode: postcode12345, title: "Dummy" });
    await addressRepository.save(address);
  }

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
    role: UserRole.USER,
    isActive: true,
    person: personUser,
  });

  try {
    await userRepository.save([userAdmin, coordinatorUser, userUser]);
  } catch (_error) {
    dataSource.logger.log(
      "log",
      "Skipping seeding users as they already seeded.",
    );
  }
}

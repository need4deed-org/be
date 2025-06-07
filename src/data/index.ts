import { AppDataSource } from "./data-source";
import { Avatar } from "./entity/Avatar";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    console.log("Loading from the database...");
    const users = await AppDataSource.manager.find(User);
    console.log("Loaded users: ", users);
    const avatars = await AppDataSource.manager.find(Avatar);
    console.log("Loaded users: ", avatars);
  })
  .catch((error) => console.log(error));

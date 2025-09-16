import { DataSource } from "typeorm";

import { seedActivityFile } from "../../config/constants";
import Activity from "../entity/profile/activity.entity";
import Category from "../entity/profile/category.entity";
import { readJsonAsync } from "../utils";
import { getCount } from "./utils";

interface ActivityJSON {
  id: string;
  category: string;
}

export async function seedActivity(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const activityRepository = dataSource.getRepository(Activity);
  if (!activityRepository) {
    throw new Error("Activity entity is not initialized.");
  }

  const count = await getCount(activityRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding activities.");
    return;
  }

  const categoryRepository = dataSource.getRepository(Category);
  if (!categoryRepository) {
    throw new Error("Category entity is not initialized.");
  }

  const categories = await categoryRepository.find();

  const activities = (await readJsonAsync(seedActivityFile)) as ActivityJSON[];

  const existingActivities = new Set(
    (await activityRepository.find()).map((activity) => activity.title),
  );

  const activitiesForInsert = activities.reduce(
    (result: Activity[], { id, category }) => {
      if (existingActivities.has(id)) {
        return result;
      }
      try {
        const newActivity = new Activity({ title: id });
        const categoryObject = categories.find((cat) => cat.title === category);
        if (!categoryObject) {
          throw new Error(`Error: category ${category} not found.`);
        }
        newActivity.categoryId = categoryObject.id;
        result.push(newActivity);
      } catch (error) {
        throw new Error(`Error creating new activity ${id}: ${error.message}`);
      }
      return result;
    },
    [],
  );

  try {
    await activityRepository.insert(activitiesForInsert);
  } catch (error) {
    throw new Error(`Error inserting activities: ${error.message}`);
  }
}

import { DataSource } from "typeorm";

import { seedCategoryFile } from "../../config/constants";
import Category from "../entity/category.entity";
import { readJsonAsync } from "../utils";

interface CategoryJSON {
  id: string;
}

export async function seedCategory(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const categoryRepository = dataSource.getRepository(Category);
  if (!categoryRepository) {
    throw new Error("Category entity is not initialized.");
  }

  const categories = (await readJsonAsync(seedCategoryFile)) as CategoryJSON[];

  const existingCategories = new Set(
    (await categoryRepository.find()).map((category) => category.title),
  );

  const categoriesForInsert = categories.reduce(
    (result: Category[], { id }) => {
      if (existingCategories.has(id)) {
        return result;
      }
      try {
        const newCategory = new Category({ title: id });
        result.push(newCategory);
      } catch (error) {
        throw new Error(`Error creating new category ${id}: ${error.message}`);
      }
      return result;
    },
    [],
  );

  try {
    await categoryRepository.insert(categoriesForInsert);
  } catch (error) {
    throw new Error(`Error inserting categories: ${error.message}`);
  }
}

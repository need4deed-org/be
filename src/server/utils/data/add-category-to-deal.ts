import Deal from "../../../data/entity/deal.entity";
import { categorize } from "../../../data/lib";

export function getCategoryToDealHandler() {
  const updates: Deal[] = [];

  return {
    // Category is derived from the deal's activities and stored on the deal.
    addCategoryToDeal(deal: Deal): Deal {
      if (deal.categoryId) {
        return deal;
      }
      const categoryId = categorize(
        deal?.dealActivity?.map(({ activity }) => activity.categoryId) || [],
      );
      if (categoryId) {
        updates.push(deal);
        return Object.assign(deal, { categoryId });
      }
      return deal;
    },
    updates,
  };
}

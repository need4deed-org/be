import Deal from "../../../data/entity/deal.entity";
import { categorize } from "../../../data/lib";

export function getCategoryToDealHandler() {
  const updates: Deal[] = [];

  return {
    // Category is derived from the deal's activities and stored on the deal.
    // `deal` can be null: opportunity.deal_id is nullable (be#999).
    addCategoryToDeal(deal: Deal | null | undefined): Deal | null | undefined {
      if (!deal || deal.categoryId) {
        return deal;
      }
      const categoryId = categorize(
        deal.dealActivity?.map(({ activity }) => activity.categoryId) || [],
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

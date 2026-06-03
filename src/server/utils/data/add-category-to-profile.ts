import Deal from "../../../data/entity/deal.entity";
import Profile from "../../../data/entity/profile/profile.entity";
import { categorize } from "../../../data/lib";

export function getCategoryToProfileHandler() {
  const updates: Profile[] = [];

  return {
    // Category is derived from the deal's activities (now on Deal, not Profile)
    // but is still stored on the Profile.
    addCategoryToProfile(deal: Deal): Profile {
      const profile = deal.profile;
      if (profile.categoryId) {
        return profile;
      }
      const categoryId = categorize(
        deal?.dealActivity?.map(({ activity }) => activity.categoryId) || [],
      );
      if (categoryId) {
        updates.push(profile);
        return Object.assign(profile, { categoryId });
      }
      return profile;
    },
    updates,
  };
}

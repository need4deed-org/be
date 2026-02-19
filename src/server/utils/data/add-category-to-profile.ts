import Profile from "../../../data/entity/profile/profile.entity";
import { categorize } from "../../../data/lib";

export function getCategoryToProfileHandler() {
  const updates: Profile[] = [];

  return {
    addCategoryToProfile(profile: Profile): Profile {
      if (profile.categoryId) {
        return profile;
      }
      const categoryId = categorize(
        profile?.profileActivity?.map(({ activity }) => activity.categoryId) ||
          [],
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

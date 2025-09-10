import { VolunteerFormData } from "need4deed-sdk";

export function getNameFields(formData: VolunteerFormData) {
  const nameParts = formData.fullName.trim().split(" ");
  const firstName = nameParts[0] || "";
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : null;
  const lastName =
    nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
  return { firstName, middleName, lastName };
}

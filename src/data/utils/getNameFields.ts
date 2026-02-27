import { VolunteerFormData } from "need4deed-sdk";

export function getNameFields(formData: VolunteerFormData) {
  const names = formData.fullName.trim().split(" ");

  return {
    firstName: names.shift() || undefined,
    lastName: names.pop() || undefined,
    middleName: names.join(" ") || undefined,
  };
}

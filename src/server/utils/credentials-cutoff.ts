import User from "../../data/entity/user.entity";

export function isIssuedBeforeCutoff(
  { credentialsValidAfter }: Pick<User, "credentialsValidAfter">,
  iat: number | undefined,
): boolean {
  if (!credentialsValidAfter) {
    return false;
  }
  if (typeof iat !== "number") {
    return true;
  }
  return iat <= Math.floor(credentialsValidAfter.getTime() / 1000);
}

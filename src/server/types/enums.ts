export const RoutePrefix = {
  AUTH: "/auth",
  COMMENT: "/comment",
  COMMUNICATION: "/communication",
  DOC: "/doc",
  HEALTH_CHECK: "/health-check",
  LOGIN: "/login",
  ME: "/me",
  OPTION: "/option",
  PERSON: "/person",
  REFRESH: "/refresh",
  SWAGGER: "/swagger",
  USER: "/user",
  VERIFY_EMAIL: "/verify-email",
  VOLUNTEER: "/volunteer",
} as const;

// eslint-disable-next-line no-redeclare
export type RoutePrefix = (typeof RoutePrefix)[keyof typeof RoutePrefix];

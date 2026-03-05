export const RoutePrefix = {
  AGENT: "/agent",
  AUTH: "/auth",
  APPRECIATION: "/appreciation",
  COMMENT: "/comment",
  COMMUNICATION: "/communication",
  DOC: "/doc",
  HEALTH_CHECK: "/health-check",
  LEGACY: "/legacy",
  LOGIN: "/login",
  ME: "/me",
  OPPORTUNITY: "/opportunity",
  OPPORTUNITY_LINKED: "/opportunity-linked",
  OPPORTUNITY_VOLUNTEER: "/opportunity-volunteer",
  OPTION: "/option",
  PERSON: "/person",
  REFRESH: "/refresh",
  SWAGGER: "/swagger",
  USER: "/user",
  VERIFY_EMAIL: "/verify-email",
  VOLUNTEER: "/volunteer",
  VOLUNTEER_LINKED: "/volunteer-linked",
} as const;

// eslint-disable-next-line no-redeclare
export type RoutePrefix = (typeof RoutePrefix)[keyof typeof RoutePrefix];

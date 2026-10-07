import { EntityTableName, UserRole } from "need4deed-sdk";
import Comment from "../../../data/entity/comment.entity";
import Address from "../../../data/entity/location/address.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import { CallerVisibility } from "./visible-persons";

export const PERSON_PII_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "landline",
  "avatarUrl",
] as const;
const ADDRESS_PII_FIELDS = ["title", "street", "city"] as const;
const ACCOMPANYING_PII_FIELDS = ["name", "address", "phone", "email"] as const;
const COMMENT_PII_FIELDS = ["text"] as const;

export function maskString(): string {
  const c = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return `${c}***`;
}

export function maskFields(
  obj: Record<string, unknown>,
  fields: readonly string[],
): void {
  for (const field of fields) {
    if (typeof obj[field] === "string" && obj[field]) {
      obj[field] = maskString();
    }
  }
}

function maskAddressCoordinates(address: Record<string, unknown>): void {
  const postcode = address.postcode;
  if (postcode && typeof postcode === "object") {
    address.postcode = { ...postcode, latitude: null, longitude: null };
  }
}

function maskAddress(address: Record<string, unknown>): void {
  maskFields(address, ADDRESS_PII_FIELDS);
  maskAddressCoordinates(address);
}

function isAgentVisible(agentId: number, ctx: CallerVisibility): boolean {
  return ctx.agentIds.has(agentId) || ctx.matchedAgentIds.has(agentId);
}

function isEntityVisible(
  entityType: EntityTableName,
  entityId: number,
  ctx: CallerVisibility,
): boolean {
  switch (entityType) {
    case EntityTableName.OPPORTUNITY:
      return ctx.opportunityIds.has(entityId);
    case EntityTableName.AGENT:
      return ctx.agentIds.has(entityId);
    default:
      return false;
  }
}

function isCommentVisible(comment: Comment, ctx: CallerVisibility): boolean {
  if (comment.userId === ctx.userId) {
    return true;
  }
  const authorRole = comment.user?.role ?? UserRole.USER;
  if (authorRole === UserRole.COORDINATOR || authorRole === UserRole.ADMIN) {
    return false;
  }
  return isEntityVisible(comment.entityType, comment.entityId, ctx);
}

function collectVisibleAddresses(
  node: unknown,
  ctx: CallerVisibility,
  seen: WeakSet<object>,
  visibleAddresses: WeakSet<object>,
): void {
  if (node === null || typeof node !== "object") {
    return;
  }
  if (seen.has(node)) {
    return;
  }
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      collectVisibleAddresses(item, ctx, seen, visibleAddresses);
    }
    return;
  }

  if (node instanceof Person) {
    if (
      ctx.personIds.has(node.id) &&
      node.address &&
      typeof node.address === "object"
    ) {
      visibleAddresses.add(node.address);
    }
  } else if (node instanceof Agent) {
    if (
      isAgentVisible(node.id, ctx) &&
      node.address &&
      typeof node.address === "object"
    ) {
      visibleAddresses.add(node.address);
    }
  }

  for (const key of Object.keys(node)) {
    collectVisibleAddresses(
      (node as Record<string, unknown>)[key],
      ctx,
      seen,
      visibleAddresses,
    );
  }
}

export function maskPii<T>(data: T, ctx: CallerVisibility): T {
  const visibleAddresses = new WeakSet<object>();
  collectVisibleAddresses(data, ctx, new WeakSet<object>(), visibleAddresses);
  walk(data, ctx, new WeakSet<object>(), visibleAddresses);
  return data;
}

function walk(
  node: unknown,
  ctx: CallerVisibility,
  seen: WeakSet<object>,
  visibleAddresses: WeakSet<object>,
): void {
  if (node === null || typeof node !== "object") {
    return;
  }
  if (seen.has(node)) {
    return;
  }
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, ctx, seen, visibleAddresses);
    }
    return;
  }

  if (node instanceof Person) {
    const isVisible = ctx.personIds.has(node.id);
    if (!isVisible) {
      maskFields(node as unknown as Record<string, unknown>, PERSON_PII_FIELDS);
    }
    if (node.address && typeof node.address === "object") {
      if (!visibleAddresses.has(node.address)) {
        maskAddress(node.address as unknown as Record<string, unknown>);
      }
      seen.add(node.address);
    }
  } else if (node instanceof Agent) {
    if (ctx.role === UserRole.VOLUNTEER && !isAgentVisible(node.id, ctx)) {
      maskFields(node as unknown as Record<string, unknown>, ["title"]);
    }
    if (
      node.address &&
      typeof node.address === "object" &&
      visibleAddresses.has(node.address)
    ) {
      seen.add(node.address);
    }
  } else if (node instanceof Address) {
    if (!visibleAddresses.has(node)) {
      maskAddress(node as unknown as Record<string, unknown>);
    }
  } else if (node instanceof Opportunity) {
    if (
      !ctx.opportunityIds.has(node.id) &&
      node.accompanying instanceof Accompanying
    ) {
      maskFields(
        node.accompanying as unknown as Record<string, unknown>,
        ACCOMPANYING_PII_FIELDS,
      );
    }
  } else if (node instanceof Comment) {
    if (!isCommentVisible(node, ctx)) {
      maskFields(
        node as unknown as Record<string, unknown>,
        COMMENT_PII_FIELDS,
      );
    }
  }

  for (const key of Object.keys(node)) {
    walk((node as Record<string, unknown>)[key], ctx, seen, visibleAddresses);
  }
}

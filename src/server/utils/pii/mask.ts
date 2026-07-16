import { EntityTableName, UserRole } from "need4deed-sdk";
import Comment from "../../../data/entity/comment.entity";
import Address from "../../../data/entity/location/address.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import { CallerVisibility } from "./visible-persons";

// PII columns masked for callers not permitted to see the owning Person.
const PERSON_PII_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "landline",
  "avatarUrl",
] as const;
const ADDRESS_PII_FIELDS = ["title", "street", "city"] as const;
// Refugee contact details carried as scalars on an opportunity's accompanying.
const ACCOMPANYING_PII_FIELDS = ["name", "address", "phone", "email"] as const;
// Free-text comment body (may name people / carry contact details).
const COMMENT_PII_FIELDS = ["text"] as const;

// A single random char + "***" — hides both the original value's length and its
// first letter (so "John" -> e.g. "x***"), unlike a fixed "****".
export function maskString(): string {
  const c = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return `${c}***`;
}

function maskFields(
  obj: Record<string, unknown>,
  fields: readonly string[],
): void {
  for (const field of fields) {
    if (typeof obj[field] === "string" && obj[field]) {
      obj[field] = maskString();
    }
  }
}

// An entity whose comments/accompanying the caller may see unmasked.
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
      // VOLUNTEER and the rest: no inherited visibility (conservative).
      return false;
  }
}

// A comment is visible if the caller authored it, or its parent entity is
// visible AND the author isn't a COORDINATOR/ADMIN (internal notes stay masked
// even on an entity the caller owns).
function isCommentVisible(comment: Comment, ctx: CallerVisibility): boolean {
  if (comment.userId === ctx.userId) {
    return true;
  }
  // A missing author role defaults to USER (non-privileged) — entity visibility
  // then decides.
  const authorRole = comment.user?.role ?? UserRole.USER;
  if (authorRole === UserRole.COORDINATOR || authorRole === UserRole.ADMIN) {
    return false;
  }
  return isEntityVisible(comment.entityType, comment.entityId, ctx);
}

/**
 * Masks PII the caller may not see, in place, on the loaded entity graph (run
 * before the DTO). TypeORM returns class instances, so PII is identified by
 * `instanceof`; reference objects and non-PII entities pass through untouched
 * (the walker still descends them to reach nested PII). A WeakSet guards the
 * entity graph's cycles.
 *
 * Masked: a Person not in `personIds` (and its own Address); an Agent not in
 * `agentIds` (and its own Address); a standalone Address reached some other
 * way; an Opportunity's accompanying when the opportunity isn't visible; a
 * Comment that isn't visible (see isCommentVisible).
 */
export function maskPii<T>(data: T, ctx: CallerVisibility): T {
  walk(data, ctx, new WeakSet<object>());
  return data;
}

function walk(
  node: unknown,
  ctx: CallerVisibility,
  seen: WeakSet<object>,
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
      walk(item, ctx, seen);
    }
    return;
  }

  if (node instanceof Person) {
    const isVisible = ctx.personIds.has(node.id);
    if (!isVisible) {
      maskFields(node as unknown as Record<string, unknown>, PERSON_PII_FIELDS);
    }
    // Claim the person's own Address so the standalone-Address rule below can't
    // re-mask a visible person's address (and don't double-mask a hidden one).
    if (node.address && typeof node.address === "object") {
      if (!isVisible) {
        maskFields(
          node.address as unknown as Record<string, unknown>,
          ADDRESS_PII_FIELDS,
        );
      }
      seen.add(node.address);
    }
  } else if (node instanceof Agent) {
    const isVisible = ctx.agentIds.has(node.id);
    // Claim the agent's own Address so the standalone-Address rule below
    // can't re-mask it when the caller has visibility into this agent.
    if (isVisible && node.address && typeof node.address === "object") {
      seen.add(node.address);
    }
  } else if (node instanceof Address) {
    // Reached not via a visible Person/Agent (e.g. another agent's address)
    // -> standalone PII, mask it.
    maskFields(node as unknown as Record<string, unknown>, ADDRESS_PII_FIELDS);
  } else if (node instanceof Opportunity) {
    // Accompanying (refugee contact) follows its opportunity's visibility.
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
    walk((node as Record<string, unknown>)[key], ctx, seen);
  }
}

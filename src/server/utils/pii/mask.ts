import { EntityTableName, UserRole } from "need4deed-sdk";
import Comment from "../../../data/entity/comment.entity";
import Address from "../../../data/entity/location/address.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import { CallerVisibility } from "./visible-persons";

// PII columns masked for callers not permitted to see the owning Person.
// Exported for reuse by the INACTIVE-agent masking (be#885), which needs the
// same "hide a volunteer's identity" field set but is gated on the agent's
// engagementStatus rather than personIds visibility.
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

// Nulls out an address's postcode coordinates (be#661's map-pin lat/lon) by
// replacing the postcode reference with a copy — a Postcode row is shared
// across every Address in the same area, so mutating its fields in place
// would leak into every other (possibly visible) address pointing at the
// same postcode.
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

// Address is a real OneToMany off Person/Organization (household members,
// agent contacts sharing one office, etc.), and TypeORM's relation loader
// returns the *same* Address (and Postcode) object instance for every row
// that references it — confirmed empirically: two Persons sharing an
// addressId, loaded via relationLoadStrategy "query", get
// `person.address === otherPerson.address`. Deciding whether to mask an
// address from a single Person/Agent's own visibility would then be
// order-dependent: whichever of two co-residents the walker reaches first
// determines the masked/unmasked outcome for *both*, since mutating one
// mutates the shared object for the other too. `collectVisibleAddresses`
// pre-scans the whole graph so an address already known to be visible via
// some Person/Agent is never masked, regardless of walk order.
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
      ctx.agentIds.has(node.id) &&
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

/**
 * Masks PII the caller may not see, in place, on the loaded entity graph (run
 * before the DTO). TypeORM returns class instances, so PII is identified by
 * `instanceof`; reference objects and non-PII entities pass through untouched
 * (the walker still descends them to reach nested PII). A WeakSet guards the
 * entity graph's cycles.
 *
 * Masked: a Person not in `personIds` (and its Address, unless that Address
 * is also reachable from a visible Person/Agent elsewhere in the same
 * response — see `collectVisibleAddresses`); an Agent not in `agentIds` (and
 * its Address, same rule); a standalone Address reached some other way; an
 * Opportunity's accompanying when the opportunity isn't visible; a Comment
 * that isn't visible (see isCommentVisible).
 */
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
    // Claim the person's own Address so the standalone-Address rule below can't
    // re-mask a visible person's address (and don't double-mask a hidden one).
    if (node.address && typeof node.address === "object") {
      if (!visibleAddresses.has(node.address)) {
        maskAddress(node.address as unknown as Record<string, unknown>);
      }
      seen.add(node.address);
    }
  } else if (node instanceof Agent) {
    // Claim the agent's own Address so the standalone-Address rule below
    // can't re-mask it when it's visible (via this agent, or some other
    // visible Person/Agent sharing the same Address).
    if (
      node.address &&
      typeof node.address === "object" &&
      visibleAddresses.has(node.address)
    ) {
      seen.add(node.address);
    }
  } else if (node instanceof Address) {
    // Reached not via a visible Person/Agent (e.g. another agent's address)
    // -> standalone PII, mask it, unless it's known visible via some other
    // Person/Agent in this same response.
    if (!visibleAddresses.has(node)) {
      maskAddress(node as unknown as Record<string, unknown>);
    }
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
    walk((node as Record<string, unknown>)[key], ctx, seen, visibleAddresses);
  }
}

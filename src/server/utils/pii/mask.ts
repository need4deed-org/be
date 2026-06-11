import Address from "../../../data/entity/location/address.entity";
import Person from "../../../data/entity/person.entity";

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

/**
 * Masks PII (Person/Address) the caller may not see, in place, on the loaded
 * entity graph (run before the DTO). TypeORM returns class instances, so PII is
 * identified by `instanceof` — reference objects and all non-PII entities pass
 * through untouched (the walker still descends them to reach nested PII).
 *
 * A Person is visible iff its id is in `visiblePersonIds`; a Person's own
 * Address follows that visibility, and standalone Addresses (e.g. agent.address)
 * are masked. A WeakSet guards against the entity graph's cycles.
 */
export function maskPii<T>(data: T, visiblePersonIds: ReadonlySet<number>): T {
  walk(data, visiblePersonIds, new WeakSet<object>());
  return data;
}

function walk(
  node: unknown,
  visible: ReadonlySet<number>,
  seen: WeakSet<object>,
): void {
  if (node === null || typeof node !== "object") {return;}
  if (seen.has(node)) {return;}
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {walk(item, visible, seen);}
    return;
  }

  if (node instanceof Person) {
    const isVisible = visible.has(node.id);
    if (!isVisible)
      {maskFields(node as unknown as Record<string, unknown>, PERSON_PII_FIELDS);}
    // Claim the person's own Address so the standalone-Address rule below can't
    // re-mask a visible person's address (and don't double-mask a hidden one).
    if (node.address && typeof node.address === "object") {
      if (!isVisible)
        {maskFields(
          node.address as unknown as Record<string, unknown>,
          ADDRESS_PII_FIELDS,
        );}
      seen.add(node.address);
    }
  } else if (node instanceof Address) {
    // Reached not via a Person (e.g. agent.address) -> standalone PII, mask it.
    maskFields(node as unknown as Record<string, unknown>, ADDRESS_PII_FIELDS);
  }

  for (const key of Object.keys(node)) {
    walk((node as Record<string, unknown>)[key], visible, seen);
  }
}

import Agent from "../../../data/entity/opportunity/agent.entity";

function normalizeStreet(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*stra(?:ße|sse)\b/g, "str") // straße / strasse → str
    .replace(/\s*str\./g, "str")             // str.  → str
    .replace(/\s+str\b/g, "str");            // " str" → str
}

// Strips trailing house number in common German formats:
//   "21"    "21a"   "5-7"   "12 A"  "5-7 A"
// [\w-]* covers attached suffixes/ranges; (\s+[a-z]+)? covers "12 A"
function extractStreetName(s: string): string {
  return normalizeStreet(s).replace(/\s+\d+[\w-]*(\s+[a-z]+)?$/, "").trim();
}

function agentHasPlz(a: Agent, plz: string): boolean {
  if (a.address?.postcode?.value === plz) return true;
  return !!a.agentPostcode?.some((ap) => ap.postcode?.value === plz);
}

function streetNameWordRegex(streetName: string): RegExp {
  const escaped = streetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
}

export function getAgentByAddress(
  agents: Agent[],
  street: string,
  plz: string,
): Agent | undefined {
  const normStreet = normalizeStreet(street);

  // 1. Strict: agents created via new code have address.street set
  const strict = agents.find(
    (a) =>
      a.address?.postcode?.value === plz &&
      normalizeStreet(a.address?.street ?? "") === normStreet,
  );
  if (strict) return strict;

  // 2. Fuzzy fallback for legacy agents: street name (no number) found as a
  //    whole word in agent title + PLZ from either address.postcode or agentPostcode.
  //    Only used when exactly one agent matches — multiple matches are ambiguous
  //    (e.g. 5 centers on the same street) and must not guess.
  const streetName = extractStreetName(street);
  if (!streetName) return undefined;
  const streetRegex = streetNameWordRegex(streetName);
  const fuzzyMatches = agents.filter(
    (a) =>
      agentHasPlz(a, plz) &&
      streetRegex.test(normalizeStreet(a.title ?? "")),
  );
  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : undefined;
}

export function getAgentByPostcode(
  agents: Agent[],
  plz: string,
): Agent | undefined {
  return agents.find((a) => a.address?.postcode?.value === plz);
}

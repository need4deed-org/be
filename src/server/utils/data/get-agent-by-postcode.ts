import Agent from "../../../data/entity/opportunity/agent.entity";

function normalizeStreet(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*stra(?:ße|sse)\b/g, "str") // straße / strasse → str
    .replace(/\s*str\./g, "str")             // str.  → str
    .replace(/\s+str\b/g, "str");            // " str" → str
}

// "Hausvaterweg 21" → "hausvaterweg", "Berliner Str. 5-7" → "berlinerstr"
// [\w-]* handles hyphenated ranges like "5-7"
function extractStreetName(s: string): string {
  return normalizeStreet(s).replace(/\s+\d+[\w-]*$/, "").trim();
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
  //    whole word in agent title + PLZ from either address.postcode or agentPostcode
  const streetName = extractStreetName(street);
  if (!streetName) return undefined;
  const streetRegex = streetNameWordRegex(streetName);
  return agents.find(
    (a) =>
      agentHasPlz(a, plz) &&
      streetRegex.test(normalizeStreet(a.title ?? "")),
  );
}

export function getAgentByPostcode(
  agents: Agent[],
  plz: string,
): Agent | undefined {
  return agents.find((a) => a.address?.postcode?.value === plz);
}

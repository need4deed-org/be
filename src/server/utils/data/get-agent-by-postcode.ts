import Agent from "../../../data/entity/opportunity/agent.entity";

function normalizeStreet(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*stra(?:ße|sse)\b/g, "str") // straße / strasse → str
    .replace(/\s*str\./g, "str")             // str.  → str
    .replace(/\s+str\b/g, "str");            // " str" → str
}

const HOUSE_NUMBER_RE = /\s+(\d+[\w-]*(?:\s+[a-z]+)?)$/;

// "Hausvaterweg 21" → "hausvaterweg", "Berliner Str. 5 A" → "berlinerstr"
function extractStreetName(s: string): string {
  return normalizeStreet(s).replace(HOUSE_NUMBER_RE, "").trim();
}

// "Hausvaterweg 21" → "21", "Berliner Str. 5 A" → "5 a", undefined if none
function extractHouseNumber(s: string): string | undefined {
  return normalizeStreet(s).match(HOUSE_NUMBER_RE)?.[1];
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
  const streetName = extractStreetName(street);
  if (!streetName) return undefined;
  const streetRegex = streetNameWordRegex(streetName);
  const fuzzyMatches = agents.filter(
    (a) =>
      agentHasPlz(a, plz) &&
      streetRegex.test(normalizeStreet(a.title ?? "")),
  );

  if (fuzzyMatches.length === 1) return fuzzyMatches[0];

  // Multiple agents on the same street — narrow by house number in title
  // (~70% of agents include the number in their title, e.g. "Refugium Staukowerstrase 5")
  if (fuzzyMatches.length > 1) {
    const houseNumber = extractHouseNumber(street);
    if (houseNumber) {
      const numberRegex = streetNameWordRegex(houseNumber);
      const byNumber = fuzzyMatches.filter((a) =>
        numberRegex.test(normalizeStreet(a.title ?? "")),
      );
      if (byNumber.length === 1) return byNumber[0];
    }
  }

  return undefined;
}

export function getAgentByPostcode(
  agents: Agent[],
  plz: string,
): Agent | undefined {
  return agents.find((a) => a.address?.postcode?.value === plz);
}

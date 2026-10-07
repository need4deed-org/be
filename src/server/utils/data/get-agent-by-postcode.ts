import Agent from "../../../data/entity/opportunity/agent.entity";

function normalizeStreet(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*stra(?:ße|sse)\b/g, "str")
    .replace(/\s*str\./g, "str")
    .replace(/\s+str\b/g, "str");
}

const HOUSE_NUMBER_RE = /\s+(\d+[\w-]*(?:\s+[a-z]+)?)$/;

function extractStreetName(s: string): string {
  return normalizeStreet(s).replace(HOUSE_NUMBER_RE, "").trim();
}

function extractHouseNumber(s: string): string | undefined {
  return normalizeStreet(s).match(HOUSE_NUMBER_RE)?.[1];
}

function agentHasPlz(a: Agent, plz: string): boolean {
  if (a.address?.postcode?.value === plz) {
    return true;
  }
  return !!a.agentPostcode?.some((ap) => ap.postcode?.value === plz);
}

function streetNameWordRegex(streetName: string): RegExp {
  const escaped = streetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, "u");
}

export function getAgentByAddress(
  agents: Agent[],
  street: string,
  plz?: string,
): Agent | undefined {
  const normStreet = normalizeStreet(street);

  const strict = agents.find(
    (a) =>
      (!plz || a.address?.postcode?.value === plz) &&
      normalizeStreet(a.address?.street ?? "") === normStreet,
  );
  if (strict) {
    return strict;
  }

  const streetName = extractStreetName(street);
  if (!streetName) {
    return undefined;
  }
  const streetRegex = streetNameWordRegex(streetName);
  const houseNumber = extractHouseNumber(street);

  const fuzzyMatches = agents.filter((a) => {
    if (plz && !agentHasPlz(a, plz)) {
      return false;
    }
    if (!streetRegex.test(normalizeStreet(a.title ?? ""))) {
      return false;
    }
    const titleNumber = extractHouseNumber(a.title ?? "");
    if (titleNumber && houseNumber && titleNumber !== houseNumber) {
      return false;
    }
    return true;
  });

  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : undefined;
}

export function searchAgentCandidates(
  agents: Agent[],
  street: string,
): Agent[] {
  const normStreet = normalizeStreet(street);
  if (!normStreet) {
    return [];
  }

  return agents.filter((a) => {
    if (a.address) {
      return normalizeStreet(a.address.street ?? "").startsWith(normStreet);
    }
    return normalizeStreet(a.title ?? "").includes(normStreet);
  });
}

export function getAgentByPostcode(
  agents: Agent[],
  plz: string,
): Agent | undefined {
  return agents.find((a) => a.address?.postcode?.value === plz);
}

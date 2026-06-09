import Agent from "../../../data/entity/opportunity/agent.entity";

function normalizeStreet(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*stra(?:ße|sse)\b/g, "str") // straße / strasse → str
    .replace(/\s*str\./g, "str")             // str.  → str
    .replace(/\s+str\b/g, "str");            // " str" → str
}

export function getAgentByAddress(
  agents: Agent[],
  street: string,
  plz: string,
): Agent | undefined {
  const normStreet = normalizeStreet(street);
  return agents.find(
    (a) =>
      a.address?.postcode?.value === plz &&
      normalizeStreet(a.address?.street ?? "") === normStreet,
  );
}

export function getAgentByPostcode(
  agents: Agent[],
  plz: string,
): Agent | undefined {
  return agents.find((a) => a.address?.postcode?.value === plz);
}

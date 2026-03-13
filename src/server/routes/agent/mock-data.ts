import {
  AgentEngagementStatusType,
  AgentTrustType,
  AgentVolunteerSearchType,
  ApiAgentGet,
  ApiCommunicationGet,
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";

export function mockDataAgentGet(id: number): ApiAgentGet {
  const now = new Date();
  return {
    id: Number(id),
    title: "Hanger 1-3",
    type: undefined,
    createdAt: now,
    statusEngagement: AgentEngagementStatusType.NEW,
    volunteerSearch: AgentVolunteerSearchType.NOT_NEEDED,
    trustLevel: AgentTrustType.UNKNOWN,
    activeVolunteers: 0,
    comments: [
      {
        id: 1,
        timestamp: new Date("2025-01-15T10:00:00.000Z"),
        content: "Initial contact made with agent.",
        authorName: "Coordinator A",
        entityId: Number(id),
        entityType: "agent",
      },
      {
        id: 2,
        timestamp: new Date("2025-01-20T14:30:00.000Z"),
        content: "Follow-up scheduled for next week.",
        authorName: "Coordinator B",
        entityId: Number(id),
        entityType: "agent",
      },
    ],
    agentDetails: {
      about:
        "A refugee accommodation centre providing housing and support services for newly arrived refugees in Berlin.",
      website: "orgname.de",
      address: "Musterstraße 12, Berlin, 10115",
      organizationType: undefined,
      operator: "AWO",
      services: ["Sozialrecht", "Beratungsstelle"].join(", "),
      clientLanguages: [
        { id: 1, title: "Ukrainian" },
        { id: 2, title: "Russian" },
        { id: 3, title: "Farsi" },
        { id: 4, title: "Arabic" },
      ],
    },
  };
}

export function mockDataAgentCommunication(): ApiCommunicationGet[] {
  return [
    {
      id: 1001,
      contactType: ContactType.CALL,
      contactMethod: ContactMethodType.PHONE,
      communicationType: CommunicationType.FIRST_INQUIRY,
      date: new Date("2025-06-01T10:00:00.000Z"),
      volunteerId: 0,
      userId: 1,
    },
    {
      id: 1002,
      contactType: ContactType.TEXT_EMAIL,
      contactMethod: ContactMethodType.EMAIL,
      communicationType: CommunicationType.POST_FOLLOWUP,
      date: new Date("2025-06-10T14:30:00.000Z"),
      volunteerId: 0,
      userId: 1,
    },
  ];
}

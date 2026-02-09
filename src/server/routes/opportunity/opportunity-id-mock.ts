export async function mockOppId(request, reply) {
  const { id } = request.params as { id: string };
  const now = new Date().toISOString();
  return reply.status(200).send({
    message: "Opportunity fetched successfully",
    data: {
      id: Number(id),
      title: "Help at Community Garden Kreuzberg",
      type: "regular",
      volunteerType: "regular",
      status: "new",
      statusOpportunity: "new",
      createdAt: now,
      category: { id: 1, title: { en: "Social", de: "Soziales" } },
      languages: [
        { id: 1, title: "German" },
        { id: 2, title: "English" },
      ],
      activities: [
        { id: 1, title: "Gardening" },
        { id: 2, title: "Community Support" },
      ],
      skills: [
        { id: 1, title: "Communication" },
        { id: 2, title: "Teamwork" },
      ],
      location: [{ id: 1, title: "Kreuzberg" }],
      availability: [
        { id: 1, day: "Monday", daytime: "08-11" },
        { id: 2, day: "Wednesday", daytime: "14-17" },
      ],
      contact: {
        name: "Maria Schmidt",
        phone: "+49 170 1234567",
        email: "maria.schmidt@example.org",
        waysToContact: ["email", "mobilePhone"],
      },
      agent: {
        type: "rac",
        name: "Hanger 1-3",
        address: "Oranienstr. 34, 10999 Berlin",
        district: { id: 1, title: { en: "Kreuzberg", de: "Kreuzberg" } },
      },
      accompanyingDetails: {
        appointmentAddress: "",
        refugeeNumber: "",
        refugeeName: "",
      },
      comments: [
        {
          id: 1,
          content: "Initial contact established with the organization.",
          authorName: "Coordinator A",
          timestamp: now,
        },
      ],
    },
    count: 1,
  });
}

import json
import sys
import uuid

from utils import (
    get_address,
    get_email,
    get_list,
    get_name_fields,
    get_parsed_cli,
    get_string_or_null,
)

delimiter = "<|>"


class Agent:
    """
    A class to handle RACs data processing.
    """

    def __init__(self, agent, scramble: bool):
        self.agent = agent
        self.scramble = scramble

    def get_person_data(self):
        """
        Extracts and formats person data from a volunteer dictionary.
        """
        if not self.agent or not isinstance(self.agent, dict):
            return None

        return [
            {
                **get_name_fields(
                    self.agent.get(f"Contact Name {n}", ""), scramble=self.scramble
                ),
                # "name": self.agent.get(f"Contact Name {n}", ""),
                "email": get_email(
                    self.agent.get(f"Email {n}", ""),
                    scramble=self.scramble,
                ),
                "phone": get_string_or_null(
                    self.agent.get(f"Moblie {n}", ""), scramble=self.scramble
                ),
                "landline": get_string_or_null(
                    self.agent.get(f"Landline {n}", ""), scramble=self.scramble
                ),
                "role": get_string_or_null(
                    self.agent.get(f"Role {n}", ""), scramble=self.scramble
                ),
            }
            for n in range(1, 4)
        ]

    def get_organization_data(self):
        """
        Extracts and formats organization data from a volunteer dictionary.
        """
        if not self.agent or not isinstance(self.agent, dict):
            return None

        return {
            "title": get_string_or_null(
                self.agent.get("Operator", ""), scramble=self.scramble
            ),
        }

    def get_id(self):
        return get_string_or_null(self.agent.get("ID", ""))

    def get_about(self):
        return delimiter.join(
            [
                (get_string_or_null(self.agent.get(about, "")) or "")
                for about in [
                    "About",
                    "Clients (About)",
                    "Collab NGOs (about)",
                    "Countries of origin (About)",
                    "Employees (About)",
                    "How long do they live in RAC? (About) ",
                    "Languages (employees) (About)" "Living situation (About)",
                    "Needs of kids (About)",
                    "Needs of men (about)",
                    "Needs of women (About)",
                    "Position",
                ]
            ]
        )

    def get_opportunity_nids(self):
        opportunity_nids = (
            get_string_or_null(self.agent.get("Volunteering Opportunities ID", ""))
            or ""
        )
        return get_list(
            [opportunity_nid.strip() for opportunity_nid in opportunity_nids.split(",")]
        )

    def get_accompanying_relations(self):
        opportunity_relations = (
            get_string_or_null(self.agent.get("Volunteering Opportunities ID", ""))
            or ""
        )
        return get_list(
            [
                opportunity_rel.strip()
                for opportunity_rel in opportunity_relations.split(",")
            ]
        )

    def get_services(self):
        services = get_string_or_null(self.agent.get("Services", "")) or ""
        return get_list([service.strip() for service in services.split(",")])

    def get_languages(self):
        services = get_string_or_null(self.agent.get("Clients languages", "")) or ""
        return get_list([service.strip() for service in services.split(",")])

    def get_title(self):
        return get_string_or_null(self.agent.get("\ufeffName", ""))

    def get_status_engagement(self):
        return get_string_or_null(self.agent.get("Engagment status", ""))

    def get_status_search(self):
        return get_string_or_null(self.agent.get("Volunteer search", ""))

    def get_type(self):
        return get_string_or_null(self.agent.get("Type of organisation", ""))

    def get_district(self):
        return get_string_or_null(self.agent.get("District", ""))

    def get_trust_level(self):
        return get_string_or_null(self.agent.get("Trust level", ""))

    def get_website(self):
        return get_string_or_null(self.agent.get("Website", ""))

    def get_phone(self):
        return get_string_or_null(self.agent.get("Phone", ""))

    def get_address(self):
        return get_address(self.agent.get("Address", ""))

    def get_postcodes(self):
        return self.agent.get("PLZ", "")

    def get_status(self):
        return get_string_or_null(self.agent.get("  Status", ""))


def get_agent(agent, scramble=False):
    """
    Processes a agent object and returns a structured JSON.
    """
    if not agent or not isinstance(agent, dict):
        return None

    agent_instance = Agent(agent, scramble)
    return {
        "nid": agent_instance.get_id(),
        "title": agent_instance.get_title(),
        "about": agent_instance.get_about(),
        "website": agent_instance.get_website(),
        "type": agent_instance.get_type(),
        "district": agent_instance.get_district(),
        "trustLevel": agent_instance.get_trust_level(),
        "statusEngagement": agent_instance.get_status_engagement(),
        "statusSearch": agent_instance.get_status_search(),
        "languages": agent_instance.get_languages(),
        "services": agent_instance.get_services(),
        "address": agent_instance.get_address(),
        "postcodes": [
            postcode.strip()
            for postcode in agent_instance.get_postcodes().split(",")
            if postcode
        ],
        "phone": agent_instance.get_phone(),
        "status": agent_instance.get_status(),
        "person": agent_instance.get_person_data(),
        "operator": agent_instance.get_organization_data(),
        "opportunityNids": agent_instance.get_opportunity_nids(),
        "accompanyingRelations": agent_instance.get_accompanying_relations(),
    }


if __name__ == "__main__":
    scramble, file_url = get_parsed_cli(sys.argv)

    if not file_url:
        print(f"Usage: python {sys.argv[0]} <path_to_agent_json>")
        sys.exit(1)

    try:
        with open(file_url, "r") as file:
            agent_data = json.load(file)
            result = [get_agent(agent, scramble=bool(scramble)) for agent in agent_data]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)

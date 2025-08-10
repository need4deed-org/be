import json
import sys
import uuid

from utils import (get_address, get_email, get_list, get_name_fields,
                   get_string_or_null)


class Agent:
    """
    A class to handle RACs data processing.
    """

    def __init__(self, agent):
        self.agent = agent

    def get_person_data(self):
        """
        Extracts and formats person data from a volunteer dictionary.
        """
        if not self.agent or not isinstance(self.agent, dict):
            return None
        
        return {
            "id": uuid.uuid4().hex,
            **get_name_fields(self.agent.get("Volunteer Coordinator", "")),
            "email": get_email(self.agent.get("Email (volunteer coordinator)", "")),
            "phone": get_string_or_null(self.agent.get("Moblie", "")),
        }
    
    def get_organization_data(self):
        """
        Extracts and formats organization data from a volunteer dictionary.
        """
        if not self.agent or not isinstance(self.agent, dict):
            return None
        
        return {
            "id": uuid.uuid4().hex,
            "title": get_string_or_null(self.agent.get("Operator", "")),
            "address": {"id": uuid.uuid4().hex, **get_address(self.agent.get("Address", ""))},
            "phone": get_string_or_null(self.agent.get("Phone", "")),
            "email": get_email(self.agent.get("Email", "")),
        }
    def get_title(self):
        return get_string_or_null(self.agent.get("Name", ""))

    def get_type(self):
        return get_string_or_null(self.agent.get("Type", ""))

    def get_district(self):
        return get_string_or_null(self.agent.get("District", ""))

def get_agent(agent):
    """
    Processes a agent object and returns a structured JSON.
    """
    if not agent or not isinstance(agent, dict):
        return None

    agent_instance = Agent(agent)
    return {
        "id": uuid.uuid4().hex,
        "title": agent_instance.get_title(),
        "type": agent_instance.get_type(),
        "district": agent_instance.get_district(),
        "person": agent_instance.get_person_data(),
        "organization": agent_instance.get_organization_data(),
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path_to_agent_json>")
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as file:
            agent_data = json.load(file)
            result = [get_agent(agent) for agent in agent_data]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)
import json
import sys

from utils import (get_email, get_list, get_name_fields, get_string_or_null,
                   get_timeslot_data, is_valid_js_date)


class Opportunity:
    """
    A class to handle opportunity data processing.
    """

    def __init__(self, opportunity):
        self.opportunity = opportunity

    def get_agent_data(self):
        """
        Extracts and formats agent data from a opportunity dictionary.
        """
        if not self.opportunity or not isinstance(self.opportunity, dict):
            return None
        
        return {}

    def get_deal_data(self):
        """
        Extracts and formats deal data from a opportunity dictionary.
        """
        if not self.opportunity or not isinstance(self.opportunity, dict):
            return None
    
        def get_profile_data():
            """
            Extracts profile data from the opportunity dictionary.
            """
            activities = [activity.strip() for activity in self.opportunity.get("Type", "").split(",")]
            skills = [activity.strip() for activity in self.opportunity.get("Skills", "").split(",")]
            languages = [get_list(language.strip().split(" ")) for language in self.opportunity.get("Refugee Languages", "").split(",")]

            return {
                "info": get_string_or_null(self.opportunity.get("Comments", "")),
                "activities": get_list(activities),
                "skills": get_list(skills),
                "languages": get_list(languages),
            }
        
        def get_time_data():
            """
            Extracts time data from the opportunity dictionary.
            """
            timeslot = {}
            info = self.opportunity.get("VO Schedule", None)
            start = self.opportunity.get("Date, time", None)
            if start and not is_valid_js_date(start):
                info = start
                start = None
            if info:
                timeslot["info"] = info
            if start:
                timeslot["start"] = start

            return {
                "timeslots": [timeslot],
            }
        
        def get_location_data():
            """
            Extracts location data from the opportunity dictionary.
            """
            districts = [district.strip() for district in self.opportunity.get("District VO", "").split(",")]

            return {"districts": get_list(districts)}
        
        return {
            "type": "opportunity",
            "postcode": get_string_or_null(self.get_postcode()),
            "profile": get_profile_data(),
            "time": get_time_data(),
            "location": get_location_data(),
        }

    def get_info(self):
        """
        Extracts info from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("VO information", ""))

    def get_info_confidential(self):
        """
        Extracts confidential info from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("AA information", ""))

    def get_status(self):
        """
        Extracts Status from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Status", ""))

    def get_type(self):
        """
        Extracts type from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Opp Type", ""))

    def get_translation_type(self):
        """
        Extracts translation type from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Translation", ""))
    
    def get_postcode(self):
        """
        Extracts postcode from the opportunity dictionary.
        """
        postcode = str(self.opportunity.get("Postcode", None))
        if postcode:
            return postcode[:5]
        else:
            rac_contact = self.opportunity.get("RAC Contact", None)
            if rac_contact:
                rac_contact = rac_contact.split("<|>")
            if rac_contact and len(rac_contact) == 5:
                return rac_contact[4]

        return None

def get_opportunity(opportunity):
    """
    Processes an opportunity object and returns a structured JSON.
    """
    if not opportunity or not isinstance(opportunity, dict):
        return None

    opportunity_instance = Opportunity(opportunity)
    return {
        "status": opportunity_instance.get_status(),
        "type": opportunity_instance.get_type(),
        "translationType": opportunity_instance.get_translation_type(),
        "info": opportunity_instance.get_info(),
        "infoConfidential": opportunity_instance.get_info_confidential(),
        "deal": opportunity_instance.get_deal_data(),
        "agent": opportunity_instance.get_agent_data(),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path_to_opportunity_json>")
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as file:
            opportunity_data = json.load(file)
            result = [get_opportunity(opportunity) for opportunity in opportunity_data]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing opportunity data: {e}")
        sys.exit(1)
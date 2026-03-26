import json
import sys

from utils import (
    get_dict_or_null,
    get_email,
    get_language_split,
    get_list,
    get_list_item_safe,
    get_name_fields,
    get_parsed_cli,
    get_string_or_null,
    get_timeslot_data,
    is_valid_js_date,
)


class Opportunity:
    """
    A class to handle opportunity data processing.
    """

    def __init__(self, opportunity, scramble):
        self.opportunity = opportunity
        self.scramble = scramble

    def get_agent_data(self):
        """
        Extracts and formats agent data from a opportunity dictionary.
        """
        if not self.opportunity or not isinstance(self.opportunity, dict):
            return None

        def get_agent_title():
            """
            Calculates agent title from the opportunity dictionary.
            """
            title = self.opportunity.get("Accommodation Centre", "")
            if type(title) == str:
                return (
                    get_string_or_null(
                        title[: title.find(" (")], scramble=self.scramble
                    ),
                    title[-40:-8] if len(title) > 40 else "",
                )

            return (
                get_string_or_null(
                    f"noname {get_list_item_safe(self.opportunity.get('RAC Contact','').split('<|>'), 1) or ''}".strip(),
                    scramble=self.scramble,
                ),
                "",
            )

        def get_person_data():
            """
            Extracts and formats person data from a volunteer dictionary.
            """
            rac_contact = self.opportunity.get("RAC Contact", "").split("<|>")
            if len(rac_contact) == 5:
                name, email, phone, _, postcode = self.opportunity.get(
                    "RAC Contact", ""
                ).split("<|>")
                return {
                    **get_name_fields(name, scramble=self.scramble),
                    "email": get_email(email, scramble=self.scramble),
                    "phone": get_string_or_null(phone, scramble=self.scramble),
                    "address": {
                        "postcode": get_string_or_null(postcode, scramble=self.scramble)
                    },
                }

            return None

        title, page_id = get_agent_title()
        person = get_person_data()
        organization = {"title": title, "person": person}
        postcode = (
            person["address"]["postcode"] if person and person.get("address") else None
        )

        return {
            "title": title,
            "page_id": page_id,
            "organization": organization,
            "person": person,
            "postcode": postcode,
        }

    def get_accompanying_data(self):
        """
        Extracts and formats accompanying data from a opportunity dictionary.
        """
        return {
            "address": get_string_or_null(
                self.opportunity.get("Address", ""), scramble=self.scramble
            ),
            "name": get_string_or_null(
                self.opportunity.get("Refugee Name", ""), scramble=self.scramble
            ),
            "phone": get_string_or_null(
                self.opportunity.get("Refugee Phone", ""), scramble=self.scramble
            ),
            "date": get_string_or_null(self.opportunity.get("Date, time", "")),
            "languageToTranslate": get_string_or_null(
                self.opportunity.get("Translation", "")
            ),
        }

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
            activities = [
                activity.strip()
                for activity in self.opportunity.get("Type", "").split(",")
            ]
            skills = [
                activity.strip()
                for activity in self.opportunity.get("Skills", "").split(",")
            ]
            languages = [
                get_list(get_language_split(language.strip()))
                for language in self.opportunity.get("Refugee Languages", "").split(",")
            ]

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
                return {
                    "timeslots": [{"info": start}],
                }
            if info:
                timeslots = [
                    get_timeslot_data(timeslot.strip()) for timeslot in info.split(",")
                ]
                return {
                    "timeslots": get_list(timeslots),
                }
            if start:
                return {
                    "timeslots": [{"start": start}],
                }
            return None

        def get_location_data():
            """
            Extracts location data from the opportunity dictionary.
            """
            districts = [
                district.strip()
                for district in self.opportunity.get("District VO", "").split(",")
            ]

            return {"districts": get_list(districts)}

        return {
            "type": "opportunity",
            "postcode": get_string_or_null(self.get_postcode()),
            "profile": get_profile_data(),
            "time": get_time_data(),
            "location": get_location_data(),
        }

    def get_title(self):
        """
        Extracts title from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("\ufeffName", ""))

    def get_nid(self):
        """
        Extracts notion id from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("ID", ""))

    def get_info(self):
        """
        Extracts info from the opportunity dictionary.
        """
        return get_string_or_null(
            self.opportunity.get("VO information", ""), scramble=self.scramble
        )

    def get_info_confidential(self):
        """
        Extracts confidential info from the opportunity dictionary.
        """
        return get_string_or_null(
            self.opportunity.get("AA Information", ""), scramble=self.scramble
        )

    def get_status(self):
        """
        Extracts Status from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Status", ""))

    def get_matching_status(self):
        """
        Extracts Matching Status from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Matching status", ""))

    def get_number_volunteers(self):
        return get_string_or_null(
            self.opportunity.get("Number of volunteers needed", "")
        )

    def get_volunteer_nids(self):
        return (
            [
                (nid.strip(), "opp-pending")
                for nid in self.opportunity.get("Contacted Volunteers ID ", "").split(
                    ","
                )
                if nid
            ]
            + [
                (nid.strip(), "opp-matched")
                for nid in self.opportunity.get("Matched Volunteers ID", "").split(",")
                if nid
            ]
            + [
                (nid.strip(), "opp-active")
                for nid in self.opportunity.get("Active Volunteers ID", "").split(",")
                if nid
            ]
        )

    def get_type(self):
        """
        Extracts type from the opportunity dictionary.
        """
        return get_string_or_null(self.opportunity.get("Opp Type", ""))

    def get_postcode(self):
        """
        Extracts postcode from the opportunity dictionary.
        """
        postcode = str(self.opportunity.get("Postcode", None))
        if postcode and postcode != "None":
            return postcode[:5]
        else:
            rac_contact = self.opportunity.get("RAC Contact", None)
            if rac_contact:
                rac_contact = rac_contact.split("<|>")
            if rac_contact and len(rac_contact) == 5:
                return rac_contact[4]

        return None


def get_opportunity(opportunity, scramble=False):
    """
    Processes an opportunity object and returns a structured JSON.
    """
    if not opportunity or not isinstance(opportunity, dict):
        return None

    opportunity_instance = Opportunity(opportunity, scramble)
    return {
        "title": opportunity_instance.get_title(),
        "status": opportunity_instance.get_status(),
        "type": opportunity_instance.get_type(),
        "numberVolunteers": opportunity_instance.get_number_volunteers(),
        "info": opportunity_instance.get_info(),
        "infoConfidential": opportunity_instance.get_info_confidential(),
        "matchingStatus": opportunity_instance.get_matching_status(),
        "deal": opportunity_instance.get_deal_data(),
        "accompanying": get_dict_or_null(opportunity_instance.get_accompanying_data()),
        "nid": opportunity_instance.get_nid(),
        "volunteerNids": opportunity_instance.get_volunteer_nids(),
    }


if __name__ == "__main__":
    scramble, file_url = get_parsed_cli(sys.argv)

    if not file_url:
        print(f"Usage: python {sys.argv[0]} <path_to_volunteer_json>")
        sys.exit(1)

    try:
        with open(file_url, "r") as file:
            opportunity_data = json.load(file)
            result = [
                get_opportunity(opportunity, bool(scramble))
                for opportunity in opportunity_data
            ]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing opportunity data: {e}")
        sys.exit(1)

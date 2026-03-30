import json
import sys

from utils import (
    get_email,
    get_language_split,
    get_list,
    get_name_fields,
    get_parsed_cli,
    get_string_or_null,
    get_timeslot_data,
)


class Volunteer:
    """
    A class to handle volunteer data processing.
    """

    def __init__(self, volunteer, scramble):
        self.volunteer = volunteer
        self.scramble = scramble

    def get_nid(self):
        """
        Extracts notion id volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("ID", ""))

    def get_person_data(self):
        """
        Extracts and formats person data from a volunteer dictionary.
        """
        if not self.volunteer or not isinstance(self.volunteer, dict):
            return None

        return {
            **get_name_fields(self.volunteer.get("Name", ""), scramble=self.scramble),
            "email": get_email(
                self.volunteer.get("﻿E-mail", ""), scramble=self.scramble
            ),
            "phone": get_string_or_null(
                self.volunteer.get("Phone Number", ""), scramble=self.scramble
            ),
            "address": {
                "postcode": get_string_or_null(
                    self.volunteer.get("Post code", ""), scramble=self.scramble
                )
            },
        }

    def get_deal_data(self):
        """
        Extracts and formats deal data from a volunteer dictionary.
        """
        if not self.volunteer or not isinstance(self.volunteer, dict):
            return None

        def get_profile_data():
            """
            Extracts profile data from the volunteer dictionary.
            """
            activities = [
                activity.strip()
                for activity in self.volunteer.get("Activities", "").split(",")
            ]
            skills = [
                activity.strip()
                for activity in self.volunteer.get("Skills", "").split(",")
            ]
            languages = [
                get_list(get_language_split(language.strip()))
                for language in self.volunteer.get("Languages", "").split(",")
            ]

            return {
                "info": get_string_or_null(
                    self.volunteer.get("Comments", ""), scramble=self.scramble
                ),
                "activities": get_list(activities),
                "skills": get_list(skills),
                "languages": get_list(languages),
            }

        def get_time_data():
            """
            Extracts time data from the volunteer dictionary.
            """
            timeslots = [
                get_timeslot_data(timeslot.strip())
                for timeslot in self.volunteer.get("Days", "").split(",")
            ]

            return {
                "timeslots": get_list(timeslots),
            }

        def get_location_data():
            """
            Extracts location data from the volunteer dictionary.
            """
            districts = [
                district.strip()
                for district in self.volunteer.get(
                    "Preferred Volunteering Locations", ""
                ).split(",")
            ]

            return {"districts": get_list(districts)}

        return {
            "type": "volunteer",
            "postcode": get_string_or_null(str(self.volunteer.get("Post code"))),
            "profile": get_profile_data(),
            "time": get_time_data(),
            "location": get_location_data(),
        }

    def get_info_about(self):
        """
        Extracts comments from the volunteer dictionary.
        """
        return get_string_or_null(
            self.volunteer.get("Comments", ""), scramble=self.scramble
        )

    def get_info_experience(self):
        """
        Extracts coordinator comments from the volunteer dictionary.
        """
        return get_string_or_null(
            self.volunteer.get("Coordinator Comments", ""), scramble=self.scramble
        )

    def get_timestamp(self):
        """
        Extracts coordinator comments from the volunteer dictionary.
        """
        return get_string_or_null(
            self.volunteer.get("Timestamp", ""),
        )

    def get_status(self):
        """
        Extracts Status from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Status", ""))

    def get_status_engagement(self):
        """
        Extracts Status of engagement from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Engagement status", ""))

    def get_cgc(self):
        """
        Extracts certificate of good conduct status from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Certificate of good conduct", ""))

    def get_vaccination(self):
        """
        Extracts vaccination status from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Measles vacc", ""))

    def get_accompanying(self):
        """
        Extracts accompanying flag from the volunteer dictionary.
        """
        return bool(self.volunteer.get("Accompanying", ""))


def get_volunteer(volunteer, scramble=False):
    """
    Processes a volunteer object and returns a structured JSON.
    """
    if not volunteer or not isinstance(volunteer, dict):
        return None

    volunteer_instance = Volunteer(volunteer, scramble)
    return {
        "nid": volunteer_instance.get_nid(),
        "status": volunteer_instance.get_status(),
        "statusEngagement": volunteer_instance.get_status_engagement(),
        "accompanying": volunteer_instance.get_accompanying(),
        "statusVaccination": volunteer_instance.get_vaccination(),
        "statusCGC": volunteer_instance.get_cgc(),
        "infoAbout": volunteer_instance.get_info_about(),
        "infoExperience": volunteer_instance.get_info_experience(),
        "timestamp": volunteer_instance.get_timestamp(),
        "person": volunteer_instance.get_person_data(),
        "deal": volunteer_instance.get_deal_data(),
    }


if __name__ == "__main__":
    scramble, file_url = get_parsed_cli(sys.argv)

    if not file_url:
        print(f"Usage: python {sys.argv[0]} <path_to_volunteer_json>")
        sys.exit(1)

    try:
        with open(file_url, "r") as file:
            volunteer_data = json.load(file)
            result = [
                get_volunteer(volunteer, scramble=bool(scramble))
                for volunteer in volunteer_data
            ]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)

import json
import sys

from utils import (get_email, get_list, get_name_fields, get_string_or_null,
                   get_timeslot_data)


class Volunteer:
    """
    A class to handle volunteer data processing.
    """

    def __init__(self, volunteer):
        self.volunteer = volunteer

    def get_person_data(self):
        """
        Extracts and formats person data from a volunteer dictionary.
        """
        if not self.volunteer or not isinstance(self.volunteer, dict):
            return None
        
        return {
            **get_name_fields(self.volunteer.get("Name", "")),
            "email": get_email(self.volunteer.get("E-mail", "")),
            "phone": get_string_or_null(self.volunteer.get("Phone Number", "")),
            "address": {"postcode": get_string_or_null(self.volunteer.get("Post code", ""))},
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
            activities = [activity.strip() for activity in self.volunteer.get("Activities", "").split(",")]
            skills = [activity.strip() for activity in self.volunteer.get("Skills", "").split(",")]
            languages = [get_list(activity.strip().split(" ")) for activity in self.volunteer.get("Languages", "").split(",")]

            return {
                "info": get_string_or_null(self.volunteer.get("Comments", "")),
                "activities": get_list(activities),
                "skills": get_list(skills),
                "languages": get_list(languages),
            }
        
        def get_time_data():
            """
            Extracts time data from the volunteer dictionary.
            """
            timeslots = [get_timeslot_data(timeslot.strip()) for timeslot in self.volunteer.get("Days", "").split(",")]

            return {
                "timeslots": get_list(timeslots),
            }
        
        def get_location_data():
            """
            Extracts location data from the volunteer dictionary.
            """
            districts = [district.strip() for district in self.volunteer.get("Preferred Volunteering Locations", "").split(",")]

            return {"districts": get_list(districts)}
        
        return {
            "type": "volunteer",
            "postcode": get_string_or_null(str(self.volunteer.get("Post code"))),
            "profile": get_profile_data(),
            "time": get_time_data(),
            "location": get_location_data(),
        }
    
    def get_info(self):
        """
        Extracts certificate of good conduct status from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Coordinator Comments", ""))
    
    def get_status(self):
        """
        Extracts Status from the volunteer dictionary.
        """
        return get_string_or_null(self.volunteer.get("Status", ""))
    
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
    
def get_volunteer(volunteer):
    """
    Processes a volunteer object and returns a structured JSON.
    """
    if not volunteer or not isinstance(volunteer, dict):
        return None

    volunteer_instance = Volunteer(volunteer)
    return {
        "status": volunteer_instance.get_status(),
        "statusVaccination": volunteer_instance.get_vaccination(),
        "statusCGC": volunteer_instance.get_cgc(),
        "info": volunteer_instance.get_info(),
        "person": volunteer_instance.get_person_data(),
        "deal": volunteer_instance.get_deal_data(),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path_to_volunteer_json>")
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as file:
            volunteer_data = json.load(file)
            result = [get_volunteer(volunteer) for volunteer in volunteer_data]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)
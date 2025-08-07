import json
import sys
import uuid

from utils import get_list


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
        
        def get_name_fields(name):
            """
            Extracts the name from the volunteer dictionary.
            Handles both 'Name' and 'name' keys.
            """
            name_fields = {
                "first_name": None,
                "last_name": None,
                "middle_name": None,
            }
            if not isinstance(name, str):
                return name_fields
            
            names = name.split(" ")

            if not names:
                return name_fields
            
            name_fields["first_name"] = names[0]

            if len(names) == 2:
                name_fields["last_name"] = names[1]
                return name_fields
            
            if len(names) > 2:
                name_fields["last_name"] = names[-1]
                name_fields["middle_name"] = " ".join(names[1:-1])

            return name_fields

        def get_email(email):
            """
            Extracts the email from the volunteer dictionary.
            Handles both 'E-mail' and 'email' keys.
            """
            if not isinstance(email, str):
                return None
            
            email = email.strip().lower()
            if "@" in email:
                if email.startswith("mailto:"):
                    email = email[7:]
                return email
            
            return None
        
        return {
            "id": uuid.uuid4().hex,
            **get_name_fields(self.volunteer.get("Name", "")),
            "email": get_email(self.volunteer.get("E-mail")),
            "phone": self.volunteer.get("Phone Number"),
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
                "id": uuid.uuid4().hex,
                "activities": get_list(activities),
                "skills": get_list(skills),
                "languages": get_list(languages),
            }
        
        def get_time_data():
            """
            Extracts time data from the volunteer dictionary.
            """
            def get_timeslot_data(timeslot):
                """
                Extracts timeslot data from a string.
                """
                day, *slots = timeslot.split(" ")
                if not day:
                    return None
                
                if not slots:
                    return [day, None]
                
                return [day, [slot.strip() for slot in slots if slot.strip() and slot.strip() != "|"]]
            
            timeslots = [get_timeslot_data(timeslot.strip()) for timeslot in self.volunteer.get("Days", "").split(",")]

            return {
                "id": uuid.uuid4().hex,
                "timeslots": get_list(timeslots),
            }
        
        def get_location_data():
            """
            Extracts location data from the volunteer dictionary.
            """
            districts = [district.strip() for district in self.volunteer.get("Preferred Volunteering Locations", "").split(",")]

            return {"districts": get_list(districts)}
        
        return {
            "id": uuid.uuid4().hex,
            "type": "volunteer",
            "profile": get_profile_data(),
            "time": get_time_data(),
            "location": get_location_data(),
        }
    
def get_volunteer(volunteer):
    """
    Processes a volunteer object and returns a structured JSON.
    """
    if not volunteer or not isinstance(volunteer, dict):
        return None

    volunteer_instance = Volunteer(volunteer)
    return {
        "id": uuid.uuid4().hex,
        "person": volunteer_instance.get_person_data(),
        "deal": volunteer_instance.get_deal_data(),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fill-volunteers.py <path_to_volunteer_json>")
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as file:
            volunteer_data = json.load(file)
            result = [get_volunteer(volunteer) for volunteer in volunteer_data]
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)
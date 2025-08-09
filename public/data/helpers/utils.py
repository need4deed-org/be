def get_name_fields(name):
    """
    Extracts the names from the string.
    """
    name_fields = {
        "first_name": None,
        "last_name": None,
        "middle_name": None,
    }
    if not isinstance(name, str) or len(name.strip()) == 0:
        return name_fields
    
    names = [item.strip() for item in name.split(" ") if item.strip()]
    
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
    Extracts the email from the string.
    """
    if not isinstance(email, str):
        return None
    
    email = email.strip().lower()
    if "@" in email and "." in email:
        if email.startswith("mailto:"):
            email = email[7:]
        return email
    
    return None

def get_list(lst):
    return [item for item in lst if item]

def get_string_or_null(value):
    """
    Returns the value if it exists, otherwise returns None.
    """

    return value if len(str(value)) else None

def get_timeslot_data(timeslot):
    """
    Extracts timeslot data from a string.
    4 variants of slots:
    - "Monday 8.00 - 10.00 10.00 - 12.00 12.00 - 14.00 14.00 - 16.00 16.00 - 18.00 18.00 - 20.00"
    - "Friday 14-17 | 17-20 | 11-14 | 08-11"
    - "Tuesday afternoon | noon | morning"
    - "Friday Not available"
    "Days" might be ""
    """

    timeslot = timeslot.replace(" - ", "-")
    day, *slots = timeslot.split(" ")
    if not day or " ".join(slots) == "Not available":
        return None
    
    if not slots:
        return {"day": day, "daytime": []}
    
    return {"day": day, "daytime": [slot.strip() for slot in slots if slot.strip() and slot.strip() != "|"]}
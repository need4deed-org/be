def get_name_fields(name):
    """
    Extracts the names from the string.
    """
    name_fields = {
        "firstName": None,
        "lastName": None,
        "middleName": None,
    }
    if not isinstance(name, str) or len(name.strip()) == 0:
        return name_fields
    
    names = [item.strip() for item in name.split(" ") if item.strip()]
    
    name_fields["firstName"] = names[0]
    if len(names) == 2:
        name_fields["lastName"] = names[1]
        return name_fields
    
    if len(names) > 2:
        name_fields["lastName"] = names[-1]
        name_fields["middleName"] = " ".join(names[1:-1])

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

def is_convertible_to_int(s):
    try:
        int(s)
        return True
    except (ValueError, TypeError):
        return False

def get_address(address):
    """
    Extracts address data from a string.
    examples:
        "Albert-Kuntz-Straße 63, 12627"
        "Albrechtstraße 81a 12167 Berlin"
        "Albrechtstraße 81a, 12167 Berlin"
        "Am Beelitzhof 12, 14, 14a-c, 16, 16a-c, 14129"
        "Askanierring 70A-K / Schülerbergstraße 9-11"
        "Columbiadamm 10, Hangar 1-3, 12101"
        "Seehausener Str. 47, 49, 13057"
    """
    if not isinstance(address, str) or len(address.strip()) == 0:
        return None
    
    address = address.strip()
    parts = [part.strip() for part in address.split(",")]
    postcode = None

    if "berlin" in parts[-1].lower():
        parts[-1] = parts[-1].lower()
        parts[-1] = parts[-1].replace("berlin", "").strip()
    
    if len(parts[-1]) == 5 and is_convertible_to_int(parts[-1]) and len(parts) > 0:
        postcode = parts[-1]
        parts.pop()

    return {
        "street": " ".join(parts),
        "city": "Berlin",
        "postcode": postcode,
    }

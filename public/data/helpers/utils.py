import json
import random
import string
import subprocess
from hashlib import sha256


def get_parsed_cli(argv):
    if len(argv) < 2:
        return (None, None)

    if argv[1] == "-s":
        if len(argv) < 3:
            return (None, None)
        return (True, argv[2])

    return (False, argv[1])


def get_list_item_safe(lst: list, idx: int):
    if 0 <= idx < len(lst):
        return lst[idx]

    return None


def is_valid_js_date(date_str: str) -> bool:
    """
    Checks if a string is valid date for javascript `new Date(date_str)`.
    """
    js_code = f"""
        const d = new Date("{date_str}");
        console.log(!isNaN(d));
    """
    result = subprocess.run(["node", "-e", js_code], capture_output=True, text=True)
    return result.stdout.strip() == "true"


def scramble_pii(pii: str) -> str:
    if not pii:
        return pii

    pii = pii.strip()

    # Create instance with seed derived from input
    seed = sha256(pii.encode("utf-8")).digest()
    rng = random.Random(seed)  # independent RNG

    alphabet = string.ascii_letters + string.digits

    return "".join(rng.choice(alphabet) if c in alphabet else c for c in pii)


def get_name_fields(name, scramble=False):
    """
    Extracts the names from the string.
    """
    name_fields = {
        "firstName": "",
        "lastName": None,
        "middleName": None,
    }
    if not isinstance(name, str) or len(name.strip()) == 0:
        return name_fields

    names = [
        scramble_pii(item) if scramble else item.strip()
        for item in name.split(" ")
        if item.strip()
    ]

    name_fields["firstName"] = names[0]
    if len(names) == 2:
        name_fields["lastName"] = names[1]
        return name_fields

    if len(names) > 2:
        name_fields["lastName"] = names[-1]
        name_fields["middleName"] = " ".join(names[1:-1])

    return name_fields


def get_email(email, scramble=False):
    """
    Extracts the email from the string.
    """
    if not isinstance(email, str):
        return None

    email = email.strip().lower()
    if "@" in email and "." in email:
        if email.startswith("mailto:"):
            email = email[7:]
        return scramble_pii(email) if scramble else email

    return None


def get_language_split(language):
    if not language:
        return [None]
    if language == "Northern Kurdish native":
        return ["Northern Kurdish", "native"]
    if language == "Northern Kurdish":
        return ["Northern Kurdish", "advanced"]
    language_split = language.split(" ")
    return language_split if len(language_split) == 2 else [language, "advanced"]


def get_list(lst):
    return [item for item in lst if item]


def get_string_or_null(value, scramble=False):
    """
    Returns the value if it exists, otherwise returns None.
    """
    value = str(value)

    if not len(value):
        return None

    return scramble_pii(value) if scramble else value


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

    return {
        "day": day,
        "daytime": [
            slot.strip() for slot in slots if slot.strip() and slot.strip() != "|"
        ],
    }


def is_convertible_to_int(s):
    try:
        int(s)
        return True
    except (ValueError, TypeError):
        return False


def get_address(address, scramble=False):
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

    address = address.replace("<|>", ",").replace("\n", ",").strip()
    parts = [part.strip() for part in address.split(",")]
    postcode = None

    if "berlin" in parts[-1].lower():
        parts[-1] = parts[-1].lower()
        parts[-1] = parts[-1].replace("berlin", "").strip()

    if len(parts[-1]) == 5 and is_convertible_to_int(parts[-1]) and len(parts) > 0:
        postcode = parts[-1]
        parts.pop()

    return {
        "street": get_string_or_null(" ".join(parts), scramble=scramble),
        "city": "Berlin",
        "postcode": get_string_or_null(postcode, scramble=scramble),
    }

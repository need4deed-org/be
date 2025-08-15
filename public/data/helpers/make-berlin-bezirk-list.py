import json
import sys


def get_districts(districts_data):
    """
    Extracts the district name and its ID from a district GeoJSON feature.
    """
    districts = []
    def get_or_create_district(district_name):
        district = next((item for item in districts if item["district"] == district_name), None)
        if not district:
            district = {"district": district_name, "plzs": []}
            districts.append(district)

        return district

    for item in districts_data:
        district = get_or_create_district(item.get("District"))
        plz = item.get("Postcode")
        district["plzs"].append(str(plz))
    return districts

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path_to_berlin_districts_json>")
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as file:
            district_data = json.load(file)
            result = get_districts(district_data)
            print(json.dumps(result, indent=4))
    except Exception as e:
        print(f"Error processing volunteer data: {e}")
        sys.exit(1)
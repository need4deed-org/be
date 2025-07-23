import json
import sys

from shapely.geometry import MultiPolygon, Polygon, shape


def calculate_centroid(geojson_feature):
    """
    Calculates the centroid (geometric center) for a given GeoJSON feature.
    Handles both Polygon and MultiPolygon geometries.
    """
    plz = geojson_feature['properties']['plz']
    geometry = geojson_feature['geometry']

    try:
        # Create a shapely geometry object from the GeoJSON geometry
        # shapely.geometry.shape can correctly parse GeoJSON geometry dictionaries
        geom = shape(geometry)

        # Calculate the centroid of the geometry
        # For a Polygon, this is its true geometric center.
        # For a MultiPolygon, it's the centroid of the union of all its constituent polygons.
        centroid = geom.centroid

        # Shapely's .x is longitude, .y is latitude
        return {
            "plz": plz,
            "latitude": centroid.y,
            "longitude": centroid.x
        }
    except Exception as e:
        # In case of invalid geometry or other processing errors,
        # print an error to stderr and return None for coordinates.
        print(f"Error processing PLZ {plz}: {e}. Skipping centroid calculation for this feature.", file=sys.stderr)
        return {
            "plz": plz,
            "latitude": None,
            "longitude": None,
            "error": str(e) # Include error message for debugging
        }

if __name__ == "__main__":
    input_data = "plz-geojson.json" 
    with open(input_data, "r") as f:
        try:
            data = json.loads(f.read())
            features = data.get("features", [])
        except json.JSONDecodeError as e:
            print(f"Error parsing input JSON: {e}", file=sys.stderr)
            sys.exit(1)

    results = []
    for feature in features:
        # Ensure the feature has the expected structure before processing
        if 'properties' in feature and 'plz' in feature['properties'] and 'geometry' in feature:
            print(f"adding plz {feature['properties']['plz']}")
            centroid_data = calculate_centroid(feature)
            results.append(centroid_data)
        else:
            print(f"Skipping malformed feature (missing 'properties.plz' or 'geometry'): {feature}", file=sys.stderr)

    # Output the results as a single JSON array
    print(json.dumps(results, indent=2))

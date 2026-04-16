#!/usr/bin/env python3
"""
Convert Notion volunteer CSV export to JSON for the BE migration script.

Usage:
  python3 scripts/csv-to-json.py <csv_file> <output_json>

Example:
  python3 scripts/csv-to-json.py "volunteers.csv" volunteers-migration.json
"""

import csv
import json
import sys

# Column indices (from header row — top row in the revised Notion export)
COL = {
    "email": 0,
    "appreciation": 9,
    "cgc": 10,
    "volunteer_comments": 11,
    "coordinator_comments": 13,
    "status": 16,
    "notion_id": 20,
    "matching_status": 23,
    "name": 25,
    "active_opp_ids": 41,      # VO active ID   — comma-separated VOL-xxx
    "contacted_opp_ids": 43,   # VO contacted ID — comma-separated VOL-xxx
    "matched_opp_ids": 45,     # VO matched ID   — comma-separated VOL-xxx
}


def get_col(row: list[str], key: str) -> str:
    idx = COL[key]
    return row[idx].strip() if len(row) > idx else ""


def split_ids(raw: str) -> list[str]:
    """Split a comma-separated VOL-xxx string into a clean list."""
    return [v.strip() for v in raw.split(",") if v.strip().startswith("VOL-")]


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 csv-to-json.py <csv_file> <output_json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Detect header position: if row 0 col[20] is a label it's at the top,
    # otherwise (legacy Notion export) the header is the last row.
    if rows and rows[0][COL["notion_id"]].strip() not in ("", ) and \
            not rows[0][COL["notion_id"]].strip().startswith("VOLVO-"):
        data_rows = rows[1:]   # header at top
    else:
        data_rows = rows[:-1]  # header at bottom (legacy)

    volunteers = []
    skipped = 0

    for row in data_rows:
        notion_id = get_col(row, "notion_id")
        if not notion_id or not notion_id.startswith("VOLVO-"):
            skipped += 1
            continue

        volunteers.append(
            {
                "notionId": notion_id,
                "status": get_col(row, "status"),
                "appreciation": get_col(row, "appreciation"),
                "cgc": get_col(row, "cgc"),
                "coordinatorComments": get_col(row, "coordinator_comments"),
                "volunteerComments": get_col(row, "volunteer_comments"),
                "activeOpportunityIds": split_ids(get_col(row, "active_opp_ids")),
                "contactedOpportunityIds": split_ids(get_col(row, "contacted_opp_ids")),
                "matchedOpportunityIds": split_ids(get_col(row, "matched_opp_ids")),
            }
        )

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(volunteers, f, ensure_ascii=False, indent=2)

    print(f"Done: {len(volunteers)} volunteers written to {output_file}")
    if skipped:
        print(f"Skipped {skipped} rows without a valid VOLVO-xxx ID")


if __name__ == "__main__":
    main()

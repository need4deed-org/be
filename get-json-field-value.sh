#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <json_file> <field_path>"
    exit 1
fi

JSON_FILE="$1"
FIELD_PATH="$2"

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: File '$JSON_FILE' not found."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed."
    exit 1
fi

# UPDATED LINE: 
# We split the input path by "." and use getpath to traverse the JSON structure.
result=$(jq -r --arg p "$FIELD_PATH" 'getpath($p | split("."))' "$JSON_FILE")

if [ "$result" == "null" ]; then
    echo "Error: Path '$FIELD_PATH' not found in $JSON_FILE."
    exit 1
else
    echo "$result"
fi
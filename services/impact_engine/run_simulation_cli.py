#!/usr/bin/env python3
"""
CLI wrapper for running simulation from stdin/args and printing JSON.
Enables Node.js/Express to invoke the Python impact engine directly.
"""
import sys
import json
import os

# Add services/impact_engine to sys.path
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from services.impact_engine.api.routes import handle_simulate, handle_get_simulation

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "sample":
        # Run default sample
        sample_path = os.path.join(base_dir, "tests", "impact", "fixtures", "impact_request.json")
        with open(sample_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        res = handle_simulate(data)
        print(json.dumps(res, indent=2))
        return

    # Read from stdin
    input_text = sys.stdin.read()
    if not input_text.strip():
        print(json.dumps({"error": "Empty input payload"}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.loads(input_text)
        res = handle_simulate(payload)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

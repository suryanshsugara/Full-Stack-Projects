"""
test_api.py -- Quick integration test for all Phase 2 endpoints.

Run with: python test_api.py
(Make sure uvicorn is running on port 8000 first)
"""

import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0


def api(method, path, body=None):
    """Make an HTTP request and return (status_code, response_json)."""
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        content = resp.read().decode()
        return resp.status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        content = e.read().decode()
        return e.code, json.loads(content) if content else None


def test(name, condition):
    global PASS, FAIL
    status = "PASS" if condition else "FAIL"
    if condition:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{status}] {name}")


print("=" * 60)
print("ZOOM CLONE API - INTEGRATION TESTS")
print("=" * 60)

# --- 1. Health Check ---
print("\n1. Health Check")
code, data = api("GET", "/api/health")
test("GET /api/health returns 200", code == 200)
test("Response has status=ok", data.get("status") == "ok")

# --- 2. List Meetings (seeded data) ---
print("\n2. List Meetings (seeded data)")
code, data = api("GET", "/api/meetings")
test("GET /api/meetings returns 200", code == 200)
test("Response has 'meetings' key", "meetings" in data)
test("Response has 'total' key", "total" in data)
test("Total is 6 (from seed)", data["total"] == 6)

# --- 3. Filter by Status ---
print("\n3. Filter by Status")
code, data = api("GET", "/api/meetings?status=completed")
test("Filter completed returns 200", code == 200)
test("All returned are completed", all(m["status"] == "completed" for m in data["meetings"]))

code, data = api("GET", "/api/meetings?status=scheduled")
test("Filter scheduled returns 200", code == 200)
test("All returned are scheduled", all(m["status"] == "scheduled" for m in data["meetings"]))

# --- 4. Create a Meeting ---
print("\n4. Create a Meeting")
code, data = api("POST", "/api/meetings", {"title": "Test Meeting"})
test("POST /api/meetings returns 201", code == 201)
test("Meeting has title 'Test Meeting'", data["title"] == "Test Meeting")
test("Meeting has a meeting_code", len(data.get("meeting_code", "")) > 0)
test("Host is loaded (nested object)", data.get("host") is not None)
test("Host name is Alex Johnson", data.get("host", {}).get("name") == "Alex Johnson")
test("Status is in_progress (instant)", data["status"] == "in_progress")
new_meeting_id = data["id"]

# --- 5. Get Single Meeting ---
print("\n5. Get Single Meeting")
code, data = api("GET", f"/api/meetings/{new_meeting_id}")
test(f"GET /api/meetings/{new_meeting_id} returns 200", code == 200)
test("Returns correct meeting", data["id"] == new_meeting_id)

# --- 6. Get Non-Existent Meeting ---
print("\n6. Get Non-Existent Meeting")
code, data = api("GET", "/api/meetings/9999")
test("GET /api/meetings/9999 returns 404", code == 404)

# --- 7. Update Meeting ---
print("\n7. Update Meeting")
code, data = api("PATCH", f"/api/meetings/{new_meeting_id}", {"title": "Updated Title"})
test("PATCH returns 200", code == 200)
test("Title was updated", data["title"] == "Updated Title")

# --- 8. End Meeting (status change) ---
print("\n8. End Meeting (status change)")
code, data = api("PATCH", f"/api/meetings/{new_meeting_id}", {"status": "completed"})
test("Status changed to completed", data["status"] == "completed")
test("ended_at is set", data.get("ended_at") is not None)

# --- 9. List Participants ---
print("\n9. List Participants (auto-added host)")
code, data = api("GET", f"/api/meetings/{new_meeting_id}/participants")
test("GET participants returns 200", code == 200)
test("Has 1 participant (the host)", len(data) == 1)
test("Host role is 'host'", data[0]["role"] == "host")

# --- 10. Add Participant ---
print("\n10. Add Participant")
code, data = api("POST", f"/api/meetings/{new_meeting_id}/participants", {"user_id": 2})
test("POST participant returns 201", code == 201)
test("User ID matches", data["user_id"] == 2)
test("User details loaded", data.get("user") is not None)

# --- 11. Duplicate Participant ---
print("\n11. Duplicate Participant (should fail)")
code, data = api("POST", f"/api/meetings/{new_meeting_id}/participants", {"user_id": 2})
test("Duplicate returns 400", code == 400)

# --- 12. Remove Participant ---
print("\n12. Remove Participant")
code, data = api("DELETE", f"/api/meetings/{new_meeting_id}/participants/2")
test("DELETE participant returns 204", code == 204)

# --- 13. Delete Meeting ---
print("\n13. Delete Meeting")
code, data = api("DELETE", f"/api/meetings/{new_meeting_id}")
test("DELETE meeting returns 204", code == 204)

# Verify it's gone
code, data = api("GET", f"/api/meetings/{new_meeting_id}")
test("Deleted meeting returns 404", code == 404)

# --- Summary ---
print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
print("=" * 60)

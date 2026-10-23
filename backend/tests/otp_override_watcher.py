# Test helper: continuously overrides the OTP code_hash for an email to a known code (testing only)
import hashlib, os, sys, time
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
email, code, secs = sys.argv[1].lower(), sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 180
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
h = hashlib.sha256(f"{email}:{code}:{os.environ['JWT_SECRET']}".encode()).hexdigest()
end = time.time() + secs
while time.time() < end:
    r = db.otps.update_many({"email": email, "code_hash": {"$ne": h}}, {"$set": {"code_hash": h, "attempts": 0}})
    if r.modified_count:
        print("overrode", email, flush=True)
    time.sleep(0.5)

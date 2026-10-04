#!/usr/bin/env python3
"""Override OTP code_hash for an email so code "1234" works. Usage: otp_override.py <email>"""
import hashlib, subprocess, sys

email = sys.argv[1].strip().lower()
jwt_secret = None
db_name = None
for line in open('/app/backend/.env'):
    if line.startswith('JWT_SECRET='):
        jwt_secret = line.split('=', 1)[1].strip().strip('"')
    if line.startswith('DB_NAME='):
        db_name = line.split('=', 1)[1].strip().strip('"')
assert jwt_secret and db_name

h = hashlib.sha256(f'{email}:1234:{jwt_secret}'.encode()).hexdigest()
js = (
    f"db.getSiblingDB('{db_name}').otp_log.deleteMany({{email: '{email}'}});"
    f"var r = db.getSiblingDB('{db_name}').otps.updateOne({{email: '{email}'}}, {{$set: {{code_hash: '{h}', attempts: 0}}}});"
    f"print('matched:', r.matchedCount, 'modified:', r.modifiedCount);"
)
subprocess.run(['mongosh', '--quiet', '--eval', js], check=True)

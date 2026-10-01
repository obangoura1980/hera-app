from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from typing import Annotated, Optional, List, Literal
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from bson import ObjectId
import os
import json
import uuid
import logging
import bcrypt
import jwt
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from content import AFFIRMATIONS, DISCOVER, SESSIONS  # noqa: E402
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone  # noqa: E402

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_KEY = os.environ["EMERGENT_LLM_KEY"]
APP_NAME = os.environ["APP_NAME"]
ALGO = "HS256"
TOKEN_DAYS = 30
LLM_PROVIDER, LLM_MODEL = "openai", "gpt-5.4"

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
storage_key: Optional[str] = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------- models
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=False)
        data.pop("_id", None)
        return data

    def public(self) -> dict:
        return self.model_dump(by_alias=False)


class User(BaseDocument):
    email: str
    name: str
    password_hash: str
    is_premium: bool = False
    created_at: datetime = Field(default_factory=now_utc)

    def public(self) -> dict:
        return {"id": self.id, "email": self.email, "name": self.name,
                "is_premium": self.is_premium, "created_at": self.created_at.isoformat()}


class JournalEntry(BaseDocument):
    user_id: str
    kind: Literal["gratitude", "intention", "reflection", "win"] = "gratitude"
    title: str = ""
    content: str
    mood: int = 3
    created_at: datetime = Field(default_factory=now_utc)


class Goal(BaseDocument):
    user_id: str
    title: str
    category: str = "Life"
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    achieved: bool = False
    created_at: datetime = Field(default_factory=now_utc)


class ChatMessage(BaseDocument):
    user_id: str
    role: Literal["user", "assistant"]
    text: str
    created_at: datetime = Field(default_factory=now_utc)


class Favorite(BaseDocument):
    user_id: str
    text: str
    created_at: datetime = Field(default_factory=now_utc)


class FileRecord(BaseDocument):
    user_id: str
    storage_path: str
    original_name: str
    content_type: str
    size: int
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=now_utc)


# ---------------------------------------------------------------- inputs
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class JournalIn(BaseModel):
    kind: Literal["gratitude", "intention", "reflection", "win"] = "gratitude"
    title: str = Field(default="", max_length=120)
    content: str = Field(min_length=1, max_length=5000)
    mood: int = Field(default=3, ge=1, le=5)


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = "Life"
    image_path: Optional[str] = None
    image_url: Optional[str] = None


class GoalPatch(BaseModel):
    achieved: Optional[bool] = None
    title: Optional[str] = None


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class GenerateIn(BaseModel):
    intention: str = Field(default="", max_length=300)


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class SessionDoneIn(BaseModel):
    session_id: str


# ---------------------------------------------------------------- auth helpers
def make_token(user_id: str) -> str:
    n = now_utc()
    return jwt.encode({"sub": user_id, "iat": n, "exp": n + timedelta(days=TOKEN_DAYS)}, JWT_SECRET, algorithm=ALGO)


async def user_from_token(token: Optional[str]) -> User:
    err = HTTPException(status_code=401, detail="Invalid or expired token")
    if not token:
        raise err
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGO], options={"require": ["sub", "exp"]})
        uid = payload["sub"]
    except (jwt.InvalidTokenError, KeyError):
        raise err
    if not ObjectId.is_valid(uid):
        raise err
    doc = await db.users.find_one({"_id": ObjectId(uid)})
    if not doc:
        raise err
    return User.from_mongo(doc)


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> User:
    return await user_from_token(creds.credentials if creds else None)


async def log_activity(user_id: str, kind: str):
    await db.activities.insert_one({"user_id": user_id, "kind": kind,
                                    "day": now_utc().date().isoformat(), "created_at": now_utc()})


async def compute_streak(user_id: str) -> int:
    days = set(await db.activities.distinct("day", {"user_id": user_id}))
    d = now_utc().date()
    if d.isoformat() not in days:
        d = d - timedelta(days=1)
    streak = 0
    while d.isoformat() in days:
        streak += 1
        d -= timedelta(days=1)
    return streak


# ---------------------------------------------------------------- storage
def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status()
    storage_key = r.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- LLM
COACH_PROMPT = (
    "You are Hera, a warm, grounded manifestation coach inside the Hera app. "
    "You help users clarify desires, release limiting beliefs, write affirmations and scripts, "
    "and take small inspired actions. Speak like a kind, wise friend writing in a journal: gentle, "
    "encouraging, practical. Keep replies under 140 words unless asked for more. Use short paragraphs, "
    "and end with one reflective question or a tiny action when it fits. Never give medical, legal or financial advice."
)


def new_chat(session_id: str, system: str) -> LlmChat:
    return LlmChat(api_key=EMERGENT_KEY, session_id=session_id, system_message=system).with_model(LLM_PROVIDER, LLM_MODEL)


# ---------------------------------------------------------------- routes: auth
@api.get("/")
async def root():
    return {"message": "Hera API"}


@api.post("/auth/register", status_code=201)
async def register(data: RegisterIn):
    email = data.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    pw = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = User(email=email, name=data.name.strip(), password_hash=pw)
    res = await db.users.insert_one(user.to_mongo())
    user.id = str(res.inserted_id)
    return {"access_token": make_token(user.id), "token_type": "bearer", "user": user.public()}


@api.post("/auth/login")
async def login(data: LoginIn):
    doc = await db.users.find_one({"email": data.email.strip().lower()})
    if not doc or not bcrypt.checkpw(data.password.encode(), doc["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    user = User.from_mongo(doc)
    return {"access_token": make_token(user.id), "token_type": "bearer", "user": user.public()}


@api.get("/auth/me")
async def me(user: User = Depends(current_user)):
    return user.public()


@api.post("/premium/activate")
async def premium_activate(user: User = Depends(current_user)):
    # MOCK: no real payment processing yet
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"is_premium": True}})
    user.is_premium = True
    return user.public()


# ---------------------------------------------------------------- routes: stats / affirmations
@api.get("/stats")
async def stats(user: User = Depends(current_user)):
    return {
        "streak": await compute_streak(user.id),
        "journal_count": await db.journal.count_documents({"user_id": user.id}),
        "goals_count": await db.goals.count_documents({"user_id": user.id}),
        "goals_achieved": await db.goals.count_documents({"user_id": user.id, "achieved": True}),
        "sessions_done": await db.activities.count_documents({"user_id": user.id, "kind": "session"}),
        "affirmed_today": bool(await db.activities.find_one(
            {"user_id": user.id, "kind": "affirm", "day": now_utc().date().isoformat()})),
    }


@api.get("/affirmations/today")
async def affirmation_today(user: User = Depends(current_user)):
    idx = (date.today().toordinal() + int(user.id[-4:], 16)) % len(AFFIRMATIONS)
    return {"text": AFFIRMATIONS[idx]}


@api.get("/affirmations/list")
async def affirmation_list():
    return {"items": AFFIRMATIONS[:16]}


@api.post("/affirmations/affirm")
async def affirm(user: User = Depends(current_user)):
    await log_activity(user.id, "affirm")
    return {"streak": await compute_streak(user.id)}


@api.post("/affirmations/generate")
async def generate_affirmation(data: GenerateIn, user: User = Depends(current_user)):
    intention = data.intention.strip()
    if not intention:
        goals = await db.goals.find({"user_id": user.id, "achieved": False}).sort("created_at", -1).to_list(3)
        intention = ", ".join(g["title"] for g in goals) or "peace, abundance and self-love"
    chat = new_chat(f"aff-{user.id}-{uuid.uuid4()}",
                    "You write one powerful, warm, first-person present-tense manifestation affirmation. "
                    "Output only the affirmation, 12-28 words, no quotes, no emojis.")
    text = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=f"My intention: {intention}")):
            if isinstance(ev, TextDelta):
                text += ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("affirmation generation failed")
        raise HTTPException(status_code=502, detail=f"AI unavailable: {e}")
    return {"text": text.strip().strip('"')}


@api.get("/affirmations/favorites")
async def list_favorites(user: User = Depends(current_user)):
    docs = await db.favorites.find({"user_id": user.id}).sort("created_at", -1).to_list(200)
    return [Favorite.from_mongo(d).public() for d in docs]


@api.post("/affirmations/favorites")
async def add_favorite(data: TextIn, user: User = Depends(current_user)):
    existing = await db.favorites.find_one({"user_id": user.id, "text": data.text})
    if existing:
        return Favorite.from_mongo(existing).public()
    fav = Favorite(user_id=user.id, text=data.text)
    res = await db.favorites.insert_one(fav.to_mongo())
    fav.id = str(res.inserted_id)
    return fav.public()


@api.delete("/affirmations/favorites/{fav_id}")
async def delete_favorite(fav_id: str, user: User = Depends(current_user)):
    if ObjectId.is_valid(fav_id):
        await db.favorites.delete_one({"_id": ObjectId(fav_id), "user_id": user.id})
    return {"ok": True}


# ---------------------------------------------------------------- routes: journal
@api.get("/journal")
async def list_journal(user: User = Depends(current_user)):
    docs = await db.journal.find({"user_id": user.id}).sort("created_at", -1).to_list(500)
    return [JournalEntry.from_mongo(d).public() for d in docs]


@api.post("/journal", status_code=201)
async def create_journal(data: JournalIn, user: User = Depends(current_user)):
    entry = JournalEntry(user_id=user.id, **data.model_dump())
    res = await db.journal.insert_one(entry.to_mongo())
    entry.id = str(res.inserted_id)
    await log_activity(user.id, "journal")
    return entry.public()


@api.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user: User = Depends(current_user)):
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(404, "Not found")
    res = await db.journal.delete_one({"_id": ObjectId(entry_id), "user_id": user.id})
    if not res.deleted_count:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------------------------------------------------------------- routes: goals (vision board)
@api.get("/goals")
async def list_goals(user: User = Depends(current_user)):
    docs = await db.goals.find({"user_id": user.id}).sort("created_at", -1).to_list(500)
    return [Goal.from_mongo(d).public() for d in docs]


@api.post("/goals", status_code=201)
async def create_goal(data: GoalIn, user: User = Depends(current_user)):
    if data.image_path and not await db.files.find_one({"storage_path": data.image_path, "user_id": user.id}):
        raise HTTPException(400, "Unknown image")
    goal = Goal(user_id=user.id, **data.model_dump())
    res = await db.goals.insert_one(goal.to_mongo())
    goal.id = str(res.inserted_id)
    await log_activity(user.id, "goal")
    return goal.public()


@api.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, data: GoalPatch, user: User = Depends(current_user)):
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(404, "Not found")
    changes = {k: v for k, v in data.model_dump().items() if v is not None}
    doc = await db.goals.find_one_and_update({"_id": ObjectId(goal_id), "user_id": user.id},
                                             {"$set": changes}, return_document=True)
    if not doc:
        raise HTTPException(404, "Not found")
    return Goal.from_mongo(doc).public()


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(current_user)):
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(404, "Not found")
    res = await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": user.id})
    if not res.deleted_count:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------------------------------------------------------------- routes: files
@api.post("/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only images are allowed")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 10MB)")
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"{APP_NAME}/uploads/{user.id}/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, file.content_type)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(402, "Storage credits exhausted")
        logger.exception("upload failed")
        raise HTTPException(502, "Upload failed")
    rec = FileRecord(user_id=user.id, storage_path=result["path"], original_name=file.filename or "",
                     content_type=file.content_type, size=result.get("size", len(data)))
    await db.files.insert_one(rec.to_mongo())
    return {"path": result["path"]}


@api.get("/files/{path:path}")
async def download(path: str, request: Request, token: Optional[str] = None):
    auth = request.headers.get("authorization", "")
    tok = auth[7:] if auth.lower().startswith("bearer ") else token
    user = await user_from_token(tok)
    rec = await db.files.find_one({"storage_path": path, "user_id": user.id, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ctype = await run_in_threadpool(get_object, path)
    return Response(content=data, media_type=rec.get("content_type", ctype),
                    headers={"Cache-Control": "private, max-age=86400"})


# ---------------------------------------------------------------- routes: coach
@api.get("/coach/messages")
async def coach_messages(user: User = Depends(current_user)):
    docs = await db.coach_messages.find({"user_id": user.id}).sort("created_at", 1).to_list(500)
    return [ChatMessage.from_mongo(d).public() for d in docs]


@api.delete("/coach/messages")
async def clear_coach(user: User = Depends(current_user)):
    await db.coach_messages.delete_many({"user_id": user.id})
    return {"ok": True}


@api.post("/coach/stream")
async def coach_stream(data: ChatIn, user: User = Depends(current_user)):
    history = await db.coach_messages.find({"user_id": user.id}).sort("created_at", -1).to_list(16)
    history.reverse()
    goals = await db.goals.find({"user_id": user.id, "achieved": False}).to_list(5)
    context = ""
    if goals:
        context += "\nUser's current vision board goals: " + "; ".join(g["title"] for g in goals) + "."
    if history:
        context += "\nRecent conversation:\n" + "\n".join(
            f"{'User' if m['role'] == 'user' else 'Hera'}: {m['text']}" for m in history)
    await db.coach_messages.insert_one(ChatMessage(user_id=user.id, role="user", text=data.text).to_mongo())
    chat = new_chat(f"coach-{user.id}-{uuid.uuid4()}", COACH_PROMPT + f"\nThe user's name is {user.name}." + context)

    async def gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=data.text)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception:
            logger.exception("coach stream failed")
            yield f"data: {json.dumps({'error': 'Hera is resting right now. Please try again.'})}\n\n"
        if full.strip():
            await db.coach_messages.insert_one(
                ChatMessage(user_id=user.id, role="assistant", text=full.strip()).to_mongo())
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------- routes: content
@api.get("/discover")
async def discover(category: Optional[str] = None):
    items = DISCOVER if not category or category == "All" else [d for d in DISCOVER if d["category"] == category]
    return items


@api.get("/discover/{item_id}")
async def discover_item(item_id: str):
    for d in DISCOVER:
        if d["id"] == item_id:
            return d
    raise HTTPException(404, "Not found")


@api.get("/sessions")
async def sessions():
    return SESSIONS


@api.get("/sessions/{session_id}")
async def session_item(session_id: str):
    for s in SESSIONS:
        if s["id"] == session_id:
            return s
    raise HTTPException(404, "Not found")


@api.post("/sessions/complete")
async def session_complete(data: SessionDoneIn, user: User = Depends(current_user)):
    await log_activity(user.id, "session")
    return {"streak": await compute_streak(user.id)}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=False, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    try:
        init_storage()
        logger.info("Object storage ready")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

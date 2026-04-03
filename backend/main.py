from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import json
from datetime import datetime, timezone, timedelta
import bcrypt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "employee"

class UserLogin(BaseModel):
    email: str
    password: str

class ChatMessage(BaseModel):
    message: str

class OverrideAction(BaseModel):
    employee_id: str
    action: str
    milestone_id: Optional[str] = None
    reason: str
    new_due_date: Optional[str] = None
    note: Optional[str] = None

class OnboardingIntake(BaseModel):
    name: str
    email: str
    role: str
    department: str
    seniority: str
    location: str
    start_date: str
    manager_name: str
    team: str
    timezone_str: str = "UTC"
    is_remote: bool = False

# ─── Auth Helpers ───
def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def gen_session_token() -> str:
    return f"sess_{uuid.uuid4().hex}"

async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ─── Auth Endpoints ───
@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id, "email": data.email, "name": data.name,
        "picture": "", "password_hash": hash_pw(data.password),
        "role": data.role, "employee_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = gen_session_token()
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", token, path="/", httponly=True, secure=True, samesite="none", max_age=7*86400)
    return {"user_id": user_id, "email": data.email, "name": data.name, "role": data.role, "token": token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = gen_session_token()
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", token, path="/", httponly=True, secure=True, samesite="none", max_age=7*86400)
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "employee_id": user.get("employee_id"), "token": token
    }

@api_router.get("/auth/session")
async def exchange_session(session_id: str, response: Response):
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data["email"]
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id, "email": email, "name": data.get("name", ""),
            "picture": data.get("picture", ""), "password_hash": "",
            "role": "employee", "employee_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", user["name"]), "picture": data.get("picture", "")}})
    token = data.get("session_token", gen_session_token())
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", token, path="/", httponly=True, secure=True, samesite="none", max_age=7*86400)
    return {"user_id": user_id, "email": email, "name": user.get("name", data.get("name", "")), "role": user.get("role", "employee"), "employee_id": user.get("employee_id"), "token": token}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ─── Employee Endpoints ───
@api_router.get("/employees")
async def list_employees(user=Depends(get_current_user)):
    if user["role"] not in ("hr_admin", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")
    employees = await db.employees.find({}, {"_id": 0}).to_list(100)
    return employees

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, user=Depends(get_current_user)):
    emp = await db.employees.find_one({"employee_id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if user["role"] == "employee" and user.get("employee_id") != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return emp

# ─── Plan Endpoints ───
@api_router.get("/plans/{employee_id}")
async def get_plan(employee_id: str, user=Depends(get_current_user)):
    plan = await db.onboarding_plans.find_one({"employee_id": employee_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@api_router.get("/milestones/{employee_id}")
async def get_milestones(employee_id: str, user=Depends(get_current_user)):
    milestones = await db.milestones.find({"employee_id": employee_id}, {"_id": 0}).sort("order_index", 1).to_list(200)
    return milestones

@api_router.put("/milestones/{milestone_id}/toggle")
async def toggle_milestone(milestone_id: str, user=Depends(get_current_user)):
    ms = await db.milestones.find_one({"milestone_id": milestone_id}, {"_id": 0})
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    new_completed = not ms.get("is_completed", False)
    completed_at = datetime.now(timezone.utc).isoformat() if new_completed else None
    await db.milestones.update_one(
        {"milestone_id": milestone_id},
        {"$set": {"is_completed": new_completed, "completed_at": completed_at}}
    )
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "actor_id": user["user_id"], "actor_name": user["name"],
        "action": "milestone_toggled", "target_id": milestone_id,
        "target_type": "milestone",
        "metadata": {"new_state": "completed" if new_completed else "incomplete", "title": ms["title"]},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"milestone_id": milestone_id, "is_completed": new_completed, "completed_at": completed_at}

# ─── Chat / AI Endpoints ───
@api_router.get("/chat/{employee_id}")
async def get_chat(employee_id: str, user=Depends(get_current_user)):
    messages = await db.chat_messages.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

@api_router.post("/chat/{employee_id}/send")
async def send_chat(employee_id: str, msg: ChatMessage, user=Depends(get_current_user)):
    # Save user message
    user_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "employee_id": employee_id, "role": "user",
        "content": msg.message, "intent_type": None, "sources": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_msg)

    # Search KB
    kb_docs = await db.kb_documents.find({}, {"_id": 0}).to_list(20)
    query_lower = msg.message.lower()
    relevant_docs = []
    for doc in kb_docs:
        score = sum(1 for w in query_lower.split() if w in doc["content"].lower())
        if score > 0:
            relevant_docs.append((score, doc))
    relevant_docs.sort(key=lambda x: -x[0])
    top_docs = [d for _, d in relevant_docs[:3]]

    # Classify intent
    intent = "general"
    if any(w in query_lower for w in ["security", "compliance", "policy", "privacy", "code of conduct", "training"]):
        intent = "hr"
    elif any(w in query_lower for w in ["access", "vpn", "laptop", "email", "setup", "git", "repo", "tool"]):
        intent = "it"
    elif any(w in query_lower for w in ["sdlc", "sprint", "campaign", "brand", "code review", "ci/cd"]):
        intent = "role"

    # Get employee info for context
    emp = await db.employees.find_one({"employee_id": employee_id}, {"_id": 0})
    emp_context = f"Employee: {emp['name']}, Role: {emp['role']}, Department: {emp['department']}, Day in journey: {(datetime.now(timezone.utc) - datetime.fromisoformat(emp['start_date']).replace(tzinfo=timezone.utc)).days}" if emp else ""

    # Build AI response
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        kb_context = "\n\n".join([f"[Source: {d['title']}] ({d['source_url']})\n{d['content']}" for d in top_docs])
        system_msg = f"""You are an onboarding assistant for new employees. {emp_context}

RULES:
- Answer ONLY using the provided knowledge base documents
- Always cite sources with [Source: title] format
- If the answer is not in the KB, say "I don't have that information in our knowledge base. Let me create a ticket for HR/IT to help you."
- Be concise, friendly, and professional
- Format with bullet points when listing steps

Knowledge Base Documents:
{kb_context if kb_context else "No relevant documents found."}"""

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"chat-{employee_id}-{uuid.uuid4().hex[:8]}",
            system_message=system_msg
        ).with_model("gemini", "gemini-3-flash-preview")
        ai_response = await chat.send_message(UserMessage(text=msg.message))
        sources = [{"title": d["title"], "url": d["source_url"]} for d in top_docs]
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        if top_docs:
            ai_response = f"Based on our knowledge base:\n\n"
            for d in top_docs:
                ai_response += f"**{d['title']}**\n{d['content'][:300]}...\n\n[Source: {d['source_url']}]\n\n"
            sources = [{"title": d["title"], "url": d["source_url"]} for d in top_docs]
        else:
            ai_response = "I don't have that information in our knowledge base. Let me create a ticket for HR/IT to help you."
            sources = []

    assistant_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "employee_id": employee_id, "role": "assistant",
        "content": ai_response, "intent_type": intent,
        "sources": sources,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(assistant_msg)
    return {k: v for k, v in assistant_msg.items() if k != "_id"}

# ─── HR Endpoints ───
@api_router.get("/hr/cohort")
async def get_cohort(user=Depends(get_current_user)):
    if user["role"] not in ("hr_admin", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")
    employees = await db.employees.find({}, {"_id": 0}).to_list(100)

    # Aggregated counts in 3 queries instead of 6*N
    ms_stats = {doc["_id"]: doc async for doc in db.milestones.aggregate([
        {"$group": {
            "_id": "$employee_id",
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": ["$is_completed", 1, 0]}},
            "pending_access": {"$sum": {"$cond": [
                {"$and": [{"$eq": ["$category", "access"]}, {"$ne": ["$is_completed", True]}]}, 1, 0
            ]}}
        }}
    ])}
    lms_stats = {doc["_id"]: doc async for doc in db.lms_assignments.aggregate([
        {"$group": {
            "_id": "$employee_id",
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}}
        }}
    ])}
    chat_stats = {doc["_id"]: doc async for doc in db.chat_messages.aggregate([
        {"$match": {"role": "user"}},
        {"$group": {"_id": "$employee_id", "count": {"$sum": 1}}}
    ])}

    result = []
    for emp in employees:
        eid = emp["employee_id"]
        ms = ms_stats.get(eid, {"total": 0, "completed": 0, "pending_access": 0})
        ls = lms_stats.get(eid, {"total": 0, "completed": 0})
        total = ms["total"]
        completed = ms["completed"]
        start = datetime.fromisoformat(emp["start_date"]).replace(tzinfo=timezone.utc)
        day_in_journey = (datetime.now(timezone.utc) - start).days
        pct = round((completed / total * 100) if total > 0 else 0)
        status = "on_track" if pct >= (day_in_journey / 90 * 100 * 0.7) else "at_risk" if pct >= (day_in_journey / 90 * 100 * 0.4) else "behind"
        result.append({
            **emp, "day_in_journey": day_in_journey,
            "total_milestones": total, "completed_milestones": completed,
            "progress_pct": pct, "status": status,
            "lms_total": ls["total"], "lms_completed": ls["completed"],
            "pending_access": ms["pending_access"],
            "chat_count": chat_stats.get(eid, {}).get("count", 0)
        })
    return result

@api_router.get("/hr/stats")
async def get_hr_stats(user=Depends(get_current_user)):
    if user["role"] not in ("hr_admin", "manager"):
        raise HTTPException(status_code=403, detail="Access denied")
    total_employees = await db.employees.count_documents({})
    total_milestones = await db.milestones.count_documents({})
    completed_milestones = await db.milestones.count_documents({"is_completed": True})
    overdue = await db.milestones.count_documents({
        "is_completed": False,
        "due_date": {"$lt": datetime.now(timezone.utc).isoformat()}
    })
    lms_total = await db.lms_assignments.count_documents({})
    lms_completed = await db.lms_assignments.count_documents({"status": "completed"})
    pending_access = await db.milestones.count_documents({"category": "access", "is_completed": False})
    return {
        "total_employees": total_employees,
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
        "completion_rate": round(completed_milestones / total_milestones * 100) if total_milestones > 0 else 0,
        "overdue_tasks": overdue,
        "lms_total": lms_total, "lms_completed": lms_completed,
        "lms_rate": round(lms_completed / lms_total * 100) if lms_total > 0 else 0,
        "pending_access": pending_access
    }

@api_router.post("/hr/override")
async def create_override(action: OverrideAction, user=Depends(get_current_user)):
    if user["role"] != "hr_admin":
        raise HTTPException(status_code=403, detail="HR Admin only")
    if action.action == "complete_task" and action.milestone_id:
        await db.milestones.update_one(
            {"milestone_id": action.milestone_id},
            {"$set": {"is_completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
    elif action.action == "update_due_date" and action.milestone_id and action.new_due_date:
        await db.milestones.update_one(
            {"milestone_id": action.milestone_id},
            {"$set": {"due_date": action.new_due_date}}
        )
    elif action.action == "add_note":
        await db.employee_notes.insert_one({
            "note_id": f"note_{uuid.uuid4().hex[:12]}",
            "employee_id": action.employee_id,
            "note": action.note, "author_id": user["user_id"],
            "author_name": user["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif action.action == "pause_plan":
        await db.onboarding_plans.update_one(
            {"employee_id": action.employee_id},
            {"$set": {"status": "paused"}}
        )
    log = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "actor_id": user["user_id"], "actor_name": user["name"],
        "action": f"override_{action.action}", "target_id": action.employee_id,
        "target_type": "employee",
        "metadata": {"reason": action.reason, "milestone_id": action.milestone_id, "note": action.note},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)
    return {"status": "success", "log_id": log["log_id"]}

# ─── LMS Endpoints ───
@api_router.get("/lms/{employee_id}")
async def get_lms(employee_id: str, user=Depends(get_current_user)):
    assignments = await db.lms_assignments.find({"employee_id": employee_id}, {"_id": 0}).to_list(50)
    return assignments

@api_router.put("/lms/{assignment_id}/complete")
async def complete_lms(assignment_id: str, user=Depends(get_current_user)):
    await db.lms_assignments.update_one(
        {"assignment_id": assignment_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "completed"}

# ─── Calendar Endpoints ───
@api_router.get("/calendar/{employee_id}")
async def get_calendar(employee_id: str, user=Depends(get_current_user)):
    events = await db.calendar_events.find({"employee_id": employee_id}, {"_id": 0}).sort("start_time", 1).to_list(50)
    return events

# ─── KB Endpoints ───
@api_router.get("/kb/search")
async def search_kb(q: str = "", user=Depends(get_current_user)):
    docs = await db.kb_documents.find({}, {"_id": 0}).to_list(20)
    if q:
        q_lower = q.lower()
        scored = [(sum(1 for w in q_lower.split() if w in d["content"].lower()), d) for d in docs]
        scored.sort(key=lambda x: -x[0])
        return [d for _, d in scored if _ > 0][:5]
    return docs

# ─── Nudge Endpoints ───
@api_router.get("/nudges/{employee_id}")
async def get_nudges(employee_id: str, user=Depends(get_current_user)):
    nudges = await db.nudges.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return nudges

@api_router.put("/nudges/{nudge_id}/read")
async def mark_nudge_read(nudge_id: str, user=Depends(get_current_user)):
    await db.nudges.update_one({"nudge_id": nudge_id}, {"$set": {"is_read": True}})
    return {"status": "read"}

# ─── Audit Endpoints ───
@api_router.get("/audit")
async def get_audit(user=Depends(get_current_user)):
    if user["role"] != "hr_admin":
        raise HTTPException(status_code=403, detail="HR Admin only")
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return logs

# ─── Notes Endpoints ───
@api_router.get("/notes/{employee_id}")
async def get_notes(employee_id: str, user=Depends(get_current_user)):
    notes = await db.employee_notes.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notes

# ─── Onboarding Intake + Plan Generation ───
@api_router.post("/onboarding/intake")
async def onboarding_intake(data: OnboardingIntake, user=Depends(get_current_user)):
    employee_id = f"emp_{uuid.uuid4().hex[:12]}"
    emp = {
        "employee_id": employee_id, "name": data.name, "email": data.email,
        "role": data.role, "department": data.department, "seniority": data.seniority,
        "location": data.location, "start_date": data.start_date,
        "manager_name": data.manager_name, "team": data.team,
        "timezone": data.timezone_str, "is_remote": data.is_remote,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(emp)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"employee_id": employee_id}})

    # Generate plan using AI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = """Generate a personalized 30-60-90 day onboarding plan. Return ONLY valid JSON with this structure:
{"milestones": [{"title": "string", "description": "string", "category": "essentials|access|training|culture|deliverable|review", "phase": "day_0_7|week_2_4|day_30_60|day_60_90", "order_index": number}]}
Generate 16-20 milestones covering: Day 0-7 (essentials, access, culture), Week 2-4 (role foundations, first output), Day 30-60 (deeper ownership), Day 60-90 (autonomy, measurable impact).
Personalize based on role, department, seniority, and location."""

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"plan-gen-{employee_id}",
            system_message=system
        ).with_model("gemini", "gemini-3-flash-preview")

        prompt = f"Generate onboarding plan for: Name={data.name}, Role={data.role}, Dept={data.department}, Level={data.seniority}, Location={data.location}, Remote={data.is_remote}, Team={data.team}"
        response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON from response
        json_str = response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        plan_data = json.loads(json_str.strip())
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        plan_data = _fallback_plan(data.role, data.department)

    plan_id = f"plan_{uuid.uuid4().hex[:12]}"
    start = datetime.fromisoformat(data.start_date).replace(tzinfo=timezone.utc)

    plan = {
        "plan_id": plan_id, "employee_id": employee_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "plan_json": plan_data, "version": 1, "status": "active"
    }
    await db.onboarding_plans.insert_one(plan)

    phase_offsets = {"day_0_7": (0, 7), "week_2_4": (7, 28), "day_30_60": (30, 60), "day_60_90": (60, 90)}
    for ms in plan_data.get("milestones", []):
        offset = phase_offsets.get(ms.get("phase", "day_0_7"), (0, 7))
        await db.milestones.insert_one({
            "milestone_id": f"ms_{uuid.uuid4().hex[:12]}",
            "plan_id": plan_id, "employee_id": employee_id,
            "title": ms["title"], "description": ms.get("description", ""),
            "category": ms.get("category", "essentials"),
            "phase": ms.get("phase", "day_0_7"),
            "due_date": (start + timedelta(days=offset[1])).isoformat(),
            "unlock_date": (start + timedelta(days=offset[0])).isoformat(),
            "completed_at": None, "is_completed": False,
            "order_index": ms.get("order_index", 0), "dependency_ids": []
        })

    _create_default_lms_calendar(employee_id, data, start)
    return {"employee_id": employee_id, "plan_id": plan_id, "status": "created"}

def _fallback_plan(role, department):
    if "engineer" in role.lower() or "software" in role.lower():
        return {"milestones": [
            {"title": "Set up development environment", "description": "Install IDE, clone repos, configure local dev", "category": "essentials", "phase": "day_0_7", "order_index": 1},
            {"title": "Complete security & privacy training", "description": "Mandatory compliance training modules", "category": "training", "phase": "day_0_7", "order_index": 2},
            {"title": "Request repository & cloud access", "description": "GitHub Enterprise, AWS/GCP access", "category": "access", "phase": "day_0_7", "order_index": 3},
            {"title": "Meet manager, buddy, and tech lead", "description": "Initial introductions and team orientation", "category": "culture", "phase": "day_0_7", "order_index": 4},
            {"title": "Review SDLC & CI/CD documentation", "description": "Understand development workflow and deployment pipeline", "category": "training", "phase": "week_2_4", "order_index": 5},
            {"title": "Complete first sprint story", "description": "Pick up a good-first-issue ticket", "category": "deliverable", "phase": "week_2_4", "order_index": 6},
            {"title": "Participate in code review", "description": "Review a PR and get one reviewed", "category": "deliverable", "phase": "week_2_4", "order_index": 7},
            {"title": "Shadow on-call engineer", "description": "Observe incident response process", "category": "training", "phase": "week_2_4", "order_index": 8},
            {"title": "Own a small component", "description": "Take ownership of a module or microservice", "category": "deliverable", "phase": "day_30_60", "order_index": 9},
            {"title": "On-call orientation", "description": "Complete on-call training and join rotation", "category": "training", "phase": "day_30_60", "order_index": 10},
            {"title": "30-day review with manager", "description": "First formal check-in on progress", "category": "review", "phase": "day_30_60", "order_index": 11},
            {"title": "Deliver feature end-to-end", "description": "Ship a complete feature from design to production", "category": "deliverable", "phase": "day_60_90", "order_index": 12},
            {"title": "Contribute runbook/KB article", "description": "Document a process or create operational runbook", "category": "deliverable", "phase": "day_60_90", "order_index": 13},
            {"title": "90-day review", "description": "Final onboarding review and goal setting", "category": "review", "phase": "day_60_90", "order_index": 14},
        ]}
    else:
        return {"milestones": [
            {"title": "Access brand assets & marketing tools", "description": "Get access to brand portal, HubSpot, CRM", "category": "access", "phase": "day_0_7", "order_index": 1},
            {"title": "Complete brand guidelines & compliance training", "description": "Review brand guide and complete compliance modules", "category": "training", "phase": "day_0_7", "order_index": 2},
            {"title": "Meet manager, buddy, and key partners", "description": "Sales, product, and creative team introductions", "category": "culture", "phase": "day_0_7", "order_index": 3},
            {"title": "Review campaign lifecycle documentation", "description": "Understand campaign process from brief to measurement", "category": "training", "phase": "day_0_7", "order_index": 4},
            {"title": "Campaign process & automation training", "description": "HubSpot, analytics, and workflow training", "category": "training", "phase": "week_2_4", "order_index": 5},
            {"title": "Build first campaign brief", "description": "Create campaign brief with mentor guidance", "category": "deliverable", "phase": "week_2_4", "order_index": 6},
            {"title": "Shadow campaign manager", "description": "Observe live campaign execution", "category": "training", "phase": "week_2_4", "order_index": 7},
            {"title": "Content calendar contribution", "description": "Add to team content calendar", "category": "deliverable", "phase": "week_2_4", "order_index": 8},
            {"title": "Run pilot campaign", "description": "Execute small campaign with analytics tracking", "category": "deliverable", "phase": "day_30_60", "order_index": 9},
            {"title": "Analytics dashboard review", "description": "Present campaign metrics to team", "category": "review", "phase": "day_30_60", "order_index": 10},
            {"title": "30-day review with manager", "description": "First formal check-in", "category": "review", "phase": "day_30_60", "order_index": 11},
            {"title": "Own quarterly campaign plan", "description": "Take ownership of a campaign track", "category": "deliverable", "phase": "day_60_90", "order_index": 12},
            {"title": "Present campaign outcomes", "description": "Share results with stakeholders", "category": "deliverable", "phase": "day_60_90", "order_index": 13},
            {"title": "90-day review", "description": "Final onboarding review", "category": "review", "phase": "day_60_90", "order_index": 14},
        ]}

async def _create_default_lms_calendar(employee_id, data, start):
    pass  # Will be populated by seed

# ─── Seed Endpoint ───
@api_router.post("/seed")
async def seed_data():
    from kb_data import KB_DOCUMENTS

    # Clear existing data
    for col in ["users", "user_sessions", "employees", "onboarding_plans", "milestones",
                 "chat_messages", "audit_logs", "lms_assignments", "calendar_events",
                 "kb_documents", "nudges", "employee_notes"]:
        await db[col].delete_many({})

    # Seed KB documents
    for i, doc in enumerate(KB_DOCUMENTS):
        await db.kb_documents.insert_one({
            "doc_id": f"kb_{i+1:03d}", "title": doc["title"],
            "category": doc["category"], "content": doc["content"],
            "source_url": doc["source_url"],
            "last_updated": datetime.now(timezone.utc).isoformat()
        })

    now = datetime.now(timezone.utc)

    # ─── Seed Users ───
    users_data = [
        {"user_id": "user_priya", "email": "priya@example.com", "name": "Priya Sharma", "picture": "", "password_hash": hash_pw("demo123"), "role": "employee", "employee_id": "emp_priya"},
        {"user_id": "user_marcus", "email": "marcus@example.com", "name": "Marcus Johnson", "picture": "", "password_hash": hash_pw("demo123"), "role": "employee", "employee_id": "emp_marcus"},
        {"user_id": "user_rohan", "email": "rohan@example.com", "name": "Rohan Mehta", "picture": "", "password_hash": hash_pw("demo123"), "role": "manager", "employee_id": None},
        {"user_id": "user_sarah", "email": "sarah@example.com", "name": "Sarah Chen", "picture": "", "password_hash": hash_pw("demo123"), "role": "manager", "employee_id": None},
        {"user_id": "user_admin", "email": "admin@example.com", "name": "HR Admin", "picture": "", "password_hash": hash_pw("demo123"), "role": "hr_admin", "employee_id": None},
    ]
    for u in users_data:
        u["created_at"] = now.isoformat()
        await db.users.insert_one(u)

    # ─── Seed Employees ───
    priya_start = now - timedelta(days=12)
    marcus_start = now - timedelta(days=8)
    employees_data = [
        {"employee_id": "emp_priya", "name": "Priya Sharma", "email": "priya@example.com",
         "role": "Software Engineer", "department": "Engineering", "seniority": "L3",
         "location": "Remote - Bangalore", "start_date": priya_start.isoformat(),
         "manager_name": "Rohan Mehta", "team": "Platform", "timezone": "Asia/Kolkata", "is_remote": True},
        {"employee_id": "emp_marcus", "name": "Marcus Johnson", "email": "marcus@example.com",
         "role": "Marketing Manager", "department": "Marketing", "seniority": "Senior",
         "location": "On-site - London", "start_date": marcus_start.isoformat(),
         "manager_name": "Sarah Chen", "team": "Growth", "timezone": "Europe/London", "is_remote": False},
    ]
    for e in employees_data:
        e["created_at"] = now.isoformat()
        await db.employees.insert_one(e)

    # ─── Seed Plans & Milestones for Priya (SWE) ───
    plan_priya = {"plan_id": "plan_priya", "employee_id": "emp_priya", "generated_at": priya_start.isoformat(), "plan_json": {}, "version": 1, "status": "active"}
    await db.onboarding_plans.insert_one(plan_priya)

    swe_milestones = [
        ("Set up development environment", "Install IDE, clone repos, configure local dev environment", "essentials", "day_0_7", 1, True, 1),
        ("Complete security awareness training", "Mandatory security training module on LMS", "training", "day_0_7", 2, True, 2),
        ("Request repository & secrets vault access", "GitHub Enterprise + HashiCorp Vault access", "access", "day_0_7", 3, True, 0),
        ("Complete privacy & data protection training", "GDPR and data handling compliance module", "training", "day_0_7", 4, True, 3),
        ("Meet manager, buddy, and tech lead", "Initial introductions and team orientation", "culture", "day_0_7", 5, True, 4),
        ("VPN & email setup verification", "Confirm VPN access and corporate email working", "essentials", "day_0_7", 6, True, 1),
        ("Review SDLC & CI/CD documentation", "Understand Git workflow, PR process, deployment pipeline", "training", "week_2_4", 7, True, 8),
        ("Complete first sprint story", "Pick up a good-first-issue ticket and deliver", "deliverable", "week_2_4", 8, False, 0),
        ("Participate in code review", "Review a teammate's PR and submit your own for review", "deliverable", "week_2_4", 9, False, 0),
        ("Shadow on-call engineer", "Observe incident response and monitoring setup", "training", "week_2_4", 10, False, 0),
        ("Team architecture deep-dive", "Understand service dependencies and data flows", "training", "week_2_4", 11, False, 0),
        ("Own a small component", "Take ownership of a module or microservice feature", "deliverable", "day_30_60", 12, False, 0),
        ("On-call orientation & training", "Complete on-call training, join PagerDuty rotation", "training", "day_30_60", 13, False, 0),
        ("30-day progress review", "Formal check-in with manager on progress and goals", "review", "day_30_60", 14, False, 0),
        ("Cross-team collaboration project", "Work with another team on a shared initiative", "deliverable", "day_30_60", 15, False, 0),
        ("Deliver feature end-to-end", "Ship a complete feature from design to production", "deliverable", "day_60_90", 16, False, 0),
        ("Contribute runbook or KB article", "Document a process or create operational runbook", "deliverable", "day_60_90", 17, False, 0),
        ("60-day checkpoint review", "Mid-point review with manager", "review", "day_60_90", 18, False, 0),
        ("90-day final review & goal setting", "Complete onboarding review, set Q2 goals", "review", "day_60_90", 19, False, 0),
    ]
    phase_offsets = {"day_0_7": (0, 7), "week_2_4": (7, 28), "day_30_60": (30, 60), "day_60_90": (60, 90)}
    for title, desc, cat, phase, idx, completed, completed_day in swe_milestones:
        offset = phase_offsets[phase]
        await db.milestones.insert_one({
            "milestone_id": f"ms_priya_{idx:02d}", "plan_id": "plan_priya", "employee_id": "emp_priya",
            "title": title, "description": desc, "category": cat, "phase": phase,
            "due_date": (priya_start + timedelta(days=offset[1])).isoformat(),
            "unlock_date": (priya_start + timedelta(days=offset[0])).isoformat(),
            "completed_at": (priya_start + timedelta(days=completed_day)).isoformat() if completed else None,
            "is_completed": completed, "order_index": idx, "dependency_ids": []
        })

    # ─── Seed Plans & Milestones for Marcus (Marketing) ───
    plan_marcus = {"plan_id": "plan_marcus", "employee_id": "emp_marcus", "generated_at": marcus_start.isoformat(), "plan_json": {}, "version": 1, "status": "active"}
    await db.onboarding_plans.insert_one(plan_marcus)

    mktg_milestones = [
        ("Access brand assets & marketing tools", "Get access to brand portal, HubSpot, Salesforce CRM views", "access", "day_0_7", 1, True, 1),
        ("Complete brand guidelines training", "Review and acknowledge brand identity guidelines", "training", "day_0_7", 2, True, 1),
        ("Complete security & compliance training", "Mandatory security and privacy modules", "training", "day_0_7", 3, True, 2),
        ("Meet manager, buddy, sales & product partners", "Key stakeholder introductions", "culture", "day_0_7", 4, True, 2),
        ("Review marketing automation platform", "HubSpot orientation and access setup", "essentials", "day_0_7", 5, True, 3),
        ("Join content calendar & team channels", "Notion content calendar, Teams/Slack channels", "essentials", "day_0_7", 6, True, 3),
        ("Campaign lifecycle & process training", "End-to-end campaign workflow training", "training", "week_2_4", 7, True, 7),
        ("Build first campaign brief", "Create campaign brief with mentor guidance", "deliverable", "week_2_4", 8, True, 7),
        ("Shadow senior campaign manager", "Observe live campaign execution and optimization", "training", "week_2_4", 9, False, 0),
        ("Analytics & reporting training", "GA4, Looker dashboards, reporting templates", "training", "week_2_4", 10, False, 0),
        ("Content calendar contribution", "Add to team editorial calendar for next month", "deliverable", "week_2_4", 11, False, 0),
        ("Run pilot campaign with analytics", "Execute small campaign, track KPIs", "deliverable", "day_30_60", 12, False, 0),
        ("Present campaign analytics to team", "Share pilot results and learnings", "review", "day_30_60", 13, False, 0),
        ("30-day progress review", "Formal check-in with manager", "review", "day_30_60", 14, False, 0),
        ("Cross-functional project with Sales", "Collaborate on sales enablement content", "deliverable", "day_30_60", 15, False, 0),
        ("Own quarterly campaign plan", "Take ownership of a campaign vertical", "deliverable", "day_60_90", 16, False, 0),
        ("Present campaign outcomes to leadership", "Stakeholder presentation with ROI analysis", "deliverable", "day_60_90", 17, False, 0),
        ("60-day checkpoint review", "Mid-point review with manager", "review", "day_60_90", 18, False, 0),
        ("90-day final review & goal setting", "Complete onboarding, set next quarter goals", "review", "day_60_90", 19, False, 0),
    ]
    for title, desc, cat, phase, idx, completed, completed_day in mktg_milestones:
        offset = phase_offsets[phase]
        await db.milestones.insert_one({
            "milestone_id": f"ms_marcus_{idx:02d}", "plan_id": "plan_marcus", "employee_id": "emp_marcus",
            "title": title, "description": desc, "category": cat, "phase": phase,
            "due_date": (marcus_start + timedelta(days=offset[1])).isoformat(),
            "unlock_date": (marcus_start + timedelta(days=offset[0])).isoformat(),
            "completed_at": (marcus_start + timedelta(days=completed_day)).isoformat() if completed else None,
            "is_completed": completed, "order_index": idx, "dependency_ids": []
        })

    # ─── Seed Chat Messages ───
    chat_data = [
        ("emp_priya", "user", "How do I set up VPN access?", None, []),
        ("emp_priya", "assistant", "Great question! Here's how to set up your VPN:\n\n1. Download GlobalProtect VPN from https://vpn.company.com\n2. Use your corporate email credentials to log in\n3. Full guide available at the wiki\n\n[Source: Day 1 Setup & Logistics Guide](https://wiki.company.com/day1-setup)", "it", [{"title": "Day 1 Setup & Logistics Guide", "url": "https://wiki.company.com/day1-setup"}]),
        ("emp_priya", "user", "What's the code review process?", None, []),
        ("emp_priya", "assistant", "Per our Engineering SDLC guide:\n\n- All PRs require **2 approvals** before merge\n- Reviews should be completed within **24 hours**\n- Use conventional comments focusing on correctness, performance, and maintainability\n- Feature branches from 'develop', PRs trigger CI/CD\n\n[Source: Engineering SDLC & Development Practices](https://wiki.company.com/engineering-sdlc)", "role", [{"title": "Engineering SDLC & Development Practices", "url": "https://wiki.company.com/engineering-sdlc"}]),
        ("emp_marcus", "user", "Where can I find the brand guidelines?", None, []),
        ("emp_marcus", "assistant", "The brand guidelines are available at:\n\n- **Brand Portal**: https://brand.company.com\n- Covers logos, colors, fonts, and tone of voice\n- All marketing materials must follow these guidelines\n\nI recommend reviewing them before creating any campaign materials.\n\n[Source: Marketing Playbook & Campaign Lifecycle](https://wiki.company.com/marketing-playbook)", "role", [{"title": "Marketing Playbook & Campaign Lifecycle", "url": "https://wiki.company.com/marketing-playbook"}]),
        ("emp_marcus", "user", "What's the leave policy?", None, []),
        ("emp_marcus", "assistant", "Per Employee Handbook Section 6:\n\n- **Annual Leave**: 25 days PTO per year (accrue 2.08 days/month)\n- **Sick Leave**: 10 days per year\n- **Parental Leave**: 16 weeks paid\n- **Mental Health**: 2 days per quarter + free EAP counseling\n- Request via Workday\n\n[Source: Benefits, Leave & Time Off Policy](https://wiki.company.com/benefits-leave)", "hr", [{"title": "Benefits, Leave & Time Off Policy", "url": "https://wiki.company.com/benefits-leave"}]),
    ]
    for eid, role, content, intent, sources in chat_data:
        await db.chat_messages.insert_one({
            "message_id": f"msg_{uuid.uuid4().hex[:12]}", "employee_id": eid,
            "role": role, "content": content, "intent_type": intent, "sources": sources,
            "created_at": now.isoformat()
        })

    # ─── Seed Nudges ───
    nudges_data = [
        ("emp_priya", "Complete your first sprint story by Friday - you're doing great!", "day_milestone", False),
        ("emp_priya", "Your Git access request is pending - want me to follow up?", "dependency", False),
        ("emp_priya", "Schedule 1:1 with Manager Rohan for your Week 2 check-in", "day_milestone", True),
        ("emp_marcus", "Complete Analytics & Reporting training this week", "day_milestone", False),
        ("emp_marcus", "Your CRM access request has been pending for 36 hours", "dependency", False),
        ("emp_marcus", "Shadow session with Campaign Manager scheduled for tomorrow", "day_milestone", True),
    ]
    for eid, msg, trigger, is_read in nudges_data:
        await db.nudges.insert_one({
            "nudge_id": f"nudge_{uuid.uuid4().hex[:12]}", "employee_id": eid,
            "message": msg, "trigger_type": trigger, "is_read": is_read,
            "created_at": now.isoformat()
        })

    # ─── Seed LMS Assignments ───
    lms_data = [
        # Priya - Mandatory
        ("emp_priya", "lms_001", "Security Awareness Training", "mandatory", 7, "completed"),
        ("emp_priya", "lms_002", "Privacy & Data Protection", "mandatory", 14, "completed"),
        # Priya - Role
        ("emp_priya", "lms_003", "SDLC & CI/CD Practices", "role", 21, "in_progress"),
        ("emp_priya", "lms_004", "On-Call & Incident Response", "role", 45, "not_started"),
        # Marcus - Mandatory
        ("emp_marcus", "lms_005", "Security Awareness Training", "mandatory", 7, "completed"),
        ("emp_marcus", "lms_006", "Privacy & Data Protection", "mandatory", 14, "in_progress"),
        # Marcus - Role
        ("emp_marcus", "lms_007", "Brand Guidelines & Compliance", "role", 14, "completed"),
        ("emp_marcus", "lms_008", "Marketing Automation (HubSpot)", "role", 28, "not_started"),
    ]
    for eid, mid, name, mtype, due_days, status in lms_data:
        start = priya_start if eid == "emp_priya" else marcus_start
        await db.lms_assignments.insert_one({
            "assignment_id": f"assign_{mid}", "employee_id": eid,
            "module_id": mid, "module_name": name, "module_type": mtype,
            "due_date": (start + timedelta(days=due_days)).isoformat(),
            "status": status,
            "completed_at": (start + timedelta(days=due_days-2)).isoformat() if status == "completed" else None
        })

    # ─── Seed Calendar Events ───
    cal_data = [
        # Priya
        ("emp_priya", "Welcome & Manager Intro", "meeting", 0, 1),
        ("emp_priya", "Buddy Connect - Alex Kumar", "meeting", 1, 1),
        ("emp_priya", "Team Platform Intro", "meeting", 2, 1),
        ("emp_priya", "Tech Lead Architecture Session", "meeting", 7, 2),
        ("emp_priya", "Sprint Planning", "meeting", 7, 1),
        ("emp_priya", "30-Day Review with Rohan", "review", 30, 1),
        ("emp_priya", "60-Day Checkpoint", "review", 60, 1),
        ("emp_priya", "90-Day Final Review", "review", 90, 1),
        # Marcus
        ("emp_marcus", "Welcome & Manager Intro", "meeting", 0, 1),
        ("emp_marcus", "Buddy Connect - Emma Wilson", "meeting", 1, 1),
        ("emp_marcus", "Sales & Product Partner Intro", "meeting", 3, 1),
        ("emp_marcus", "Campaign Process Workshop", "meeting", 7, 2),
        ("emp_marcus", "Content Calendar Planning", "meeting", 8, 1),
        ("emp_marcus", "30-Day Review with Sarah", "review", 30, 1),
        ("emp_marcus", "60-Day Checkpoint", "review", 60, 1),
        ("emp_marcus", "90-Day Final Review", "review", 90, 1),
    ]
    for eid, title, etype, day_offset, dur_hours in cal_data:
        start = priya_start if eid == "emp_priya" else marcus_start
        event_start = start + timedelta(days=day_offset, hours=10)
        await db.calendar_events.insert_one({
            "event_id": f"evt_{uuid.uuid4().hex[:12]}", "employee_id": eid,
            "title": title, "event_type": etype,
            "start_time": event_start.isoformat(),
            "end_time": (event_start + timedelta(hours=dur_hours)).isoformat(),
            "attendees": [], "is_simulated": True
        })

    # ─── Seed Audit Logs ───
    audit_data = [
        ("user_admin", "HR Admin", "plan_generated", "emp_priya", "employee", {"plan_id": "plan_priya"}),
        ("user_admin", "HR Admin", "plan_generated", "emp_marcus", "employee", {"plan_id": "plan_marcus"}),
        ("user_priya", "Priya Sharma", "milestone_completed", "ms_priya_01", "milestone", {"title": "Set up development environment"}),
        ("user_marcus", "Marcus Johnson", "milestone_completed", "ms_marcus_01", "milestone", {"title": "Access brand assets & marketing tools"}),
    ]
    for actor_id, actor_name, action, target, ttype, meta in audit_data:
        await db.audit_logs.insert_one({
            "log_id": f"log_{uuid.uuid4().hex[:12]}",
            "actor_id": actor_id, "actor_name": actor_name,
            "action": action, "target_id": target, "target_type": ttype,
            "metadata": meta, "created_at": now.isoformat()
        })

    return {"status": "seeded", "employees": 2, "users": 5}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

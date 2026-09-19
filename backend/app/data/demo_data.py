"""
Demo data initialization — preloads realistic hospital simulation data.
"""
import uuid
from datetime import datetime, timedelta

# Shared in-memory store (acts as the database for this prototype)
APP_STORE: dict = {
    "patients": {},
    "doctors": {},
    "departments": {},
    "tokens": {},
    "notifications": [],
    "activity": [],
    "consultations": [],
}


def get_store() -> dict:
    return APP_STORE


def _ts(offset_minutes: int = 0) -> str:
    return (datetime.now() - timedelta(minutes=abs(offset_minutes))).isoformat()


def _fmt(dt: datetime) -> str:
    return dt.strftime("%I:%M %p")


def initialize_demo_data():
    """Populate the in-memory store with realistic demo data."""
    from app.services.queue_engine import queue_engine
    queue_engine.set_store(APP_STORE)

    now = datetime.now()

    # ── Doctors ──────────────────────────────────────────────────────────────
    APP_STORE["doctors"] = {
        "D01": {
            "id": "D01",
            "name": "Dr. Sarah Mitchell",
            "department": "Cardiology",
            "status": "consulting",
            "current_patient": "C03",
            "specialization": "Interventional Cardiology",
            "patients_seen_today": 7,
        },
        "D02": {
            "id": "D02",
            "name": "Dr. Raj Patel",
            "department": "General Medicine",
            "status": "available",
            "current_patient": None,
            "specialization": "Internal Medicine",
            "patients_seen_today": 9,
        },
        "D03": {
            "id": "D03",
            "name": "Dr. Amelia Chen",
            "department": "Orthopaedics",
            "status": "consulting",
            "current_patient": "O02",
            "specialization": "Joint Replacement",
            "patients_seen_today": 5,
        },
        "D04": {
            "id": "D04",
            "name": "Dr. Priya Sharma",
            "department": "Paediatrics",
            "status": "available",
            "current_patient": None,
            "specialization": "Paediatric Care",
            "patients_seen_today": 11,
        },
        "D05": {
            "id": "D05",
            "name": "Dr. James Wilson",
            "department": "Emergency",
            "status": "consulting",
            "current_patient": "E01",
            "specialization": "Emergency Medicine",
            "patients_seen_today": 15,
        },
    }

    # ── Departments ──────────────────────────────────────────────────────────
    APP_STORE["departments"] = {
        "Cardiology":       {"name": "Cardiology",      "capacity": 8,  "doctor_ids": ["D01"]},
        "General Medicine": {"name": "General Medicine","capacity": 12, "doctor_ids": ["D02"]},
        "Orthopaedics":     {"name": "Orthopaedics",    "capacity": 8,  "doctor_ids": ["D03"]},
        "Paediatrics":      {"name": "Paediatrics",     "capacity": 10, "doctor_ids": ["D04"]},
        "Emergency":        {"name": "Emergency",       "capacity": 6,  "doctor_ids": ["D05"]},
    }

    # ── Patients & Tokens ────────────────────────────────────────────────────
    patients_data = [
        # Cardiology (D01 consulting C03)
        {
            "id": "PAT001", "name": "Robert Harrington", "age": 58,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "C01", "status": "completed", "estimated_duration": 12,
            "is_emergency": False, "offset": -90,
        },
        {
            "id": "PAT002", "name": "Linda Fernandez", "age": 65,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "New Consultation",
            "priority_level": 4, "priority_label": "Less Urgent",
            "priority_reason": "New consultation — standard",
            "token": "C02", "status": "completed", "estimated_duration": 22,
            "is_emergency": False, "offset": -50,
        },
        {
            "id": "PAT003", "name": "George Tan", "age": 72,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "New Consultation",
            "priority_level": 2, "priority_label": "Very Urgent",
            "priority_reason": "New consultation — elderly patient (>70)",
            "token": "C03", "status": "consulting", "estimated_duration": 25,
            "is_emergency": False, "offset": -10, "consulting": True,
        },
        {
            "id": "PAT004", "name": "Maria Santos", "age": 44,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "Report Review",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Report review — non-urgent",
            "token": "C04", "status": "waiting", "estimated_duration": 10,
            "is_emergency": False, "offset": 0, "position": 1,
        },
        {
            "id": "PAT005", "name": "David Park", "age": 51,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "C05", "status": "waiting", "estimated_duration": 14,
            "is_emergency": False, "offset": 0, "position": 2,
        },

        # General Medicine (D02 available)
        {
            "id": "PAT006", "name": "Angela Moore", "age": 34,
            "department": "General Medicine", "doctor_id": "D02", "visit_type": "New Consultation",
            "priority_level": 4, "priority_label": "Less Urgent",
            "priority_reason": "New consultation — standard",
            "token": "G01", "status": "waiting", "estimated_duration": 12,
            "is_emergency": False, "offset": 0, "position": 1,
        },
        {
            "id": "PAT007", "name": "Thomas Green", "age": 28,
            "department": "General Medicine", "doctor_id": "D02", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "G02", "status": "waiting", "estimated_duration": 9,
            "is_emergency": False, "offset": 0, "position": 2,
        },
        {
            "id": "PAT008", "name": "Susan White", "age": 61,
            "department": "General Medicine", "doctor_id": "D02", "visit_type": "Report Review",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Report review — non-urgent",
            "token": "G03", "status": "waiting", "estimated_duration": 8,
            "is_emergency": False, "offset": 0, "position": 3,
        },
        {
            "id": "PAT009", "name": "Kevin Brooks", "age": 45,
            "department": "General Medicine", "doctor_id": "D02", "visit_type": "New Consultation",
            "priority_level": 4, "priority_label": "Less Urgent",
            "priority_reason": "New consultation — standard",
            "token": "G04", "status": "waiting", "estimated_duration": 13,
            "is_emergency": False, "offset": 0, "position": 4,
        },

        # Orthopaedics (D03 consulting O02)
        {
            "id": "PAT010", "name": "Nancy Kim", "age": 55,
            "department": "Orthopaedics", "doctor_id": "D03", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "O01", "status": "completed", "estimated_duration": 16,
            "is_emergency": False, "offset": -60,
        },
        {
            "id": "PAT011", "name": "Frank Lee", "age": 48,
            "department": "Orthopaedics", "doctor_id": "D03", "visit_type": "New Consultation",
            "priority_level": 4, "priority_label": "Less Urgent",
            "priority_reason": "New consultation — standard",
            "token": "O02", "status": "consulting", "estimated_duration": 20,
            "is_emergency": False, "offset": -15, "consulting": True,
        },
        {
            "id": "PAT012", "name": "Catherine Hughes", "age": 67,
            "department": "Orthopaedics", "doctor_id": "D03", "visit_type": "New Consultation",
            "priority_level": 4, "priority_label": "Less Urgent",
            "priority_reason": "New consultation — standard",
            "token": "O03", "status": "waiting", "estimated_duration": 18,
            "is_emergency": False, "offset": 0, "position": 1,
        },

        # Paediatrics (D04 available)
        {
            "id": "PAT013", "name": "Liam Johnson (child)", "age": 7,
            "department": "Paediatrics", "doctor_id": "D04", "visit_type": "New Consultation",
            "priority_level": 3, "priority_label": "Urgent",
            "priority_reason": "New consultation — paediatric patient (<5)",
            "token": "P01", "status": "waiting", "estimated_duration": 15,
            "is_emergency": False, "offset": 0, "position": 1,
        },
        {
            "id": "PAT014", "name": "Emily Brown (child)", "age": 4,
            "department": "Paediatrics", "doctor_id": "D04", "visit_type": "Follow-up",
            "priority_level": 3, "priority_label": "Urgent",
            "priority_reason": "New consultation — paediatric patient (<5)",
            "token": "P02", "status": "waiting", "estimated_duration": 12,
            "is_emergency": False, "offset": 0, "position": 2,
        },
        {
            "id": "PAT015", "name": "Noah Taylor (child)", "age": 9,
            "department": "Paediatrics", "doctor_id": "D04", "visit_type": "Report Review",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Report review — non-urgent",
            "token": "P03", "status": "waiting", "estimated_duration": 8,
            "is_emergency": False, "offset": 0, "position": 3,
        },

        # Emergency (D05 consulting E01)
        {
            "id": "PAT016", "name": "Daniel Thompson", "age": 42,
            "department": "Emergency", "doctor_id": "D05", "visit_type": "Emergency",
            "priority_level": 1, "priority_label": "Immediate",
            "priority_reason": "Emergency walk-in — very urgent",
            "token": "E01", "status": "consulting", "estimated_duration": 35,
            "is_emergency": True, "offset": -5, "consulting": True,
        },
        {
            "id": "PAT017", "name": "Sarah O'Brien", "age": 78,
            "department": "Emergency", "doctor_id": "D05", "visit_type": "Emergency",
            "priority_level": 1, "priority_label": "Immediate",
            "priority_reason": "Emergency case with high-risk age group (≤5 or >65)",
            "token": "E02", "status": "waiting", "estimated_duration": 40,
            "is_emergency": True, "offset": 0, "position": 1,
        },

        # More General Medicine completed
        {
            "id": "PAT018", "name": "Martin Rivera", "age": 39,
            "department": "General Medicine", "doctor_id": "D02", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "G00", "status": "completed", "estimated_duration": 10,
            "is_emergency": False, "offset": -120,
        },
        {
            "id": "PAT019", "name": "Olivia Scott", "age": 52,
            "department": "Cardiology", "doctor_id": "D01", "visit_type": "Follow-up",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Follow-up appointment — non-urgent",
            "token": "C00", "status": "completed", "estimated_duration": 14,
            "is_emergency": False, "offset": -130,
        },
        {
            "id": "PAT020", "name": "James Walker", "age": 33,
            "department": "Orthopaedics", "doctor_id": "D03", "visit_type": "Report Review",
            "priority_level": 5, "priority_label": "Non-Urgent",
            "priority_reason": "Report review — non-urgent",
            "token": "O00", "status": "completed", "estimated_duration": 9,
            "is_emergency": False, "offset": -80,
        },
    ]

    now = datetime.now()
    for p in patients_data:
        pid = p["id"]
        token_str = p["token"]
        offset = p.get("offset", 0)
        created_at = now - timedelta(minutes=abs(offset)) if offset < 0 else now

        patient_record = {
            "id": pid,
            "name": p["name"],
            "age": p["age"],
            "department": p["department"],
            "doctor_id": p["doctor_id"],
            "visit_type": p["visit_type"],
            "priority_level": p["priority_level"],
            "priority_label": p["priority_label"],
            "priority_reason": p["priority_reason"],
            "token": token_str,
            "status": p["status"],
            "estimated_duration": p["estimated_duration"],
            "is_emergency": p.get("is_emergency", False),
            "estimated_call_in": None,
            "arrival_window_start": None,
            "arrival_window_end": None,
            "created_at": created_at.isoformat(),
        }
        APP_STORE["patients"][pid] = patient_record

        # Token record
        status_map = {
            "completed": "completed",
            "waiting": "queued",
            "consulting": "consulting",
        }
        token_record = {
            "token": token_str,
            "patient_id": pid,
            "patient_name": p["name"],
            "department": p["department"],
            "doctor_id": p["doctor_id"],
            "priority": p["priority_level"],
            "position": p.get("position", 0),
            "estimated_start": None,
            "estimated_end": None,
            "estimated_start_fmt": None,
            "estimated_end_fmt": None,
            "arrival_window_start": None,
            "arrival_window_end": None,
            "wait_minutes": 0,
            "status": status_map.get(p["status"], "queued"),
            "is_emergency": p.get("is_emergency", False),
            "estimated_duration": p["estimated_duration"],
            "created_at": created_at.isoformat(),
        }
        if p.get("consulting"):
            token_record["consultation_start"] = (now - timedelta(minutes=abs(offset))).isoformat()
            token_record["actual_start_fmt"] = (now - timedelta(minutes=abs(offset))).strftime("%I:%M %p")

        APP_STORE["tokens"][token_str] = token_record

    # Set token counters based on loaded data
    queue_engine._token_counters = {"C": 5, "G": 4, "O": 3, "P": 3, "E": 2}
    queue_engine._emergency_counter = {"E": 2}

    # Run initial ETA calculation
    from app.services.queue_engine import queue_engine as qe
    for dept in ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]:
        qe.recalculate_queue(dept)

    # Seed initial activity log
    APP_STORE["activity"] = [
        {
            "id": str(uuid.uuid4()),
            "message": "Token C03 moved to consultation.",
            "type": "success",
            "timestamp": (now - timedelta(minutes=10)).strftime("%I:%M %p"),
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Emergency token E01 added.",
            "type": "emergency",
            "timestamp": (now - timedelta(minutes=5)).strftime("%I:%M %p"),
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Dr. Raj Patel is now available.",
            "type": "info",
            "timestamp": (now - timedelta(minutes=3)).strftime("%I:%M %p"),
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Token O02 moved to consultation.",
            "type": "success",
            "timestamp": (now - timedelta(minutes=15)).strftime("%I:%M %p"),
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Cardiology consultation exceeded predicted duration by 7 min.",
            "type": "warning",
            "timestamp": (now - timedelta(minutes=8)).strftime("%I:%M %p"),
        },
        {
            "id": str(uuid.uuid4()),
            "message": "ETA updated for token C04 and C05.",
            "type": "warning",
            "timestamp": (now - timedelta(minutes=7)).strftime("%I:%M %p"),
        },
    ]
    APP_STORE["notifications"] = [
        {
            "id": str(uuid.uuid4()),
            "message": "Emergency case E02 added. Queue updated.",
            "type": "emergency",
            "token": "E02",
            "timestamp": (now - timedelta(minutes=2)).strftime("%I:%M %p"),
            "read": False,
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Your expected consultation time has changed. Token C04.",
            "type": "warning",
            "token": "C04",
            "timestamp": (now - timedelta(minutes=7)).strftime("%I:%M %p"),
            "read": False,
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Doctor is now available — General Medicine.",
            "type": "info",
            "token": None,
            "timestamp": (now - timedelta(minutes=3)).strftime("%I:%M %p"),
            "read": True,
        },
        {
            "id": str(uuid.uuid4()),
            "message": "Please arrive within your assigned window. Token G01.",
            "type": "info",
            "token": "G01",
            "timestamp": (now - timedelta(minutes=12)).strftime("%I:%M %p"),
            "read": True,
        },
    ]

"""
FastAPI Routes — All API endpoints for the Hospital Triage Engine.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.data.demo_data import get_store
from app.models.schemas import (
    PatientCreate, EmergencyCreate, ConsultationStartRequest,
    ConsultationExtendRequest, ConsultationCompleteRequest,
    PredictionRequest, SimulationRequest,
    PatientStatus, TokenStatus, PRIORITY_LABELS,
)
from app.services.queue_engine import queue_engine, calculate_priority
from app.ml.predictor import predictor

router = APIRouter()


def _store():
    return get_store()


# ── Helper: Department Status ────────────────────────────────────────────────

def _dept_status(dept_name: str) -> dict:
    store = _store()
    tokens = store["tokens"]
    doctors = store["doctors"]

    dept_tokens = [t for t in tokens.values() if t["department"] == dept_name]
    waiting = [t for t in dept_tokens if t["status"] in ("queued", "called")]
    consulting = [t for t in dept_tokens if t["status"] == "consulting"]

    dept_doctors = [d for d in doctors.values() if d["department"] == dept_name]
    doctor_statuses = [d["status"] for d in dept_doctors]
    if "consulting" in doctor_statuses:
        doctor_status = "consulting"
    elif "available" in doctor_statuses:
        doctor_status = "available"
    else:
        doctor_status = "unavailable"

    current_token = None
    if consulting:
        current_token = consulting[0]["token"]

    waiting_count = len(waiting)
    avg_wait = sum(t.get("wait_minutes", 0) for t in waiting) / max(1, len(waiting))

    if waiting_count >= 6 or avg_wait >= 45:
        congestion = "bottleneck"
    elif waiting_count >= 3 or avg_wait >= 20:
        congestion = "moderate"
    else:
        congestion = "normal"

    return {
        "department": dept_name,
        "current_token": current_token,
        "waiting_count": waiting_count,
        "active_consultations": len(consulting),
        "estimated_wait_minutes": int(avg_wait),
        "doctor_status": doctor_status,
        "congestion_level": congestion,
    }


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard():
    store = _store()
    patients = store["patients"]
    tokens = store["tokens"]
    doctors = store["doctors"]
    activity = store.get("activity", [])

    now = datetime.now()
    total_today = len(patients)
    waiting = sum(1 for p in patients.values() if p["status"] == "waiting")
    consulting = sum(1 for p in patients.values() if p["status"] == "consulting")
    emergency = sum(1 for p in patients.values() if p.get("is_emergency"))
    available_docs = sum(1 for d in doctors.values() if d["status"] == "available")

    waiting_times = [t.get("wait_minutes", 0) for t in tokens.values() if t["status"] in ("queued", "called")]
    avg_wait = int(sum(waiting_times) / max(1, len(waiting_times)))

    dept_statuses = [
        _dept_status(d) for d in
        ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]
    ]

    # Arrivals over time (simulated hourly data)
    arrivals = []
    for h in range(8, 18):
        arrivals.append({
            "time": f"{h:02d}:00",
            "count": max(0, int(10 - abs(h - 11) * 1.5 + (2 if h == 14 else 0))),
        })

    # Waiting time trend
    wait_trend = []
    for h in range(8, 18):
        wait_trend.append({
            "time": f"{h:02d}:00",
            "avg_wait": max(5, int(25 - abs(h - 12) * 2 + (10 if h == 10 else 0))),
        })

    # Department congestion chart
    dept_congestion = [
        {"department": d["department"], "waiting": d["waiting_count"], "avg_wait": d["estimated_wait_minutes"]}
        for d in dept_statuses
    ]

    # Doctor workload
    doctor_workload = [
        {
            "doctor": d["name"].replace("Dr. ", ""),
            "patients_seen": d["patients_seen_today"],
            "status": d["status"],
        }
        for d in doctors.values()
    ]

    return {
        "total_patients_today": total_today,
        "currently_waiting": waiting,
        "active_consultations": consulting,
        "emergency_cases": emergency,
        "average_waiting_time": avg_wait,
        "available_doctors": available_docs,
        "departments": dept_statuses,
        "recent_activity": activity[:15],
        "arrivals_over_time": arrivals,
        "waiting_time_trend": wait_trend,
        "department_congestion": dept_congestion,
        "doctor_workload": doctor_workload,
    }


# ── Patients ─────────────────────────────────────────────────────────────────

@router.post("/patients")
def register_patient(req: PatientCreate):
    store = _store()
    doctors = store["doctors"]

    if req.doctor_id not in doctors:
        raise HTTPException(404, f"Doctor {req.doctor_id} not found")

    priority, reason = calculate_priority(
        is_emergency=req.is_emergency,
        visit_type=req.visit_type,
        age=req.age,
    )

    duration = predictor.predict(
        department=req.department,
        age=req.age,
        visit_type=req.visit_type,
        doctor_id=req.doctor_id,
    )

    pid = f"PAT{str(uuid.uuid4())[:6].upper()}"
    token_str = queue_engine.generate_token(req.department, req.is_emergency)
    now = datetime.now()

    patient = {
        "id": pid,
        "name": req.name,
        "age": req.age,
        "department": req.department,
        "doctor_id": req.doctor_id,
        "visit_type": req.visit_type,
        "priority_level": priority,
        "priority_label": PRIORITY_LABELS[priority],
        "priority_reason": reason,
        "token": token_str,
        "status": "waiting",
        "estimated_duration": duration,
        "is_emergency": req.is_emergency,
        "estimated_call_in": None,
        "arrival_window_start": None,
        "arrival_window_end": None,
        "created_at": now.isoformat(),
    }

    # Determine queue position
    dept_waiting = [
        t for t in store["tokens"].values()
        if t["department"] == req.department and t["status"] in ("queued", "called")
    ]
    position = len(dept_waiting) + 1

    token_rec = {
        "token": token_str,
        "patient_id": pid,
        "patient_name": req.name,
        "department": req.department,
        "doctor_id": req.doctor_id,
        "priority": priority,
        "position": position,
        "estimated_start": None,
        "estimated_end": None,
        "estimated_start_fmt": None,
        "estimated_end_fmt": None,
        "arrival_window_start": None,
        "arrival_window_end": None,
        "wait_minutes": 0,
        "status": "queued",
        "is_emergency": req.is_emergency,
        "estimated_duration": duration,
        "created_at": now.isoformat(),
    }

    store["patients"][pid] = patient
    store["tokens"][token_str] = token_rec

    # Priority insertion
    patient["queue_position"] = position
    queue_engine.insert_patient(patient)

    # Recalculate ETAs
    queue_engine.recalculate_queue(req.department)

    queue_engine.add_activity(
        f"New patient registered: {req.name} — Token {token_str} ({req.department}).",
        "info"
    )

    # Return patient info with ETA
    updated_token = store["tokens"].get(token_str, token_rec)
    patient["estimated_call_in"] = updated_token.get("estimated_start_fmt")
    patient["arrival_window_start"] = updated_token.get("arrival_window_start")
    patient["arrival_window_end"] = updated_token.get("arrival_window_end")
    patient["queue_position"] = updated_token.get("position", position)

    return {
        "patient": patient,
        "token": updated_token,
        "message": f"Patient registered. Token: {token_str}",
    }


@router.get("/patients")
def get_patients(department: Optional[str] = None, status: Optional[str] = None):
    store = _store()
    patients = list(store["patients"].values())
    if department:
        patients = [p for p in patients if p["department"] == department]
    if status:
        patients = [p for p in patients if p["status"] == status]
    return {"patients": patients, "total": len(patients)}


@router.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    store = _store()
    if patient_id not in store["patients"]:
        raise HTTPException(404, "Patient not found")
    return store["patients"][patient_id]


# ── Queue ────────────────────────────────────────────────────────────────────

@router.get("/queue")
def get_queue(department: Optional[str] = None):
    store = _store()
    tokens = store["tokens"]

    items = list(tokens.values())
    if department:
        items = [t for t in items if t["department"] == department]

    # Only active tokens
    active = [t for t in items if t["status"] in ("queued", "called", "consulting")]
    active.sort(key=lambda x: (x["department"], x["priority"], x["position"]))

    queue_items = []
    for t in active:
        queue_items.append({
            "position": t["position"],
            "token": t["token"],
            "patient_name": t["patient_name"],
            "priority_level": t["priority"],
            "priority_label": PRIORITY_LABELS.get(t["priority"], "Unknown"),
            "estimated_start": t.get("estimated_start_fmt", "--"),
            "estimated_end": t.get("estimated_end_fmt", "--"),
            "arrival_window_start": t.get("arrival_window_start", "--"),
            "arrival_window_end": t.get("arrival_window_end", "--"),
            "wait_minutes": t.get("wait_minutes", 0),
            "status": t["status"],
            "is_emergency": t.get("is_emergency", False),
            "estimated_duration": t.get("estimated_duration", 15),
            "department": t["department"],
            "doctor_id": t.get("doctor_id"),
        })

    return {"queue": queue_items, "total": len(queue_items)}


@router.get("/queue/{department}")
def get_dept_queue(department: str):
    return get_queue(department=department)


@router.post("/queue/recalculate")
def recalculate_all():
    store = _store()
    for dept in ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]:
        queue_engine.recalculate_queue(dept)
    return {"message": "Queue recalculated for all departments"}


# ── Emergency ────────────────────────────────────────────────────────────────

@router.post("/emergency")
def add_emergency(req: EmergencyCreate):
    store = _store()
    doctors = store["doctors"]

    # Find emergency doctor
    dept_doctors = [d for d in doctors.values() if d["department"] == req.department]
    if not dept_doctors:
        # Fallback to Emergency dept
        dept_doctors = [d for d in doctors.values() if d["department"] == "Emergency"]
    doctor_id = dept_doctors[0]["id"] if dept_doctors else "D05"

    priority, reason = calculate_priority(
        is_emergency=True,
        visit_type="Emergency",
        age=req.age,
        explicit_priority=req.priority_level,
    )

    duration = predictor.predict(
        department=req.department,
        age=req.age,
        visit_type="Emergency",
        doctor_id=doctor_id,
    )

    pid = f"EMG{str(uuid.uuid4())[:6].upper()}"
    token_str = queue_engine.generate_token(req.department, is_emergency=True)
    now = datetime.now()

    patient = {
        "id": pid,
        "name": req.name,
        "age": req.age,
        "department": req.department,
        "doctor_id": doctor_id,
        "visit_type": "Emergency",
        "priority_level": priority,
        "priority_label": PRIORITY_LABELS[priority],
        "priority_reason": reason,
        "token": token_str,
        "status": "waiting",
        "estimated_duration": duration,
        "is_emergency": True,
        "chief_complaint": req.chief_complaint,
        "estimated_call_in": None,
        "arrival_window_start": None,
        "arrival_window_end": None,
        "created_at": now.isoformat(),
        "queue_position": 1,
    }

    # Count affected patients before insertion
    dept_waiting_before = [
        t for t in store["tokens"].values()
        if t["department"] == req.department and t["status"] in ("queued", "called")
    ]
    affected_count = len(dept_waiting_before)

    token_rec = {
        "token": token_str,
        "patient_id": pid,
        "patient_name": req.name,
        "department": req.department,
        "doctor_id": doctor_id,
        "priority": priority,
        "position": 1,
        "estimated_start": None,
        "estimated_end": None,
        "estimated_start_fmt": None,
        "estimated_end_fmt": None,
        "arrival_window_start": None,
        "arrival_window_end": None,
        "wait_minutes": 0,
        "status": "queued",
        "is_emergency": True,
        "estimated_duration": duration,
        "created_at": now.isoformat(),
    }

    store["patients"][pid] = patient
    store["tokens"][token_str] = token_rec

    # Priority insertion (emergency goes ahead)
    queue_engine.insert_patient(patient)
    token_rec["position"] = patient.get("queue_position", 1)

    # Recalculate
    queue_engine.recalculate_queue(req.department)

    # Emergency notifications
    queue_engine.add_activity(
        f"🚨 EMERGENCY PREEMPTION — Token {token_str} (Level {priority}). {affected_count} patients affected.",
        "emergency"
    )
    queue_engine.add_activity(
        f"Emergency token {token_str} — {req.chief_complaint}. Queue recalculated.",
        "emergency"
    )

    updated_token = store["tokens"].get(token_str, token_rec)

    return {
        "patient": patient,
        "token": updated_token,
        "emergency_token": token_str,
        "priority_level": priority,
        "priority_label": PRIORITY_LABELS[priority],
        "affected_patients": affected_count,
        "message": f"Emergency preemption activated. {affected_count} patients' ETAs updated.",
        "preemption_event": {
            "token": token_str,
            "priority": priority,
            "affected": affected_count,
            "reason": reason,
        },
    }


# ── Consultation ──────────────────────────────────────────────────────────────

@router.post("/consultation/start")
def start_consultation(req: ConsultationStartRequest):
    store = _store()
    try:
        result = queue_engine.start_consultation(req.token, req.doctor_id)
        return {"message": f"Consultation started for token {req.token}", "token": result}
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/consultation/extend")
def extend_consultation(req: ConsultationExtendRequest):
    store = _store()
    try:
        result = queue_engine.extend_consultation(req.token, req.extra_minutes)
        return {
            "message": f"Consultation extended by {req.extra_minutes} min. Queue recalculated.",
            "token": result,
        }
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/consultation/complete")
def complete_consultation(req: ConsultationCompleteRequest):
    store = _store()
    try:
        result = queue_engine.complete_consultation(req.token, req.actual_duration)
        return {
            "message": f"Consultation completed. Duration: {req.actual_duration} min.",
            "token": result,
        }
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Tokens ────────────────────────────────────────────────────────────────────

@router.post("/tokens")
def create_token(req: PatientCreate):
    """Alias — token creation is part of patient registration."""
    return register_patient(req)


@router.get("/tokens/{token}")
def get_token(token: str):
    store = _store()
    tokens = store["tokens"]
    if token not in tokens:
        raise HTTPException(404, f"Token {token} not found")
    t = tokens[token]
    patient = store["patients"].get(t.get("patient_id"), {})

    # Find how many are ahead
    dept = t["department"]
    position = t.get("position", 0)
    dept_queue = [
        x for x in tokens.values()
        if x["department"] == dept and x["status"] in ("queued", "called")
    ]
    ahead = max(0, position - 1)

    # Current consulting token for dept
    consulting_tokens = [
        x for x in tokens.values()
        if x["department"] == dept and x["status"] == "consulting"
    ]
    current_consulting = consulting_tokens[0]["token"] if consulting_tokens else None

    return {
        "token": t,
        "patient": patient,
        "patients_ahead": ahead,
        "current_consulting": current_consulting,
        "queue_position": position,
        "estimated_call_in_window": f"{t.get('arrival_window_start', '--')} – {t.get('arrival_window_end', '--')}",
        "estimated_start": t.get("estimated_start_fmt", "--"),
        "estimated_end": t.get("estimated_end_fmt", "--"),
    }


# ── ML Prediction ─────────────────────────────────────────────────────────────

@router.post("/prediction")
def predict_duration(req: PredictionRequest):
    duration = predictor.predict(
        department=req.department,
        age=req.age,
        visit_type=req.visit_type,
        doctor_id=req.doctor_id,
    )
    return {
        "estimated_duration_minutes": duration,
        "model_active": predictor.trained,
        "message": f"Estimated consultation duration: {duration} min",
    }


# ── Simulation ────────────────────────────────────────────────────────────────

@router.post("/simulation")
def run_simulation(req: SimulationRequest):
    store = _store()
    tokens = store["tokens"]
    patients = store["patients"]
    doctors = store["doctors"]

    # Current state
    waiting_now = sum(1 for p in patients.values() if p["status"] == "waiting")
    emergency_now = sum(1 for p in patients.values() if p.get("is_emergency"))
    dept_loads_now = {}
    for dept in ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]:
        w = sum(1 for t in tokens.values() if t["department"] == dept and t["status"] in ("queued", "called"))
        dept_loads_now[dept] = w

    avg_wait_now = 25

    # Simulated state
    total_extra = req.additional_patients + req.additional_emergencies
    sim_waiting = waiting_now + total_extra
    sim_emergencies = emergency_now + req.additional_emergencies
    doc_factor = req.doctor_availability_percent / 100
    effective_docs = max(1, int(len(doctors) * doc_factor))
    avg_duration = req.avg_consultation_duration
    capacity_mult = req.department_capacity_multiplier

    # Projected wait time
    sim_avg_wait = int(
        (sim_waiting * avg_duration) / max(1, effective_docs) * (1 / capacity_mult)
    )

    # Per-dept projections
    dept_loads_sim = {}
    for dept, current in dept_loads_now.items():
        extra = int(req.additional_patients / 5)
        if dept == "Emergency":
            extra += req.additional_emergencies
        dept_loads_sim[dept] = int((current + extra) / max(0.1, capacity_mult))

    most_affected = max(dept_loads_sim, key=lambda d: dept_loads_sim[d] - dept_loads_now.get(d, 0))
    bottleneck = "Emergency" if req.additional_emergencies > 5 else most_affected

    # Build comparison chart data
    comparison = []
    for dept in ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]:
        comparison.append({
            "department": dept,
            "current_waiting": dept_loads_now.get(dept, 0),
            "simulated_waiting": dept_loads_sim.get(dept, 0),
            "current_wait_min": int(dept_loads_now.get(dept, 0) * 15),
            "simulated_wait_min": int(dept_loads_sim.get(dept, 0) * avg_duration),
        })

    return {
        "current_state": {
            "total_waiting": waiting_now,
            "emergency_cases": emergency_now,
            "average_wait_minutes": avg_wait_now,
            "available_doctors": sum(1 for d in doctors.values() if d["status"] == "available"),
            "department_loads": dept_loads_now,
        },
        "simulated_state": {
            "total_waiting": sim_waiting,
            "emergency_cases": sim_emergencies,
            "average_wait_minutes": sim_avg_wait,
            "available_doctors": effective_docs,
            "department_loads": dept_loads_sim,
        },
        "most_affected_department": most_affected,
        "projected_bottleneck": bottleneck,
        "comparison_data": comparison,
        "summary": f"Adding {total_extra} patients with {effective_docs} available doctors projects avg wait of {sim_avg_wait} min.",
    }


# ── Doctors ───────────────────────────────────────────────────────────────────

@router.get("/doctors")
def get_doctors(department: Optional[str] = None):
    store = _store()
    docs = list(store["doctors"].values())
    if department:
        docs = [d for d in docs if d["department"] == department]
    return {"doctors": docs}


@router.get("/doctors/{doctor_id}/queue")
def get_doctor_queue(doctor_id: str):
    store = _store()
    if doctor_id not in store["doctors"]:
        raise HTTPException(404, "Doctor not found")
    doctor = store["doctors"][doctor_id]
    dept = doctor["department"]
    tokens = [
        t for t in store["tokens"].values()
        if t["department"] == dept and t["status"] in ("queued", "called", "consulting")
    ]
    tokens.sort(key=lambda x: x["position"])
    return {
        "doctor": doctor,
        "queue": tokens,
        "dept_waiting": len([t for t in tokens if t["status"] in ("queued", "called")]),
    }


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications():
    store = _store()
    return {"notifications": store.get("notifications", [])[:20]}


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    store = _store()
    for n in store.get("notifications", []):
        if n["id"] == notif_id:
            n["read"] = True
    return {"message": "Marked as read"}


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments")
def get_departments():
    statuses = [
        _dept_status(d) for d in
        ["Cardiology", "General Medicine", "Orthopaedics", "Paediatrics", "Emergency"]
    ]
    return {"departments": statuses}

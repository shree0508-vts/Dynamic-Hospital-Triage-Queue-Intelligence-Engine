"""
Priority Queue Engine — Core Innovation
Rolling arrival windows + dynamic ETA recalculation + emergency preemption.
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from app.models.schemas import (
    PriorityLevel, PRIORITY_LABELS, PatientStatus, TokenStatus, Department
)


def calculate_priority(
    is_emergency: bool,
    visit_type: str,
    age: int,
    chief_complaint: Optional[str] = None,
    explicit_priority: Optional[int] = None,
) -> tuple[int, str]:
    """
    Rule-based priority assignment (transparent hackathon logic).
    Returns (priority_level, reason).
    """
    if explicit_priority is not None:
        return explicit_priority, f"Manually assigned priority Level {explicit_priority}"

    if is_emergency:
        if age > 65 or age < 5:
            return 1, "Emergency case with high-risk age group (≤5 or >65)"
        return 2, "Emergency walk-in — very urgent"

    if visit_type == "Emergency":
        return 2, "Emergency visit type flagged at registration"

    if visit_type == "New Consultation":
        if age > 70:
            return 2, "New consultation — elderly patient (>70)"
        if age < 5:
            return 3, "New consultation — paediatric patient (<5)"
        return 4, "New consultation — standard"

    if visit_type == "Follow-up":
        return 5, "Follow-up appointment — non-urgent"

    if visit_type == "Report Review":
        return 5, "Report review — non-urgent"

    return 4, "Standard priority"


def calculate_arrival_window(
    estimated_call_in: datetime,
    window_minutes: int = 15,
) -> tuple[str, str]:
    """Return formatted arrival window strings."""
    start = estimated_call_in - timedelta(minutes=5)
    end = estimated_call_in + timedelta(minutes=window_minutes - 5)
    fmt = "%I:%M %p"
    return start.strftime(fmt), end.strftime(fmt)


def calculate_eta(base_time: datetime, wait_minutes: int) -> str:
    """Return formatted ETA string."""
    eta = base_time + timedelta(minutes=wait_minutes)
    return eta.strftime("%I:%M %p")


def predict_wait_time(queue_items: list, position: int, avg_duration: float = 15.0) -> int:
    """
    Predict wait time for a patient at given position.
    Sums estimated durations of all patients ahead in the queue.
    """
    total = 0
    count = 0
    for item in queue_items:
        if item.get("position", 999) < position and item.get("status") in ("queued", "consulting", "called"):
            total += item.get("estimated_duration", avg_duration)
            count += 1
    return max(0, int(total))


class QueueEngine:
    """In-memory priority queue with dynamic recalculation."""

    def __init__(self):
        self.store: Dict = {}  # shared app state injected from demo_data
        self._emergency_counter = {"E": 0}
        self._token_counters: Dict[str, int] = {}

    def set_store(self, store: Dict):
        self.store = store

    # ── Token Generation ────────────────────────────────────────────────────

    def _dept_prefix(self, department: str) -> str:
        mapping = {
            "Cardiology": "C",
            "General Medicine": "G",
            "Orthopaedics": "O",
            "Paediatrics": "P",
            "Emergency": "E",
        }
        return mapping.get(department, "X")

    def generate_token(self, department: str, is_emergency: bool = False) -> str:
        if is_emergency:
            self._emergency_counter["E"] += 1
            return f"E{self._emergency_counter['E']:02d}"
        prefix = self._dept_prefix(department)
        if prefix not in self._token_counters:
            self._token_counters[prefix] = 0
        self._token_counters[prefix] += 1
        return f"{prefix}{self._token_counters[prefix]:02d}"

    # ── Insert / Remove ─────────────────────────────────────────────────────

    def insert_patient(self, patient: dict) -> dict:
        """
        Insert patient into queue with correct position based on priority.
        Emergency patients (priority 1-2) jump ahead of non-emergency,
        but regular patients are never fully starved — emergencies go behind
        any currently-consulting patients and behind other equal-priority emergencies.
        """
        tokens = self.store["tokens"]
        dept = patient["department"]
        dept_tokens = [t for t in tokens.values()
                       if t["department"] == dept
                       and t["status"] in ("queued", "called")]

        # Sort existing queue
        dept_tokens.sort(key=lambda x: (x["priority"], x["position"]))

        new_priority = patient["priority_level"]
        is_emergency = patient["is_emergency"]

        if is_emergency and new_priority <= 2:
            # Find insertion point: after all consulting + after higher-priority emergencies
            insert_pos = 1
            for t in dept_tokens:
                if t["status"] == "consulting":
                    insert_pos += 1
                elif t["priority"] < new_priority:
                    insert_pos += 1
                elif t["priority"] == new_priority and t["is_emergency"]:
                    insert_pos += 1
            # Shift others down
            for t in dept_tokens:
                if t["position"] >= insert_pos:
                    t["position"] += 1
                    tokens[t["token"]]["position"] = t["position"]
            patient["queue_position"] = insert_pos
        else:
            # Regular: append to end of dept queue
            patient["queue_position"] = len(dept_tokens) + 1

        return patient

    def remove_patient(self, token: str):
        """Mark patient as completed and compact positions."""
        tokens = self.store["tokens"]
        if token not in tokens:
            return
        t = tokens[token]
        t["status"] = TokenStatus.COMPLETED
        dept = t["department"]
        removed_pos = t["position"]

        # Compact: decrement positions of patients behind the removed one
        for other_token, other in tokens.items():
            if (other["department"] == dept
                    and other["status"] in ("queued", "called")
                    and other["position"] > removed_pos):
                other["position"] -= 1

    def recalculate_queue(self, department: Optional[str] = None):
        """
        Recalculate ETAs for all waiting patients in a department (or all).
        Uses the rolling window approach: each patient's window starts
        immediately after the previous patient's estimated end.
        """
        tokens = self.store["tokens"]
        patients = self.store["patients"]
        departments = department and [department] or list({t["department"] for t in tokens.values()})

        now = datetime.now()
        notifications = self.store.setdefault("notifications", [])

        for dept in departments:
            dept_tokens = [t for t in tokens.values()
                           if t["department"] == dept
                           and t["status"] in ("queued", "called", "consulting")]
            dept_tokens.sort(key=lambda x: x["position"])

            cursor = now
            for t in dept_tokens:
                if t["status"] == "consulting":
                    # Already started — next patient starts after current consultation ends
                    if t.get("consultation_start"):
                        start_dt = datetime.fromisoformat(t["consultation_start"])
                        duration = t.get("estimated_duration", 15)
                        cursor = start_dt + timedelta(minutes=duration)
                    continue

                old_start = t.get("estimated_start")
                duration = t.get("estimated_duration", 15)
                t["estimated_start"] = cursor.isoformat()
                t["estimated_end"] = (cursor + timedelta(minutes=duration)).isoformat()

                # Format for patient view
                fmt = "%I:%M %p"
                t["estimated_start_fmt"] = cursor.strftime(fmt)
                t["estimated_end_fmt"] = (cursor + timedelta(minutes=duration)).strftime(fmt)
                t["wait_minutes"] = max(0, int((cursor - now).total_seconds() / 60))

                # Arrival window
                arr_start = cursor - timedelta(minutes=5)
                arr_end = cursor + timedelta(minutes=10)
                t["arrival_window_start"] = arr_start.strftime(fmt)
                t["arrival_window_end"] = arr_end.strftime(fmt)

                # Update patient record too
                pid = t.get("patient_id")
                if pid and pid in patients:
                    patients[pid]["estimated_call_in"] = cursor.strftime(fmt)
                    patients[pid]["arrival_window_start"] = t["arrival_window_start"]
                    patients[pid]["arrival_window_end"] = t["arrival_window_end"]

                # Notify if ETA changed
                if old_start and old_start != t["estimated_start"]:
                    self._add_notification(
                        f"ETA updated for token {t['token']}: now {t['estimated_start_fmt']}",
                        "warning",
                        t["token"],
                    )

                cursor += timedelta(minutes=duration)

    def _add_notification(self, message: str, ntype: str = "info", token: Optional[str] = None):
        notifs = self.store.setdefault("notifications", [])
        notifs.insert(0, {
            "id": str(uuid.uuid4()),
            "message": message,
            "type": ntype,
            "token": token,
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "read": False,
        })
        # Keep only the last 50
        if len(notifs) > 50:
            self.store["notifications"] = notifs[:50]

    def add_activity(self, message: str, atype: str = "info"):
        acts = self.store.setdefault("activity", [])
        acts.insert(0, {
            "id": str(uuid.uuid4()),
            "message": message,
            "type": atype,
            "timestamp": datetime.now().strftime("%I:%M %p"),
        })
        if len(acts) > 30:
            self.store["activity"] = acts[:30]
        self._add_notification(message, atype)

    # ── Consultation Lifecycle ──────────────────────────────────────────────

    def start_consultation(self, token: str, doctor_id: str) -> dict:
        tokens = self.store["tokens"]
        doctors = self.store["doctors"]
        patients = self.store["patients"]

        if token not in tokens:
            raise ValueError(f"Token {token} not found")

        t = tokens[token]
        t["status"] = TokenStatus.CONSULTING
        t["consultation_start"] = datetime.now().isoformat()
        t["actual_start_fmt"] = datetime.now().strftime("%I:%M %p")

        pid = t.get("patient_id")
        if pid and pid in patients:
            patients[pid]["status"] = PatientStatus.CONSULTING

        if doctor_id in doctors:
            doctors[doctor_id]["status"] = "consulting"
            doctors[doctor_id]["current_patient"] = token

        self.add_activity(f"Token {token} moved to consultation.", "success")
        return t

    def extend_consultation(self, token: str, extra_minutes: int) -> dict:
        tokens = self.store["tokens"]
        if token not in tokens:
            raise ValueError(f"Token {token} not found")

        t = tokens[token]
        t["estimated_duration"] = t.get("estimated_duration", 15) + extra_minutes
        dept = t["department"]
        self.add_activity(
            f"Consultation for {token} extended by {extra_minutes} min. Downstream ETAs recalculated.",
            "warning"
        )
        self.recalculate_queue(dept)
        return t

    def complete_consultation(self, token: str, actual_duration: int) -> dict:
        tokens = self.store["tokens"]
        doctors = self.store["doctors"]
        patients = self.store["patients"]

        if token not in tokens:
            raise ValueError(f"Token {token} not found")

        t = tokens[token]
        dept = t["department"]
        old_duration = t.get("estimated_duration", 15)
        t["status"] = TokenStatus.COMPLETED
        t["actual_duration"] = actual_duration
        t["estimated_duration"] = actual_duration  # update for recalc

        pid = t.get("patient_id")
        if pid and pid in patients:
            patients[pid]["status"] = PatientStatus.COMPLETED

        doctor_id = t.get("doctor_id")
        if doctor_id and doctor_id in doctors:
            doctors[doctor_id]["status"] = "available"
            doctors[doctor_id]["current_patient"] = None
            doctors[doctor_id]["patients_seen_today"] = doctors[doctor_id].get("patients_seen_today", 0) + 1

        self.remove_patient(token)
        self.add_activity(f"Consultation for token {token} completed ({actual_duration} min).", "success")

        # Update ML feedback data
        variance = actual_duration - old_duration
        if abs(variance) > 3:
            self.add_activity(
                f"{'Cardiology' if 'C' in token else dept} consultation exceeded predicted duration by {variance} min.",
                "warning"
            )

        self.recalculate_queue(dept)
        return t


# Singleton
queue_engine = QueueEngine()

"""
Pydantic schemas for the Hospital Triage System
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Department(str, Enum):
    CARDIOLOGY = "Cardiology"
    GENERAL_MEDICINE = "General Medicine"
    ORTHOPAEDICS = "Orthopaedics"
    PAEDIATRICS = "Paediatrics"
    EMERGENCY = "Emergency"


class VisitType(str, Enum):
    NEW_CONSULTATION = "New Consultation"
    FOLLOW_UP = "Follow-up"
    REPORT_REVIEW = "Report Review"
    EMERGENCY = "Emergency"


class PriorityLevel(int, Enum):
    IMMEDIATE = 1
    VERY_URGENT = 2
    URGENT = 3
    LESS_URGENT = 4
    NON_URGENT = 5


PRIORITY_LABELS = {
    1: "Immediate",
    2: "Very Urgent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-Urgent",
}


class PatientStatus(str, Enum):
    REGISTERED = "registered"
    WAITING = "waiting"
    CONSULTING = "consulting"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TokenStatus(str, Enum):
    QUEUED = "queued"
    CALLED = "called"
    CONSULTING = "consulting"
    COMPLETED = "completed"
    SKIPPED = "skipped"


# ── Request Models ──────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    age: int
    department: Department
    doctor_id: str
    visit_type: VisitType
    is_emergency: bool = False
    chief_complaint: Optional[str] = None


class EmergencyCreate(BaseModel):
    name: str
    age: int
    department: Department
    chief_complaint: str
    priority_level: Optional[int] = None  # auto-assigned if None


class ConsultationStartRequest(BaseModel):
    token: str
    doctor_id: str


class ConsultationExtendRequest(BaseModel):
    token: str
    extra_minutes: int = 10


class ConsultationCompleteRequest(BaseModel):
    token: str
    actual_duration: int


class PredictionRequest(BaseModel):
    department: Department
    age: int
    visit_type: VisitType
    doctor_id: str


class SimulationRequest(BaseModel):
    additional_patients: int = 0
    additional_emergencies: int = 0
    doctor_availability_percent: float = 100.0
    avg_consultation_duration: float = 15.0
    department_capacity_multiplier: float = 1.0


# ── Response Models ─────────────────────────────────────────────────────────

class DoctorInfo(BaseModel):
    id: str
    name: str
    department: Department
    status: str  # available, consulting, unavailable
    current_patient: Optional[str] = None
    patients_seen_today: int = 0


class PatientInfo(BaseModel):
    id: str
    name: str
    age: int
    department: Department
    doctor_id: str
    visit_type: VisitType
    priority_level: int
    priority_label: str
    priority_reason: str
    token: str
    status: PatientStatus
    estimated_duration: int
    estimated_call_in: Optional[str]
    arrival_window_start: Optional[str]
    arrival_window_end: Optional[str]
    queue_position: int
    is_emergency: bool
    created_at: str


class TokenInfo(BaseModel):
    token: str
    patient_id: str
    patient_name: str
    department: Department
    doctor_id: str
    priority: int
    position: int
    estimated_start: Optional[str]
    estimated_end: Optional[str]
    status: TokenStatus
    is_emergency: bool
    created_at: str


class QueueItem(BaseModel):
    position: int
    token: str
    patient_name: str
    priority_level: int
    priority_label: str
    estimated_start: Optional[str]
    estimated_end: Optional[str]
    status: str
    is_emergency: bool
    wait_minutes: int


class DepartmentStatus(BaseModel):
    department: str
    current_token: Optional[str]
    waiting_count: int
    active_consultations: int
    estimated_wait_minutes: int
    doctor_status: str
    congestion_level: str  # normal, moderate, bottleneck


class DashboardData(BaseModel):
    total_patients_today: int
    currently_waiting: int
    active_consultations: int
    emergency_cases: int
    average_waiting_time: int
    available_doctors: int
    departments: List[DepartmentStatus]
    recent_activity: List[dict]
    arrivals_over_time: List[dict]
    waiting_time_trend: List[dict]
    department_congestion: List[dict]
    doctor_workload: List[dict]


class NotificationItem(BaseModel):
    id: str
    message: str
    type: str  # info, warning, emergency, success
    token: Optional[str]
    timestamp: str
    read: bool = False


class SimulationResult(BaseModel):
    current_state: dict
    simulated_state: dict
    most_affected_department: str
    projected_bottleneck: str
    comparison_data: List[dict]

from pydantic import BaseModel, EmailStr
from typing import List, Optional

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # 'interviewee' or 'interviewer'

class UserCreate(UserBase):
    password: str
    bio: Optional[str] = ""
    specialties: Optional[str] = ""
    hourly_rate: Optional[int] = 50

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    bio: str
    specialties: str
    hourly_rate: int
    balance: int
    rating: float
    avatar: str

    class Config:
        from_attributes = True


# --- AVAILABILITY SCHEMAS ---
class AvailabilityCreate(BaseModel):
    day_of_week: int  # 0 to 6
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"

class AvailabilityResponse(BaseModel):
    id: int
    interviewer_id: int
    day_of_week: int
    start_time: str
    end_time: str

    class Config:
        from_attributes = True


# --- APPOINTMENT SCHEMAS ---
class AppointmentCreate(BaseModel):
    interviewer_id: int
    scheduled_at: str  # "YYYY-MM-DD HH:MM"

class AppointmentResponse(BaseModel):
    id: int
    interviewee_id: int
    interviewer_id: int
    scheduled_at: str
    status: str
    duration_minutes: int
    credits_paid: int
    interviewer: Optional[UserResponse] = None
    interviewee: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# --- FEEDBACK SCHEMAS ---
class FeedbackCreate(BaseModel):
    overall_score: int
    technical_depth_score: int
    technical_depth_feedback: str
    communication_score: int
    communication_feedback: str
    recommendations: str

class FeedbackResponse(BaseModel):
    id: int
    appointment_id: int
    overall_score: int
    technical_depth_score: int
    technical_depth_feedback: str
    communication_score: int
    communication_feedback: str
    recommendations: str
    created_at: str

    class Config:
        from_attributes = True


# --- TRANSACTION SCHEMAS ---
class TransactionResponse(BaseModel):
    id: int
    user_id: int
    amount: int
    type: str  # 'deposit', 'withdrawal', 'payment_sent', 'payment_received'
    description: str
    created_at: str

    class Config:
        from_attributes = True


# --- TOPUP & WITHDRAWAL SCHEMAS ---
class TopUpRequest(BaseModel):
    amount: int

class WithdrawalRequest(BaseModel):
    amount: int
    method: str  # 'PayPal', 'Bank Transfer', 'UPI'
    details: str

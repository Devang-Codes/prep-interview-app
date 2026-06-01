from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # Stored simple string for demo authentication ease
    role = Column(String)  # 'interviewee' or 'interviewer'
    bio = Column(String, default="")
    specialties = Column(String, default="")  # Comma-separated specialties, e.g., "Frontend,React,System Design"
    hourly_rate = Column(Integer, default=50)  # Rate in credits per session
    balance = Column(Integer, default=100)  # Interviewees start with 100, interviewers start with 0
    rating = Column(Float, default=5.0)
    avatar = Column(String, default="")

    # Relationships
    availability = relationship("Availability", back_populates="interviewer", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    
    # Dual relationship to appointments
    appointments_as_interviewee = relationship(
        "Appointment", 
        foreign_keys="[Appointment.interviewee_id]",
        back_populates="interviewee",
        cascade="all, delete-orphan"
    )
    appointments_as_interviewer = relationship(
        "Appointment", 
        foreign_keys="[Appointment.interviewer_id]",
        back_populates="interviewer",
        cascade="all, delete-orphan"
    )


class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    day_of_week = Column(Integer)  # 0: Monday, 6: Sunday
    start_time = Column(String)  # "HH:MM"
    end_time = Column(String)  # "HH:MM"

    interviewer = relationship("User", back_populates="availability")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    interviewee_id = Column(Integer, ForeignKey("users.id"))
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    scheduled_at = Column(String)  # Format: "YYYY-MM-DD HH:MM"
    status = Column(String, default="scheduled")  # 'scheduled', 'completed', 'cancelled'
    duration_minutes = Column(Integer, default=60)
    credits_paid = Column(Integer, default=0)

    # Relationships
    interviewee = relationship("User", foreign_keys=[interviewee_id], back_populates="appointments_as_interviewee")
    interviewer = relationship("User", foreign_keys=[interviewer_id], back_populates="appointments_as_interviewer")
    feedback = relationship("Feedback", uselist=False, back_populates="appointment", cascade="all, delete-orphan")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True)
    overall_score = Column(Integer)
    technical_depth_score = Column(Integer)
    technical_depth_feedback = Column(String)
    communication_score = Column(Integer)
    communication_feedback = Column(String)
    recommendations = Column(String)
    created_at = Column(String)  # ISO format

    appointment = relationship("Appointment", back_populates="feedback")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Integer)  # Can be positive (earn/deposit) or negative (pay/withdraw)
    type = Column(String)  # 'deposit', 'withdrawal', 'payment_sent', 'payment_received'
    description = Column(String)
    created_at = Column(String)

    user = relationship("User", back_populates="transactions")

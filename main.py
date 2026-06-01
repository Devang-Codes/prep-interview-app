import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any

import models
import schemas
from database import engine, Base, get_db
from ai_service import AIService

# Initialize DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prep - AI Interview Marketplace API")

# Seed initial premium database content
def seed_database(db: Session):
    if db.query(models.User).count() > 0:
        return  # Database already seeded

    print("Seeding database with premium mock expert data...")

    # Seed Interviewee
    devan = models.User(
        name="Devan",
        email="devan@prep.com",
        password="password",
        role="interviewee",
        bio="Passionate aspiring Software Engineer preparing for senior product roles.",
        specialties="",
        hourly_rate=0,
        balance=350,  # Starts with ample credits to book mock interviews
        rating=5.0,
        avatar="devan"
    )
    db.add(devan)
    db.flush()

    # Seed Interviewers
    interviewers_data = [
        {
            "name": "Sarah Jenkins",
            "email": "sarah@prep.com",
            "password": "password",
            "role": "interviewer",
            "specialties": "Frontend, React, UI/UX",
            "hourly_rate": 60,
            "balance": 180,
            "rating": 4.9,
            "bio": "Ex-Netflix Staff Engineer. Specialized in advanced React architectures, performance profiling, and design systems integration.",
            "avatar": "sarah"
        },
        {
            "name": "Marcus Chen",
            "email": "marcus@prep.com",
            "password": "password",
            "role": "interviewer",
            "specialties": "Backend, Python, Databases",
            "hourly_rate": 80,
            "balance": 240,
            "rating": 5.0,
            "bio": "Principal Backend Engineer at Stripe. Author of Python web tools. Specialist in database optimizations, connection queues, and distributed transactional Sagas.",
            "avatar": "marcus"
        },
        {
            "name": "Elena Rostova",
            "email": "elena@prep.com",
            "password": "password",
            "role": "interviewer",
            "specialties": "System Design, Microservices, Scale",
            "hourly_rate": 100,
            "balance": 0,
            "rating": 4.8,
            "bio": "Principal Solutions Architect at AWS. Resilient cloud systems designer. Focused on distributed state, sharding, and high-availability consistency protocols.",
            "avatar": "elena"
        },
        {
            "name": "Alex Thompson",
            "email": "alex@prep.com",
            "password": "password",
            "role": "interviewer",
            "specialties": "PM, Product Roadmap, Metrics",
            "hourly_rate": 70,
            "balance": 140,
            "rating": 4.7,
            "bio": "Senior Product Manager at Google. Monetization products lead. Master at prioritized roadmaps, user cohort retention, and data-driven product pivots.",
            "avatar": "alex"
        },
        {
            "name": "Aiden Reynolds",
            "email": "aiden@prep.com",
            "password": "password",
            "role": "interviewer",
            "specialties": "General, STAR Method, Behavior",
            "hourly_rate": 50,
            "balance": 50,
            "rating": 4.9,
            "bio": "Experienced Coach and Technical Recruiter. Specialized in behavioral frameworks, leadership principles, and aces structural STAR storytelling.",
            "avatar": "aiden"
        }
    ]

    seeded_interviewers = []
    for data in interviewers_data:
        interviewer = models.User(**data)
        db.add(interviewer)
        db.flush()
        seeded_interviewers.append(interviewer)

        # Seed Availability slots for each interviewer (Monday, Wednesday, Friday)
        for day in [0, 2, 4]:
            slot1 = models.Availability(
                interviewer_id=interviewer.id,
                day_of_week=day,
                start_time="10:00",
                end_time="12:00"
            )
            slot2 = models.Availability(
                interviewer_id=interviewer.id,
                day_of_week=day,
                start_time="14:00",
                end_time="16:00"
            )
            db.add(slot1)
            db.add(slot2)

    # Seed some Transaction ledger entries
    t1 = models.Transaction(
        user_id=devan.id,
        amount=350,
        type="deposit",
        description="Welcome promotion signup credits",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(t1)

    # Seed past completed session between Devan and Marcus Chen
    marcus = seeded_interviewers[1]
    past_date = "2026-05-28 14:00"
    
    past_appt = models.Appointment(
        interviewee_id=devan.id,
        interviewer_id=marcus.id,
        scheduled_at=past_date,
        status="completed",
        duration_minutes=60,
        credits_paid=80
    )
    db.add(past_appt)
    db.flush()

    # Deduct credits from Devan for past session
    devan.balance -= 80
    marcus.balance += 80

    t2 = models.Transaction(
        user_id=devan.id,
        amount=-80,
        type="payment_sent",
        description=f"Completed backend interview session with Marcus Chen",
        created_at=past_date
    )
    t3 = models.Transaction(
        user_id=marcus.id,
        amount=80,
        type="payment_received",
        description=f"Completed backend interview session with Devan",
        created_at=past_date
    )
    db.add(t2)
    db.add(t3)

    # Add a rich AI Feedback report for the completed session
    mock_chat = [
        {"sender": "Interviewer", "text": "Hi Devan, let's start the backend interview. What is the Global Interpreter Lock in Python?"},
        {"sender": "Candidate", "text": "Hi! The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once. It's used in CPython for memory management safety."},
        {"sender": "Interviewer", "text": "Excellent explanation. How do you bypass it if you need high performance multi-core calculation?"},
        {"sender": "Candidate", "text": "To bypass the GIL, we can use the `multiprocessing` library instead of `threading`. This spawns separate system processes, each with its own Python interpreter and memory space, allowing them to utilize separate CPU cores."}
    ]

    report = AIService.generate_feedback_report("Backend Developer", "Python & DB", mock_chat)

    past_feedback = models.Feedback(
        appointment_id=past_appt.id,
        overall_score=report["overall_score"],
        technical_depth_score=report["technical_depth_score"],
        technical_depth_feedback=report["technical_depth_feedback"],
        communication_score=report["communication_score"],
        communication_feedback=report["communication_feedback"],
        recommendations=report["recommendations"],
        created_at=past_date
    )
    db.add(past_feedback)
    
    db.commit()
    print("Database seeding completed successfully.")

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    seed_database(db)

# --- API ENDPOINTS ---

# 1. AUTHENTICATION
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Assign predefined placeholder tags as avatar name
    avatar_name = user_data.name.split()[0].lower() if user_data.name else "user"
    
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role,
        bio=user_data.bio,
        specialties=user_data.specialties,
        hourly_rate=user_data.hourly_rate if user_data.role == "interviewer" else 0,
        balance=100 if user_data.role == "interviewee" else 0,  # Interviewees get 100 free credits
        avatar=avatar_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create transaction log for initial welcome credits
    if new_user.role == "interviewee":
        welcome_t = models.Transaction(
            user_id=new_user.id,
            amount=100,
            type="deposit",
            description="Welcome promotion signup credits",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
        )
        db.add(welcome_t)
        db.commit()

    return new_user

@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or user.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

# 2. MARKETPLACE & INTERVIEWERS
@app.get("/api/interviewers", response_model=List[schemas.UserResponse])
def get_interviewers(role_filter: str = None, db: Session = Depends(get_db)):
    query = db.query(models.User).filter(models.User.role == "interviewer")
    if role_filter:
        query = query.filter(models.User.specialties.contains(role_filter))
    return query.all()

@app.get("/api/interviewers/{interviewer_id}", response_model=schemas.UserResponse)
def get_interviewer(interviewer_id: int, db: Session = Depends(get_db)):
    interviewer = db.query(models.User).filter(models.User.id == interviewer_id, models.User.role == "interviewer").first()
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")
    return interviewer

# 3. AVAILABILITY SLOTS
@app.get("/api/interviewers/{interviewer_id}/availability", response_model=List[schemas.AvailabilityResponse])
def get_interviewer_availability(interviewer_id: int, db: Session = Depends(get_db)):
    return db.query(models.Availability).filter(models.Availability.interviewer_id == interviewer_id).all()

@app.post("/api/availability", response_model=schemas.AvailabilityResponse)
def create_availability(slot: schemas.AvailabilityCreate, interviewer_id: int, db: Session = Depends(get_db)):
    # Check if user is interviewer
    interviewer = db.query(models.User).filter(models.User.id == interviewer_id, models.User.role == "interviewer").first()
    if not interviewer:
        raise HTTPException(status_code=403, detail="Only interviewers can configure availability")
        
    db_slot = models.Availability(
        interviewer_id=interviewer_id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

@app.delete("/api/availability/{slot_id}")
def delete_availability(slot_id: int, interviewer_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.Availability).filter(models.Availability.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.interviewer_id != interviewer_id:
        raise HTTPException(status_code=403, detail="Unauthorised operation")
        
    db.delete(slot)
    db.commit()
    return {"detail": "Slot deleted successfully"}

# 4. APPOINTMENTS & BOOKINGS
@app.post("/api/appointments", response_model=schemas.AppointmentResponse)
def book_appointment(booking: schemas.AppointmentCreate, interviewee_id: int, db: Session = Depends(get_db)):
    # Check interviewee
    interviewee = db.query(models.User).filter(models.User.id == interviewee_id, models.User.role == "interviewee").first()
    if not interviewee:
        raise HTTPException(status_code=404, detail="Interviewee not found")
        
    # Check interviewer
    interviewer = db.query(models.User).filter(models.User.id == booking.interviewer_id, models.User.role == "interviewer").first()
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")
        
    cost = interviewer.hourly_rate
    if interviewee.balance < cost:
        raise HTTPException(status_code=400, detail="Insufficient credits. Please top up your wallet.")
        
    # Deduct interviewee credits
    interviewee.balance -= cost
    
    # Create Appointment
    appointment = models.Appointment(
        interviewee_id=interviewee_id,
        interviewer_id=booking.interviewer_id,
        scheduled_at=booking.scheduled_at,
        status="scheduled",
        duration_minutes=60,
        credits_paid=cost
    )
    db.add(appointment)
    db.flush()
    
    # Log ledger transaction for payee
    transaction = models.Transaction(
        user_id=interviewee_id,
        amount=-cost,
        type="payment_sent",
        description=f"Booked 1:1 session with {interviewer.name} for {booking.scheduled_at}",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(transaction)
    db.commit()
    db.refresh(appointment)
    
    return appointment

@app.get("/api/appointments/me", response_model=List[schemas.AppointmentResponse])
def get_my_appointments(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "interviewee":
        appointments = db.query(models.Appointment).filter(models.Appointment.interviewee_id == user_id).all()
    else:
        appointments = db.query(models.Appointment).filter(models.Appointment.interviewer_id == user_id).all()
        
    # Lazy loads the associated interviewer/interviewee models
    return appointments

# 5. AI ROOM REAL-TIME HELPERS
@app.get("/api/appointments/{appointment_id}/room-helper")
def get_room_helper(appointment_id: int, user_id: int, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Security check: User is member of appointment
    if appointment.interviewee_id != user_id and appointment.interviewer_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Get role and specialties
    interviewer = appointment.interviewer
    
    # Generate Questions based on specialties
    role = interviewer.specialties.split(",")[0] if interviewer.specialties else "Software Engineer"
    questions = AIService.generate_questions(role, interviewer.specialties)
    return {"role": role, "specialties": interviewer.specialties, "suggested_questions": questions}

@app.post("/api/appointments/{appointment_id}/submit-transcript", response_model=schemas.FeedbackResponse)
def submit_transcript(appointment_id: int, transcript_payload: Dict[str, Any], user_id: int, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appointment.interviewee_id != user_id and appointment.interviewer_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if appointment.status == "completed":
        raise HTTPException(status_code=400, detail="Session already processed")
        
    # Update appointment status
    appointment.status = "completed"
    
    # Add credits to interviewer wallet
    interviewer = appointment.interviewer
    cost = appointment.credits_paid
    interviewer.balance += cost
    
    # Log transaction for earner
    earnings_tx = models.Transaction(
        user_id=interviewer.id,
        amount=cost,
        type="payment_received",
        description=f"Earned from 1:1 session with {appointment.interviewee.name}",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(earnings_tx)
    
    # Generate AI Feedback
    chat_transcript = transcript_payload.get("transcript", [])
    role = interviewer.specialties.split(",")[0] if interviewer.specialties else "Software Engineer"
    report = AIService.generate_feedback_report(role, interviewer.specialties, chat_transcript)
    
    feedback = models.Feedback(
        appointment_id=appointment_id,
        overall_score=report["overall_score"],
        technical_depth_score=report["technical_depth_score"],
        technical_depth_feedback=report["technical_depth_feedback"],
        communication_score=report["communication_score"],
        communication_feedback=report["communication_feedback"],
        recommendations=report["recommendations"],
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    return feedback

@app.get("/api/appointments/{appointment_id}/feedback", response_model=schemas.FeedbackResponse)
def get_appointment_feedback(appointment_id: int, user_id: int, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if appointment.interviewee_id != user_id and appointment.interviewer_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    feedback = db.query(models.Feedback).filter(models.Feedback.appointment_id == appointment_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback report not generated yet")
        
    return feedback

# 6. DASHBOARDS, CREDITS, LEDGERS
@app.get("/api/transactions", response_model=List[schemas.TransactionResponse])
def get_transactions(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.id.desc()).all()

@app.post("/api/dashboard/topup", response_model=schemas.UserResponse)
def topup_credits(payload: schemas.TopUpRequest, user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "interviewee").first()
    if not user:
        raise HTTPException(status_code=404, detail="Interviewee user not found")
        
    user.balance += payload.amount
    
    tx = models.Transaction(
        user_id=user_id,
        amount=payload.amount,
        type="deposit",
        description=f"Deposited {payload.amount} credits to wallet",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(tx)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/dashboard/withdraw", response_model=schemas.UserResponse)
def withdraw_credits(payload: schemas.WithdrawalRequest, user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id, models.User.role == "interviewer").first()
    if not user:
        raise HTTPException(status_code=404, detail="Interviewer user not found")
        
    if user.balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient earnings balance to withdraw")
        
    user.balance -= payload.amount
    
    tx = models.Transaction(
        user_id=user_id,
        amount=-payload.amount,
        type="withdrawal",
        description=f"Withdrew {payload.amount} credits via {payload.method} ({payload.details})",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M")
    )
    db.add(tx)
    db.commit()
    db.refresh(user)
    return user

# Serve SPA Frontend static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# HTML template serving route
@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_dir, "index.html"))

# Mount remaining static directories for CSS and JS
app.mount("/static", StaticFiles(directory=static_dir), name="static")

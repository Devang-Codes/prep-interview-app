# 🧠 Prep - AI-Powered Technical Interview Marketplace

Prep is a production-grade, full-stack mock interview marketplace built using **Python (FastAPI)** and a premium **Single Page Application (SPA)** frontend utilizing dark-mode glassmorphic aesthetics, custom HSL variable stylesheets, and Canvas-driven camera simulations.

The platform bridges the gap for candidates preparing for technical and behavioral interviews by allowing them to book 1:1 sessions with verified experts, practice inside a cinematic mock interview call room with real-time AI technical question helpers, and automatically receive comprehensive post-interview feedback analytics.

---

## ✨ Features

* **💼 Verifiable Experts Marketplace**: Browse verified principal architects and engineering leaders, search specialties, filter categories (Frontend, Backend, System Design, Product Management, Behavioral), and check schedule calendars.
* **📅 Booking & Credit System**: Candidates start with free credits to book mock slots. Credits are safely checked out and held, then released to the interviewer's earnings upon completing the session.
* **⚡ Double Webcam Call Room**: Fullscreen immersive call room featuring simulated audio frequency sine waves, camera scan filters, a shared whiteboard notepad editor, and a live text-chat dialogue feed.
* **🤖 AI Interviewer Helper**: During the call, the interviewer has access to an AI question generator that suggests challenging, role-specific questions in real-time.
* **📊 AI Appraisal Reports**: Once the call ends, the system automatically analyzes dialogue transcripts and generates beautiful radial match score charts, competency progress bars, technical strengths, and behavioral feedback roadmaps.
* **💳 Financial Audit Ledgers**: Review deposit history, checkout pay logs, incoming salary balances, and withdraw earnings directly through PayPal, bank transfers, or UPI.

---

## 🛠️ Technology Stack

* **Backend & API**: FastAPI (Python 3.12+)
* **Database Persistence**: SQLite mapped via SQLAlchemy ORM
* **Schema Validation**: Pydantic v2
* **AI Core**: Google Gemini API (`google-generativeai`) with a robust local synthesis engine fallback
* **Frontend**: HTML5, modern Single Page Application (SPA) routing, and Vanilla CSS Grid/Flex layout systems featuring backdrop-filter blur (glassmorphism)

---

## 🚀 Local Development Startup

### 1. Prerequisite Installations
Ensure Python 3.10+ is installed on your system. Clone your repository and install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables (Optional)
If you wish to use live Google Gemini API question and report generations (instead of the high-fidelity local synthesis generators), create a `.env` file in the root folder and add your key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Launch the Server
Start the development server using Uvicorn:
```bash
python -m uvicorn main:app --port 8000
```

Open your browser and navigate to:
🔗 **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

---

## 🔑 Seeding & Demo Accounts
On initial server startup, the database is automatically seeded with candidate balances, 5 professional interviewers, schedules, transactions, and a completed past session feedback report.

You can log in and test both candidate and interviewer dashboards immediately:

### 👤 Candidate Account (For booking & viewing feedback)
* **Email**: `devan@prep.com`
* **Password**: `password`
* *Preloaded with 350 free credits, active appointments, and a complete past AI Appraisal Report*

### 👔 Interviewer Account (For slot configurations & withdrawals)
* **Email**: `marcus@prep.com`
* **Password**: `password`
* *Preloaded with active earnings, withdrawals logs, and weekly availability slots*

---

## ☁️ 1-Click Deployment to Render (Free Tier)
To deploy this unified app to the cloud:
1. Push this folder to a new repository on GitHub.
2. Sign up for a free account at [Render.com](https://render.com/).
3. Create a new **Web Service** and link your GitHub repository.
4. Set the configurations:
   * **Language**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   * **Instance Type**: Select **Free**
5. Click **Deploy Web Service** and access your public HTTPS link!

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

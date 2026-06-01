import os
import json
import random
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Attempt to configure Gemini if key is present
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_available = False

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
    except Exception as e:
        print(f"Failed to load google-generativeai or configure API key: {e}")

# High-fidelity Local Mock Database for rich simulations
MOCK_QUESTIONS = {
    "frontend": [
        "Explain the difference between Virtual DOM and Real DOM, and how React 19's reconciliation algorithm operates.",
        "How do you optimize a complex React application that is experiencing slow rendering and bottleneck performance?",
        "What are React Server Components (RSC) and how do they fundamentally differ from Client Components (SSR)?",
        "Explain hook closures in React. Have you ever encountered stale closures, and how did you resolve them?",
        "How would you build a micro-frontend architecture? What are the pros and cons of using Webpack Module Federation?",
        "Explain standard CSS-in-JS vs CSS Modules performance implications. When would you prefer vanilla CSS?"
    ],
    "backend": [
        "What is the Global Interpreter Lock (GIL) in Python? How does it affect multi-threading vs multi-processing under Python 3.12+?",
        "Compare SQL and NoSQL databases. When would you choose PostgreSQL over MongoDB for an e-commerce platform?",
        "How do you design a database schema for high-throughput write operations while maintaining strict ACID compliance?",
        "What is the difference between concurrency and parallelism in Python? Explain how FastAPI utilizes `asyncio` and thread pools.",
        "How do you handle distributed transactions across multiple microservices? Explain the Saga Pattern.",
        "Explain database indexing strategies. What is the internal difference between a B-Tree and a Hash index?"
    ],
    "system_design": [
        "How would you design a distributed, low-latency rate limiter for an API marketplace handling 200k requests per second?",
        "Explain horizontal vs vertical scaling. What mechanisms are needed to manage session state in horizontally scaled systems?",
        "How do you design a high-definition video-streaming service like Netflix or Twitch? Focus on CDNs and transcoding pipelines.",
        "Explain the CAP theorem. How would you choose between consistency and availability in a distributed financial ledger?",
        "How would you design a distributed job scheduler or message queue like RabbitMQ or Kafka from scratch?",
        "What is database sharding? How do consistent hashing algorithms help minimize re-sharding overhead?"
    ],
    "pm": [
        "How do you prioritize features for a new SaaS product launch when dealing with conflicting requests from sales, engineering, and executives?",
        "Tell me about a time you had to pivot a product strategy based on user analytics. What specific metrics guided your decision?",
        "How do you handle a situation where engineering tells you a critical feature will be delayed by three weeks, risking a contract with a key enterprise client?",
        "How would you define the North Star metric for a credit-based AI tutoring marketplace? How do you measure user retention?",
        "Walk me through how you would conduct a competitive analysis and position a premium mock interview platform.",
        "How do you design a user onboarding flow to maximize conversion rate while collecting essential personalization data?"
    ],
    "general": [
        "Tell me about a challenging technical conflict you had with a team member. How did you resolve it, and what did you learn?",
        "What is your approach to learning a brand-new technology framework or language quickly when starting a new codebase?",
        "Where do you see yourself in five years? How does this interview role align with your long-term career goals?",
        "Explain a time you took ownership of a critical bug or outage. What steps did you take to mitigate the issue and prevent future occurrences?",
        "How do you balance write-time vs read-time optimizations when designing software components under tight deadlines?",
        "What is your perspective on clean code vs speed-to-market? When is technical debt acceptable, and how do you manage it?"
    ]
}

MOCK_FEEDBACK_TOPICS = {
    "frontend": {
        "technical_strengths": [
            "Demonstrated clear understanding of React render cycles and hook state lifecycles.",
            "Strong command over browser rendering mechanics and modern layout systems (CSS Grid/Flexbox).",
            "Effective use of performance metrics (Core Web Vitals) to justify optimization strategies."
        ],
        "technical_improvements": [
            "Could elaborate more on key differences between hydration errors and normal compile errors.",
            "Consider exploring modern state managers like Zustand or Redux Toolkit for complex cache synchronization."
        ]
    },
    "backend": {
        "technical_strengths": [
            "Excellent understanding of database optimization, including indexing strategies and connection pooling.",
            "Strong grip on asynchronous routing mechanics in Python and thread-safety models.",
            "Comprehensive breakdown of API design principles, demonstrating good RESTful or gRPC practices."
        ],
        "technical_improvements": [
            "Explain further how message queues (e.g., Celery/Redis) resolve long-running request bottlenecks.",
            "Refine discussion on transaction isolation levels and how to prevent deadlocks in high concurrency."
        ]
    },
    "system_design": {
        "technical_strengths": [
            "Strong grasp of distributed system concepts, especially CDNs, caching layers, and load balancers.",
            "Realistic design decisions showing an appreciation for cost-to-performance trade-offs.",
            "Excellent application of consistent hashing to resolve sharding hot-spots."
        ],
        "technical_improvements": [
            "Should consider single-point-of-failure (SPOF) risks in your primary database orchestrator.",
            "Elaborate on database write replication lag and how it influences eventual consistency reads."
        ]
    },
    "pm": {
        "technical_strengths": [
            "Clear customer-centric prioritization framework (e.g., using RICE or Kano model).",
            "Strong analytical approach to measuring product success and cohort retention.",
            "Excellent communication of product roadmap adjustments in response to technical feasibility."
        ],
        "technical_improvements": [
            "Incorporate more precise metric terminology, distinguishing clearly between DAU/MAU and active engagement.",
            "Elaborate on user research methodologies used to validate qualitative customer pain points."
        ]
    },
    "general": {
        "technical_strengths": [
            "Solid structural answers using the STAR method (Situation, Task, Action, Result).",
            "Strong communication flow, speaking at a highly professional pace with good clarity.",
            "Honest approach to acknowledging mistakes and articulating learnings from technical failures."
        ],
        "technical_improvements": [
            "Try to keep initial contextual setup shorter so you can spend more time on key actions and results.",
            "Highlight collaboration tools and team-wide documentation practices when detailing conflict resolution."
        ]
    }
}

class AIService:
    @staticmethod
    def generate_questions(role: str, specialty: str = "") -> List[str]:
        """
        Generates 4 role-specific interview questions.
        Utilizes Gemini API if configured, otherwise falls back to a curated local database.
        """
        role_key = role.lower()
        if "frontend" in role_key or "react" in role_key:
            category = "frontend"
        elif "backend" in role_key or "python" in role_key or "data" in role_key:
            category = "backend"
        elif "system" in role_key or "design" in role_key or "architect" in role_key:
            category = "system_design"
        elif "pm" in role_key or "product" in role_key or "manager" in role_key:
            category = "pm"
        else:
            category = "general"

        if gemini_available:
            try:
                model = genai.GenerativeModel("gemini-2.5-flash") # standard fast model
                prompt = (
                    f"You are a Senior Technical Interviewer. Generate a list of exactly 4 challenging technical interview questions "
                    f"for a candidate applying for the role '{role}' focusing on '{specialty}'. "
                    f"Keep questions concise, practical, and highly realistic. Return only a valid JSON array of strings, like: "
                    f'["Question 1", "Question 2", "Question 3", "Question 4"]'
                )
                response = model.generate_content(prompt)
                text = response.text.strip()
                # Clean markdown JSON block if generated
                if text.startswith("```json"):
                    text = text.split("```json")[1].split("```")[0].strip()
                elif text.startswith("```"):
                    text = text.split("```")[1].split("```")[0].strip()
                
                questions = json.loads(text)
                if isinstance(questions, list) and len(questions) > 0:
                    return questions
            except Exception as e:
                print(f"Gemini Question Generation failed, falling back to local simulation: {e}")

        # Fallback to local high-fidelity generator
        available_questions = MOCK_QUESTIONS.get(category, MOCK_QUESTIONS["general"])
        selected = random.sample(available_questions, min(4, len(available_questions)))
        
        # Customize a question slightly with specialty if provided
        if specialty and len(selected) > 0:
            selected[0] = f"Considering your interest in {specialty}: {selected[0]}"
            
        return selected

    @staticmethod
    def generate_feedback_report(role: str, specialty: str, chat_transcript: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyzes the chat transcript and produces a premium AI Interview Feedback Report.
        Utilizes Gemini API if configured, otherwise falls back to a curated local synthesis engine.
        """
        role_key = role.lower()
        if "frontend" in role_key or "react" in role_key:
            category = "frontend"
        elif "backend" in role_key or "python" in role_key or "data" in role_key:
            category = "backend"
        elif "system" in role_key or "design" in role_key or "architect" in role_key:
            category = "system_design"
        elif "pm" in role_key or "product" in role_key or "manager" in role_key:
            category = "pm"
        else:
            category = "general"

        transcript_str = "\n".join([f"{msg['sender']}: {msg['text']}" for msg in chat_transcript])

        if gemini_available:
            try:
                model = genai.GenerativeModel("gemini-2.5-flash")
                prompt = (
                    f"Analyze this chat transcript of a technical mock interview for the role '{role}' ({specialty}):\n\n"
                    f"{transcript_str}\n\n"
                    f"Act as a Principal Technical Interviewer. Produce a detailed evaluation in valid JSON format. "
                    f"You must include scores (0-100) and actionable bulleted insights. The JSON must match this structure exactly:\n"
                    f"{{\n"
                    f"  \"overall_score\": 75,\n"
                    f"  \"technical_depth_score\": 80,\n"
                    f"  \"technical_depth_feedback\": \"Bullet points of strengths and improvements...\",\n"
                    f"  \"communication_score\": 70,\n"
                    f"  \"communication_feedback\": \"Bullet points of clarity and pacing metrics...\",\n"
                    f"  \"recommendations\": \"Specific technical and behavioral recommendations...\"\n"
                    f"}}"
                )
                response = model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text.split("```json")[1].split("```")[0].strip()
                elif text.startswith("```"):
                    text = text.split("```")[1].split("```")[0].strip()
                
                report = json.loads(text)
                if all(k in report for k in ["overall_score", "technical_depth_score", "technical_depth_feedback", "communication_score", "communication_feedback", "recommendations"]):
                    return report
            except Exception as e:
                print(f"Gemini Report Generation failed, falling back to local simulation: {e}")

        # High-Fidelity Local Simulation fallback
        # Let's count turns to simulate realistic performance
        turns = len([m for m in chat_transcript if m.get('sender') == 'Candidate' or m.get('sender') == 'Interviewee'])
        
        # Base scores off interaction levels
        if turns == 0:
            overall_score = random.randint(30, 45)
            tech_score = random.randint(25, 40)
            comm_score = random.randint(30, 50)
            rec = "No significant speaking content detected. Please participate in dialogue, answer questions, or use the coding notepad to demonstrate problem-solving skills during the mock interview."
        elif turns <= 2:
            overall_score = random.randint(55, 68)
            tech_score = random.randint(50, 65)
            comm_score = random.randint(60, 72)
            rec = "The dialogue was quite brief. While you provided basic answers, technical interviews require deeper elaboration. Aim to walk through your code logic, clarify edge cases, and structure answers using the STAR method."
        else:
            overall_score = random.randint(76, 92)
            tech_score = random.randint(74, 90)
            comm_score = random.randint(80, 94)
            rec = f"Great active session! Your technical framework aligns well with the standards for {role}. For upcoming rounds, practice advanced whiteboarding, write out explicit helper functions to decompose systems, and continue using explicit runtime/space complexity justifications."

        # Fetch category topic items
        topic_info = MOCK_FEEDBACK_TOPICS.get(category, MOCK_FEEDBACK_TOPICS["general"])
        gen_info = MOCK_FEEDBACK_TOPICS["general"]

        strengths = random.sample(topic_info["technical_strengths"], 2)
        improvements = random.sample(topic_info["technical_improvements"], 1) + [random.choice(gen_info["technical_improvements"])]
        
        tech_feedback_list = [f"✔ Strength: {s}" for s in strengths] + [f"✦ Improvement: {i}" for i in improvements]
        tech_feedback_str = "\n".join(tech_feedback_list)

        comm_strengths = [
            "Maintained a professional, calm, and highly collaborative tone throughout.",
            "Structured thoughts clearly, allowing the interviewer to easily track your conceptual process."
        ]
        comm_improvements = [
            "Ensure you explicitly confirm details by asking clarifying questions before coding.",
            "Vary vocal inflection and keep explanations punchy to avoid losing the listener's focus."
        ]
        comm_feedback_str = (
            f"✔ Strength: {random.choice(comm_strengths)}\n"
            f"✔ Strength: {random.choice(comm_strengths)}\n"
            f"✦ Improvement: {random.choice(comm_improvements)}"
        )

        return {
            "overall_score": overall_score,
            "technical_depth_score": tech_score,
            "technical_depth_feedback": tech_feedback_str,
            "communication_score": comm_score,
            "communication_feedback": comm_feedback_str,
            "recommendations": rec
        }

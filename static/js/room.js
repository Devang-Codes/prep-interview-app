/**
 * PREP VIDEO CALL ROOM CLIENT
 * Handles simulated WebGL/Canvas video feeds, chat dialogues, notepad syncing, and AI questions triggers.
 */
const Room = {
    appointmentId: null,
    user: null,
    partner: null,
    transcript: [],
    questions: [],
    timerInterval: null,
    roomTimeSeconds: 0,
    isMuted: false,
    isVideoOff: false,
    
    // Canvas animation handles
    canvasAnimId: null,
    interviewerCanvas: null,
    candidateCanvas: null,
    interviewerCtx: null,
    candidateCtx: null,
    
    // Voice activity levels
    interviewerVolume: 0.1,
    candidateVolume: 0.1,
    speakerTurn: "interviewer", // toggles speaking simulation

    init(appointmentId, user, partner, targetRole, specialties) {
        this.appointmentId = appointmentId;
        this.user = user;
        this.partner = partner;
        this.transcript = [];
        this.questions = [];
        this.roomTimeSeconds = 0;
        
        // Setup UI displays
        document.getElementById("room-partner-name").innerText = `${partner.name} (${partner.role})`;
        document.getElementById("interviewer-room-avatar").innerText = partner.name[0];
        document.getElementById("candidate-room-avatar").innerText = user.name[0];
        
        // Set up Chat Container
        const chatContainer = document.getElementById("room-chat-messages");
        chatContainer.innerHTML = "";
        
        // Load initial welcome message
        this.addChatMessage("System", `Connected to secure room. Subject: ${targetRole} Mock Interview.`, "ai-system");
        
        // Start simulated timer
        this.startTimer();
        
        // Setup Canvas rendering
        this.setupCanvases();
        
        // Load AI Questions Helper
        this.loadAIQuestions(targetRole, specialties);
        
        // Start simulated dialog loop after a short delay
        setTimeout(() => {
            this.addChatMessage(partner.name, `Hello ${user.name}! Welcome to your technical mock interview for the ${targetRole} position. Are you ready to begin?`, "partner");
            this.speakerTurn = "candidate";
        }, 1500);

        // Bind Controls
        this.bindEvents();
    },

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const display = document.getElementById("room-timer-display");
        this.timerInterval = setInterval(() => {
            this.roomTimeSeconds++;
            const mins = String(Math.floor(this.roomTimeSeconds / 60)).padStart(2, '0');
            const secs = String(this.roomTimeSeconds % 60).padStart(2, '0');
            display.innerText = `${mins}:${secs}`;
            
            // Randomly toggle voice waves to simulate conversation
            if (this.roomTimeSeconds % 6 === 0) {
                this.speakerTurn = this.speakerTurn === "interviewer" ? "candidate" : "interviewer";
            }
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    setupCanvases() {
        this.interviewerCanvas = document.getElementById("interviewer-canvas");
        this.candidateCanvas = document.getElementById("candidate-canvas");
        
        this.interviewerCtx = this.interviewerCanvas.getContext("2d");
        this.candidateCtx = this.candidateCanvas.getContext("2d");
        
        // Set canvas sizing relative to container
        this.resizeCanvases();
        window.addEventListener("resize", () => this.resizeCanvases());
        
        // Launch render loops
        if (this.canvasAnimId) cancelAnimationFrame(this.canvasAnimId);
        this.renderVideoLoop();
    },

    resizeCanvases() {
        if (!this.interviewerCanvas) return;
        const rect1 = this.interviewerCanvas.parentElement.getBoundingClientRect();
        this.interviewerCanvas.width = rect1.width || 300;
        this.interviewerCanvas.height = rect1.height || 200;
        
        const rect2 = this.candidateCanvas.parentElement.getBoundingClientRect();
        this.candidateCanvas.width = rect2.width || 300;
        this.candidateCanvas.height = rect2.height || 200;
    },

    renderVideoLoop() {
        const render = (time) => {
            // Clear
            this.interviewerCtx.fillStyle = "#0f1015";
            this.interviewerCtx.fillRect(0, 0, this.interviewerCanvas.width, this.interviewerCanvas.height);
            
            this.candidateCtx.fillStyle = "#0f1015";
            this.candidateCtx.fillRect(0, 0, this.candidateCanvas.width, this.candidateCanvas.height);
            
            // Update audio waves simulation
            if (this.speakerTurn === "interviewer") {
                this.interviewerVolume = 0.4 + Math.sin(time / 80) * 0.3;
                this.candidateVolume = 0.05 + Math.cos(time / 150) * 0.03;
                document.getElementById("interviewer-mic-wave").classList.remove("hidden");
                document.getElementById("candidate-mic-wave").classList.add("hidden");
            } else {
                this.candidateVolume = 0.5 + Math.sin(time / 70) * 0.4;
                this.interviewerVolume = 0.04 + Math.sin(time / 200) * 0.02;
                document.getElementById("candidate-mic-wave").classList.remove("hidden");
                document.getElementById("interviewer-mic-wave").classList.add("hidden");
            }

            if (this.isMuted) {
                this.candidateVolume = 0;
                document.getElementById("candidate-mic-wave").classList.add("hidden");
            }

            // Draw Interviewer Video Simulation (pulsing grids and HSL matrix color flows)
            this.drawVideoFeed(
                this.interviewerCtx, 
                this.interviewerCanvas.width, 
                this.interviewerCanvas.height, 
                time, 
                "interviewer",
                this.partner.avatar
            );
            
            // Draw Candidate Video Simulation
            if (!this.isVideoOff) {
                this.drawVideoFeed(
                    this.candidateCtx, 
                    this.candidateCanvas.width, 
                    this.candidateCanvas.height, 
                    time, 
                    "candidate",
                    "devan"
                );
            } else {
                this.candidateCtx.fillStyle = "#090a0c";
                this.candidateCtx.fillRect(0, 0, this.candidateCanvas.width, this.candidateCanvas.height);
                this.candidateCtx.fillStyle = "rgba(255,255,255,0.2)";
                this.candidateCtx.font = "14px Inter";
                this.candidateCtx.textAlign = "center";
                this.candidateCtx.fillText("Camera Turned Off", this.candidateCanvas.width / 2, this.candidateCanvas.height / 2);
            }
            
            this.canvasAnimId = requestAnimationFrame(render);
        };
        this.canvasAnimId = requestAnimationFrame(render);
    },

    drawVideoFeed(ctx, w, h, time, type, avatarSeed) {
        // Draw static tech-grid
        ctx.strokeStyle = "rgba(250, 85, 65, 0.04)";
        if (type === "candidate") ctx.strokeStyle = "rgba(180, 75, 45, 0.04)";
        ctx.lineWidth = 1;
        const gridSize = 30;
        
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw camera scanner line moving vertically
        const scanY = (time / 15) % h;
        ctx.fillStyle = type === "interviewer" ? "rgba(250, 85, 65, 0.05)" : "rgba(180, 75, 45, 0.05)";
        ctx.fillRect(0, scanY, w, 2);

        // Draw gorgeous colored particles orbiting in the background
        const colors = type === "interviewer" 
            ? ["rgba(250, 85, 65, 0.15)", "rgba(180, 75, 45, 0.1)"]
            : ["rgba(180, 75, 45, 0.15)", "rgba(250, 85, 65, 0.1)"];
        
        ctx.fillStyle = colors[0];
        
        const count = 5;
        for (let i = 0; i < count; i++) {
            const angle = (time / 1000) + (i * Math.PI * 2 / count);
            const radius = 40 + Math.sin(time / 500) * 10;
            const x = w / 2 + Math.cos(angle) * radius;
            const y = h / 2 + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 4 + i, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw volume ring indicators around central sphere
        const vol = type === "interviewer" ? this.interviewerVolume : this.candidateVolume;
        ctx.strokeStyle = type === "interviewer" ? "rgba(250, 85, 65, 0.3)" : "rgba(180, 75, 45, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 45 + vol * 30, 0, Math.PI * 2);
        ctx.stroke();

        // Central visualizer sphere representing webcam focus
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, 35);
        if (type === "interviewer") {
            grad.addColorStop(0, "hsl(250, 85%, 65%)");
            grad.addColorStop(1, "hsl(180, 75%, 45%)");
        } else {
            grad.addColorStop(0, "hsl(180, 75%, 45%)");
            grad.addColorStop(1, "hsl(250, 85%, 65%)");
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
        ctx.fill();

        // Draw webcam scanner vignette
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 15;
        ctx.strokeRect(0, 0, w, h);
    },

    addChatMessage(sender, text, type = "partner") {
        const chatContainer = document.getElementById("room-chat-messages");
        const msgElement = document.createElement("div");
        msgElement.className = `chat-message ${type}`;
        
        let senderName = sender;
        if (type === "candidate") senderName = "You";
        else if (type === "ai-system") senderName = "AI System";
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        msgElement.innerHTML = `
            <strong>${senderName}</strong>
            <p>${text}</p>
            <span class="chat-message-meta">${timeStr}</span>
        `;
        
        chatContainer.appendChild(msgElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Log in session transcript for database
        this.transcript.push({
            sender: type === "candidate" ? "Candidate" : senderName,
            text: text
        });
    },

    async loadAIQuestions(role, specialties) {
        try {
            const data = await API.getRoomHelper(this.appointmentId, this.user.id);
            this.questions = data.suggested_questions || [];
            
            const container = document.getElementById("ai-room-questions-container");
            container.innerHTML = "";
            
            this.questions.forEach((q, idx) => {
                const card = document.createElement("div");
                card.className = "ai-question-card";
                card.innerHTML = `
                    <div class="card-q-header">
                        <span>Question ${idx + 1}</span>
                        <button class="btn btn-secondary btn-sm q-ask-btn" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;"><i data-lucide="send" style="width: 0.7rem; height: 0.7rem;"></i> Ask Now</button>
                    </div>
                    <p class="card-q-body">${q}</p>
                `;
                
                // Allow interviewer simulation to prompt question to chat
                card.querySelector(".q-ask-btn").addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.speakerTurn = "interviewer";
                    this.addChatMessage(this.partner.name, q, "partner");
                    
                    // Simulate Candidate typing code template response after brief delay
                    setTimeout(() => {
                        this.simulateCandidateAnswering(idx, q);
                    }, 4000);
                });

                container.appendChild(card);
            });
            lucide.createIcons();
        } catch (e) {
            console.error("Could not load AI Helper panel:", e);
        }
    },

    simulateCandidateAnswering(index, question) {
        this.speakerTurn = "candidate";
        
        const answers = [
            "This is a great question. Let's analyze the runtime complexity of this problem. If we use a hash map, we can achieve O(n) lookup time...",
            "In React 19, the new compiler optimizes this automatically. However, manually caching renders via useMemo or useCallback remains highly relevant for complex components.",
            "To design a distributed rate limiter, I would utilize a Redis sliding-window algorithm, maintaining a transaction lock to handle concurrent spikes safely.",
            "Prioritizing roadmap features is highly challenging. I rely on a standard RICE validation matrix, aligning inputs directly to core activation metrics."
        ];
        
        const answer = answers[index % answers.length];
        this.addChatMessage("Candidate", answer, "candidate");
        
        // Write dynamic code templates into editor based on topics
        const editor = document.getElementById("room-notepad-textarea");
        const templates = [
            `# Solution for Question 1\ndef reconciliation_recomputed(vdom_tree, actual_dom):\n    # Re-renders Virtual DOM structures with minimal modifications\n    for node in vdom_tree.children:\n        if node.has_changed():\n            actual_dom.patch(node.tag, node.props)\n            print("Hydrated React component successfully.")`,
            `// Solution for Question 2\nconst memoizedHeavyComputation = (items) => {\n  return useMemo(() => {\n    console.log("Analyzing render bottlenecks...");\n    return items.filter(i => i.val > 100).sort((a,b) => a.val - b.val);\n  }, [items]);\n};`,
            `-- Solution for Question 3\nCREATE INDEX idx_user_transactions ON transactions(user_id, created_at);\nSELECT user_id, SUM(amount) as net_balance\nFROM transactions\nGROUP BY user_id\nHAVING net_balance > 1000;`,
            `# Product Feature prioritization blueprint\n# Priority = (Reach * Impact * Confidence) / Effort\nfeatures = {\n  "ai_helper": {"reach": 80, "impact": 3, "confidence": 0.8, "effort": 2},\n  "instant_payouts": {"reach": 50, "impact": 4, "confidence": 0.7, "effort": 3}\n}`
        ];
        
        editor.value += (editor.value ? "\n\n" : "") + templates[index % templates.length];
    },

    bindEvents() {
        // Text message send
        const form = document.getElementById("room-chat-form");
        form.onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById("room-chat-input");
            const val = input.value.trim();
            if (!val) return;
            
            this.addChatMessage(this.user.name, val, "candidate");
            input.value = "";
            this.speakerTurn = "interviewer";
            
            // Trigger interviewer reaction reply in mock session
            setTimeout(() => {
                const replies = [
                    "Very interesting breakdown, Devan. Let's delve deeper into that edge case.",
                    "Excellent point! How would that scale if we had 10 million concurrent reads?",
                    "That is correct. Let's look at the third question to test your architectural thinking.",
                    "Great STAR story. How did you align the stakeholders on that exact monetization metric?"
                ];
                const reply = replies[Math.floor(Math.random() * replies.length)];
                this.addChatMessage(this.partner.name, reply, "partner");
            }, 3000);
        };

        // Mic Mute controls
        const micBtn = document.getElementById("ctrl-mic");
        micBtn.onclick = () => {
            this.isMuted = !this.isMuted;
            micBtn.classList.toggle("active", this.isMuted);
            micBtn.querySelector("i").setAttribute("data-lucide", this.isMuted ? "mic-off" : "mic");
            lucide.createIcons();
            showToast(this.isMuted ? "Microphone muted" : "Microphone unmuted", "info");
        };

        // Video Pause controls
        const videoBtn = document.getElementById("ctrl-video");
        videoBtn.onclick = () => {
            this.isVideoOff = !this.isVideoOff;
            videoBtn.classList.toggle("active", this.isVideoOff);
            videoBtn.querySelector("i").setAttribute("data-lucide", this.isVideoOff ? "video-off" : "video");
            lucide.createIcons();
            showToast(this.isVideoOff ? "Camera turned off" : "Camera turned on", "info");
        };

        // End Call
        const endBtn = document.getElementById("ctrl-end-call");
        endBtn.onclick = () => {
            this.endSession();
        };

        // Tab Switching inside room
        const tabs = document.querySelectorAll(".interactive-tab");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                
                const paneId = tab.getAttribute("data-room-tab");
                const panes = document.querySelectorAll(".room-tab-pane");
                panes.forEach(p => p.classList.remove("active"));
                document.getElementById(paneId).classList.add("active");
            });
        });
    },

    async endSession() {
        this.stopTimer();
        if (this.canvasAnimId) {
            cancelAnimationFrame(this.canvasAnimId);
            this.canvasAnimId = null;
        }

        showToast("Processing evaluation transcript with AI...", "info");
        
        try {
            // Append notepad summary to final feedback
            const codeContent = document.getElementById("room-notepad-textarea").value.trim();
            if (codeContent) {
                this.transcript.push({
                    sender: "Candidate Code Notepad",
                    text: codeContent
                });
            }

            const feedback = await API.submitTranscript(this.appointmentId, this.user.id, this.transcript);
            
            // Switch view back to dashboard
            switchView("section-dashboard");
            
            // Show Feedback modal report!
            showFeedbackReport(feedback, this.partner.name, this.partner.specialties);
            
            // Reset room values
            this.appointmentId = null;
            
            // Refresh dashboard
            initDashboard();
        } catch (e) {
            showToast(`Error processing report: ${e.message}`, "error");
            switchView("section-dashboard");
        }
    }
};

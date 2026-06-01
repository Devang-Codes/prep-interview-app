/**
 * PREP DASHBOARD & FINANCIAL CONTROLLER
 * Orchestrates availability calendars, booking logs, top ups, and withdrawal requests.
 */
const Dashboard = {
    user: null,

    init(user) {
        this.user = user;
        
        // Dynamically show/hide correct dashboard view based on role
        if (user.role === "interviewee") {
            document.getElementById("interviewee-dashboard").classList.remove("hidden");
            document.getElementById("interviewer-dashboard").classList.add("hidden");
            this.loadIntervieweeDashboard();
        } else {
            document.getElementById("interviewer-dashboard").classList.remove("hidden");
            document.getElementById("interviewee-dashboard").classList.add("hidden");
            this.loadInterviewerDashboard();
        }
        
        // Populate ledger
        this.loadLedger();
        this.bindEvents();
    },

    async loadIntervieweeDashboard() {
        // Update wallet display in dashboard
        document.getElementById("dash-wallet-bal").innerText = this.user.balance;
        
        try {
            const appointments = await API.getMyAppointments(this.user.id);
            const tbody = document.getElementById("interviewee-appointments-list");
            tbody.innerHTML = "";
            
            let count = 0;
            appointments.forEach(appt => {
                if (appt.status === "scheduled") count++;
                
                const tr = document.createElement("tr");
                const dateObj = new Date(appt.scheduled_at);
                const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                
                let actionBtn = "";
                if (appt.status === "scheduled") {
                    actionBtn = `<button class="btn btn-primary btn-sm join-btn" data-appt-id="${appt.id}" data-partner-id="${appt.interviewer.id}"><i data-lucide="video"></i> Start Room</button>`;
                } else if (appt.status === "completed") {
                    actionBtn = `<button class="btn btn-secondary btn-sm feedback-btn" data-appt-id="${appt.id}" data-partner-name="${appt.interviewer.name}" data-partner-specialties="${appt.interviewer.specialties}"><i data-lucide="sparkles"></i> View Feedback</button>`;
                } else {
                    actionBtn = `<span class="text-muted">-</span>`;
                }

                tr.innerHTML = `
                    <td>
                        <div class="table-user-info" style="display: flex; align-items: center; gap: 0.6rem;">
                            <div class="user-avatar" style="width: 1.8rem; height: 1.8rem; font-size: 0.75rem;">${appt.interviewer.name[0]}</div>
                            <strong>${appt.interviewer.name}</strong>
                        </div>
                    </td>
                    <td><span class="specialties-text">${appt.interviewer.specialties}</span></td>
                    <td>${dateStr}</td>
                    <td><strong>${appt.credits_paid} cr</strong></td>
                    <td><span class="badge badge-${appt.status}">${appt.status}</span></td>
                    <td>${actionBtn}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById("upcoming-appt-count").innerText = `${count} Active`;
            
            if (appointments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No scheduled mock sessions found. Head over to Find Experts to book one!</td></tr>`;
            }
            
            // Bind join buttons
            tbody.querySelectorAll(".join-btn").forEach(btn => {
                btn.onclick = async () => {
                    const apptId = btn.getAttribute("data-appt-id");
                    const partnerId = btn.getAttribute("data-partner-id");
                    
                    showToast("Connecting to mock room...", "info");
                    try {
                        const partner = await API.getInterviewer(partnerId);
                        
                        // Switch views
                        switchView("section-room");
                        
                        // Init room
                        const targetRole = partner.specialties.split(",")[0] || "Software Engineer";
                        Room.init(apptId, this.user, partner, targetRole, partner.specialties);
                    } catch (e) {
                        showToast(`Failed to join room: ${e.message}`, "error");
                    }
                };
            });

            // Bind feedback buttons
            tbody.querySelectorAll(".feedback-btn").forEach(btn => {
                btn.onclick = async () => {
                    const apptId = btn.getAttribute("data-appt-id");
                    const partnerName = btn.getAttribute("data-partner-name");
                    const partnerSpecialties = btn.getAttribute("data-partner-specialties");
                    
                    showToast("Retrieving AI feedback analytics...", "info");
                    try {
                        const feedback = await API.getFeedback(apptId, this.user.id);
                        showFeedbackReport(feedback, partnerName, partnerSpecialties);
                    } catch (e) {
                        showToast(`Feedback error: ${e.message}`, "error");
                    }
                };
            });
            
            lucide.createIcons();
        } catch (e) {
            showToast("Failed to load sessions dashboard", "error");
        }
    },

    async loadInterviewerDashboard() {
        document.getElementById("interviewer-earnings-bal").innerText = this.user.balance;
        
        try {
            // Load slots availability list
            await this.loadActiveAvailabilitySlots();
            
            // Load appointments
            const appointments = await API.getMyAppointments(this.user.id);
            const tbody = document.getElementById("interviewer-appointments-list");
            tbody.innerHTML = "";
            
            let count = 0;
            appointments.forEach(appt => {
                if (appt.status === "scheduled") count++;
                
                const tr = document.createElement("tr");
                const dateObj = new Date(appt.scheduled_at);
                const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                
                let actionBtn = "";
                if (appt.status === "scheduled") {
                    actionBtn = `<button class="btn btn-primary btn-sm join-btn" data-appt-id="${appt.id}" data-partner-id="${appt.interviewee.id}"><i data-lucide="video"></i> Start Room</button>`;
                } else if (appt.status === "completed") {
                    actionBtn = `<button class="btn btn-secondary btn-sm feedback-btn" data-appt-id="${appt.id}" data-partner-name="${appt.interviewee.name}" data-partner-specialties="Candidate"><i data-lucide="sparkles"></i> View Feedback</button>`;
                } else {
                    actionBtn = `<span class="text-muted">-</span>`;
                }

                tr.innerHTML = `
                    <td>
                        <div class="table-user-info" style="display: flex; align-items: center; gap: 0.6rem;">
                            <div class="user-avatar" style="width: 1.8rem; height: 1.8rem; font-size: 0.75rem;">${appt.interviewee.name[0]}</div>
                            <strong>${appt.interviewee.name}</strong>
                        </div>
                    </td>
                    <td>${dateStr}</td>
                    <td>${appt.duration_minutes} min</td>
                    <td><span class="badge badge-${appt.status}">${appt.status}</span></td>
                    <td>${actionBtn}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById("interviewer-appt-count").innerText = `${count} Bookings`;
            
            if (appointments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No candidate bookings scheduled yet. Make sure to configure availability slots!</td></tr>`;
            }

            // Bind join buttons for Interviewers
            tbody.querySelectorAll(".join-btn").forEach(btn => {
                btn.onclick = async () => {
                    const apptId = btn.getAttribute("data-appt-id");
                    const partnerId = btn.getAttribute("data-partner-id");
                    
                    showToast("Connecting to mock room...", "info");
                    try {
                        const partner = await API.request(`/api/interviewers/${this.user.id}`); // Fetch mock profile or user as interviewer context
                        // The partner here in candidate context is the interviewee!
                        const interviewee = await API.request(`/api/interviewers/${partnerId}`).catch(() => {
                            // Fetch user detail fails for interviewee since marketplace filter is interviewers. Let's make simple endpoint fetch or fallback object.
                            return { name: "Candidate Devan", role: "Candidate", specialties: "React, Python", avatar: "devan", id: partnerId };
                        });
                        
                        // Switch views
                        switchView("section-room");
                        
                        // Init room
                        const targetRole = this.user.specialties.split(",")[0] || "Software Engineer";
                        Room.init(apptId, this.user, interviewee, targetRole, this.user.specialties);
                    } catch (e) {
                        showToast(`Failed to join room: ${e.message}`, "error");
                    }
                };
            });

            // Bind feedback buttons
            tbody.querySelectorAll(".feedback-btn").forEach(btn => {
                btn.onclick = async () => {
                    const apptId = btn.getAttribute("data-appt-id");
                    const partnerName = btn.getAttribute("data-partner-name");
                    
                    showToast("Retrieving AI feedback analytics...", "info");
                    try {
                        const feedback = await API.getFeedback(apptId, this.user.id);
                        showFeedbackReport(feedback, partnerName, "Candidate");
                    } catch (e) {
                        showToast(`Feedback error: ${e.message}`, "error");
                    }
                };
            });
            
            lucide.createIcons();
        } catch (e) {
            showToast("Failed to load interviewer dashboard", "error");
        }
    },

    async loadActiveAvailabilitySlots() {
        try {
            const slots = await API.getAvailability(this.user.id);
            const container = document.getElementById("active-slots-container");
            container.innerHTML = "";
            
            const daysMap = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            
            slots.forEach(slot => {
                const chip = document.createElement("div");
                chip.className = "avail-slot-chip";
                chip.innerHTML = `
                    <span>${daysMap[slot.day_of_week]}: ${slot.start_time} - ${slot.end_time}</span>
                    <button class="delete-slot-btn" data-slot-id="${slot.id}" title="Remove Slot"><i data-lucide="x-circle"></i></button>
                `;
                
                chip.querySelector(".delete-slot-btn").onclick = async () => {
                    if (confirm("Are you sure you want to remove this availability slot?")) {
                        try {
                            await API.deleteAvailability(slot.id, this.user.id);
                            showToast("Availability slot removed", "success");
                            this.loadActiveAvailabilitySlots();
                        } catch (e) {
                            showToast(`Failed to delete: ${e.message}`, "error");
                        }
                    }
                };
                container.appendChild(chip);
            });
            
            if (slots.length === 0) {
                container.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">No availability slots set yet. Set standard times below!</span>`;
            }
            
            lucide.createIcons();
        } catch (e) {
            console.error("Could not load slots:", e);
        }
    },

    async loadLedger() {
        try {
            const txs = await API.getTransactions(this.user.id);
            const tbody = document.getElementById("ledger-transactions-list");
            tbody.innerHTML = "";
            
            txs.forEach(tx => {
                const tr = document.createElement("tr");
                const amountClass = tx.amount > 0 ? "success-text" : "danger-text";
                const amountSign = tx.amount > 0 ? `+${tx.amount}` : `${tx.amount}`;
                
                tr.innerHTML = `
                    <td><code>#TX-0${tx.id}</code></td>
                    <td>${tx.created_at}</td>
                    <td><span class="badge badge-${tx.type}">${tx.type.replace('_', ' ')}</span></td>
                    <td>${tx.description}</td>
                    <td class="${amountClass}"><strong>${amountSign} cr</strong></td>
                `;
                tbody.appendChild(tr);
            });
            
            if (txs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No transactions recorded in ledger yet.</td></tr>`;
            }
        } catch (e) {
            console.error("Failed to load transactions ledger:", e);
        }
    },

    bindEvents() {
        // Quick Top Up selections
        const topupQuickBtns = document.querySelectorAll(".topup-quick-btn");
        topupQuickBtns.forEach(btn => {
            btn.onclick = () => {
                const amount = btn.getAttribute("data-amount");
                this.simulateTopUp(amount);
            };
        });

        // Add custom Credits topup submit
        const topupSubmitBtn = document.getElementById("topup-submit-btn");
        topupSubmitBtn.onclick = () => {
            const amount = prompt("Enter amount of credits to deposit:", "100");
            if (amount && !isNaN(amount)) {
                this.simulateTopUp(parseInt(amount));
            }
        };

        // Add availability form submit
        const availForm = document.getElementById("availability-form");
        availForm.onsubmit = async (e) => {
            e.preventDefault();
            const day = document.getElementById("avail-day").value;
            const start = document.getElementById("avail-start").value;
            const end = document.getElementById("avail-end").value;
            
            if (start >= end) {
                showToast("End time must be after start time", "error");
                return;
            }
            
            showToast("Adding availability slot...", "info");
            try {
                await API.createAvailability(this.user.id, {
                    day_of_week: parseInt(day),
                    start_time: start,
                    end_time: end
                });
                showToast("Slot added successfully!", "success");
                this.loadActiveAvailabilitySlots();
            } catch (error) {
                showToast(`Failed to add: ${error.message}`, "error");
            }
        };

        // Withdrawal payout request submit
        const withdrawSubmitBtn = document.getElementById("withdraw-submit-btn");
        withdrawSubmitBtn.onclick = async () => {
            const amountInput = document.getElementById("withdraw-amount").value;
            const method = document.getElementById("withdraw-method").value;
            const details = document.getElementById("withdraw-details").value.trim();
            
            const amount = parseInt(amountInput);
            if (isNaN(amount) || amount <= 0) {
                showToast("Please enter a valid credit amount", "error");
                return;
            }
            if (amount > this.user.balance) {
                showToast("Insufficient earnings balance to withdraw", "error");
                return;
            }
            if (!details) {
                showToast("Please provide withdrawal destination details", "error");
                return;
            }
            
            showToast("Processing simulated payout transaction...", "info");
            try {
                const updatedUser = await API.withdraw(this.user.id, amount, method, details);
                
                // Update local session
                this.user = updatedUser;
                updateSessionUser(updatedUser);
                
                // Clear fields
                document.getElementById("withdraw-amount").value = "";
                document.getElementById("withdraw-details").value = "";
                
                showToast(`Simulated Payout of ${amount} credits was successfully dispatched!`, "success");
                
                // Reload dashboard
                this.loadInterviewerDashboard();
                this.loadLedger();
            } catch (err) {
                showToast(`Payout failed: ${err.message}`, "error");
            }
        };
    },

    async simulateTopUp(amount) {
        showToast("Processing simulated deposit transaction...", "info");
        try {
            const updatedUser = await API.topUp(this.user.id, amount);
            
            // Update local session
            this.user = updatedUser;
            updateSessionUser(updatedUser);
            
            showToast(`Deposited ${amount} credits successfully!`, "success");
            
            // Reload dashboard
            this.loadIntervieweeDashboard();
            this.loadLedger();
        } catch (e) {
            showToast(`Deposit failed: ${e.message}`, "error");
        }
    }
};

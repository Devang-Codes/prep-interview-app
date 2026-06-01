/**
 * PREP APP CORE CONTROLLER (SPA ROUTER)
 * Synchronizes authentication, marketplace cards, booking modal flows, and notifications.
 */
let currentUser = null;
let activeView = "section-landing";

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // Check if user is cached in local storage
    const cached = localStorage.getItem("prep_user");
    if (cached) {
        currentUser = JSON.parse(cached);
        updateUserUI();
        initDashboard();
    } else {
        switchView("section-landing");
    }

    // Load expert interviewers list in marketplace
    loadMarketplace();

    // Bind navigation actions
    bindAppEvents();

    // Initialize Lucide Icons
    lucide.createIcons();
}

// --- VIEW ROUTING & SPA CONTROLS ---
function switchView(targetId) {
    const sections = document.querySelectorAll(".view-section");
    sections.forEach(s => {
        s.classList.remove("active");
    });
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add("active");
        activeView = targetId;
        
        // Auto scroll to top on page switch
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Sync navbar links active states
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-target") === targetId) {
            link.classList.add("active");
        }
    });
}

function updateSessionUser(user) {
    currentUser = user;
    localStorage.setItem("prep_user", JSON.stringify(user));
    updateUserUI();
}

function updateUserUI() {
    const userBadge = document.getElementById("user-badge");
    const openAuthBtn = document.getElementById("open-auth-btn");
    
    if (currentUser) {
        // Logged in
        userBadge.classList.remove("hidden");
        openAuthBtn.classList.add("hidden");
        
        document.getElementById("credit-count").innerText = currentUser.balance;
        document.getElementById("navbar-username").innerText = currentUser.name;
        document.getElementById("navbar-avatar").innerText = currentUser.name[0];
        
        // Show/hide dashboard and transactions tab
        document.getElementById("nav-dashboard").classList.remove("hidden");
        document.getElementById("nav-transactions").classList.remove("hidden");
    } else {
        // Logged out
        userBadge.classList.add("hidden");
        openAuthBtn.classList.remove("hidden");
        
        document.getElementById("nav-dashboard").classList.add("hidden");
        document.getElementById("nav-transactions").classList.add("hidden");
        
        switchView("section-landing");
    }
}

function initDashboard() {
    if (!currentUser) return;
    Dashboard.init(currentUser);
}

// --- MARKETPLACE LOADER ---
async function loadMarketplace(roleFilter = "") {
    const grid = document.getElementById("interviewers-list");
    grid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 3rem;"><i data-lucide="refresh-cw" class="animate-spin" style="width: 2.5rem; height: 2.5rem; color: var(--primary-light);"></i><p style="margin-top: 0.8rem; color: var(--text-secondary);">Loading expert interviewers...</p></div>`;
    lucide.createIcons();

    try {
        const interviewers = await API.getInterviewers(roleFilter);
        grid.innerHTML = "";
        
        interviewers.forEach(interviewer => {
            const card = document.createElement("div");
            card.className = "interviewer-card";
            
            // Build specialties chips tag string
            const specialtiesList = interviewer.specialties.split(",")
                .map(s => `<span class="badge" style="background: hsla(180, 75%, 45%, 0.1); color: var(--secondary-light); border: 1px solid hsla(180, 75%, 45%, 0.25); font-size: 0.75rem; margin-right: 0.3rem;">${s.trim()}</span>`)
                .join("");

            card.innerHTML = `
                <div>
                    <div class="interviewer-header">
                        <div class="interviewer-info">
                            <div class="user-avatar avatar-md">${interviewer.name[0]}</div>
                            <div class="interviewer-meta">
                                <h3>${interviewer.name}</h3>
                                <span class="specialties-text">${interviewer.specialties.split(",")[0]} Expert</span>
                            </div>
                        </div>
                        <div class="rating-badge">
                            <i data-lucide="star"></i>
                            <span>${interviewer.rating.toFixed(1)}</span>
                        </div>
                    </div>
                    <div style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.2rem;">
                        ${specialtiesList}
                    </div>
                    <p class="interviewer-bio">${interviewer.bio}</p>
                </div>
                
                <div class="interviewer-footer">
                    <div class="hourly-rate">
                        <span class="amount">${interviewer.hourly_rate} cr</span>
                        <span class="label">Credits per hour</span>
                    </div>
                    <button class="btn btn-primary book-btn" data-id="${interviewer.id}"><i data-lucide="calendar"></i> Book Session</button>
                </div>
            `;

            // Bind booking trigger
            card.querySelector(".book-btn").onclick = () => {
                triggerBookingFlow(interviewer);
            };

            grid.appendChild(card);
        });
        
        if (interviewers.length === 0) {
            grid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 4rem; color: var(--text-muted);">No interviewers found matching this search or category filter.</div>`;
        }
        
        lucide.createIcons();
    } catch (e) {
        showToast("Failed to load interviewers catalog", "error");
    }
}

// --- BOOKING DIALOG SYSTEM ---
async function triggerBookingFlow(interviewer) {
    if (!currentUser) {
        showToast("Please Sign In to book a mock interview session", "error");
        document.getElementById("auth-modal").classList.add("active");
        return;
    }
    if (currentUser.role !== "interviewee") {
        showToast("Only candidate accounts can book mock interviews", "error");
        return;
    }

    // Setup modal body
    document.getElementById("booking-modal-title").innerText = `Schedule Mock with ${interviewer.name}`;
    document.getElementById("booking-modal-rate").innerText = `${interviewer.hourly_rate} cr / hr`;
    document.getElementById("booking-modal-avatar").innerText = interviewer.name[0];
    document.getElementById("booking-modal-name").innerText = interviewer.name;
    document.getElementById("booking-modal-specialties").innerText = interviewer.specialties;
    
    document.getElementById("booking-invoice-rate").innerText = `${interviewer.hourly_rate} credits`;
    document.getElementById("booking-invoice-total").innerText = `${interviewer.hourly_rate} credits`;
    
    // Load availability slots
    const container = document.getElementById("booking-slots-container");
    container.innerHTML = `<span style="grid-column: span 3; color: var(--text-secondary); text-align: center; font-size: 0.85rem;">Checking scheduled hours...</span>`;
    
    try {
        const slots = await API.getAvailability(interviewer.id);
        container.innerHTML = "";
        
        const daysMap = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        let selectedTimeSlot = null;

        // Visual mapping: We will map slots to the upcoming weekdays of this current week!
        // To make it look extremely realistic, let's pick Wednesday, Monday, Friday dates
        const now = new Date();
        
        slots.forEach(slot => {
            // Find next date matching day_of_week
            const d = new Date();
            const currentDay = d.getDay(); // 0 is Sunday, 1 is Monday...
            // database day_of_week: 0 is Monday, 6 is Sunday
            const targetDbDay = slot.day_of_week;
            const targetJsDay = targetDbDay === 6 ? 0 : targetDbDay + 1; // Map to JS values
            
            let distance = targetJsDay - currentDay;
            if (distance <= 0) distance += 7; // Next week's date
            d.setDate(d.getDate() + distance);
            
            const dateStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
            const displayDate = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            
            const btn = document.createElement("button");
            btn.className = "booking-slot-btn";
            btn.innerHTML = `
                <div style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">${displayDate}</div>
                <div style="font-size: 0.9rem; font-weight: 700; margin-top: 0.15rem;">${slot.start_time}</div>
            `;
            
            btn.onclick = () => {
                container.querySelectorAll(".booking-slot-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                selectedTimeSlot = `${dateStr} ${slot.start_time}`;
            };
            container.appendChild(btn);
        });

        if (slots.length === 0) {
            container.innerHTML = `<span style="grid-column: span 3; color: var(--danger); text-align: center; font-size: 0.85rem;">This interviewer hasn't configured any availability slots.</span>`;
        }

        // Bind Confirm Checkout Button
        const confirmBtn = document.getElementById("booking-confirm-btn");
        confirmBtn.onclick = async () => {
            if (!selectedTimeSlot) {
                showToast("Please choose an available time slot", "error");
                return;
            }
            if (currentUser.balance < interviewer.hourly_rate) {
                showToast("Insufficient credits. Please Top Up your dashboard wallet.", "error");
                return;
            }

            confirmBtn.disabled = true;
            showToast("Processing booking payment checkout...", "info");
            
            try {
                await API.bookAppointment(currentUser.id, interviewer.id, selectedTimeSlot);
                
                // Deduct balance locally
                currentUser.balance -= interviewer.hourly_rate;
                updateSessionUser(currentUser);
                
                // Close modal
                document.getElementById("booking-modal").classList.remove("active");
                showToast("Mock session scheduled successfully!", "success");
                
                // Switch view & init dashboard
                switchView("section-dashboard");
                initDashboard();
            } catch (err) {
                showToast(`Booking failed: ${err.message}`, "error");
            } finally {
                confirmBtn.disabled = false;
            }
        };

        // Open booking modal overlay
        document.getElementById("booking-modal").classList.add("active");
    } catch (e) {
        showToast("Error retrieving calendar slots", "error");
    }
}

// --- GLOBAL EVENT BINDINGS ---
function bindAppEvents() {
    // Navigation routing
    document.querySelectorAll(".nav-link").forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const target = link.getAttribute("data-target");
            switchView(target);
            if (target === "section-dashboard") {
                initDashboard();
            }
        };
    });

    // Logo routing
    document.getElementById("logo-btn").onclick = (e) => {
        e.preventDefault();
        switchView(currentUser ? "section-marketplace" : "section-landing");
    };

    // Hero buttons routing
    document.getElementById("explore-marketplace-btn").onclick = () => {
        switchView("section-marketplace");
    };

    document.getElementById("learn-more-btn").onclick = () => {
        switchView("section-marketplace");
    };

    // Auth Overlay toggles
    document.getElementById("open-auth-btn").onclick = () => {
        document.getElementById("auth-modal").classList.add("active");
    };
    
    document.getElementById("auth-modal-close").onclick = () => {
        document.getElementById("auth-modal").classList.remove("active");
    };

    document.getElementById("booking-modal-close").onclick = () => {
        document.getElementById("booking-modal").classList.remove("active");
    };
    document.getElementById("booking-cancel-btn").onclick = () => {
        document.getElementById("booking-modal").classList.remove("active");
    };

    // Payout modal report close
    document.getElementById("feedback-modal-close").onclick = () => {
        document.getElementById("feedback-modal").classList.remove("active");
    };
    document.getElementById("feedback-close-btn").onclick = () => {
        document.getElementById("feedback-modal").classList.remove("active");
    };

    // Auth tab toggles
    const loginTab = document.getElementById("auth-tab-login");
    const regTab = document.getElementById("auth-tab-register");
    const loginForm = document.getElementById("login-form");
    const regForm = document.getElementById("register-form");

    loginTab.onclick = () => {
        loginTab.classList.add("active");
        regTab.classList.remove("active");
        loginForm.classList.add("active");
        regForm.classList.remove("active");
    };

    regTab.onclick = () => {
        regTab.classList.add("active");
        loginTab.classList.remove("active");
        regForm.classList.add("active");
        loginForm.classList.remove("active");
    };

    // Dynamic field toggle during registration
    document.getElementById("reg-role").onchange = (e) => {
        const fields = document.getElementById("reg-interviewer-fields");
        if (e.target.value === "interviewer") {
            fields.classList.remove("hidden");
        } else {
            fields.classList.add("hidden");
        }
    };

    // Sign out button
    document.getElementById("logout-btn").onclick = () => {
        if (confirm("Are you sure you want to sign out?")) {
            currentUser = null;
            localStorage.removeItem("prep_user");
            updateUserUI();
            showToast("Signed out successfully", "success");
        }
    };

    // Submit forms handler
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-password").value;
        
        try {
            const user = await API.login(email, pass);
            updateSessionUser(user);
            document.getElementById("auth-modal").classList.remove("active");
            showToast(`Welcome back, ${user.name}!`, "success");
            
            // Route
            switchView("section-marketplace");
            initDashboard();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    regForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const pass = document.getElementById("reg-password").value;
        const role = document.getElementById("reg-role").value;
        
        const specialties = document.getElementById("reg-specialties").value;
        const rate = document.getElementById("reg-rate").value;
        const bio = document.getElementById("reg-bio").value;

        try {
            const user = await API.register(name, email, pass, role, specialties, rate, bio);
            updateSessionUser(user);
            document.getElementById("auth-modal").classList.remove("active");
            showToast(`Account created! Welcome, ${user.name}.`, "success");
            
            // Route
            switchView("section-marketplace");
            initDashboard();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // Filters search & tabs click
    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach(tab => {
        tab.onclick = () => {
            filterTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const category = tab.getAttribute("data-filter");
            loadMarketplace(category);
        };
    });

    document.getElementById("search-input").oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll(".interviewer-card");
        
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            if (text.includes(query)) {
                card.style.display = "flex";
            } else {
                card.style.display = "none";
            }
        });
    };
}

// --- DYNAMIC AI NOTIFICATION SYSTEM ---
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const msgSpan = document.getElementById("toast-message");
    const icon = document.getElementById("toast-icon");
    
    toast.className = `toast toast-${type} active`;
    msgSpan.innerText = message;
    
    let lucideIcon = "info";
    if (type === "success") lucideIcon = "check-circle-2";
    else if (type === "error") lucideIcon = "alert-octagon";
    
    icon.setAttribute("data-lucide", lucideIcon);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove("active");
    }, 4000);
}

// --- COMPREHENSIVE FEEDBACK DISPLAY ---
function showFeedbackReport(report, partnerName, specialties) {
    document.getElementById("feedback-modal-subtitle").innerText = `Session with ${partnerName} (${specialties})`;
    
    // Animate overall circle match score
    const score = report.overall_score;
    document.getElementById("feedback-overall-score").innerText = score;
    
    const circlePath = document.getElementById("feedback-radial-path");
    // total circumference is 100 on our circle diagram
    circlePath.style.strokeDasharray = `${score}, 100`;
    
    // Fill progress meters
    const techScore = report.technical_depth_score;
    const commScore = report.communication_score;
    
    document.getElementById("feedback-tech-score").innerText = `${techScore}%`;
    document.getElementById("feedback-tech-fill").style.width = `${techScore}%`;
    
    document.getElementById("feedback-comm-score").innerText = `${commScore}%`;
    document.getElementById("feedback-comm-fill").style.width = `${commScore}%`;

    // Process lists of strengths & improvements
    // They are separated by newline from backend
    const processFeedbackBulletPoints = (text) => {
        if (!text) return "No evaluations logged.";
        return text.split("\n")
            .filter(line => line.trim())
            .map(line => `
                <div style="display: flex; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 0.4rem; line-height: 1.45;">
                    <span style="flex-shrink: 0; color: ${line.includes("✔") ? "var(--success)" : "var(--primary-light)"}">${line.includes("✔") ? "✔" : "✦"}</span>
                    <span>${line.replace(/[✔✦]\s*(Strength:|Improvement:)?/i, "").trim()}</span>
                </div>
            `)
            .join("");
    };

    document.getElementById("feedback-tech-pane").innerHTML = processFeedbackBulletPoints(report.technical_depth_feedback);
    document.getElementById("feedback-comm-pane").innerHTML = processFeedbackBulletPoints(report.communication_feedback);
    document.getElementById("feedback-recommendations-text").innerText = report.recommendations;

    // Toggle Modal active
    document.getElementById("feedback-modal").classList.add("active");
}

/**
 * PREP API CLIENT WRAPPER
 * Coordinates client-side fetch requests to the FastAPI backend.
 */
const API = {
    baseUrl: "", // Root host

    async request(url, options = {}) {
        const defaultHeaders = {
            "Content-Type": "application/json",
        };
        options.headers = {
            ...defaultHeaders,
            ...options.headers
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "An unexpected error occurred");
            }
            return data;
        } catch (error) {
            console.error(`API Error on ${url}:`, error);
            throw error;
        }
    },

    // --- AUTHENTICATION ---
    async login(email, password) {
        return this.request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    },

    async register(name, email, password, role, specialties = "", hourlyRate = 50, bio = "") {
        const payload = {
            name,
            email,
            password,
            role,
            bio,
            specialties,
            hourly_rate: parseInt(hourlyRate)
        };
        return this.request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    // --- INTERVIEWERS & MARKETPLACE ---
    async getInterviewers(roleFilter = "") {
        let url = "/api/interviewers";
        if (roleFilter && roleFilter !== "all") {
            url += `?role_filter=${encodeURIComponent(roleFilter)}`;
        }
        return this.request(url);
    },

    async getInterviewer(interviewerId) {
        return this.request(`/api/interviewers/${interviewerId}`);
    },

    // --- AVAILABILITY SLOTS ---
    async getAvailability(interviewerId) {
        return this.request(`/api/interviewers/${interviewerId}/availability`);
    },

    async createAvailability(interviewerId, slot) {
        return this.request(`/api/availability?interviewer_id=${interviewerId}`, {
            method: "POST",
            body: JSON.stringify(slot)
        });
    },

    async deleteAvailability(slotId, interviewerId) {
        return this.request(`/api/availability/${slotId}?interviewer_id=${interviewerId}`, {
            method: "DELETE"
        });
    },

    // --- APPOINTMENTS & BOOKING ---
    async bookAppointment(intervieweeId, interviewerId, scheduledAt) {
        return this.request(`/api/appointments?interviewee_id=${intervieweeId}`, {
            method: "POST",
            body: JSON.stringify({
                interviewer_id: parseInt(interviewerId),
                scheduled_at: scheduledAt
            })
        });
    },

    async getMyAppointments(userId) {
        return this.request(`/api/appointments/me?user_id=${userId}`);
    },

    // --- AI ROOM REAL-TIME MODULES ---
    async getRoomHelper(appointmentId, userId) {
        return this.request(`/api/appointments/${appointmentId}/room-helper?user_id=${userId}`);
    },

    async submitTranscript(appointmentId, userId, transcript) {
        return this.request(`/api/appointments/${appointmentId}/submit-transcript?user_id=${userId}`, {
            method: "POST",
            body: JSON.stringify({ transcript })
        });
    },

    async getFeedback(appointmentId, userId) {
        return this.request(`/api/appointments/${appointmentId}/feedback?user_id=${userId}`);
    },

    // --- WALLET & TRANSACATION HISTORY ---
    async getTransactions(userId) {
        return this.request(`/api/transactions?user_id=${userId}`);
    },

    async topUp(userId, amount) {
        return this.request(`/api/dashboard/topup?user_id=${userId}`, {
            method: "POST",
            body: JSON.stringify({ amount: parseInt(amount) })
        });
    },

    async withdraw(userId, amount, method, details) {
        return this.request(`/api/dashboard/withdraw?user_id=${userId}`, {
            method: "POST",
            body: JSON.stringify({
                amount: parseInt(amount),
                method,
                details
            })
        });
    }
};

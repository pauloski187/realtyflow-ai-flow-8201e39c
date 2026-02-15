// ── Environment-based API client ──
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper — every request goes through here.
 * - Prefixes paths with VITE_API_BASE_URL (never hits Lovable origin)
 * - Sets Content-Type for JSON bodies
 * - credentials: "omit" (no cookies)
 * - Throws with status + body on non-2xx
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${path}`;
  const method = options?.method || "GET";

  console.log(`📡 API Request: ${method} ${fullUrl}`);

  const res = await fetch(fullUrl, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`❌ API Error: ${method} ${fullUrl}`, {
      status: res.status,
      statusText: res.statusText,
      body: errorBody,
    });
    throw new Error(
      `API error ${res.status}: ${res.statusText} — ${errorBody}`
    );
  }

  const data = await res.json();
  console.log(`✅ API Success: ${method} ${fullUrl}`, { status: res.status });
  return data;
}

// ── Typed API helpers ──

export const api = {
  // Health
  healthCheck: () =>
    apiFetch<{ status: string }>("/health"),

  // Chat
  chat: (message: string, sessionId: string) =>
    apiFetch<{ response: string; session_id: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  // Leads
  listLeads: (filters?: { status?: string; skip?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.skip != null) params.set("skip", String(filters.skip));
    if (filters?.limit != null) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return apiFetch<{ leads: Lead[] }>(`/api/leads${qs ? `?${qs}` : ""}`);
  },

  getLead: (id: string) =>
    apiFetch<Lead>(`/api/leads/${id}`),

  updateLead: (id: string, patch: Partial<Lead>) =>
    apiFetch<Lead>(`/api/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  updateLeadStatus: (id: string, status: "hot" | "warm" | "cold") =>
    apiFetch<Lead>(`/api/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  addLeadNote: (id: string, notes: string) =>
    apiFetch<Lead>(`/api/leads/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  // Dashboard / Analytics
  getDashboardStats: () =>
    apiFetch<any>("/api/analytics/dashboard-stats"),

  getLeadSources: (period = 30) =>
    apiFetch<{ sources: { name: string; count: number }[]; period_days: number }>(
      `/api/lead-sources?period=${period}`
    ),

  getAiActivity: () =>
    apiFetch<{ activities: AiActivity[] }>("/api/ai-activity"),

  // Appointments
  getAppointments: () =>
    apiFetch<{ appointments: Appointment[] }>("/api/appointments"),

  // Conversations
  getConversations: () =>
    apiFetch<any>("/api/conversations"),

  // Legacy aliases (so existing pages keep working without changes)
  getLeads: (params?: string) =>
    apiFetch<{ leads: Lead[] }>(`/api/leads${params ? `?${params}` : ""}`),

  postChat: (message: string, sessionId: string) =>
    apiFetch<{ response: string; session_id: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
};

// ── Interfaces ──

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  timeline: string;
  budget: number;
  location: string;
  createdAt: string;
  score: number;
  stage: string;
  propertyInterest: string;
  bedrooms: number;
  notes: string;
  conversations: { sender: string; message: string; timestamp: string }[];
}

export interface Appointment {
  id: string;
  leadName: string;
  propertyAddress: string;
  dateTime: string;
  status: string;
  reminder24h: boolean;
  reminder1h: boolean;
  notes: string;
}

export interface AiActivity {
  id: number;
  lead_name: string;
  action: string;
  status: "scheduled" | "in_progress" | "completed";
  time: string;
  relative_time: string;
  action_type:
    | "message_sent"
    | "followup_scheduled"
    | "appointment_booked"
    | "lead_reengaged";
}

// ── Environment-based API client ──
const DEFAULT_API_BASE_URL = "https://ai-sales-rep-for-real-estate-pns1.onrender.com";
const ENV_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

export const API_BASE_URL = String(ENV_API_BASE_URL).replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;
  const method = options?.method || "GET";

  console.log(`📡 API Request: ${method} ${fullUrl}`);

  const canRetry = method.toUpperCase() === "GET";
  let res: Response | null = null;
  let lastErr: unknown;
  const attempts = canRetry ? MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      res = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
    } catch (networkErr) {
      lastErr = networkErr;
      console.error(`❌ Network Error: ${method} ${fullUrl} (attempt ${attempt + 1}/${attempts})`, networkErr);
      if (attempt < attempts - 1) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      const err = new Error(`Request failed: network/timeout error on ${path}`);
      (err as any).status = 0;
      (err as any).endpoint = path;
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (res.ok) break;

    if (attempt < attempts - 1 && [502, 503, 504].includes(res.status)) {
      await sleep(1000 * (attempt + 1));
      continue;
    }

    break;
  }

  if (!res) {
    const err = new Error(`Request failed: network/timeout error on ${path}`);
    (err as any).status = 0;
    (err as any).endpoint = path;
    (err as any).cause = lastErr;
    throw err;
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`❌ API Error: ${method} ${fullUrl}`, {
      status: res.status,
      statusText: res.statusText,
      body: errorBody,
    });
    const err = new Error(
      `Request failed: ${res.status} on ${path}`
    );
    (err as any).status = res.status;
    (err as any).endpoint = path;
    (err as any).body = errorBody;
    throw err;
  }

  let data: T;
  try {
    data = await res.json();
  } catch {
    console.error(`❌ JSON parse error: ${method} ${fullUrl}`);
    throw new Error(`Request failed: invalid JSON on ${path}`);
  }
  console.log(`✅ API Success: ${method} ${fullUrl}`, { status: res.status });
  return data;
}

// ── Normalize raw API lead to frontend Lead shape ──
function normalizeLead(raw: any): Lead {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    source: (raw.source ?? '').replace('SourceChannelEnum.', ''),
    status: raw.temperature ?? raw.status ?? 'cold',
    timeline: raw.timeline ?? '',
    budget: raw.budget_max ?? raw.budget_min ?? 0,
    location: (raw.preferred_neighborhoods ?? []).join(', ') || '',
    createdAt: raw.stage_changed_at ?? raw.last_contact_at ?? '',
    score: raw.qualification_status === 'fully_qualified' ? 90 : raw.qualification_status === 'partially_qualified' ? 50 : 20,
    stage: raw.current_stage ?? 'new',
    propertyInterest: raw.must_have_features ? String(raw.must_have_features) : '',
    bedrooms: raw.bedrooms ?? 0,
    notes: raw.notes ?? '',
    conversations: [],
  };
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

  // Leads — API returns a flat array, normalize to { leads: Lead[] }
  listLeads: async (filters?: { status?: string; skip?: number; limit?: number; demo_only?: boolean }): Promise<{ leads: Lead[] }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.skip != null) params.set("skip", String(filters.skip));
    if (filters?.limit != null) params.set("limit", String(filters.limit));
    params.set("demo_only", String(filters?.demo_only ?? true));
    const qs = params.toString();
    const raw = await apiFetch<any[]>(`/api/leads${qs ? `?${qs}` : ""}`);
    const arr = Array.isArray(raw) ? raw : (raw as any).leads ?? [];
    return { leads: arr.map(normalizeLead) };
  },

  getLead: async (id: string): Promise<Lead> => {
    const raw = await apiFetch<any>(`/api/leads/${id}`);
    return normalizeLead(raw);
  },

  updateLead: (id: string, patch: Partial<Lead>) =>
    apiFetch<any>(`/api/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  updateLeadStatus: (id: string, status: "hot" | "warm" | "cold") =>
    apiFetch<any>(`/api/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  addLeadNote: (id: string, notes: string) =>
    apiFetch<any>(`/api/leads/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  // Dashboard / Analytics
  getDashboardStats: () =>
    apiFetch<any>("/api/analytics/dashboard-stats"),

  getLeadSources: (period = 30) =>
    apiFetch<any>(`/api/lead-sources?period=${period}`),

  getAiActivity: () =>
    apiFetch<any>("/api/ai-activity"),

  // Appointments
  getAppointments: () =>
    apiFetch<any>("/api/appointments"),

  // Conversations
  getConversations: () =>
    apiFetch<any>("/api/conversations"),

  getConversationThread: (leadId: number) =>
    apiFetch<any>(`/api/conversations/${leadId}`),

  // Profile
  getProfile: () =>
    apiFetch<any>("/api/profile"),

  updateProfile: (data: any) =>
    apiFetch<any>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadProfilePhoto: (base64Data: string) =>
    apiFetch<{ photo_url: string }>("/api/profile/photo", {
      method: "POST",
      body: JSON.stringify({ photo: base64Data }),
    }),

  updateAiSettings: (settings: any) =>
    apiFetch<any>("/api/profile/ai-settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  updateNotificationSettings: (settings: any) =>
    apiFetch<any>("/api/profile/notifications", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  // Follow-ups
  getFollowUpStats: () =>
    apiFetch<any>("/api/follow-ups/stats"),

  getFollowUps: () =>
    apiFetch<any[]>("/api/follow-ups?status=pending"),

  sendFollowUp: (id: number) =>
    apiFetch<any>(`/api/follow-ups/${id}/send`, { method: "POST" }),

  completeFollowUp: (id: number) =>
    apiFetch<any>(`/api/follow-ups/${id}/complete`, { method: "PUT" }),

  snoozeFollowUp: (id: number, days: number) =>
    apiFetch<any>(`/api/follow-ups/${id}/snooze`, {
      method: "PUT",
      body: JSON.stringify({ days }),
    }),

  // Legacy aliases
  getLeads: async (params?: string): Promise<{ leads: Lead[] }> => {
    const query = params?.trim()
      ? (params.includes("demo_only=") ? params : `${params}&demo_only=true`)
      : "demo_only=true";
    const raw = await apiFetch<any[]>(`/api/leads?${query}`);
    const arr = Array.isArray(raw) ? raw : (raw as any).leads ?? [];
    return { leads: arr.map(normalizeLead) };
  },

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

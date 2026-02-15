export const API_BASE_URL = "https://ai-sales-rep-for-real-estate.onrender.com";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE_URL}${path}`;
  const method = options?.method || "GET";
  
  console.log(`📡 API Request: ${method} ${fullUrl}`);
  
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true",
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
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`✅ API Success: ${method} ${fullUrl}`, { status: res.status });
    return data;
  } catch (error) {
    console.error(`❌ API Failed: ${method} ${fullUrl}`, error);
    throw error;
  }
}

// Typed API helpers
export const api = {
  getDashboardStats: () => apiFetch<any>("/api/analytics/dashboard-stats"),
  getLeadSources: (period = 30) => apiFetch<{ sources: { name: string; count: number }[]; period_days: number }>(`/api/lead-sources?period=${period}`),
  getAiActivity: () => apiFetch<{ activities: AiActivity[] }>("/api/ai-activity"),
  getLeads: (params?: string) => apiFetch<{ leads: Lead[] }>(`/api/leads${params ? `?${params}` : ""}`),
  getAppointments: () => apiFetch<{ appointments: Appointment[] }>("/api/appointments"),
  getConversations: () => apiFetch<any>("/api/conversations"),
  getAnalytics: () => apiFetch<any>("/api/analytics/dashboard-stats"),
  postChat: (message: string, sessionId: string) =>
    apiFetch<{ response: string; session_id: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
  healthCheck: () => apiFetch<{ status: string }>("/health"),
};

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
  action_type: "message_sent" | "followup_scheduled" | "appointment_booked" | "lead_reengaged";
}

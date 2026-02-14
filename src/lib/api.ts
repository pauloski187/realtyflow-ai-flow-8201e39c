export const API_BASE_URL = "https://calm-coats-repeat.loca.lt";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "bypass-tunnel-reminder": "true",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// Typed API helpers
export const api = {
  getDashboardStats: () => apiFetch<any>("/api/dashboard/stats"),
  getLeadSources: (period = 30) => apiFetch<{ sources: { name: string; count: number }[]; period_days: number }>(`/api/lead-sources?period=${period}`),
  getAiActivity: () => apiFetch<{ activities: AiActivity[] }>("/api/ai-activity"),
  getLeads: (params?: string) => apiFetch<any>(`/api/leads${params ? `?${params}` : ""}`),
  getAppointments: () => apiFetch<any>("/api/appointments"),
  getAnalytics: () => apiFetch<any>("/api/analytics"),
  postChat: (message: string, sessionId: string) =>
    apiFetch<{ response: string; session_id: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
};

export interface AiActivity {
  id: number;
  lead_name: string;
  action: string;
  status: "scheduled" | "in_progress" | "completed";
  time: string;
  relative_time: string;
  action_type: "message_sent" | "followup_scheduled" | "appointment_booked" | "lead_reengaged";
}

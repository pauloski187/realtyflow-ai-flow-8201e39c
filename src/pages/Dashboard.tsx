import { TrendingUp, TrendingDown, Flame, CalendarDays, BarChart3, Clock, Target, CalendarCheck, RefreshCw } from 'lucide-react';
import { type LeadStatus, type LeadSource } from '@/data/mockData';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api, type AiActivity } from '@/lib/api';
import { cn } from '@/lib/utils';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = { hot: 'badge-hot', warm: 'badge-warm', cold: 'badge-cold' };
  const emojis: Record<string, string> = { hot: '🔥', warm: '☀️', cold: '❄️' };
  return <span className={`${styles[status] ?? 'badge-cold'} text-xs font-medium px-2 py-0.5 rounded-full`}>{emojis[status] ?? '❄️'} {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const SourceBadge = ({ source }: { source: string }) => {
  const colors: Record<string, string> = { Gmail: 'bg-destructive/10 text-destructive', Website: 'bg-primary/10 text-primary', WhatsApp: 'bg-success/10 text-success' };
  return <span className={`${colors[source] ?? 'bg-muted text-muted-foreground'} text-xs font-medium px-2 py-0.5 rounded-full`}>{source}</span>;
};

// ── AI Activity Card ──
const actionIcons: Record<string, string> = {
  message_sent: '📧',
  followup_scheduled: '🔄',
  appointment_booked: '📅',
  lead_reengaged: '💬',
};

const statusStyles: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function AiActivityCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-activity'],
    queryFn: () => api.getAiActivity(),
    refetchInterval: 30000,
  });

  const activities = data?.activities ?? [];
  const hasData = activities.length > 0;
  const showError = isError && !hasData && !isLoading;
  const showEmpty = !isLoading && !showError && !hasData;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5 bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-foreground text-base">🤖 AI Activity Right Now</h2>
          {isLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>
        <p className="text-xs text-muted-foreground">Your AI is working 24/7</p>
      </div>
      <div className="p-4">
        {showError && (
          <p className="text-sm text-destructive text-center py-6">⚠️ Request failed on /api/ai-activity</p>
        )}
        {showEmpty && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">🤖 AI is monitoring for new leads...</p>
            <p className="text-xs text-muted-foreground mt-1">No recent activity yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {activities.slice(0, 6).map((a: any) => {
            const actionType = a.action_type ?? a.type ?? 'message_sent';
            const leadName = a.lead_name ?? a.description ?? '';
            const action = a.action ?? a.title ?? '';
            const relativeTime = a.relative_time ?? (a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '');
            const status = a.status ?? 'completed';
            return (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 animate-fade-in">
              <div className="text-xl shrink-0">{actionIcons[actionType] ?? '📧'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{action}</p>
                <p className="text-xs text-muted-foreground">{leadName}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusStyles[status] ?? statusStyles.scheduled, status === 'in_progress' && 'animate-pulse')}>
                  {status === 'completed' ? '✓ ' : ''}{status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-muted-foreground">{relativeTime}</span>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Lead Sources Donut (API) ──
const sourceColorMap: Record<string, string> = {
  gmail: '#EA4335',
  Gmail: '#EA4335',
  Website: '#10B981',
  website: '#10B981',
  WhatsApp: '#25D366',
  whatsapp: '#25D366',
  Unknown: '#6B7280',
  unknown: '#6B7280',
};

function LeadSourcesDonut() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => api.getLeadSources(30),
  });

  const sources = data?.sources ?? [];
  const total = sources.reduce((sum: number, s: any) => sum + (s.count ?? s.value ?? 0), 0);
  const chartData = sources.map((s: any) => ({
    name: s.name,
    value: s.count ?? s.value ?? 0,
    color: sourceColorMap[s.name] ?? '#6B7280',
  }));

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-3 text-sm">Lead Sources (Last 30 Days)</h3>
      {isLoading && <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
      {isError && chartData.length === 0 && <div className="h-[200px] flex items-center justify-center text-destructive text-sm">⚠️ Request failed on /api/lead-sources</div>}
      {!isLoading && !isError && chartData.length > 0 && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [`${value} leads (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-xl font-bold">{total}</text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span>{d.name}</span>
                  <span className="font-medium text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
  });

  const leads = leadsData?.leads ?? [];
  const totalLeads = statsData?.total_leads ?? leads.length;
  const hotLeads = statsData?.hot_leads ?? leads.filter(l => l.status === 'hot').length;
  const appointmentsToday = statsData?.appointments_today ?? 0;
  const responseRate = statsData?.response_rate ?? '—';

  const stats = [
    { label: 'Total Leads', value: totalLeads, change: statsData?.total_leads_change ?? '', up: true, icon: TrendingUp, gradient: 'gradient-blue' },
    { label: 'Hot Leads', value: hotLeads, change: '🔥', up: true, icon: Flame, gradient: 'gradient-red' },
    { label: 'Appointments Today', value: appointmentsToday, change: '', up: true, icon: CalendarDays, gradient: 'gradient-green' },
    { label: 'Response Rate', value: responseRate, change: statsData?.response_rate_change ?? '', up: true, icon: BarChart3, gradient: 'gradient-purple' },
  ];

  // Generate line data from real leads if available
  const lineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dayStr = date.toISOString().split('T')[0];
    const count = leads.filter(l => l.createdAt?.startsWith(dayStr)).length;
    return { day: `Day ${i + 1}`, leads: count };
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's your lead overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`stat-card ${s.gradient}`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 opacity-80" />
              {s.change && (
                <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold">{statsLoading ? '...' : s.value}</div>
            <div className="text-sm opacity-80 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Activity Feed */}
      <AiActivityCard />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Conversion Rate', value: statsData?.conversion_rate ?? '—', icon: Target },
          { label: 'Avg Response Time', value: statsData?.avg_response_time ?? '—', icon: Clock },
          { label: 'Appointments This Week', value: statsData?.appointments_week ?? '—', icon: CalendarCheck },
          { label: 'Appointments This Month', value: statsData?.appointments_month ?? '—', icon: CalendarDays },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <s.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{statsLoading ? '...' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Recent Leads</h2>
          <div className="space-y-3">
            {leads.slice(0, 10).map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {l.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{l.name}</span> — {l.propertyInterest}
                  </p>
                  <p className="text-xs text-muted-foreground">{l.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SourceBadge source={l.source} />
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
            {leads.length === 0 && !statsLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">No leads yet.</p>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3 text-sm">Leads (30 Days)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={lineData}>
                <XAxis dataKey="day" tick={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="leads" stroke="hsl(224, 64%, 33%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <LeadSourcesDonut />
        </div>
      </div>
    </div>
  );
}

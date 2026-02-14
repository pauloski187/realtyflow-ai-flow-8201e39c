import { TrendingUp, TrendingDown, Flame, CalendarDays, BarChart3, Clock, Target, CalendarCheck, Mail, RefreshCw, MessageSquare, Calendar } from 'lucide-react';
import { mockLeads, mockActivities, type LeadStatus, type LeadSource } from '@/data/mockData';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api, type AiActivity } from '@/lib/api';
import { cn } from '@/lib/utils';

const stats = [
  { label: 'Total Leads', value: mockLeads.length, change: '+12%', up: true, icon: TrendingUp, gradient: 'gradient-blue' },
  { label: 'Hot Leads', value: mockLeads.filter(l => l.status === 'hot').length, change: '🔥', up: true, icon: Flame, gradient: 'gradient-red' },
  { label: 'Appointments Today', value: 3, change: '', up: true, icon: CalendarDays, gradient: 'gradient-green' },
  { label: 'Response Rate', value: '94%', change: '+2%', up: true, icon: BarChart3, gradient: 'gradient-purple' },
];

const lineData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  leads: Math.floor(Math.random() * 8) + 2,
}));

const StatusBadge = ({ status }: { status: LeadStatus }) => {
  const styles = { hot: 'badge-hot', warm: 'badge-warm', cold: 'badge-cold' };
  const emojis = { hot: '🔥', warm: '☀️', cold: '❄️' };
  return <span className={`${styles[status]} text-xs font-medium px-2 py-0.5 rounded-full`}>{emojis[status]} {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const SourceBadge = ({ source }: { source: LeadSource }) => {
  const colors: Record<LeadSource, string> = { Gmail: 'bg-destructive/10 text-destructive', Website: 'bg-primary/10 text-primary', WhatsApp: 'bg-success/10 text-success' };
  return <span className={`${colors[source]} text-xs font-medium px-2 py-0.5 rounded-full`}>{source}</span>;
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
        {isError && (
          <p className="text-sm text-muted-foreground text-center py-6">⚠️ Could not load activity feed</p>
        )}
        {!isLoading && !isError && activities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">🤖 AI is monitoring for new leads...</p>
            <p className="text-xs text-muted-foreground mt-1">No recent activity yet.</p>
          </div>
        )}
        <div className="space-y-3">
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 animate-fade-in">
              <div className="text-xl shrink-0">{actionIcons[a.action_type] ?? '📧'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{a.action}</p>
                <p className="text-xs text-muted-foreground">{a.lead_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusStyles[a.status] ?? statusStyles.scheduled, a.status === 'in_progress' && 'animate-pulse')}>
                  {a.status === 'completed' ? '✓ ' : ''}{a.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-muted-foreground">{a.relative_time}</span>
              </div>
            </div>
          ))}
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
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  const chartData = sources.map(s => ({
    name: s.name,
    value: s.count,
    color: sourceColorMap[s.name] ?? '#6B7280',
  }));

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-3 text-sm">Lead Sources (Last 30 Days)</h3>
      {isLoading && <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
      {isError && <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">⚠️ Could not load data</div>}
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
                  {/* Center total */}
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
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm opacity-80 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Activity Feed */}
      <AiActivityCard />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Conversion Rate', value: '23%', icon: Target },
          { label: 'Avg Response Time', value: '4.2s', icon: Clock },
          { label: 'Appointments This Week', value: '12', icon: CalendarCheck },
          { label: 'Appointments This Month', value: '47', icon: CalendarDays },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <s.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {mockActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {a.leadName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{a.leadName}</span> {a.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.timeAgo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SourceBadge source={a.source} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
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
          {/* API-powered Lead Sources Donut */}
          <LeadSourcesDonut />
        </div>
      </div>
    </div>
  );
}

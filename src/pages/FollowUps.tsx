import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, AlertTriangle, CheckCircle2, CalendarDays, Search, Send, ChevronDown,
  Loader2, Mail, Eye, EyeOff, XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──
interface FollowUp {
  id: number;
  lead_id: number;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  lead_temperature: string;
  follow_up_type: string;
  stage: string;
  scheduled_at: string;
  status: string;
  original_inquiry: string;
  days_overdue: number;
  suggested_message: string;
}

interface FollowUpStats {
  overdue: number;
  due_today: number;
  upcoming: number;
  total_pending: number;
}

type FilterTab = 'all' | 'overdue' | 'due_today' | 'upcoming';

// ── Helpers ──
function getUrgency(f: FollowUp): 'overdue' | 'due_today' | 'upcoming' {
  const scheduled = new Date(f.scheduled_at);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  if (scheduled < todayStart) return 'overdue';
  if (scheduled < todayEnd) return 'due_today';
  return 'upcoming';
}

function urgencyLabel(u: 'overdue' | 'due_today' | 'upcoming', f: FollowUp) {
  if (u === 'overdue') return `OVERDUE — ${Math.abs(f.days_overdue)} day${Math.abs(f.days_overdue) !== 1 ? 's' : ''} ago`;
  if (u === 'due_today') return 'DUE TODAY';
  const days = Math.ceil((new Date(f.scheduled_at).getTime() - Date.now()) / 86400000);
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

function urgencyConfig(u: string) {
  switch (u) {
    case 'overdue': return { border: 'border-l-destructive', badge: 'bg-destructive/10 text-destructive', icon: '🔴' };
    case 'due_today': return { border: 'border-l-warning', badge: 'bg-warning/10 text-warning', icon: '🟡' };
    default: return { border: 'border-l-success', badge: 'bg-success/10 text-success', icon: '🟢' };
  }
}

function tempBadge(t: string) {
  switch (t?.toLowerCase()) {
    case 'hot': return 'bg-destructive/10 text-destructive';
    case 'warm': return 'bg-warning/10 text-warning';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Main Page ──
export default function FollowUps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sendModal, setSendModal] = useState<FollowUp | null>(null);
  const [snoozeOpen, setSnoozeOpen] = useState<number | null>(null);

  // ── Data fetching ──
  const { data: stats, isLoading: statsLoading } = useQuery<FollowUpStats>({
    queryKey: ['follow-up-stats'],
    queryFn: () => api.getFollowUpStats(),
    refetchInterval: 60000,
  });

  const { data: followUps, isLoading, isError, refetch } = useQuery<FollowUp[]>({
    queryKey: ['follow-ups'],
    queryFn: () => api.getFollowUps(),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // ── Mutations ──
  const sendMutation = useMutation({
    mutationFn: (id: number) => api.sendFollowUp(id),
    onSuccess: () => {
      toast({ title: 'Follow-up sent!', description: 'Email has been sent to the lead.' });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
      setSendModal(null);
    },
    onError: () => toast({ title: 'Failed to send', description: 'Please try again.', variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.completeFollowUp(id),
    onSuccess: () => {
      toast({ title: 'Follow-up marked as complete' });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
    },
    onError: () => toast({ title: 'Failed to complete', variant: 'destructive' }),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) => api.snoozeFollowUp(id, days),
    onSuccess: (_, { days }) => {
      toast({ title: `Snoozed for ${days} day${days !== 1 ? 's' : ''}` });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-stats'] });
      setSnoozeOpen(null);
    },
    onError: () => toast({ title: 'Failed to snooze', variant: 'destructive' }),
  });

  // ── Filtering & grouping ──
  const items = useMemo(() => {
    let list = Array.isArray(followUps) ? followUps : [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => (f.lead_name ?? '').toLowerCase().includes(q));
    }
    if (filter !== 'all') {
      list = list.filter(f => getUrgency(f) === filter);
    }
    // Sort: overdue first, then due_today, then upcoming
    const order = { overdue: 0, due_today: 1, upcoming: 2 };
    return [...list].sort((a, b) => order[getUrgency(a)] - order[getUrgency(b)] || new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [followUps, search, filter]);

  const grouped = useMemo(() => {
    const groups: { urgency: 'overdue' | 'due_today' | 'upcoming'; items: FollowUp[] }[] = [];
    items.forEach(f => {
      const u = getUrgency(f);
      const last = groups[groups.length - 1];
      if (last?.urgency === u) last.items.push(f);
      else groups.push({ urgency: u, items: [f] });
    });
    return groups;
  }, [items]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statCards = [
    { icon: '🔴', label: 'Overdue', value: stats?.overdue ?? 0, color: 'text-destructive' },
    { icon: '🟡', label: 'Due Today', value: stats?.due_today ?? 0, color: 'text-warning' },
    { icon: '🟢', label: 'Upcoming', value: stats?.upcoming ?? 0, color: 'text-success' },
    { icon: '📊', label: 'Total', value: stats?.total_pending ?? 0, color: 'text-primary' },
  ];

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'due_today', label: 'Due Today' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">⏰ Follow-Ups</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage scheduled follow-up emails to your leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center">
            <span className="text-lg">{s.icon}</span>
            {statsLoading ? (
              <Skeleton className="h-8 w-12 mx-auto mt-1" />
            ) : (
              <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                filter === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by lead name…"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {search && (
        <p className="text-xs text-muted-foreground">
          Showing {items.length} of {(followUps ?? []).length} follow-ups
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : isError && items.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-destructive mb-3">⚠️ Request failed on /api/follow-ups</p>
          <button onClick={() => refetch()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          {filter === 'overdue' ? (
            <>
              <p className="text-xl mb-1">✅ No Overdue Follow-Ups</p>
              <p className="text-sm text-muted-foreground">Great job staying on top of leads!</p>
            </>
          ) : (
            <>
              <p className="text-xl mb-1">🎉 All Caught Up!</p>
              <p className="text-sm text-muted-foreground">No pending follow-ups at the moment.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => {
            const cfg = urgencyConfig(group.urgency);
            const groupLabel = group.urgency === 'overdue' ? '🔴 OVERDUE' : group.urgency === 'due_today' ? '🟡 DUE TODAY' : '🟢 UPCOMING';
            return (
              <div key={group.urgency}>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {groupLabel} ({group.items.length})
                </h3>
                <div className="space-y-3">
                  {group.items.map(f => {
                    const u = getUrgency(f);
                    const isExpanded = expanded.has(f.id);
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          'glass-card rounded-xl border-l-4 p-4 transition-all hover:shadow-md',
                          cfg.border
                        )}
                      >
                        {/* Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                            {urgencyLabel(u, f)}
                          </span>
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', tempBadge(f.lead_temperature))}>
                            {f.lead_temperature?.toUpperCase()} {f.lead_temperature === 'hot' ? '🔥' : ''}
                          </span>
                        </div>

                        {/* Lead info */}
                        <h4 className="font-semibold text-foreground">{f.lead_name ?? 'Unknown Lead'}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.lead_email}{f.lead_phone ? ` | ${f.lead_phone}` : ''}
                        </p>

                        {/* Original inquiry */}
                        {f.original_inquiry && (
                          <div className="mt-3 bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Original Inquiry:</p>
                            <p className="text-sm text-foreground line-clamp-2">{f.original_inquiry}</p>
                          </div>
                        )}

                        {/* Schedule info */}
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">Follow-Up Type:</span> {(f.follow_up_type ?? 'general').replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Scheduled:</span> {formatDate(f.scheduled_at)} at {formatTime(f.scheduled_at)}
                        </p>

                        {/* Preview message */}
                        {f.suggested_message && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleExpand(f.id)}
                              className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                            >
                              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              {isExpanded ? 'Hide Message' : 'Preview Message'}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 bg-muted/30 border border-border rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap animate-fade-in">
                                {f.suggested_message}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                          <button
                            onClick={() => setSendModal(f)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                          >
                            <Send className="w-3.5 h-3.5" /> Send Now
                          </button>
                          <button
                            onClick={() => completeMutation.mutate(f.id)}
                            disabled={completeMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            {completeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Mark Done
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setSnoozeOpen(snoozeOpen === f.id ? null : f.id)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" /> Snooze <ChevronDown className="w-3 h-3" />
                            </button>
                            {snoozeOpen === f.id && (
                              <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[120px] py-1 animate-fade-in">
                                {[1, 3, 7].map(d => (
                                  <button
                                    key={d}
                                    onClick={() => snoozeMutation.mutate({ id: f.id, days: d })}
                                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                  >
                                    {d === 1 ? '1 day' : d === 7 ? '1 week' : `${d} days`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Confirmation Modal */}
      <Dialog open={!!sendModal} onOpenChange={() => setSendModal(null)}>
        <DialogContent>
          {sendModal && (
            <>
              <DialogHeader>
                <DialogTitle>Send Follow-Up Email?</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">To: <span className="text-foreground font-medium">{sendModal.lead_email}</span></p>
                  <p className="text-muted-foreground mt-1">Subject: <span className="text-foreground">Following up on your property inquiry</span></p>
                </div>
                {sendModal.suggested_message && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto border border-border">
                    {sendModal.suggested_message}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <button
                  onClick={() => setSendModal(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendMutation.mutate(sendModal.id)}
                  disabled={sendMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Follow-Up
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

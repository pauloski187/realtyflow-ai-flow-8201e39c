import { useState } from 'react';
import { type AppointmentStatus } from '@/data/mockData';
import { CalendarDays, List, CheckCircle2, Clock, XCircle, AlertCircle, Eye, Pencil, Mail, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { api, type Appointment } from '@/lib/api';

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-warning/10 text-warning' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Appointments() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.getAppointments(),
  });

  const appointments = data?.appointments ?? [];

  const todayCount = appointments.filter(a => {
    const d = new Date(a.dateTime);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const filtered = appointments.filter(a => {
    if (filter === 'all') return true;
    const d = new Date(a.dateTime);
    const now = new Date();
    if (filter === 'today') return d.toDateString() === now.toDateString();
    if (filter === 'week') return d.getTime() - now.getTime() < 7 * 86400000 && d.getTime() >= now.getTime() - 86400000;
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const upcoming = filtered.filter(a => new Date(a.dateTime) >= new Date() && a.status !== 'cancelled');
  const past = filtered.filter(a => new Date(a.dateTime) < new Date() || a.status === 'cancelled' || a.status === 'completed');

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading appointments...</div>;
  if (isError) return <div className="flex items-center justify-center py-20 text-destructive">⚠️ Request failed on /api/appointments</div>;

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm">{todayCount} appointments today</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors', view === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
              <List className="w-4 h-4" /> List
            </button>
            <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors', view === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
              <CalendarDays className="w-4 h-4" /> Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'today', 'week', 'month'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 text-sm rounded-lg font-medium transition-colors', filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground')}>
            {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Upcoming</h2>
              <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-left font-medium text-muted-foreground">Lead</th>
                      <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Property</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Date & Time</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Reminders</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(apt => {
                      const cfg = statusConfig[apt.status] ?? statusConfig.pending;
                      return (
                        <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedApt(apt)}>
                          <td className="p-3 font-medium text-foreground">{apt.leadName}</td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{apt.propertyAddress}</td>
                          <td className="p-3">
                            <div className="text-foreground">{formatDate(apt.dateTime)}</div>
                            <div className="text-xs text-muted-foreground">{formatTime(apt.dateTime)}</div>
                          </td>
                          <td className="p-3">
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>
                              <cfg.icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <div className="flex gap-1 text-xs">
                              <span className={apt.reminder24h ? 'text-success' : 'text-muted-foreground'}>24h {apt.reminder24h ? '✓' : '—'}</span>
                              <span className={apt.reminder1h ? 'text-success' : 'text-muted-foreground'}>1h {apt.reminder1h ? '✓' : '—'}</span>
                            </div>
                          </td>
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedApt(apt)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Eye className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past</h2>
              <div className="glass-card rounded-xl overflow-hidden opacity-75">
                <table className="w-full text-sm">
                  <tbody>
                    {past.map(apt => {
                      const cfg = statusConfig[apt.status] ?? statusConfig.pending;
                      return (
                        <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedApt(apt)}>
                          <td className="p-3 font-medium text-foreground">{apt.leadName}</td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{apt.propertyAddress}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(apt.dateTime)} {formatTime(apt.dateTime)}</td>
                          <td className="p-3">
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>
                              <cfg.icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {(() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayApts = appointments.filter(a => a.dateTime.startsWith(dateStr));
                const isToday = d === now.getDate();
                cells.push(
                  <div key={d} className={cn('min-h-[60px] p-1 rounded-lg border border-transparent', isToday && 'border-primary bg-primary/5')}>
                    <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-foreground')}>{d}</span>
                    {dayApts.map(a => {
                      const cfg = statusConfig[a.status] ?? statusConfig.pending;
                      return (
                        <div key={a.id} className={cn('text-[10px] px-1 py-0.5 rounded mt-0.5 truncate cursor-pointer', cfg.className)} onClick={() => setSelectedApt(a)}>
                          {a.leadName.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedApt} onOpenChange={() => setSelectedApt(null)}>
        <DialogContent>
          {selectedApt && (() => {
            const cfg = statusConfig[selectedApt.status] ?? statusConfig.pending;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground">{selectedApt.leadName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Property</p><p className="text-sm text-foreground">{selectedApt.propertyAddress}</p></div>
                    <div><p className="text-xs text-muted-foreground">Date & Time</p><p className="text-sm text-foreground">{formatDate(selectedApt.dateTime)} at {formatTime(selectedApt.dateTime)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Status</p><span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>{cfg.label}</span></div>
                    <div><p className="text-xs text-muted-foreground">ID</p><p className="text-sm font-mono text-muted-foreground">{selectedApt.id}</p></div>
                  </div>
                  {selectedApt.notes && (
                    <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm text-foreground">{selectedApt.notes}</p></div>
                  )}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-accent text-accent-foreground hover:opacity-90" onClick={() => toast({ title: 'Reschedule', description: 'Coming soon!' })}><Pencil className="w-4 h-4" /> Reschedule</button>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90" onClick={() => toast({ title: 'Reminder sent!', description: 'Email reminder sent to lead.' })}><Mail className="w-4 h-4" /> Send Reminder</button>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => toast({ title: 'Cancelled', description: 'Appointment cancelled.' })}><XCircle className="w-4 h-4" /> Cancel</button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

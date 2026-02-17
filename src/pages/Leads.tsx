import { useState, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, Eye, MessageSquare, Mail, Phone, CalendarDays, Trash2, X } from 'lucide-react';
import { formatNaira, type LeadStatus, type LeadSource } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { api, type Lead } from '@/lib/api';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = { hot: 'badge-hot', warm: 'badge-warm', cold: 'badge-cold' };
  const emojis: Record<string, string> = { hot: '🔥', warm: '☀️', cold: '❄️' };
  return <span className={`${styles[status] ?? 'badge-cold'} text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap`}>{emojis[status] ?? '❄️'} {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

const SourceBadge = ({ source }: { source: string }) => {
  const colors: Record<string, string> = { Gmail: 'bg-destructive/10 text-destructive', Website: 'bg-primary/10 text-primary', WhatsApp: 'bg-success/10 text-success' };
  return <span className={`${colors[source] ?? 'bg-muted text-muted-foreground'} text-xs font-medium px-2 py-0.5 rounded-full`}>{source}</span>;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
  });

  const leads = data?.leads ?? [];

  const filtered = useMemo(() => {
    return leads.filter((l: Lead) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const exportCSV = () => {
    const rows = filtered.map(l => `${l.name},${l.email},${l.phone},${l.source},${l.status},${l.budget},${l.location}`);
    const csv = 'Name,Email,Phone,Source,Status,Budget,Location\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    toast({ title: 'Exported!', description: `${filtered.length} leads exported to CSV.` });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading leads...</div>;
  if (isError) return <div className="flex items-center justify-center py-20 text-destructive">⚠️ Request failed on /api/leads — check backend connection.</div>;

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} leads found</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-muted transition-colors text-foreground">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-muted transition-colors text-foreground">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-card border border-border text-foreground focus:outline-none">
          <option value="all">All Status</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">☀️ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg bg-card border border-border text-foreground focus:outline-none">
          <option value="all">All Sources</option>
          <option value="Gmail">Gmail</option>
          <option value="Website">Website</option>
          <option value="WhatsApp">WhatsApp</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <button onClick={exportCSV} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Export Selected</button>
          <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-1 rounded bg-muted text-foreground">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left w-8">
                  <input type="checkbox" className="rounded" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set())} />
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Source</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Budget</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Location</th>
                <th className="p-3 text-left font-medium text-muted-foreground hidden md:table-cell">Created</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-foreground whitespace-nowrap">{lead.name}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{lead.email}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{lead.phone}</td>
                  <td className="p-3"><SourceBadge source={lead.source} /></td>
                  <td className="p-3"><StatusBadge status={lead.status} /></td>
                  <td className="p-3 hidden lg:table-cell font-medium text-foreground">{formatNaira(lead.budget)}</td>
                  <td className="p-3 hidden xl:table-cell text-muted-foreground">{lead.location}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{timeAgo(lead.createdAt)}</td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedLead(lead)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Eye className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><MessageSquare className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedLead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <span className="text-foreground">{selectedLead.name}</span>
                    <div className="mt-1"><StatusBadge status={selectedLead.status} /></div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="conversation" className="flex-1">Conversation</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${selectedLead.email}`} className="text-sm text-primary font-medium">{selectedLead.email}</a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${selectedLead.phone}`} className="text-sm text-primary font-medium">{selectedLead.phone}</a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium text-foreground">{formatNaira(selectedLead.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Timeline</p>
                      <p className="text-sm font-medium text-foreground">{selectedLead.timeline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium text-foreground">{selectedLead.location}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="text-sm font-medium text-foreground">{selectedLead.bedrooms}BR</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <SourceBadge source={selectedLead.source} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Property Interest</p>
                      <p className="text-sm font-medium text-foreground">{selectedLead.propertyInterest}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Lead Score</p>
                    <div className="flex items-center gap-3">
                      <Progress value={selectedLead.score} className="flex-1 h-2" />
                      <span className="text-sm font-bold text-foreground">{selectedLead.score}/100</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="conversation" className="mt-4">
                  <div className="space-y-3">
                    {(selectedLead.conversations ?? []).map((msg, i) => (
                      <div key={i} className={cn('flex', msg.sender === 'lead' ? 'justify-start' : 'justify-end')}>
                        <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5', msg.sender === 'lead' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground')}>
                          <p className="text-sm">{msg.message}</p>
                          <p className={cn('text-xs mt-1', msg.sender === 'lead' ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
                            {msg.sender === 'ai' ? '🤖 AI' : '👤 Lead'} · {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <textarea
                    defaultValue={selectedLead.notes}
                    placeholder="Add notes about this lead..."
                    className="w-full h-32 p-3 text-sm rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none placeholder:text-muted-foreground"
                  />
                  <button className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity" onClick={async () => {
                    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Add notes about this lead..."]');
                    if (textarea && selectedLead) {
                      try {
                        await api.addLeadNote(selectedLead.id, textarea.value);
                        toast({ title: 'Saved', description: 'Notes updated successfully.' });
                      } catch {
                        toast({ title: 'Error', description: 'Could not save notes.', variant: 'destructive' });
                      }
                    }
                  }}>
                    Save Notes
                  </button>
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"><Mail className="w-4 h-4" /> Email</button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-success text-success-foreground hover:opacity-90"><Phone className="w-4 h-4" /> Call</button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-accent text-accent-foreground hover:opacity-90"><CalendarDays className="w-4 h-4" /> Schedule</button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-4 h-4" /> Delete</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

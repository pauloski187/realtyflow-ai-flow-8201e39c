import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageSquare, Search, Filter, ArrowLeft, Loader2, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// ── Types ──
interface ConversationListItem {
  lead_id: number;
  lead_name: string;
  lead_email: string;
  lead_temperature: string;
  last_message: string;
  last_message_time: string;
  last_channel: string;
}

interface ThreadMessage {
  type: string;
  sender: string;
  subject?: string;
  content: string;
  timestamp: string;
}

interface ThreadData {
  lead: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    temperature: string;
    budget_min?: number;
    budget_max?: number;
    bedrooms?: number;
    timeline?: string;
  };
  messages: ThreadMessage[];
}

// ── Helpers ──
function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - msgDay.getTime();
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function channelIcon(channel: string) {
  const ch = channel.toLowerCase();
  if (ch.includes('email') || ch.includes('gmail')) return <Mail className="w-3.5 h-3.5" />;
  return <MessageSquare className="w-3.5 h-3.5" />;
}

function tempBadgeClass(temp: string) {
  switch (temp?.toLowerCase()) {
    case 'hot': return 'badge-hot';
    case 'warm': return 'badge-warm';
    case 'cold': return 'badge-cold';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatNaira(n?: number) {
  if (!n) return '—';
  return '₦' + n.toLocaleString();
}

// ── Components ──

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearchChange,
}: {
  conversations: ConversationListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c =>
      (c.lead_name ?? '').toLowerCase().includes(q) || (c.lead_email ?? '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <h2 className="text-lg font-bold text-foreground">Conversations</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">No conversations found</p>
        )}
        {filtered.map(c => (
          <button
            key={c.lead_id}
            onClick={() => onSelect(c.lead_id)}
            className={cn(
              'w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50',
              selectedId === c.lead_id && 'bg-primary/5 border-l-2 border-l-primary'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {(c.lead_name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">{c.lead_name ?? 'Unknown Lead'}</span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', tempBadgeClass(c.lead_temperature))}>
                      {c.lead_temperature?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{relativeTime(c.last_message_time)}</span>
                <span className="text-muted-foreground">{channelIcon(c.last_channel)}</span>
              </div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}

function MessageThread({ leadId, onBack }: { leadId: number; onBack: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery<ThreadData>({
    queryKey: ['conversation-thread', leadId],
    queryFn: () => api.getConversationThread(leadId),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading messages…
    </div>
  );
  if (isError || !data) return (
    <div className="flex items-center justify-center h-full text-muted-foreground">⚠️ Could not load thread.</div>
  );

  const { lead, messages } = data;

  // Group messages by date
  const grouped: { label: string; msgs: ThreadMessage[] }[] = [];
  messages.forEach(msg => {
    const dl = dateLabel(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (last?.label === dl) last.msgs.push(msg);
    else grouped.push({ label: dl, msgs: [msg] });
  });

  const isInbound = (m: ThreadMessage) => m.sender === 'lead' || m.type?.includes('inbound');
  const isEmail = (m: ThreadMessage) => m.type?.includes('email');

  return (
    <div className="flex flex-col h-full">
      {/* Lead info header */}
      <div className="p-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {(lead.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground truncate">{lead.name ?? 'Unknown Lead'}</h3>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', tempBadgeClass(lead.temperature))}>
                {lead.temperature?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
          </div>
        </div>
        {/* Quick stats */}
        <div className="flex gap-4 mt-3 text-xs">
          {lead.budget_max && (
            <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium text-foreground">{formatNaira(lead.budget_max)}</span></div>
          )}
          {lead.bedrooms && (
            <div><span className="text-muted-foreground">Beds:</span> <span className="font-medium text-foreground">{lead.bedrooms}BR</span></div>
          )}
          {lead.timeline && (
            <div><span className="text-muted-foreground">Timeline:</span> <span className="font-medium text-foreground">{lead.timeline}</span></div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {grouped.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium px-2">{group.label}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {group.msgs.map((msg, mi) => {
                const inbound = isInbound(msg);
                const email = isEmail(msg);
                return (
                  <div key={mi} className={cn('flex mb-3', inbound ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[85%] sm:max-w-[70%]')}>
                      {/* Meta line */}
                      <div className={cn('flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground', !inbound && 'justify-end')}>
                        {channelIcon(msg.type)}
                        <span className="font-medium">
                          {email ? 'EMAIL' : 'CHAT'} · {inbound ? 'Lead' : 'AI'}
                        </span>
                        <span>· {formatTime(msg.timestamp)}</span>
                      </div>
                      {/* Bubble */}
                      <div className={cn(
                        'rounded-xl px-4 py-3 text-sm',
                        inbound
                          ? 'bg-muted text-foreground rounded-tl-sm'
                          : 'bg-primary text-primary-foreground rounded-tr-sm'
                      )}>
                        {msg.subject && (
                          <p className={cn('text-xs font-semibold mb-1.5', inbound ? 'text-foreground' : 'text-primary-foreground/90')}>
                            Subject: {msg.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      {/* Sender icon */}
                      <div className={cn('flex mt-1', inbound ? 'justify-start' : 'justify-end')}>
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center',
                          inbound ? 'bg-muted' : 'bg-primary/20'
                        )}>
                          {inbound
                            ? <User className="w-3 h-3 text-muted-foreground" />
                            : <Bot className="w-3 h-3 text-primary" />
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──
export default function Conversations() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery<ConversationListItem[]>({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    refetchInterval: 30000,
  });

  const conversations = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return [...list]
      .filter(c => c != null)
      .sort((a, b) => new Date(b.last_message_time ?? 0).getTime() - new Date(a.last_message_time ?? 0).getTime());
  }, [data]);

  // On mobile, show either list or thread
  const showThread = selectedId !== null;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-7xl">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
        <p className="text-muted-foreground text-sm">{conversations.length} conversations</p>
      </div>

      <div className="flex-1 min-h-0 glass-card rounded-xl overflow-hidden flex">
        {/* Left panel */}
        <div className={cn(
          'w-full lg:w-[360px] lg:border-r lg:border-border shrink-0 flex flex-col',
          showThread && 'hidden lg:flex'
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">⚠️ Could not load conversations.</div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              search={search}
              onSearchChange={setSearch}
            />
          )}
        </div>

        {/* Right panel */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          !showThread && 'hidden lg:flex'
        )}>
          {selectedId ? (
            <MessageThread leadId={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-30" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

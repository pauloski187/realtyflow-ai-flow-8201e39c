import { useState } from 'react';
import { formatNaira, stageLabels, type PipelineStage } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Search, GripVertical, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, type Lead } from '@/lib/api';

const stages: PipelineStage[] = ['new', 'contacted', 'viewing_scheduled', 'viewed', 'negotiation', 'closed'];

const stageHeaderColors: Record<PipelineStage, string> = {
  new: 'bg-primary',
  contacted: 'bg-cold',
  viewing_scheduled: 'bg-warning',
  viewed: 'bg-accent',
  negotiation: 'bg-warm',
  closed: 'bg-success',
};

const StatusDot = ({ status }: { status: string }) => {
  const emojis: Record<string, string> = { hot: '🔥', warm: '☀️', cold: '❄️' };
  return <span className="text-xs">{emojis[status] ?? '❄️'}</span>;
};

export default function Pipeline() {
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, PipelineStage>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
  });

  const apiLeads = data?.leads ?? [];
  
  // Apply local drag overrides on top of API data
  const leads = apiLeads.map(l => localOverrides[l.id] ? { ...l, stage: localOverrides[l.id] } : l);

  const filtered = leads.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  const getStageLeads = (stage: PipelineStage) => filtered.filter(l => l.stage === stage);
  const getStageValue = (stage: PipelineStage) => getStageLeads(stage).reduce((sum, l) => sum + l.budget, 0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    if (!draggedId) return;
    setLocalOverrides(prev => ({ ...prev, [draggedId]: stage }));
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (isLoading && apiLeads.length === 0) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading pipeline...</div>;
  if (isError && apiLeads.length === 0) return <div className="flex items-center justify-center py-20 text-muted-foreground">⚠️ Could not load pipeline data.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-muted-foreground text-sm">Drag leads between stages to update their status.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {stages.map(stage => {
          const stageLeads = getStageLeads(stage);
          return (
            <div
              key={stage}
              className="kanban-column min-w-[260px] flex-1"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, stage)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full', stageHeaderColors[stage])} />
                  <h3 className="text-sm font-semibold text-foreground">{stageLabels[stage]}</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{stageLeads.length}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{formatNaira(getStageValue(stage))} total</p>

              <div className="space-y-2 flex-1">
                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={e => handleDragStart(e, lead.id)}
                    className={cn('kanban-card', draggedId === lead.id && 'opacity-50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.propertyInterest}</p>
                        </div>
                      </div>
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <span className="text-xs font-medium text-foreground">{formatNaira(lead.budget)}</span>
                      <StatusDot status={lead.status} />
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground">No leads in this stage</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

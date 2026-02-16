import { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw, Share2, Sparkles, CheckCircle, Search, BarChart3, CalendarDays, Mail, Database, Zap, Clock, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface ChatMessage {
  sender: 'lead' | 'ai';
  text: string;
}

interface BehindStep {
  icon: typeof CheckCircle;
  text: string;
  delay: number;
}

const scenarios: Record<string, { title: string; lead: string; aiResponse: string; steps: BehindStep[] }> = {
  booking: {
    title: 'Booking Request',
    lead: "I'm interested in 3BR apartments in Lekki under ₦5M. Can I schedule a viewing for this Saturday at 2 PM?",
    aiResponse: "",
    steps: [
      { icon: CheckCircle, text: '✅ Lead detected and classified', delay: 500 },
      { icon: Search, text: '🔍 Extracting: Budget, Timeline, Location', delay: 1200 },
      { icon: BarChart3, text: '📊 Scoring lead...', delay: 2000 },
      { icon: CalendarDays, text: '📅 Checking calendar availability...', delay: 2800 },
      { icon: Mail, text: '📧 Generating response...', delay: 3400 },
      { icon: Database, text: '💾 Saving to CRM', delay: 4000 },
    ],
  },
  question: {
    title: 'Property Question',
    lead: "What's your commission rate? And is the Ikoyi property still available?",
    aiResponse: "",
    steps: [
      { icon: CheckCircle, text: '✅ Inquiry detected — Q&A type', delay: 500 },
      { icon: Search, text: '🔍 Matching against FAQ database...', delay: 1200 },
      { icon: Database, text: '💾 Checking property availability...', delay: 2000 },
      { icon: Mail, text: '📧 Personalized response generated', delay: 2800 },
    ],
  },
  objection: {
    title: 'Price Objection',
    lead: "₦5M is too expensive for a 3BR in Lekki. Do you have anything cheaper?",
    aiResponse: "",
    steps: [
      { icon: CheckCircle, text: '✅ Objection detected — Price concern', delay: 500 },
      { icon: Search, text: '🔍 Searching lower-budget alternatives...', delay: 1200 },
      { icon: Database, text: '💾 Found matching properties', delay: 2000 },
      { icon: Sparkles, text: '✨ Crafting persuasive response...', delay: 2800 },
    ],
  },
  followup: {
    title: 'Follow-up Sequence',
    lead: "I viewed the property last week but haven't decided yet.",
    aiResponse: "",
    steps: [
      { icon: CheckCircle, text: '✅ Follow-up scenario detected', delay: 500 },
      { icon: Database, text: '💾 Pulling viewing history...', delay: 1200 },
      { icon: BarChart3, text: '📊 Analyzing market data...', delay: 2000 },
      { icon: Sparkles, text: '✨ Generating persuasive follow-up...', delay: 2800 },
    ],
  },
};

const exampleMessages = [
  "I'm looking for a 3-bedroom house in Austin, Texas. My budget is $500,000.",
  "Can I schedule a viewing for this Saturday at 2 PM?",
  "What's your commission rate?",
  "Is the property still available?",
  "₦5M is too expensive, any cheaper options?",
];

function generateSessionId() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Demo() {
  const [activeTab, setActiveTab] = useState('booking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<number>(0);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState(generateSessionId);
  const chatRef = useRef<HTMLDivElement>(null);
  const stepsTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scenario = scenarios[activeTab];

  const resetDemo = () => {
    stepsTimers.current.forEach(clearTimeout);
    stepsTimers.current = [];
    setMessages([]);
    setSteps(0);
    setTyping(false);
    setStarted(false);
    setInput('');
    setSessionId(generateSessionId());
  };

  const sendToBackend = async (userMessage: string) => {
    setStarted(true);
    setMessages(prev => [...prev, { sender: 'lead', text: userMessage }]);

    // Animate behind-the-scenes steps
    scenario.steps.forEach((step, i) => {
      const t = setTimeout(() => setSteps(i + 1), step.delay);
      stepsTimers.current.push(t);
    });

    // Show typing after steps finish
    const lastDelay = scenario.steps.length > 0 ? scenario.steps[scenario.steps.length - 1].delay + 500 : 500;
    const t = setTimeout(() => setTyping(true), lastDelay);
    stepsTimers.current.push(t);

    try {
      const data = await api.postChat(userMessage, sessionId);
      setTyping(false);
      // Make sure all steps are shown
      setSteps(scenario.steps.length);
      setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
    } catch (err) {
      setTyping(false);
      setSteps(scenario.steps.length);
      setMessages(prev => [...prev, { sender: 'ai', text: '⚠️ Could not reach the AI backend. Please check the connection and try again.' }]);
      toast({ title: 'Connection Error', description: 'Failed to reach the backend API.', variant: 'destructive' });
    }
  };

  const runScenario = (customMessage?: string) => {
    resetDemo();
    const msg = customMessage || scenario.lead;
    // Small delay so reset completes
    setTimeout(() => sendToBackend(msg), 50);
  };

  useEffect(() => {
    resetDemo();
  }, [activeTab]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    if (!started) {
      runScenario(msg);
    } else {
      sendToBackend(msg);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" /> Live Demo
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">See RealtyFlow AI in Action</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Experience how our AI handles real estate leads 24/7 — qualifying, booking, and nurturing automatically.</p>
      </div>

      {/* Scenario Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-xl mx-auto grid grid-cols-4">
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="question">Q&A</TabsTrigger>
          <TabsTrigger value="objection">Objection</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
        </TabsList>

        {Object.keys(scenarios).map(key => (
          <TabsContent key={key} value={key}>
            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* LEFT: Chat */}
              <div className="glass-card rounded-xl flex flex-col h-[520px]">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                   <span className="text-sm font-semibold text-foreground select-none">Lead Chat</span>
                  <span className="ml-auto text-[10px] text-muted-foreground select-none">Connected to AI Backend</span>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!started && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm mb-4">Click "Run Demo" or type a message to start</p>
                      <button onClick={() => runScenario()} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                        ▶ Run Demo
                      </button>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.sender === 'lead' ? 'justify-start' : 'justify-end')} style={{ animation: 'slideUp 0.3s ease-out' }}>
                      <div className={cn('max-w-[85%] rounded-2xl px-4 py-3', msg.sender === 'lead' ? 'bg-muted text-foreground rounded-bl-md' : 'bg-primary text-primary-foreground rounded-br-md')}>
                        <p className="text-sm whitespace-pre-line">{msg.text}</p>
                        <p className={cn('text-[10px] mt-1.5 select-none', msg.sender === 'lead' ? 'text-muted-foreground' : 'text-primary-foreground/60')}>
                          {msg.sender === 'lead' ? '👤 Lead' : '🤖 RealtyFlow AI'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {typing && (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse-dot" />
                          <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Try it yourself..."
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                    />
                    <button onClick={handleSend} disabled={typing} className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 shrink-0 disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exampleMessages.slice(0, 3).map((msg, i) => (
                      <button key={i} onClick={() => { setInput(msg); }} className="text-[11px] px-2 py-1 rounded-md bg-muted/70 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]">
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Behind the Scenes */}
              <div className="glass-card rounded-xl flex flex-col h-[520px]">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground select-none">⚡ Behind the Scenes</span>
                  <div className="flex gap-2">
                    <button onClick={resetDemo} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><RotateCcw className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied!' }); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Share2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {!started ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Start the demo to see AI processing in real-time</div>
                  ) : (
                    <div className="space-y-3">
                      {scenario.steps.slice(0, steps).map((step, i) => (
                        <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                            <step.icon className="w-3.5 h-3.5 text-success" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground select-none">{step.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{((step.delay / 1000) + 0.2).toFixed(1)}s</p>
                          </div>
                        </div>
                      ))}
                      {steps > 0 && steps < scenario.steps.length && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          <span className="text-xs">Processing...</span>
                        </div>
                      )}
                      {typing && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          <span className="text-xs">AI is composing response...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Response Time', value: '<5 seconds' },
          { icon: Clock, label: 'Availability', value: '24/7/365' },
          { icon: TrendingUp, label: 'More Conversions', value: '+40%' },
          { icon: Users, label: 'Hours Saved', value: '15/week' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-5 text-center">
            <s.icon className="w-6 h-6 text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="glass-card rounded-xl p-8 text-center gradient-blue text-primary-foreground">
        <h2 className="text-2xl font-bold mb-2">Ready to Never Miss a Lead Again?</h2>
        <p className="opacity-80 mb-6 max-w-lg mx-auto">Join hundreds of real estate agents who close more deals with AI-powered lead management.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <input placeholder="Enter your email" className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 w-64 focus:outline-none focus:ring-2 focus:ring-white/30" />
          <button className="px-6 py-2.5 rounded-lg gradient-gold text-accent-foreground font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}

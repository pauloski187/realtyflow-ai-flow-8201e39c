import { useState } from 'react';
import { Save, Bot, Calendar, Mail, Bell, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const [autoReply, setAutoReply] = useState(true);
  const [classifyLeads, setClassifyLeads] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const save = () => toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your RealtyFlow AI preferences.</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="ai"><Bot className="w-4 h-4 mr-1.5 hidden sm:inline" />AI</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="w-4 h-4 mr-1.5 hidden sm:inline" />Calendar</TabsTrigger>
          <TabsTrigger value="email"><Mail className="w-4 h-4 mr-1.5 hidden sm:inline" />Email</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1.5 hidden sm:inline" />Alerts</TabsTrigger>
          <TabsTrigger value="demo"><PlayCircle className="w-4 h-4 mr-1.5 hidden sm:inline" />Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4 space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h3 className="font-semibold text-foreground">AI Response Settings</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Auto-reply to leads</p><p className="text-xs text-muted-foreground">AI will automatically respond to new inquiries</p></div>
              <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Auto-classify leads</p><p className="text-xs text-muted-foreground">Automatically score and categorize incoming leads</p></div>
              <Switch checked={classifyLeads} onCheckedChange={setClassifyLeads} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Response Tone</label>
              <select className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none">
                <option>Professional & Friendly</option>
                <option>Formal</option>
                <option>Casual</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Max Response Time</label>
              <select className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none">
                <option>Under 5 seconds</option>
                <option>Under 30 seconds</option>
                <option>Under 1 minute</option>
              </select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Calendar Integration</h3>
            <div>
              <label className="text-sm font-medium text-foreground">Cal.com Link</label>
              <input defaultValue="https://cal.com/realtyflow" className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Default Meeting Duration</label>
              <select className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none">
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Working Hours</label>
              <div className="flex gap-2 mt-1">
                <input type="time" defaultValue="09:00" className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground" />
                <span className="text-muted-foreground self-center">to</span>
                <input type="time" defaultValue="18:00" className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground" />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Email Settings</h3>
            <div>
              <label className="text-sm font-medium text-foreground">Reply-to Email</label>
              <input type="email" defaultValue="hello@realtyflow.ai" className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email Signature</label>
              <textarea defaultValue="Best regards,\nRealtyFlow AI Team" className="mt-1 w-full h-20 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none resize-none" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h3 className="font-semibold text-foreground">Notification Preferences</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Email notifications</p><p className="text-xs text-muted-foreground">Receive email alerts for new leads</p></div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">SMS notifications</p><p className="text-xs text-muted-foreground">Receive SMS for hot leads only</p></div>
              <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="demo" className="mt-4">
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h3 className="font-semibold text-foreground">Demo Mode Settings</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Enable demo mode</p><p className="text-xs text-muted-foreground">Show demo section to visitors</p></div>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Demo Property Examples</label>
              <textarea defaultValue="3BR Lekki Phase 1 - ₦5M\n4BR Ikoyi Duplex - ₦15M\n2BR VI Studio - ₦3.5M" className="mt-1 w-full h-24 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none resize-none" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}

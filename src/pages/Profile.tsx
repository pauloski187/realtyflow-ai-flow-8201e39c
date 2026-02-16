import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  User, Mail, Phone, Briefcase, Globe, Camera, Loader2, CheckCircle2, AlertCircle,
  Linkedin, Instagram, Twitter, Facebook, Shield, Bell, Bot, Save, Trash2
} from 'lucide-react';

// ── Types ──
interface ProfileData {
  id?: number;
  full_name: string;
  title: string;
  license_number: string;
  agency_name: string;
  photo_url: string;
  email: string;
  phone: string;
  office_phone: string;
  whatsapp: string;
  bio: string;
  linkedin_url: string;
  instagram_url: string;
  twitter_url: string;
  facebook_url: string;
  ai_settings: {
    response_style: string;
    include_photo: boolean;
    include_social: boolean;
    include_license: boolean;
    response_timing: string;
  };
  notification_settings: {
    hot_leads: boolean;
    appointments: boolean;
    any_inquiry: boolean;
    ai_failure: boolean;
    daily_summary: boolean;
    summary_time: string;
  };
}

const defaultProfile: ProfileData = {
  full_name: '', title: '', license_number: '', agency_name: '', photo_url: '',
  email: '', phone: '', office_phone: '', whatsapp: '', bio: '',
  linkedin_url: '', instagram_url: '', twitter_url: '', facebook_url: '',
  ai_settings: { response_style: 'friendly', include_photo: true, include_social: true, include_license: false, response_timing: 'immediate' },
  notification_settings: { hot_leads: true, appointments: true, any_inquiry: false, ai_failure: true, daily_summary: true, summary_time: '18:00' },
};

// ── Helpers ──
const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidUrl = (v: string) => !v || /^https?:\/\/.+/.test(v);

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [form, setForm] = useState<ProfileData>(defaultProfile);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('personal');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        ...defaultProfile,
        ...profile,
        ai_settings: { ...defaultProfile.ai_settings, ...(profile.ai_settings ?? {}) },
        notification_settings: { ...defaultProfile.notification_settings, ...(profile.notification_settings ?? {}) },
      });
    }
  }, [profile]);

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const { ai_settings, notification_settings, ...personal } = data;
      await Promise.all([
        api.updateProfile(personal),
        api.updateAiSettings(ai_settings),
        api.updateNotificationSettings(notification_settings),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setDirty(false);
      setLastSaved(new Date());
      toast({ title: 'Profile updated successfully', description: 'Your changes have been saved.' });
    },
    onError: () => {
      toast({ title: 'Failed to save', description: 'Please try again.', variant: 'destructive' });
    },
  });

  const photoMutation = useMutation({
    mutationFn: (base64: string) => api.uploadProfilePhoto(base64),
    onSuccess: (data) => {
      updateField('photo_url', data.photo_url);
      toast({ title: 'Photo uploaded' });
    },
    onError: () => toast({ title: 'Photo upload failed', variant: 'destructive' }),
  });

  // ── Handlers ──
  const validate = useCallback((d: ProfileData) => {
    const e: Record<string, string> = {};
    if (!d.full_name.trim()) e.full_name = 'Name is required';
    if (!isValidEmail(d.email)) e.email = 'Invalid email';
    if (d.linkedin_url && !isValidUrl(d.linkedin_url)) e.linkedin_url = 'Invalid URL';
    if (d.instagram_url && !isValidUrl(d.instagram_url)) e.instagram_url = 'Invalid URL';
    if (d.twitter_url && !isValidUrl(d.twitter_url)) e.twitter_url = 'Invalid URL';
    if (d.facebook_url && !isValidUrl(d.facebook_url)) e.facebook_url = 'Invalid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, []);

  const updateField = useCallback((key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      setDirty(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (validate(next)) saveMutation.mutate(next);
      }, 1000);
      return next;
    });
  }, [validate, saveMutation]);

  const updateAi = useCallback((key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, ai_settings: { ...prev.ai_settings, [key]: value } };
      setDirty(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (validate(next)) saveMutation.mutate(next);
      }, 1000);
      return next;
    });
  }, [validate, saveMutation]);

  const updateNotif = useCallback((key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, notification_settings: { ...prev.notification_settings, [key]: value } };
      setDirty(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (validate(next)) saveMutation.mutate(next);
      }, 1000);
      return next;
    });
  }, [validate, saveMutation]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateField('photo_url', base64); // instant preview
      photoMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  // ── Tabs ──
  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'social', label: 'Social', icon: Globe },
    { id: 'bio', label: 'Bio', icon: Briefcase },
    { id: 'ai', label: 'AI Settings', icon: Bot },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (form.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal info, AI preferences, and notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-warning font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
            </span>
          )}
          {lastSaved && !dirty && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === t.id
                ? 'bg-card text-primary border border-border border-b-transparent -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">

        {/* ── PERSONAL ── */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Information</h2>

            {/* Photo */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-6 h-6 text-primary-foreground" />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Profile Photo</p>
                <p>JPG, PNG or WebP. Max 2MB.</p>
                {photoMutation.isPending && <p className="text-primary mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</p>}
                {form.photo_url && (
                  <button
                    onClick={() => {
                      updateField('photo_url', '');
                      toast({ title: 'Photo removed' });
                    }}
                    className="mt-2 flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Full Name *" error={errors.full_name}>
                <Input value={form.full_name} onChange={e => updateField('full_name', e.target.value)} placeholder="John Doe" />
              </FieldGroup>
              <FieldGroup label="Title">
                <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Real Estate Agent" />
              </FieldGroup>
              <FieldGroup label="License Number">
                <Input value={form.license_number} onChange={e => updateField('license_number', e.target.value)} placeholder="RES-12345-NG" />
              </FieldGroup>
              <FieldGroup label="Agency Name">
                <Input value={form.agency_name} onChange={e => updateField('agency_name', e.target.value)} placeholder="Your Agency" />
              </FieldGroup>
            </div>
          </div>
        )}

        {/* ── CONTACT ── */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Email" error={errors.email}>
                <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="you@example.com" />
              </FieldGroup>
              <FieldGroup label="Phone">
                <Input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0803-XXX-XXXX" />
              </FieldGroup>
              <FieldGroup label="Office Phone">
                <Input type="tel" value={form.office_phone} onChange={e => updateField('office_phone', e.target.value)} placeholder="01-XXX-XXXX" />
              </FieldGroup>
              <FieldGroup label="WhatsApp">
                <Input type="tel" value={form.whatsapp} onChange={e => updateField('whatsapp', e.target.value)} placeholder="0803-XXX-XXXX" />
              </FieldGroup>
            </div>
          </div>
        )}

        {/* ── SOCIAL ── */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Social Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="LinkedIn" icon={<Linkedin className="w-4 h-4 text-muted-foreground" />} error={errors.linkedin_url}>
                <Input value={form.linkedin_url} onChange={e => updateField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/you" />
              </FieldGroup>
              <FieldGroup label="Instagram" icon={<Instagram className="w-4 h-4 text-muted-foreground" />} error={errors.instagram_url}>
                <Input value={form.instagram_url} onChange={e => updateField('instagram_url', e.target.value)} placeholder="https://instagram.com/you" />
              </FieldGroup>
              <FieldGroup label="Twitter / X" icon={<Twitter className="w-4 h-4 text-muted-foreground" />} error={errors.twitter_url}>
                <Input value={form.twitter_url} onChange={e => updateField('twitter_url', e.target.value)} placeholder="https://x.com/you" />
              </FieldGroup>
              <FieldGroup label="Facebook" icon={<Facebook className="w-4 h-4 text-muted-foreground" />} error={errors.facebook_url}>
                <Input value={form.facebook_url} onChange={e => updateField('facebook_url', e.target.value)} placeholder="https://facebook.com/you" />
              </FieldGroup>
            </div>
          </div>
        )}

        {/* ── BIO ── */}
        {activeTab === 'bio' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Professional Bio</h2>
            <div className="space-y-2">
              <Label>Bio (max 500 characters)</Label>
              <Textarea
                value={form.bio}
                onChange={e => { if (e.target.value.length <= 500) updateField('bio', e.target.value); }}
                placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                rows={6}
              />
              <p className={cn('text-xs text-right', form.bio.length > 450 ? 'text-warning' : 'text-muted-foreground')}>
                {500 - form.bio.length} characters remaining
              </p>
            </div>
            {form.bio && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Email Preview</Label>
                <div className="bg-muted/50 rounded-lg p-4 border border-border text-sm text-foreground whitespace-pre-wrap">
                  {form.bio}
                  {form.full_name && <p className="mt-3 font-semibold">— {form.full_name}{form.title ? `, ${form.title}` : ''}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI SETTINGS ── */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> AI Settings</h2>

            {/* Response style */}
            <div className="space-y-3">
              <Label className="font-medium">Response Style</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'professional', label: 'Professional & Formal', desc: 'Corporate tone, detailed responses' },
                  { value: 'friendly', label: 'Friendly & Conversational', desc: 'Warm and approachable' },
                  { value: 'brief', label: 'Brief & Direct', desc: 'Short, to-the-point replies' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateAi('response_style', opt.value)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      form.ai_settings.response_style === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Signature */}
            <div className="space-y-3">
              <Label className="font-medium">Email Signature Options</Label>
              <div className="space-y-3">
                {[
                  { key: 'include_photo', label: 'Include my photo in emails' },
                  { key: 'include_social', label: 'Include social links' },
                  { key: 'include_license', label: 'Include license number' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Switch
                      checked={form.ai_settings[item.key as keyof typeof form.ai_settings] as boolean}
                      onCheckedChange={v => updateAi(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Response timing */}
            <div className="space-y-3">
              <Label className="font-medium">Response Timing</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'immediate', label: 'Immediate', desc: 'Within 60 seconds' },
                  { value: 'business_hours', label: 'Business Hours Only', desc: '9am – 6pm' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateAi('response_timing', opt.value)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      form.ai_settings.response_timing === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Preferences</h2>

            <div className="space-y-1">
              <Label className="font-medium">Email me when:</Label>
              <div className="space-y-3 mt-3">
                {[
                  { key: 'hot_leads', label: 'New hot lead arrives' },
                  { key: 'appointments', label: 'Appointment is booked' },
                  { key: 'any_inquiry', label: 'Any new inquiry' },
                  { key: 'ai_failure', label: 'AI fails to respond' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Switch
                      checked={form.notification_settings[item.key as keyof typeof form.notification_settings] as boolean}
                      onCheckedChange={v => updateNotif(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="font-medium">Daily Summary</Label>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">Send daily lead report</span>
                <Switch
                  checked={form.notification_settings.daily_summary}
                  onCheckedChange={v => updateNotif('daily_summary', v)}
                />
              </div>
              {form.notification_settings.daily_summary && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Send at:</Label>
                  <Select value={form.notification_settings.summary_time} onValueChange={v => updateNotif('summary_time', v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['06:00', '08:00', '12:00', '15:00', '18:00', '20:00'].map(t => (
                        <SelectItem key={t} value={t}>{t.replace(':00', ':00 ' + (parseInt(t) < 12 ? 'AM' : 'PM'))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reusable field wrapper ──
function FieldGroup({ label, error, icon, children }: { label: string; error?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

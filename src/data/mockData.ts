export type LeadStatus = 'hot' | 'warm' | 'cold';
export type LeadSource = 'Gmail' | 'Website' | 'WhatsApp';
export type PipelineStage = 'new' | 'contacted' | 'viewing_scheduled' | 'viewed' | 'negotiation' | 'closed';
export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  timeline: string;
  budget: number;
  location: string;
  createdAt: string;
  score: number;
  stage: PipelineStage;
  propertyInterest: string;
  bedrooms: number;
  notes: string;
  conversations: { sender: 'lead' | 'ai' | 'agent'; message: string; timestamp: string }[];
}

export interface Appointment {
  id: string;
  leadName: string;
  propertyAddress: string;
  dateTime: string;
  status: AppointmentStatus;
  reminder24h: boolean;
  reminder1h: boolean;
  notes: string;
}

export interface Activity {
  id: string;
  leadName: string;
  action: string;
  source: LeadSource;
  status: LeadStatus;
  timeAgo: string;
}

const names = ['Adebayo Ogundimu', 'Chioma Nwosu', 'John Doe', 'Sarah Chen', 'Fatima Al-Hassan', 'Michael Obi', 'Grace Adeyemi', 'David Okoro', 'Amara Eze', 'Yusuf Bello', 'Ngozi Ike', 'Emeka Okafor', 'Aisha Musa', 'Peter Olumide', 'Blessing Uche'];

const locations = ['Lekki Phase 1', 'Victoria Island', 'Ikoyi', 'Banana Island', 'Ajah', 'Ikeja GRA', 'Magodo', 'Gbagada'];

const properties = ['3BR Apartment Lekki', '4BR Duplex VI', '2BR Flat Ikoyi', '5BR Mansion Banana Island', '3BR Penthouse Ajah', '2BR Studio Ikeja', '4BR Terrace Magodo', '3BR Bungalow Gbagada'];

export const mockLeads: Lead[] = names.map((name, i) => ({
  id: `lead-${i + 1}`,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
  phone: `+234 ${800 + i} ${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
  source: (['Gmail', 'Website', 'WhatsApp'] as LeadSource[])[i % 3],
  status: (['hot', 'warm', 'cold'] as LeadStatus[])[i % 3],
  timeline: ['ASAP', '1 month', '3 months', '6 months', 'Flexible'][i % 5],
  budget: [5000000, 15000000, 25000000, 50000000, 80000000, 120000000][i % 6],
  location: locations[i % locations.length],
  createdAt: new Date(Date.now() - (i * 86400000 + Math.random() * 86400000)).toISOString(),
  score: Math.floor(Math.random() * 40) + 60,
  stage: (['new', 'contacted', 'viewing_scheduled', 'viewed', 'negotiation', 'closed'] as PipelineStage[])[i % 6],
  propertyInterest: properties[i % properties.length],
  bedrooms: [2, 3, 4, 5][i % 4],
  notes: i % 2 === 0 ? 'Very interested, follow up soon.' : '',
  conversations: [
    { sender: 'lead', message: `Hi, I'm interested in ${properties[i % properties.length]}. What's the price?`, timestamp: new Date(Date.now() - 7200000).toISOString() },
    { sender: 'ai', message: `Hello ${name.split(' ')[0]}! Thank you for your interest. The property is listed at ₦${([5, 15, 25, 50, 80, 120][i % 6])}M. Would you like to schedule a viewing?`, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { sender: 'lead', message: 'Yes, can I see it this weekend?', timestamp: new Date(Date.now() - 1800000).toISOString() },
  ],
}));

export const mockAppointments: Appointment[] = [
  { id: 'apt-1', leadName: 'Adebayo Ogundimu', propertyAddress: '15 Admiralty Way, Lekki Phase 1', dateTime: new Date(Date.now() + 3600000).toISOString(), status: 'confirmed', reminder24h: true, reminder1h: false, notes: '' },
  { id: 'apt-2', leadName: 'Chioma Nwosu', propertyAddress: '8 Bourdillon Road, Ikoyi', dateTime: new Date(Date.now() + 86400000).toISOString(), status: 'pending', reminder24h: true, reminder1h: false, notes: 'Client prefers afternoon' },
  { id: 'apt-3', leadName: 'Sarah Chen', propertyAddress: '22 Adeola Odeku, VI', dateTime: new Date(Date.now() + 172800000).toISOString(), status: 'confirmed', reminder24h: false, reminder1h: false, notes: '' },
  { id: 'apt-4', leadName: 'John Doe', propertyAddress: '5 Banana Island Road', dateTime: new Date(Date.now() - 86400000).toISOString(), status: 'completed', reminder24h: true, reminder1h: true, notes: 'Client loved the property' },
  { id: 'apt-5', leadName: 'Michael Obi', propertyAddress: '12 Allen Avenue, Ikeja', dateTime: new Date(Date.now() - 172800000).toISOString(), status: 'cancelled', reminder24h: true, reminder1h: false, notes: 'Rescheduled to next week' },
  { id: 'apt-6', leadName: 'Fatima Al-Hassan', propertyAddress: '3 Ozumba Mbadiwe, VI', dateTime: new Date(Date.now() + 259200000).toISOString(), status: 'pending', reminder24h: false, reminder1h: false, notes: '' },
  { id: 'apt-7', leadName: 'Grace Adeyemi', propertyAddress: '7 Glover Road, Ikoyi', dateTime: new Date(Date.now() + 345600000).toISOString(), status: 'confirmed', reminder24h: false, reminder1h: false, notes: '' },
];

export const mockActivities: Activity[] = [
  { id: 'act-1', leadName: 'Adebayo Ogundimu', action: 'requested a viewing', source: 'Gmail', status: 'hot', timeAgo: '5 minutes ago' },
  { id: 'act-2', leadName: 'Chioma Nwosu', action: 'asked about pricing', source: 'WhatsApp', status: 'warm', timeAgo: '12 minutes ago' },
  { id: 'act-3', leadName: 'John Doe', action: 'submitted inquiry form', source: 'Website', status: 'hot', timeAgo: '25 minutes ago' },
  { id: 'act-4', leadName: 'Sarah Chen', action: 'opened email', source: 'Gmail', status: 'warm', timeAgo: '1 hour ago' },
  { id: 'act-5', leadName: 'Michael Obi', action: 'requested callback', source: 'WhatsApp', status: 'cold', timeAgo: '2 hours ago' },
  { id: 'act-6', leadName: 'Fatima Al-Hassan', action: 'booked appointment', source: 'Website', status: 'hot', timeAgo: '3 hours ago' },
  { id: 'act-7', leadName: 'Grace Adeyemi', action: 'asked about location', source: 'Gmail', status: 'warm', timeAgo: '4 hours ago' },
  { id: 'act-8', leadName: 'David Okoro', action: 'viewed property listing', source: 'Website', status: 'cold', timeAgo: '5 hours ago' },
  { id: 'act-9', leadName: 'Amara Eze', action: 'replied to follow-up', source: 'Gmail', status: 'hot', timeAgo: '6 hours ago' },
  { id: 'act-10', leadName: 'Yusuf Bello', action: 'filled budget form', source: 'WhatsApp', status: 'warm', timeAgo: '8 hours ago' },
];

export const formatNaira = (amount: number) => {
  if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(0)}M`;
  if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
  return `₦${amount}`;
};

export const stageLabels: Record<PipelineStage, string> = {
  new: 'New Leads',
  contacted: 'Contacted',
  viewing_scheduled: 'Viewing Scheduled',
  viewed: 'Viewed',
  negotiation: 'Negotiation',
  closed: 'Closed',
};

export const stageColors: Record<PipelineStage, string> = {
  new: 'bg-primary',
  contacted: 'bg-cold',
  viewing_scheduled: 'bg-warning',
  viewed: 'bg-accent',
  negotiation: 'bg-warm',
  closed: 'bg-success',
};

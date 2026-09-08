'use client'

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { ShieldAlert, MapPin, Phone, Mail, User, Building2, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';

const STATES = [
  { id: 'MH', name: 'Maharashtra' },
  { id: 'KL', name: 'Kerala' },
  { id: 'OR', name: 'Odisha' },
  { id: 'GJ', name: 'Gujarat' },
  { id: 'AS', name: 'Assam' },
  { id: 'UT', name: 'Uttarakhand' },
  { id: 'HP', name: 'Himachal Pradesh' },
  { id: 'WB', name: 'West Bengal' },
  { id: 'AP', name: 'Andhra Pradesh' },
  { id: 'TS', name: 'Telangana' },
  { id: 'TN', name: 'Tamil Nadu' },
  { id: 'KA', name: 'Karnataka' },
  { id: 'BR', name: 'Bihar' },
  { id: 'MP', name: 'Madhya Pradesh' },
  { id: 'RJ', name: 'Rajasthan' },
  { id: 'UP', name: 'Uttar Pradesh' },
  { id: 'JK', name: 'Jammu & Kashmir' },
  { id: 'UK', name: 'Uttarakhand' },
  { id: 'PB', name: 'Punjab' },
  { id: 'HR', name: 'Haryana' },
];

const DISTRICTS_BY_STATE: Record<string, string[]> = {
  MH: ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Kolhapur', 'Satara', 'Raigad', 'Thane', 'Sangli'],
  KL: ['Wayanad', 'Ernakulam', 'Idukki', 'Kozhikode', 'Thrissur', 'Palakkad', 'Malappuram'],
  OR: ['Puri', 'Cuttack', 'Bhubaneswar', 'Balasore', 'Ganjam', 'Mayurbhanj'],
  GJ: ['Valsad', 'Surat', 'Vadodara', 'Ahmedabad', 'Rajkot', 'Junagarh'],
  AS: ['Cachar', 'Kamrup', 'Barpeta', 'Nagaon', 'Dibrugarh'],
  UT: ['Dehradun', 'Haridwar', 'Chamoli', 'Uttarkashi', 'Pithoragarh'],
  HP: ['Mandi', 'Kullu', 'Shimla', 'Kangra', 'Chamba'],
  WB: ['Darjeeling', 'Alipurduar', 'Jalpaiguri', 'Cooch Behar', 'Kolkata'],
  AP: ['Visakhapatnam', 'Krishna', 'East Godavari', 'West Godavari', 'Guntur'],
  TS: ['Hyderabad', 'Warangal', 'Khammam', 'Nizamabad', 'Adilabad'],
  TN: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  KA: ['Bengaluru Urban', 'Mysuru', 'Dakshina Kannada', 'Udupi', 'Kodagu'],
  BR: ['Patna', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'East Champaran'],
  MP: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
  RJ: ['Jaipur', 'Jodhpur', 'Udaipur', 'Bikaner', 'Kota'],
  UP: ['Lucknow', 'Kanpur', 'Varanasi', 'Allahabad', 'Agra'],
  JK: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kupwara'],
  PB: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali'],
  HR: ['Gurugram', 'Faridabad', 'Hisar', 'Rohtak', 'Ambala'],
  UK: ['Dehradun', 'Haridwar', 'Nainital', 'Almora', 'Champawat'],
};

const ROLES = [
  'District Collector / DM',
  'SP / Police Superintendent',
  'Chief Medical Officer',
  'District DM Officer',
  'Block Development Officer',
  'Municipal Commissioner',
  'State Emergency Operations',
  'NDRF / SDRF Officer',
  'Revenue & Relief Officer',
  'Other Govt. Official',
];

interface FormData {
  name: string;
  designation: string;
  role: string;
  state: string;
  district: string;
  phone: string;
  email: string;
  empId: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    designation: '',
    role: '',
    state: '',
    district: '',
    phone: '',
    email: '',
    empId: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const districts = form.state ? (DISTRICTS_BY_STATE[form.state] || []) : [];

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'state' ? { district: '' } : {}),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.state || !form.district || !form.phone || !form.email || !form.role) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');

    // Store in localStorage as mock backend
    const existing = JSON.parse(localStorage.getItem('hazardguard_officials') || '[]');
    const newEntry = {
      ...form,
      registeredAt: new Date().toISOString(),
      id: `off_${Date.now()}`,
    };
    localStorage.setItem('hazardguard_officials', JSON.stringify([...existing, newEntry]));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-graphite-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-graphite-900 border border-chartreuse/40 shadow-[0_0_30px_rgba(200,255,61,0.15)] p-8 space-y-6 font-mono text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-graphite-950 border-2 border-chartreuse flex items-center justify-center shadow-[0_0_20px_rgba(200,255,61,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-chartreuse" />
            </div>
            <h2 className="font-display font-bold text-xl text-chartreuse tracking-wider uppercase">
              Registration Confirmed
            </h2>
          </div>

          <div className="text-xs text-paper-dim space-y-2 text-left bg-graphite-950 border border-graphite-700 p-4">
            <div className="flex justify-between">
              <span className="text-smoke">Official:</span>
              <span className="text-paper font-bold">{form.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-smoke">District:</span>
              <span className="text-paper font-bold">{form.district}, {STATES.find(s => s.id === form.state)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-smoke">Alert Channel:</span>
              <span className="text-paper font-bold">{form.phone} · {form.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-smoke">Role:</span>
              <span className="text-paper font-bold">{form.role}</span>
            </div>
          </div>

          <div className="text-xs font-sans text-paper-dim leading-relaxed text-left">
            <p>
              Your district ({form.district}) has been registered for automated hazard alert dispatch.
              Whenever a <span className="text-signal-red font-bold">RED</span> or <span className="text-amber font-bold">ORANGE</span> alert
              is forecasted for your jurisdiction, HazardGuard will send an automated advisory to your registered contact details.
            </p>
          </div>

          <div className="px-3 py-2 bg-graphite-950 border border-graphite-700 text-[10px] font-mono text-smoke text-left">
            <span className="text-chartreuse font-bold">SYSTEM:</span> Alert pipeline activated for district perimeter.
            Monitoring 72-hour ensemble forecast cycle.
          </div>

          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', designation: '', role: '', state: '', district: '', phone: '', email: '', empId: '' }); }}
            className="w-full py-2.5 bg-graphite-800 hover:bg-graphite-700 border border-graphite-600 text-paper text-xs font-mono font-bold tracking-wider transition-all"
          >
            REGISTER ANOTHER OFFICIAL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-graphite-950 py-8 px-4 font-mono">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="p-5 bg-graphite-900 border border-graphite-700 shadow-2xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-graphite-950 border border-chartreuse/60 text-chartreuse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-paper tracking-wider uppercase">
                Official Registration
              </h1>
              <p className="text-[11px] text-smoke mt-0.5">
                NDMA / SDMA District Disaster Management Officer Portal
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-graphite-950 border border-amber/30 text-xs text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber" />
            <span className="font-sans leading-relaxed">
              Registering your contact here enables automated hazard alerts for your district when rainfall forecasts trigger
              <span className="text-signal-red font-bold"> RED </span> or
              <span className="text-amber font-bold"> ORANGE </span> alert thresholds.
              Only verified government officials should register.
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 bg-graphite-900 border border-graphite-700 shadow-xl space-y-5">

          {/* Personal Info */}
          <div>
            <h2 className="text-[10px] font-bold text-chartreuse uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> OFFICIAL IDENTITY
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">Full Name <span className="text-signal-red">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Eg. Amit Kumar Sharma"
                  className="w-full bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper placeholder-smoke focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">Employee / Badge ID</label>
                <input
                  type="text"
                  value={form.empId}
                  onChange={(e) => handleChange('empId', e.target.value)}
                  placeholder="Govt. Employee ID (Optional)"
                  className="w-full bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper placeholder-smoke focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">Designation</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="Eg. IAS, IPS, NDRF..."
                  className="w-full bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper placeholder-smoke focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">DM Role <span className="text-signal-red">*</span></label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-full appearance-none bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper focus:outline-none transition pr-8"
                  >
                    <option value="" className="bg-graphite-950 text-smoke">Select role...</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-graphite-950 text-paper">{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-smoke absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Jurisdiction */}
          <div>
            <h2 className="text-[10px] font-bold text-chartreuse uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> JURISDICTIONAL AREA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">State / UT <span className="text-signal-red">*</span></label>
                <div className="relative">
                  <select
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full appearance-none bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper focus:outline-none transition pr-8"
                  >
                    <option value="" className="bg-graphite-950 text-smoke">Select state...</option>
                    {STATES.map((s) => (
                      <option key={s.id} value={s.id} className="bg-graphite-950 text-paper">{s.name} ({s.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-smoke absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">District <span className="text-signal-red">*</span></label>
                <div className="relative">
                  <select
                    value={form.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    disabled={!form.state}
                    className="w-full appearance-none bg-graphite-950 border border-graphite-700 focus:border-chartreuse px-3 py-2.5 text-xs text-paper focus:outline-none transition pr-8 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-graphite-950 text-smoke">{form.state ? 'Select district...' : 'Select state first'}</option>
                    {districts.map((d) => (
                      <option key={d} value={d} className="bg-graphite-950 text-paper">{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-smoke absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="text-[10px] font-bold text-chartreuse uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> ALERT CONTACT DETAILS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">Phone / WhatsApp <span className="text-signal-red">*</span></label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-smoke absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-graphite-950 border border-graphite-700 focus:border-chartreuse pl-9 pr-3 py-2.5 text-xs text-paper placeholder-smoke focus:outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-smoke mb-1.5 uppercase font-bold">Official Email <span className="text-signal-red">*</span></label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-smoke absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="official@nic.in"
                    className="w-full bg-graphite-950 border border-graphite-700 focus:border-chartreuse pl-9 pr-3 py-2.5 text-xs text-paper placeholder-smoke focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Authority badge */}
          <div className="flex items-center gap-2 p-3 bg-graphite-950 border border-graphite-700">
            <Building2 className="w-3.5 h-3.5 text-violet shrink-0" />
            <p className="text-[10px] font-sans text-smoke leading-relaxed">
              This registration is for authorized government disaster management officials only.
              By submitting, you confirm you are a verified NDMA/SDMA operative with jurisdiction over the selected district.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-signal-red/10 border border-signal-red/60 text-signal-red text-xs font-mono">
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-chartreuse hover:bg-chartreuse/90 text-graphite-950 font-display font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(200,255,61,0.3)] hover:shadow-[0_0_25px_rgba(200,255,61,0.5)]"
          >
            ACTIVATE DISTRICT ALERT SUBSCRIPTION
          </button>
        </form>
      </div>
    </div>
  );
}

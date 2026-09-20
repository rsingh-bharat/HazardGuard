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
      <div className="h-screen overflow-y-auto w-full font-mono">
        <div className="max-w-2xl mx-auto p-6 pt-20 space-y-6 select-none pb-16">
          <div className="p-8 space-y-6 font-mono text-center shadow-2xl" style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
            backdropFilter: "blur(26px) saturate(118%)",
            WebkitBackdropFilter: "blur(26px) saturate(118%)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 20,
          }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 flex items-center justify-center rounded-full" style={{ background: "rgba(200,255,61,.14)", border: "1px solid rgba(200,255,61,.35)", color: "#C8FF3D" }}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 style={{ fontFamily: "'Inter Tight', Inter, sans-serif", fontWeight: 600, fontSize: 22, color: "#ffffff", letterSpacing: "-0.4px", textTransform: "uppercase" }}>
                Registration Confirmed
              </h2>
            </div>

            <div className="space-y-2 text-left p-4" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12 }}>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest">Official:</span>
                <span className="text-xs text-white font-bold">{form.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest">District:</span>
                <span className="text-xs text-white font-bold">{form.district}, {STATES.find(s => s.id === form.state)?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest">Alert Channel:</span>
                <span className="text-xs text-white font-bold">{form.phone} — {form.email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] font-bold text-white/55 uppercase tracking-widest">Role:</span>
                <span className="text-xs text-white font-bold">{form.role}</span>
              </div>
            </div>

            <div className="text-xs text-white/70 leading-relaxed text-left">
              <p>
                Your district ({form.district}) has been registered for automated hazard alert dispatch.
                Whenever a <span style={{ color: "#FF3B30", fontWeight: "bold" }}>RED</span> or <span style={{ color: "#FFB347", fontWeight: "bold" }}>ORANGE</span> alert
                is forecasted for your jurisdiction, HazardGuard will send an automated advisory to your registered contact details.
              </p>
            </div>

            <div className="px-4 py-3 text-[10px] font-mono text-left" style={{ background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 10, color: "rgba(255,255,255,.55)" }}>
              <span style={{ color: "#C8FF3D", fontWeight: "bold" }}>SYSTEM:</span> Alert pipeline activated for district perimeter.
              Monitoring 72-hour ensemble forecast cycle.
            </div>

            <button
              onClick={() => { setSubmitted(false); setForm({ name: '', designation: '', role: '', state: '', district: '', phone: '', email: '', empId: '' }); }}
              className="w-full py-3.5 flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}
            >
              REGISTER ANOTHER OFFICIAL
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectStyle = {
    background: "rgba(255,255,255,.08)", 
    border: "1px solid rgba(255,255,255,.15)", 
    borderRadius: 10,
    color: "#ffffff"
  };

  const inputStyle = {
    background: "rgba(0,0,0,.2)", 
    border: "1px solid rgba(255,255,255,.12)", 
    borderRadius: 10,
    color: "#ffffff"
  };

  return (
    <div className="h-screen overflow-y-auto w-full font-mono">
      <div className="max-w-2xl mx-auto p-6 pt-20 space-y-6 select-none pb-16">

        {/* Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 shadow-2xl"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
            backdropFilter: "blur(26px) saturate(118%)",
            WebkitBackdropFilter: "blur(26px) saturate(118%)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 20,
          }}>
          <div>
            <div className="flex items-center gap-3">
              <span style={{ padding: "8px", background: "rgba(200,255,61,.14)", border: "1px solid rgba(200,255,61,.35)", borderRadius: "10px", color: "#C8FF3D" }}>
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h1 style={{ fontFamily: "'Inter Tight', Inter, sans-serif", fontWeight: 600, fontSize: 22, color: "#ffffff", letterSpacing: "-0.4px", textTransform: "uppercase" }}>
                  OFFICIAL REGISTRATION
                </h1>
                <p style={{ color: "rgba(255,255,255,.55)", fontSize: 11, fontFamily: "Inter, sans-serif", marginTop: 4 }}>
                  NDMA / SDMA District Disaster Management Officer Portal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="p-6 shadow-xl space-y-6" style={{
            background: "rgba(255,255,255,.06)",
            backdropFilter: "blur(20px) saturate(115%)",
            WebkitBackdropFilter: "blur(20px) saturate(115%)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 16,
          }}>
          
          <div className="flex items-start gap-2 p-3" style={{ background: "rgba(255, 179, 71, 0.15)", border: "1px solid rgba(255, 179, 71, 0.3)", borderRadius: 10, color: "#FFB347" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-[11px] font-sans leading-relaxed">
              Registering your contact here enables automated hazard alerts for your district when rainfall forecasts trigger
              severe risk criteria (RED/ORANGE). Keep this information updated.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Personnel Details */}
            <div>
              <h2 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
                <User className="w-4 h-4 text-[#C8FF3D]" /> PERSONNEL IDENTIFICATION
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">Full Name <span style={{ color: "#FF3B30" }}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Eg. Dr. A. Kumar"
                    className="w-full px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">Employee / Badge ID</label>
                  <input
                    type="text"
                    value={form.empId}
                    onChange={(e) => handleChange('empId', e.target.value)}
                    placeholder="Govt. Employee ID (Optional)"
                    className="w-full px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => handleChange('designation', e.target.value)}
                    placeholder="Eg. IAS, IPS, NDRF..."
                    className="w-full px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">DM Role <span style={{ color: "#FF3B30" }}>*</span></label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition pr-8 cursor-pointer"
                      style={selectStyle}
                    >
                      <option value="" style={{ background: "#04121b", color: "rgba(255,255,255,0.6)" }}>Select role...</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r} style={{ background: "#04121b", color: "#ffffff" }}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Jurisdiction */}
            <div>
              <h2 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
                <MapPin className="w-4 h-4 text-[#C8FF3D]" /> JURISDICTIONAL AREA
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">State / UT <span style={{ color: "#FF3B30" }}>*</span></label>
                  <div className="relative">
                    <select
                      value={form.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition pr-8 cursor-pointer"
                      style={selectStyle}
                    >
                      <option value="" style={{ background: "#04121b", color: "rgba(255,255,255,0.6)" }}>Select state...</option>
                      {STATES.map((s) => (
                        <option key={s.id} value={s.id} style={{ background: "#04121b", color: "#ffffff" }}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">District <span style={{ color: "#FF3B30" }}>*</span></label>
                  <div className="relative">
                    <select
                      value={form.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                      disabled={!form.state}
                      className="w-full appearance-none px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition pr-8 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={selectStyle}
                    >
                      <option value="" style={{ background: "#04121b", color: "rgba(255,255,255,0.6)" }}>{form.state ? 'Select district...' : 'Select state first'}</option>
                      {districts.map((d) => (
                        <option key={d} value={d} style={{ background: "#04121b", color: "#ffffff" }}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-[11px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
                <Phone className="w-4 h-4 text-[#C8FF3D]" /> ALERT CONTACT DETAILS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">Phone / WhatsApp <span style={{ color: "#FF3B30" }}>*</span></label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition placeholder:text-white/20"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-white/55 mb-1.5 uppercase font-bold">Official Email <span style={{ color: "#FF3B30" }}>*</span></label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="official@nic.in"
                      className="w-full pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8FF3D] transition placeholder:text-white/20"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Authority badge */}
            <div className="flex items-center gap-3 p-4" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 12 }}>
              <Building2 className="w-5 h-5 text-white/50 shrink-0" />
              <p className="text-[10px] font-sans text-white/60 leading-relaxed">
                This registration is for authorized government disaster management officials only.
                By submitting, you confirm you are a verified NDMA/SDMA operative with jurisdiction over the selected district.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 text-xs font-mono" style={{ background: "rgba(255,59,48,0.15)", border: "1px solid rgba(255,59,48,0.3)", borderRadius: 10, color: "#FF3B30" }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 flex items-center justify-center transition-all hover:opacity-90"
              style={{
                background: "#C8FF3D",
                borderRadius: 12,
                color: "#000000",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}
            >
              ACTIVATE DISTRICT ALERT SUBSCRIPTION
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

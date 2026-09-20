import os
import re

base_dir = r"E:\SIH\HazardGuard fv4\hazardguard\src\components\impact"

def process_file(filename, replacements):
    filepath = os.path.join(base_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

# LayerControls.tsx
layer_replacements = [
    (r'className="absolute top-20 left-4 z-20 select-none"', r'className="absolute top-[90px] left-4 z-20 select-none pointer-events-none"'),
    (r'className=\{\`/90 backdrop-blur-md border border-white/10 clipped-br shadow-2xl transition-all duration-300 overflow-hidden \$\{\n            isExpanded \? "w-64 p-3\.5" : "w-0 p-0 border-none opacity-0"\n          \}\`\}', r'className={`pointer-events-auto rounded-[24px] shadow-2xl transition-all duration-300 overflow-y-auto custom-scrollbar max-h-[calc(100vh-140px)] ${isExpanded ? "w-[280px] p-4" : "w-0 p-0 opacity-0 border-none"}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,.125) 0%, rgba(255,255,255,.135) 13%, rgba(255,255,255,.098) 34%, rgba(255,255,255,.092) 100%)", backdropFilter: "blur(18px) saturate(115%)", WebkitBackdropFilter: "blur(18px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}'),
    (r'className="/90 backdrop-blur border border-white/10 clipped-br p-2\.5 text-white/70 hover:text-white shadow-xl hover: transition"', r'className="pointer-events-auto rounded-[20px] p-3 text-white/70 hover:text-white shadow-xl transition" style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(16px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}'),
    (r'text-chartreuse', r'text-[#C8FF3D]'),
    (r'bg-chartreuse', r'bg-[#C8FF3D]'),
    (r'accent-chartreuse', r'accent-[#C8FF3D]'),
    (r'border-chartreuse', r'border-[#C8FF3D]'),
    (r'text-signal-red', r'text-[#FF3B30]'),
    (r'bg-signal-red', r'bg-[#FF3B30]'),
    (r'border-signal-red', r'border-[#FF3B30]'),
    (r'text-amber', r'text-[#FFB347]'),
    (r'bg-amber', r'bg-[#FFB347]'),
    (r'border-amber', r'border-[#FFB347]'),
    (r'text-warm-paper', r'text-white'),
    (r'clipped-br', r'rounded-xl'),
    (r'clipped-tl', r'rounded-xl'),
    (r'clipped-both', r'rounded-sm')
]
process_file("LayerControls.tsx", layer_replacements)

# ImpactAnalyticsPanel.tsx
analytics_replacements = [
    (r'className="absolute top-20 right-4 bottom-24 z-20 flex select-none pointer-events-none"', r'className="absolute top-[90px] right-4 bottom-[120px] z-20 flex select-none pointer-events-none"'),
    (r'className="w-96  backdrop-blur-xl border border-white/10 clipped-br shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-all"', r'className="w-[380px] rounded-[24px] shadow-2xl flex flex-col pointer-events-auto transition-all" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.125) 0%, rgba(255,255,255,.135) 13%, rgba(255,255,255,.098) 34%, rgba(255,255,255,.092) 100%)", backdropFilter: "blur(18px) saturate(115%)", WebkitBackdropFilter: "blur(18px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}'),
    (r'className="/90 backdrop-blur border border-white/10 clipped-tl p-2\.5 text-white/70 hover:text-white shadow-xl hover: transition"', r'className="pointer-events-auto rounded-[20px] p-3 text-white/70 hover:text-white shadow-xl transition mr-2 h-fit" style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(16px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}'),
    (r'text-chartreuse', r'text-[#C8FF3D]'),
    (r'bg-chartreuse', r'bg-[#C8FF3D]'),
    (r'accent-chartreuse', r'accent-[#C8FF3D]'),
    (r'border-chartreuse', r'border-[#C8FF3D]'),
    (r'text-signal-red', r'text-[#FF3B30]'),
    (r'bg-signal-red', r'bg-[#FF3B30]'),
    (r'border-signal-red', r'border-[#FF3B30]'),
    (r'text-amber', r'text-[#FFB347]'),
    (r'bg-amber', r'bg-[#FFB347]'),
    (r'border-amber', r'border-[#FFB347]'),
    (r'text-warm-paper', r'text-white'),
    (r'clipped-br', r'rounded-xl'),
    (r'clipped-tl', r'rounded-xl'),
    (r'clipped-both', r'rounded-sm')
]
process_file("ImpactAnalyticsPanel.tsx", analytics_replacements)

# TimelineControls.tsx
timeline_replacements = [
    (r'className="absolute bottom-4 left-1/2 -translate-x-1/2 w-\[92%\] max-w-4xl /90 backdrop-blur-md border border-white/10/90 clipped-br p-3 shadow-2xl shadow-black/80 z-20 select-none"', r'className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl p-4 shadow-2xl z-30 select-none pointer-events-auto rounded-[24px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.258) 24%, rgba(255,255,255,.252) 78%, rgba(255,255,255,.232) 100%)", backdropFilter: "blur(26px) saturate(118%)", WebkitBackdropFilter: "blur(26px) saturate(118%)", border: "1px solid rgba(255,255,255,.20)" }}'),
    (r'text-chartreuse', r'text-[#C8FF3D]'),
    (r'bg-chartreuse', r'bg-[#C8FF3D]'),
    (r'accent-chartreuse', r'accent-[#C8FF3D]'),
    (r'border-chartreuse', r'border-[#C8FF3D]'),
    (r'text-signal-red', r'text-[#FF3B30]'),
    (r'bg-signal-red', r'bg-[#FF3B30]'),
    (r'border-signal-red', r'border-[#FF3B30]'),
    (r'text-amber', r'text-[#FFB347]'),
    (r'bg-amber', r'bg-[#FFB347]'),
    (r'border-amber', r'border-[#FFB347]'),
    (r'text-warm-paper', r'text-white'),
    (r'clipped-br', r'rounded-xl'),
    (r'clipped-tl', r'rounded-xl'),
    (r'clipped-both', r'rounded-sm')
]
process_file("TimelineControls.tsx", timeline_replacements)

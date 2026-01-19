#!/usr/bin/env python3
"""
Complete Portfolio Design Unification Script
This script automatically applies all CSS changes to unify your portfolio design.

Usage:
  python3 unify_portfolio.py

This will:
1. Process cyber-readiness-tool.html (replace <style> section)
2. Process grc-lab.html (apply 10 CSS changes)
3. Output unified versions ready for GitHub
"""

import re
import sys
from pathlib import Path

# The complete unified CSS for cyber-readiness-tool.html
UNIFIED_CYBER_CSS = """<style>
:root{
  --bg0:#070A12;
  --bg1:#0B1226;
  --card: rgba(255,255,255,.06);
  --card2: rgba(255,255,255,.085);
  --stroke: rgba(255,255,255,.10);
  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.62);
  --muted2: rgba(255,255,255,.44);
  --brand:#7C3AED;
  --brand2:#22D3EE;
  --good:#34D399;
  --warn:#FBBF24;
  --bad:#FB7185;
  --shadow: 0 24px 70px rgba(0,0,0,.55);
  --shadow2: 0 14px 40px rgba(0,0,0,.35);
  --radius: 18px;
  --radius2: 26px;
  --ease: cubic-bezier(.2,.8,.2,1);
}
*{ box-sizing:border-box; }
html,body{ height:100%; margin:0; padding:0; }
body{
  font-family: Manrope, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color: var(--text);
  background:
    radial-gradient(1200px 800px at 20% 10%, rgba(124,58,237,.28), transparent 60%),
    radial-gradient(900px 600px at 80% 20%, rgba(34,211,238,.18), transparent 55%),
    radial-gradient(800px 600px at 50% 90%, rgba(251,113,133,.12), transparent 55%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  overflow-x:hidden; line-height: 1.6;
}
.gridfx{
  position:fixed; inset:0;
  background-image:
    linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(800px 600px at 50% 20%, black 35%, transparent 85%);
  pointer-events:none; opacity:.55;
  animation: drift 14s var(--ease) infinite alternate;
}
@keyframes drift{ from{ transform: translate3d(0,0,0);} to{ transform: translate3d(0,-14px,0);} }
.orb{
  position:fixed; width:520px; height:520px; border-radius:999px;
  filter: blur(18px); opacity:.55; pointer-events:none; mix-blend-mode: screen;
  animation: float 9s var(--ease) infinite alternate;
}
.orb.one{ left:-140px; top:-140px; background: radial-gradient(circle at 35% 30%, rgba(124,58,237,.75), transparent 55%); }
.orb.two{ right:-180px; top:80px; background: radial-gradient(circle at 40% 35%, rgba(34,211,238,.55), transparent 60%); animation-duration: 11s; }
.orb.three{ left:40%; bottom:-220px; background: radial-gradient(circle at 45% 45%, rgba(251,113,133,.45), transparent 62%); animation-duration: 13s; }
@keyframes float { from{ transform: translate3d(0,0,0) scale(1);} to{ transform: translate3d(0,24px,0) scale(1.02);} }
.wrap{ max-width: 1200px; margin: 0 auto; padding: 28px 18px 70px; position:relative; }
.topbar{
  display:flex; align-items:center; justify-content:space-between; gap:14px;
  position:sticky; top:0; z-index:50;
  padding: 14px 12px; margin: -8px -6px 18px;
  border-radius: 26px;
  background: rgba(10,14,26,.62);
  border: 1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 32px rgba(0,0,0,.35);
}
.brandRow{ display:flex; align-items:center; gap:10px; user-select:none; min-width: 240px; text-decoration:none; color:inherit;}
.logo{
  width:38px; height:38px; border-radius:12px;
  background: conic-gradient(from 210deg, rgba(124,58,237,.9), rgba(34,211,238,.9), rgba(251,113,133,.7), rgba(124,58,237,.9));
  box-shadow: 0 12px 26px rgba(124,58,237,.25);
  position:relative; overflow:hidden; flex-shrink:0;
}
.logo:after{
  content:""; position:absolute; inset:-40%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), transparent 60%);
  transform: rotate(18deg);
}
.brandTitle{ margin:0; font-size:14px; letter-spacing:.2px; line-height:1.05; font-weight:800; }
.brandSub{ margin-top:2px; font-size:12px; color: var(--muted); }
.navlinks{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
.pill{
  display:flex; align-items:center; gap:8px;
  padding: 10px 12px; border-radius: 999px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: var(--text); cursor:pointer;
  transition: transform .18s var(--ease), background .18s var(--ease), border-color .18s var(--ease);
  user-select:none; text-decoration:none;
  font-weight:800; font-size:13px; line-height:1;
}
.pill:hover{ transform: translateY(-1px); background: rgba(255,255,255,.085); border-color: rgba(255,255,255,.16); }
.pill:active{ transform: translateY(0px) scale(.99); }
.pill.primary{
  background: linear-gradient(135deg, rgba(124,58,237,.92), rgba(34,211,238,.65));
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 20px 55px rgba(124,58,237,.25);
}
.pill.muted{ color: rgba(255,255,255,.88); }
.card{
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius2);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(12px);
  overflow:hidden; position:relative;
}
.glow{
  position:absolute; inset:-1px; z-index:0; pointer-events:none;
  background:
    radial-gradient(700px 380px at 20% 15%, rgba(124,58,237,.20), transparent 55%),
    radial-gradient(650px 360px at 90% 30%, rgba(34,211,238,.14), transparent 55%);
  opacity:.95;
}
.inner{ padding: 22px 22px 18px; position:relative; z-index:1; }
.heroTitle{ font-size: 34px; margin: 0 0 8px; letter-spacing: -.4px; line-height: 1.12; font-weight: 900;}
.heroP{ margin: 0 0 14px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.btn{
  padding: 11px 14px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.9); cursor:pointer;
  transition: transform .18s var(--ease), background .18s var(--ease), border-color .18s var(--ease);
  user-select:none; display:inline-flex; align-items:center; gap:10px;
  text-decoration:none; font-weight: 900; font-size: 13px;
}
.btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.085); border-color: rgba(255,255,255,.18); }
.btn:active{ transform: translateY(0px) scale(.99); }
.btn.primary{
  background: linear-gradient(135deg, rgba(124,58,237,.92), rgba(34,211,238,.65));
  border-color: rgba(255,255,255,.16);
  box-shadow: 0 18px 46px rgba(124,58,237,.24);
}
.btn.small{ padding: 9px 12px; font-size: 12px; }
.meta{
  padding: 12px; border-radius: 16px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.09);
}
.meta .k{ color: var(--muted2); font-size: 12px; }
.meta .v{ margin-top: 6px; font-weight: 800; letter-spacing:.2px; }
.chiprow{ display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px; }
.chip{
  display:inline-flex; align-items:center; gap:8px;
  padding: 8px 10px; border-radius: 999px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.86); font-size: 12px;
}
.small{ font-size: 12.5px; color: var(--muted); line-height:1.55; }
.domainGrid{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-top:12px; }
.domainTile{
  padding:14px; border-radius:var(--radius);
  background: rgba(255,255,255,.055);
  border:1px solid rgba(255,255,255,.10);
  cursor:pointer;
  transition: all .18s var(--ease);
  position:relative;
}
.domainTile:hover{transform:translateY(-2px); border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.075);}
.domainTile.selected{
  background: linear-gradient(135deg, rgba(124,58,237,.18), rgba(34,211,238,.12));
  border-color: rgba(124,58,237,.35);
}
.domainTitle{ font-weight:900; font-size:15px; letter-spacing:-.2px; margin-bottom:6px; }
.domainDesc{ font-size:12.5px; color:var(--muted); line-height:1.5; }
.scorePills{ display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
.scorePill{
  padding:7px 10px; border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  font-size:12px; font-weight:700;
  cursor:pointer;
  transition: all .18s var(--ease);
}
.scorePill:hover{transform: translateY(-1px); background: rgba(255,255,255,.085);}
.scorePill.selected{
  background: var(--brand);
  border-color: rgba(124,58,237,.5);
  color: white;
}
.qCard{
  padding:16px; border-radius:var(--radius);
  background: rgba(255,255,255,.055);
  border:1px solid rgba(255,255,255,.10);
  margin-top:12px;
}
.qText{ font-weight:800; font-size:14px; margin-bottom:10px; }
.progressBar{
  height:8px; border-radius:999px;
  background: rgba(255,255,255,.10);
  overflow:hidden; position:relative;
}
.progressFill{
  height:100%; border-radius:999px;
  background: linear-gradient(90deg, var(--brand), var(--brand2));
  transition: width .3s var(--ease);
}
.progressRing{width:120px; height:120px; position:relative;}
.progressRing svg{transform: rotate(-90deg);}
.progressRing circle{fill:none; stroke-width:8; transition: stroke-dashoffset .3s var(--ease);}
.vizRow{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:14px; }
.vizCard{
  padding:18px; border-radius:var(--radius);
  background: rgba(255,255,255,.055);
  border:1px solid rgba(255,255,255,.10);
}
.vizTitle{ font-weight:900; font-size:15px; margin-bottom:12px; }
@media (max-width: 980px){ .domainGrid{ grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px){
  .wrap{ padding: 20px 16px 50px; }
  .topbar{ flex-direction: column; align-items: stretch; gap: 12px; padding: 12px; }
  .navlinks{ justify-content: flex-start; }
  .heroTitle{ font-size: 26px; }
  .brandRow{ min-width: auto; }
  .vizRow{ grid-template-columns:1fr; }
}
@media (max-width: 620px){ .domainGrid{ grid-template-columns: 1fr; } }
@media (max-width: 480px){
  .heroTitle{ font-size: 22px; }
  .pill{ padding: 8px 10px; font-size: 12px; }
  .btn{ padding: 10px 12px; font-size: 12px; }
}
.toast{
  position:fixed; bottom:20px; right:20px;
  padding:14px 18px; border-radius:14px;
  background: rgba(10,14,26,.95);
  border:1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 50px rgba(0,0,0,.45);
  color: white; font-size:14px;
  z-index:999;
  animation: slideIn .3s var(--ease);
}
@keyframes slideIn{from{ transform: translateX(400px); opacity:0; } to{ transform: translateX(0); opacity:1; }}
.analyzing{
  position:fixed; inset:0; z-index:9999;
  background: rgba(7,10,18,.95);
  backdrop-filter: blur(8px);
  display:flex; align-items:center; justify-content:center;
  flex-direction:column; gap:20px;
}
.spinner{
  width:60px; height:60px; border-radius:999px;
  border:4px solid rgba(255,255,255,.1);
  border-top-color: var(--brand);
  animation: spin 1s linear infinite;
}
@keyframes spin{to{ transform: rotate(360deg); }}
@media print{
  .topbar, .btn, .toast, .analyzing{ display:none !important; }
  body{ background: white; color: black; }
  .card{ border:1px solid #ddd; box-shadow:none; }
}
</style>"""

# GRC Lab CSS replacements
GRC_REPLACEMENTS = [
    (r'padding:\s*16px\s+20px', 'padding: 14px 12px'),
    (r'width:\s*44px', 'width: 38px'),
    (r'height:\s*44px', 'height: 38px'),
    (r'font-size:\s*16px', 'font-size: 14px'),
    (r'font-weight:\s*700', 'font-weight: 900'),
    (r'padding:\s*10px\s+16px', 'padding: 10px 12px'),
    (r'border-radius:\s*var\(--radius-lg\)', 'border-radius: 26px'),
    (r'border-radius:\s*var\(--radius-md\)', 'border-radius: 18px'),
    (r'padding:\s*0\.75rem\s+1\.5rem', 'padding: 11px 14px'),
    (r'font-size:\s*2\.5rem', 'font-size: 34px'),
]

def process_cyber_readiness(content):
    """Replace the <style> section in cyber-readiness-tool.html"""
    pattern = r'<style>.*?</style>'
    return re.sub(pattern, UNIFIED_CYBER_CSS, content, flags=re.DOTALL)

def process_grc_lab(content):
    """Apply CSS replacements to grc-lab.html"""
    for pattern, replacement in GRC_REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    return content

def main():
    print("🚀 Portfolio Design Unification Script")
    print("=" * 50)
    print()
    
    # Check for input files
    cyber_file = Path('cyber-readiness-tool.html')
    grc_file = Path('grc-lab.html')
    
    if not cyber_file.exists() or not grc_file.exists():
        print("❌ Error: Required files not found")
        print()
        print("Please ensure these files are in the current directory:")
        print("  - cyber-readiness-tool.html")
        print("  - grc-lab.html")
        print()
        print("Then run this script again:")
        print("  python3 unify_portfolio.py")
        sys.exit(1)
    
    print("✅ Found input files")
    print()
    
    # Process cyber-readiness-tool.html
    print("⏳ Processing cyber-readiness-tool.html...")
    with open(cyber_file, 'r', encoding='utf-8') as f:
        cyber_content = f.read()
    
    cyber_unified = process_cyber_readiness(cyber_content)
    
    with open('cyber-readiness-tool-UNIFIED.html', 'w', encoding='utf-8') as f:
        f.write(cyber_unified)
    
    print("✅ Created: cyber-readiness-tool-UNIFIED.html")
    print()
    
    # Process grc-lab.html
    print("⏳ Processing grc-lab.html...")
    with open(grc_file, 'r', encoding='utf-8') as f:
        grc_content = f.read()
    
    grc_unified = process_grc_lab(grc_content)
    
    with open('grc-lab-UNIFIED.html', 'w', encoding='utf-8') as f:
        f.write(grc_unified)
    
    print("✅ Created: grc-lab-UNIFIED.html")
    print()
    
    print("=" * 50)
    print("🎉 SUCCESS! Your unified files are ready:")
    print()
    print("  📄 index.html (already perfect)")
    print("  📄 cyber-readiness-tool-UNIFIED.html")
    print("  📄 grc-lab-UNIFIED.html")
    print()
    print("Next steps:")
    print("  1. Test the -UNIFIED.html files in your browser")
    print("  2. If everything looks good, rename them:")
    print("     mv cyber-readiness-tool-UNIFIED.html cyber-readiness-tool.html")
    print("     mv grc-lab-UNIFIED.html grc-lab.html")
    print("  3. Push to GitHub:")
    print("     git add *.html")
    print("     git commit -m 'feat: unified design system'")
    print("     git push origin main")
    print()
    print("✨ Your portfolio is now beautifully unified!")

if __name__ == '__main__':
    main()

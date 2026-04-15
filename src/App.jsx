import { useState, useMemo, useEffect } from "react";

// ── Palette & constants ───────────────────────────────────────────────────
const F  = "'Courier New','Lucida Console',monospace";
const G  = "#00ff41";  // matrix green
const G2 = "#00aa2a";
const DG = "#003d00";
const DDG= "#000f00";
const BG = "#000700";
const AM = "#ffaa00";  // amber (elevated)
const RD = "#ff2244";  // red (critical)
const CY = "#00d4ff";  // cyan (info)
const WH = "#aaffaa";  // soft white

// ── Afrobarometer Round 9 data ────────────────────────────────────────────
const tableData = {
  cleanWater: {
    baseline: { no:0.145, low:0.29, moderate:0.375, high:0.455 },
    urban:    { no:0.09,  low:0.18, moderate:0.25,  high:0.29  },
    rural:    { no:0.29,  low:0.41, moderate:0.48,  high:0.55  },
    none:     { no:0.30,  low:0.42, moderate:0.45,  high:0.50  },
    primary:  { no:0.27,  low:0.39, moderate:0.45,  high:0.52  },
    secondary:{ no:0.13,  low:0.25, moderate:0.34,  high:0.40  },
    postSec:  { no:0.07,  low:0.15, moderate:0.20,  high:0.29  },
  },
  pipedWater: {
    baseline: { no:0.27,  low:0.535,moderate:0.68,  high:0.775 },
    urban:    { no:0.17,  low:0.34, moderate:0.45,  high:0.56  },
    rural:    { no:0.52,  low:0.75, moderate:0.85,  high:0.90  },
    none:     { no:0.57,  low:0.74, moderate:0.80,  high:0.84  },
    primary:  { no:0.44,  low:0.65, moderate:0.76,  high:0.84  },
    secondary:{ no:0.26,  low:0.50, moderate:0.63,  high:0.71  },
    postSec:  { no:0.14,  low:0.32, moderate:0.44,  high:0.56  },
  },
  offCompound:{
    baseline: { no:0.195, low:0.435,moderate:0.585, high:0.675 },
    urban:    { no:0.11,  low:0.26, moderate:0.38,  high:0.46  },
    rural:    { no:0.43,  low:0.62, moderate:0.75,  high:0.81  },
    none:     { no:0.46,  low:0.64, moderate:0.72,  high:0.77  },
    primary:  { no:0.37,  low:0.57, moderate:0.68,  high:0.75  },
    secondary:{ no:0.18,  low:0.40, moderate:0.53,  high:0.60  },
    postSec:  { no:0.07,  low:0.21, moderate:0.32,  high:0.47  },
  },
};

const countryBaselines = {
  "AFRICA AVG":  null,
  "KENYA":       { cleanWater:0.31, pipedWater:0.78, offCompound:0.58 },
  "TANZANIA":    { cleanWater:0.35, pipedWater:0.74, offCompound:0.74 },
  "ETHIOPIA":    { cleanWater:0.32, pipedWater:0.65, offCompound:0.70 },
  "GHANA":       { cleanWater:0.12, pipedWater:0.70, offCompound:0.65 },
  "MALI":        { cleanWater:0.13, pipedWater:0.76, offCompound:0.56 },
  "SUDAN":       { cleanWater:0.10, pipedWater:0.64, offCompound:0.29 },
  "GAMBIA":      { cleanWater:0.05, pipedWater:0.46, offCompound:0.41 },
  "NAMIBIA":     { cleanWater:0.06, pipedWater:0.36, offCompound:0.36 },
  "BOTSWANA":    { cleanWater:0.06, pipedWater:0.31, offCompound:0.15 },
  "CABO VERDE":  { cleanWater:0.05, pipedWater:0.25, offCompound:0.19 },
  "TUNISIA":     { cleanWater:0.05, pipedWater:0.36, offCompound:0.04 },
  "SOUTH AFRICA":{ cleanWater:0.06, pipedWater:0.19, offCompound:0.17 },
  "MOROCCO":     { cleanWater:0.04, pipedWater:0.15, offCompound:0.08 },
  "SEYCHELLES":  { cleanWater:0.02, pipedWater:0.05, offCompound:0.01 },
  "MAURITIUS":   { cleanWater:0.005,pipedWater:0.005,offCompound:0.01 },
};

const LPI_LEVELS = [
  { id:"no",       label:"NO THREAT",      short:"CLEAR",    color:G  },
  { id:"low",      label:"LOW THREAT",     short:"LOW",      color:G2 },
  { id:"moderate", label:"MOD. THREAT",    short:"MOD",      color:AM },
  { id:"high",     label:"HIGH THREAT",    short:"HIGH",     color:RD },
];

const OUTCOMES = {
  pipedWater:  { label:"WATER GRID ACCESS",    code:"WGA", desc:"Pipeline infrastructure integration" },
  cleanWater:  { label:"POTABLE SUPPLY",       code:"PTS", desc:"Improved source dependency"          },
  offCompound: { label:"EXTERNAL RESUPPLY",    code:"ERS", desc:"Off-compound water procurement"      },
};

// ── Model ─────────────────────────────────────────────────────────────────
const logit   = p => Math.log(Math.max(0.001,Math.min(0.999,p))/(1-Math.max(0.001,Math.min(0.999,p))));
const sigmoid = x => Math.max(0.005,Math.min(0.995,1/(1+Math.exp(-x))));

function predict(outcome, lpi, urbanPct, edu, country) {
  const d=tableData[outcome], base=d.baseline[lpi], bL=logit(base);
  const uW = urbanPct*d.urban[lpi]+(1-urbanPct)*d.rural[lpi];
  const uAdj = logit(uW)-bL;
  const tot = edu.none+edu.primary+edu.secondary+edu.postSec||1;
  const eW = (edu.none*d.none[lpi]+edu.primary*d.primary[lpi]+edu.secondary*d.secondary[lpi]+edu.postSec*d.postSec[lpi])/tot;
  const eAdj = logit(eW)-bL;
  let cAdj=0;
  const cb=countryBaselines[country];
  if(cb){const cOff=logit(cb[outcome])-logit(tableData[outcome].baseline.no);const sc={no:1,low:0.65,moderate:0.45,high:0.25};cAdj=cOff*sc[lpi];}
  return sigmoid(bL+uAdj+eAdj+cAdj);
}

// ── Helpers ───────────────────────────────────────────────────────────────
const pct  = v => `${Math.round(v*100)}%`;
const pp   = v => `${v>0?"+":""}${Math.round(v*100)}PP`;
const tc   = v => v>0.65?RD:v>0.40?AM:G;
const tl   = v => v>0.65?"CRITICAL":v>0.40?"ELEVATED":v>0.20?"MODERATE":"NOMINAL";
const bar  = (v,w=16)=>"▓".repeat(Math.round(v*w))+"░".repeat(w-Math.round(v*w));
const now  = ()=>new Date().toISOString().replace("T"," ").slice(0,19)+" UTC";

// ── Sub-components ────────────────────────────────────────────────────────
function Bracket({ children, color=G, title, style={} }) {
  const brd = `1px solid ${color}44`;
  return (
    <div style={{ position:"relative", border:`1px solid ${DG}`, background:DDG, ...style }}>
      <div style={{ position:"absolute",top:-1,left:-1,width:10,height:10,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}` }} />
      <div style={{ position:"absolute",top:-1,right:-1,width:10,height:10,borderTop:`2px solid ${color}`,borderRight:`2px solid ${color}` }} />
      <div style={{ position:"absolute",bottom:-1,left:-1,width:10,height:10,borderBottom:`2px solid ${color}`,borderLeft:`2px solid ${color}` }} />
      <div style={{ position:"absolute",bottom:-1,right:-1,width:10,height:10,borderBottom:`2px solid ${color}`,borderRight:`2px solid ${color}` }} />
      {title && (
        <div style={{ borderBottom:`1px solid ${DG}`,padding:"5px 14px",fontSize:9,fontFamily:F,color,letterSpacing:"0.2em",display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ color:DG }}>▶</span>{title}
        </div>
      )}
      <div style={{ padding:14 }}>{children}</div>
    </div>
  );
}

function Row({ label, children, dim=false }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,opacity:dim?0.5:1 }}>
      <span style={{ fontSize:10,fontFamily:F,color:DG,letterSpacing:"0.1em" }}>{label}</span>
      <span style={{ fontFamily:F,fontSize:12,color:WH }}>{children}</span>
    </div>
  );
}

function Blink({ children, color=G, ms=800 }) {
  const [on,setOn]=useState(true);
  useEffect(()=>{ const t=setInterval(()=>setOn(v=>!v),ms); return()=>clearInterval(t); },[ms]);
  return <span style={{ color, opacity:on?1:0 }}>{children}</span>;
}

function MetricCard({ outKey, meta, predicted, baseline, popSize, lpiLevel }) {
  const gap   = predicted-baseline;
  const color = tc(predicted);
  const lvl   = tl(predicted);
  const aff   = Math.round(predicted*popSize);
  const hidden= lpiLevel==="no" && gap>0.05;

  return (
    <Bracket color={color} title={`[${meta.code}] ${meta.label}`} style={{ marginBottom:12 }}>
      <div style={{ fontSize:9,fontFamily:F,color:DG,letterSpacing:"0.1em",marginBottom:10 }}>{meta.desc}</div>

      {/* Threat level badge */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <Blink color={color} ms={lvl==="CRITICAL"?400:1200}>■</Blink>
          <span style={{ fontFamily:F,fontSize:11,color,fontWeight:700,letterSpacing:"0.15em" }}>{lvl}</span>
        </div>
        <div style={{ fontFamily:F,fontSize:22,fontWeight:700,color, textShadow:`0 0 10px ${color}88` }}>
          {pct(predicted)}
        </div>
      </div>

      {/* Projected bar */}
      <div style={{ marginBottom:6 }}>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:F,color:DG,marginBottom:3 }}>
          <span>FIELD PROJECTION</span><span>{pct(predicted)}</span>
        </div>
        <div style={{ fontFamily:F,fontSize:11,color,letterSpacing:"0.05em" }}>
          [{bar(predicted)}]
        </div>
      </div>

      {/* Baseline bar */}
      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:F,color:DG,marginBottom:3 }}>
          <span>SURVEY BASELINE</span><span>{pct(baseline)}</span>
        </div>
        <div style={{ fontFamily:F,fontSize:11,color:DG,letterSpacing:"0.05em" }}>
          [{bar(baseline)}]
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex",gap:12,borderTop:`1px solid ${DG}`,paddingTop:10 }}>
        <div>
          <div style={{ fontSize:8,fontFamily:F,color:DG,letterSpacing:"0.1em" }}>AFFECTED UNITS</div>
          <div style={{ fontSize:14,fontFamily:F,color:WH,fontWeight:700 }}>{aff.toLocaleString()}</div>
          <div style={{ fontSize:8,fontFamily:F,color:DG }}>/{popSize.toLocaleString()}</div>
        </div>
        <div style={{ borderLeft:`1px solid ${DG}`,paddingLeft:12 }}>
          <div style={{ fontSize:8,fontFamily:F,color:DG,letterSpacing:"0.1em" }}>BASELINE Δ</div>
          <div style={{ fontSize:14,fontFamily:F,color:gap>0?RD:G,fontWeight:700 }}>{pp(gap)}</div>
          {hidden && <div style={{ fontSize:8,fontFamily:F,color:AM }}>⚠ UNDETECTED</div>}
        </div>
      </div>
    </Bracket>
  );
}

// ── Enhanced: Export functionality ────────────────────────────────────────
function exportToJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deprivation-analysis-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToCSV(data) {
  const rows = [
    ['Metric', 'Predicted', 'Baseline', 'Delta', 'Affected Population', 'Threat Level'],
    ...Object.entries(data.predictions).map(([key, pred]) => [
      OUTCOMES[key].label,
      (pred * 100).toFixed(1) + '%',
      (data.baselines[key] * 100).toFixed(1) + '%',
      ((pred - data.baselines[key]) * 100).toFixed(1) + 'PP',
      Math.round(pred * data.popSize).toLocaleString(),
      tl(pred)
    ])
  ];
  const csv = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deprivation-analysis-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Enhanced: Comparison mode ─────────────────────────────────────────────
function ComparisonPanel({ scenarios, onClose }) {
  if (scenarios.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,7,0,0.95)',
      zIndex: 1000,
      padding: 20,
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: F, fontSize: 18, color: G, letterSpacing: '0.1em' }}>
            SCENARIO COMPARISON
          </div>
          <button
            onClick={onClose}
            style={{
              background: DDG,
              border: `1px solid ${DG}`,
              color: G,
              fontFamily: F,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 10
            }}
          >
            [CLOSE]
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(scenarios.length, 3)}, 1fr)`, gap: 12 }}>
          {scenarios.map((scenario, idx) => (
            <Bracket key={idx} color={CY} title={`SCENARIO ${idx + 1}`}>
              <Row label="SECTOR">{scenario.country}</Row>
              <Row label="THREAT">{scenario.lpiLabel}</Row>
              <Row label="URBAN">{scenario.urbanPct}%</Row>
              <div style={{ borderTop: `1px solid ${DG}`, marginTop: 10, paddingTop: 10 }}>
                {Object.entries(scenario.predictions).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: DG, fontFamily: F }}>{OUTCOMES[key].code}</div>
                    <div style={{ fontSize: 14, color: tc(val), fontFamily: F, fontWeight: 700 }}>
                      {pct(val)}
                    </div>
                  </div>
                ))}
              </div>
            </Bracket>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [country,  setCountry]  = useState("AFRICA AVG");
  const [lpi,      setLpi]      = useState("no");
  const [urbanPct, setUrbanPct] = useState(35);
  const [popSize,  setPopSize]  = useState(10000);
  const [edu, setEdu] = useState({ none:30, primary:35, secondary:25, postSec:10 });
  const [ts] = useState(now());
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const normEdu = useMemo(()=>{
    const t=edu.none+edu.primary+edu.secondary+edu.postSec||1;
    return { none:edu.none/t, primary:edu.primary/t, secondary:edu.secondary/t, postSec:edu.postSec/t };
  },[edu]);

  const preds = useMemo(()=>({
    pipedWater:  predict("pipedWater",  lpi, urbanPct/100, normEdu, country),
    cleanWater:  predict("cleanWater",  lpi, urbanPct/100, normEdu, country),
    offCompound: predict("offCompound", lpi, urbanPct/100, normEdu, country),
  }),[lpi,urbanPct,normEdu,country]);

  const bases = {
    pipedWater: tableData.pipedWater.baseline[lpi],
    cleanWater: tableData.cleanWater.baseline[lpi],
    offCompound:tableData.offCompound.baseline[lpi],
  };

  const currentLPI = LPI_LEVELS.find(l=>l.id===lpi);
  const hasCalib   = !!countryBaselines[country];
  const worstKey   = Object.keys(preds).sort((a,b)=>preds[b]-preds[a])[0];
  const worstPred  = preds[worstKey];
  const sysColor   = tc(worstPred);
  const hiddenAlert= lpi==="no" && worstPred>0.35;

  const missionId = useMemo(()=>`HI-${Math.random().toString(36).slice(2,8).toUpperCase()}`,[]);

  const handleExportJSON = () => {
    exportToJSON({
      missionId,
      timestamp: ts,
      parameters: { country, lpi, urbanPct, popSize, edu },
      predictions: preds,
      baselines: bases,
    });
  };

  const handleExportCSV = () => {
    exportToCSV({
      predictions: preds,
      baselines: bases,
      popSize,
    });
  };

  const handleSaveScenario = () => {
    setSavedScenarios(prev => [...prev, {
      country,
      lpiLabel: currentLPI.label,
      urbanPct,
      edu,
      predictions: preds,
      timestamp: now()
    }]);
  };

  const handleLoadPreset = (preset) => {
    const presets = {
      urban: { urbanPct: 80, edu: { none: 10, primary: 20, secondary: 40, postSec: 30 } },
      rural: { urbanPct: 10, edu: { none: 45, primary: 35, secondary: 15, postSec: 5 } },
      mixed: { urbanPct: 50, edu: { none: 25, primary: 30, secondary: 30, postSec: 15 } }
    };
    const p = presets[preset];
    if (p) {
      setUrbanPct(p.urbanPct);
      setEdu(p.edu);
    }
  };

  return (
    <div style={{ fontFamily:F, background:BG, minHeight:"100vh", color:G, position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes scanline{0%{top:-5%}100%{top:105%}}
        @keyframes glow{0%,100%{text-shadow:0 0 4px #00ff41}50%{text-shadow:0 0 12px #00ff41,0 0 20px #00ff41}}
        @keyframes flicker{0%,96%,100%{opacity:1}97%{opacity:0.85}98%{opacity:1}99%{opacity:0.9}}
        input[type=range]{accent-color:#00ff41;height:2px;cursor:pointer;}
        select{background:#000700;color:#00ff41;border:1px solid #003d00;font-family:'Courier New',monospace;padding:7px 10px;width:100%;font-size:11px;outline:none;cursor:pointer;letter-spacing:.05em;}
        select option{background:#000700;}
        select:focus{border-color:#00ff41;box-shadow:0 0 6px #00ff4144;}
        input[type=number]{background:#000700;color:#00ff41;border:1px solid #003d00;font-family:'Courier New',monospace;padding:7px 10px;width:100%;font-size:11px;outline:none;}
        input[type=number]:focus{border-color:#00ff41;}
        button{background:#000700;color:#00ff41;border:1px solid #003d00;font-family:'Courier New',monospace;padding:8px 12px;font-size:10px;cursor:pointer;letter-spacing:0.1em;transition:all 0.2s;}
        button:hover{border-color:#00ff41;background:#000f00;box-shadow:0 0 8px #00ff4144;}
        button:active{background:#003d00;}
        ::-webkit-scrollbar{width:3px;background:#000700}
        ::-webkit-scrollbar-thumb{background:#003d00}
      `}</style>

      {/* Grid background */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(0,255,65,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,65,0.03) 1px,transparent 1px)",
        backgroundSize:"40px 40px",zIndex:0 }} />

      {/* Scanline */}
      <div style={{ position:"fixed",left:0,right:0,height:"3px",
        background:"linear-gradient(transparent,rgba(0,255,65,0.06),transparent)",
        animation:"scanline 6s linear infinite",zIndex:1,pointerEvents:"none" }} />

      {/* Vignette */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,0.6))",zIndex:0 }} />

      {showComparison && (
        <ComparisonPanel
          scenarios={savedScenarios}
          onClose={() => setShowComparison(false)}
        />
      )}

      <div style={{ position:"relative",zIndex:2 }}>

        {/* ── Header ── */}
        <div style={{ borderBottom:`1px solid ${DG}`,background:"#000400",padding:"0" }}>
          {/* Classification bar */}
          <div style={{ background:RD,padding:"2px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.3em",color:"#fff" }}>
              ▌▌▌  CLASSIFIED — RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY  ▌▌▌
            </span>
            <span style={{ fontSize:9,color:"#ffaaaa",letterSpacing:"0.1em" }}>ACCESS LEVEL: 4 / EYES ONLY</span>
          </div>
          {/* Main header */}
          <div style={{ padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:9,color:DG,letterSpacing:"0.25em",marginBottom:4 }}>// HUMAN INTELLIGENCE CORP · BEHAVIORAL SIMULATION DIVISION //</div>
              <div style={{ fontSize:18,fontWeight:700,letterSpacing:"0.08em",color:G,textShadow:`0 0 12px ${G}66`,animation:"glow 3s ease-in-out infinite" }}>
                ▶ STRUCTURAL DEPRIVATION ANALYSIS SYSTEM
              </div>
              <div style={{ fontSize:9,color:DG,marginTop:4,letterSpacing:"0.1em" }}>
                CALIBRATION SOURCE: AFROBAROMETER R9 · 39 SECTORS · N=53,444 · FIELD VERIFIED
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9,color:DG,letterSpacing:"0.1em" }}>MISSION REF</div>
              <div style={{ fontSize:13,color:CY,letterSpacing:"0.15em" }}>{missionId}</div>
              <div style={{ fontSize:9,color:DG,marginTop:4,letterSpacing:"0.08em" }}>{ts}</div>
              <div style={{ fontSize:9,color:sysColor,marginTop:2,letterSpacing:"0.1em" }}>
                SYS STATUS: <Blink color={sysColor} ms={1500}>■ ACTIVE</Blink>
              </div>
            </div>
          </div>
        </div>

        {/* ── Enhanced: Action bar ── */}
        <div style={{ borderBottom:`1px solid ${DG}`,background:DDG,padding:"10px 20px",display:"flex",gap:10,alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={handleExportJSON}>↓ EXPORT JSON</button>
            <button onClick={handleExportCSV}>↓ EXPORT CSV</button>
            <button onClick={handleSaveScenario}>+ SAVE SCENARIO ({savedScenarios.length})</button>
            {savedScenarios.length > 0 && (
              <button onClick={() => setShowComparison(true)}>⚏ COMPARE</button>
            )}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <span style={{ fontSize:9,color:DG,marginRight:8 }}>PRESETS:</span>
            <button onClick={() => handleLoadPreset('urban')}>URBAN</button>
            <button onClick={() => handleLoadPreset('rural')}>RURAL</button>
            <button onClick={() => handleLoadPreset('mixed')}>MIXED</button>
          </div>
        </div>

        {/* ── Sector + LPI selectors ── */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,borderBottom:`1px solid ${DG}`,background:DG }}>
          <div style={{ background:DDG,padding:"12px 20px" }}>
            <div style={{ fontSize:9,color:DG,letterSpacing:"0.2em",marginBottom:6 }}>SECTOR / REGION</div>
            <select value={country} onChange={e=>setCountry(e.target.value)}>
              {Object.keys(countryBaselines).map(c=><option key={c}>{c}</option>)}
            </select>
            <div style={{ fontSize:9,color:hasCalib?CY:DG,letterSpacing:"0.08em",marginTop:5 }}>
              {hasCalib?"◉ SECTOR-SPECIFIC INTEL LOADED":"◎ USING CONTINENTAL BASELINE ESTIMATE"}
            </div>
          </div>
          <div style={{ background:DDG,padding:"12px 20px" }}>
            <div style={{ fontSize:9,color:DG,letterSpacing:"0.2em",marginBottom:6 }}>THREAT CLASSIFICATION (LPI)</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
              {LPI_LEVELS.map(l=>(
                <button key={l.id} onClick={()=>setLpi(l.id)} style={{
                  padding:"7px 4px",cursor:"pointer",fontSize:9,fontFamily:F,fontWeight:700,
                  letterSpacing:"0.08em",textAlign:"center",
                  border:`1px solid ${lpi===l.id?l.color:DG}`,
                  background:lpi===l.id?`${l.color}18`:DDG,
                  color:lpi===l.id?l.color:DG,
                  textShadow:lpi===l.id?`0 0 6px ${l.color}66`:"none",
                }}>
                  {lpi===l.id && <Blink color={l.color} ms={800}>■ </Blink>}{l.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main body ── */}
        <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:1,background:DG }}>

          {/* ── Left: Inputs ── */}
          <div style={{ background:BG,padding:"14px" }}>

            {/* SITREP summary */}
            <div style={{ borderBottom:`1px solid ${DG}`,paddingBottom:12,marginBottom:14 }}>
              <div style={{ fontSize:9,color:DG,letterSpacing:"0.2em",marginBottom:8 }}>// SITREP //</div>
              <Row label="SECTOR">{country}</Row>
              <Row label="THREAT CLASS"><span style={{ color:currentLPI.color }}>{currentLPI.label}</span></Row>
              <Row label="CALIBRATION"><span style={{ color:hasCalib?CY:DG }}>{hasCalib?"SECTOR DATA":"CONTINENTAL"}</span></Row>
            </div>

            {/* Terrain */}
            <Bracket color={G} title="TERRAIN ANALYSIS" style={{ marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:6 }}>
                <span style={{ color:CY }}>URBAN {urbanPct}%</span>
                <span style={{ color:AM }}>RURAL {100-urbanPct}%</span>
              </div>
              <input type="range" min={0} max={100} value={urbanPct}
                onChange={e=>setUrbanPct(Number(e.target.value))} style={{ width:"100%" }} />
              <div style={{ display:"flex",height:4,marginTop:8,fontFamily:F,fontSize:10,gap:0 }}>
                <div style={{ width:`${urbanPct}%`,background:CY,transition:"width 0.2s" }} />
                <div style={{ flex:1,background:AM }} />
              </div>
              <div style={{ fontSize:9,color:DG,marginTop:4,letterSpacing:"0.05em" }}>
                [{bar(urbanPct/100,16)}] {urbanPct}% URBAN
              </div>
            </Bracket>

            {/* Population capability */}
            <Bracket color={G} title="CAPABILITY PROFILE (EDUCATION)" style={{ marginBottom:12 }}>
              {[
                { key:"none",      label:"NO FORMAL",    color:RD },
                { key:"primary",   label:"PRIMARY",      color:AM },
                { key:"secondary", label:"SECONDARY",    color:G2 },
                { key:"postSec",   label:"POST-SEC",     color:CY },
              ].map(({key,label,color})=>(
                <div key={key} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,letterSpacing:"0.08em",marginBottom:3 }}>
                    <span style={{ color:DG }}>{label}</span>
                    <span style={{ color }}>{edu[key]}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={edu[key]}
                    onChange={e=>setEdu(p=>({...p,[key]:Number(e.target.value)}))}
                    style={{ width:"100%",accentColor:color }} />
                  <div style={{ fontSize:9,color,letterSpacing:"0.03em" }}>[{bar(edu[key]/100,14)}]</div>
                </div>
              ))}
              <div style={{ fontSize:8,color:DG,marginTop:4 }}>AUTO-NORMALISED IN MODEL</div>
            </Bracket>

            {/* Unit count */}
            <Bracket color={G} title="UNIT COUNT">
              <div style={{ fontSize:9,color:DG,letterSpacing:"0.1em",marginBottom:6 }}>REFERENCE POPULATION SIZE</div>
              <input type="number" value={popSize} min={100} max={10000000}
                onChange={e=>setPopSize(Math.max(100,Number(e.target.value)))} />
              <div style={{ fontSize:9,color:DG,marginTop:5,letterSpacing:"0.05em" }}>
                {popSize.toLocaleString()} UNITS INDEXED
              </div>
            </Bracket>
          </div>

          {/* ── Right: Outputs ── */}
          <div style={{ background:BG,padding:"14px" }}>

            {/* Alert banner */}
            {hiddenAlert ? (
              <div style={{ border:`1px solid ${RD}`,background:`${RD}0d`,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ fontSize:18 }}><Blink color={RD} ms={500}>⚠</Blink></div>
                <div>
                  <div style={{ fontSize:10,fontWeight:700,color:RD,letterSpacing:"0.15em" }}>
                    !! UNDETECTED VULNERABILITY ALERT !!
                  </div>
                  <div style={{ fontSize:9,color:AM,marginTop:3,letterSpacing:"0.06em" }}>
                    POPULATION CLASSIFIED AS [{currentLPI.label}] — STRUCTURAL ANALYSIS DETECTS SIGNIFICANT INFRASTRUCTURE EXCLUSION NOT CAPTURED BY SURVEY METHODOLOGY
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ border:`1px solid ${DG}`,background:DDG,padding:"10px 14px",marginBottom:12 }}>
                <div style={{ fontSize:9,color:currentLPI.color,letterSpacing:"0.12em" }}>
                  ◉ ACTIVE ANALYSIS · THREAT CLASS: {currentLPI.label} · SECTOR: {country}
                </div>
              </div>
            )}

            {/* Metric cards */}
            {Object.entries(OUTCOMES).map(([k,meta])=>(
              <MetricCard key={k} outKey={k} meta={meta}
                predicted={preds[k]} baseline={bases[k]}
                popSize={popSize} lpiLevel={lpi} />
            ))}

            {/* Dependency chain */}
            <Bracket color={CY} title="CAUSAL DEPENDENCY CHAIN" style={{ marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" }}>
                {[
                  { label:"LPI",   val:currentLPI.short,         color:currentLPI.color },
                  ">>",
                  { label:"EDU",   val:`${Math.round((normEdu.none+normEdu.primary)*100)}% LOW`, color:AM },
                  ">>",
                  { label:"LOC",   val:`${100-urbanPct}% RURAL`, color:CY },
                  ">>",
                  { label:"INTEL", val:hasCalib?"CALIBRATED":"ESTIMATE", color:hasCalib?CY:DG },
                  ">>",
                  { label:"GRID Δ",val:pct(preds.pipedWater),    color:tc(preds.pipedWater) },
                  ">>",
                  { label:"VULN",  val:lpi==="no"?(preds.pipedWater>0.3?"DETECTED":"CLEAR"):"N/A", color:lpi==="no"&&preds.pipedWater>0.3?RD:G },
                ].map((node,i)=>
                  node===">>"
                    ? <span key={i} style={{ color:DG,fontSize:10 }}>▶▶</span>
                    : <div key={i} style={{ border:`1px solid ${node.color}44`,padding:"5px 8px",background:`${node.color}0a`,textAlign:"center" }}>
                        <div style={{ fontSize:8,color:DG,letterSpacing:"0.08em" }}>{node.label}</div>
                        <div style={{ fontSize:10,fontWeight:700,color:node.color,marginTop:2 }}>{node.val}</div>
                      </div>
                )}
              </div>
            </Bracket>

            {/* Methodology */}
            <div style={{ border:`1px solid ${DG}`,padding:"10px 14px",fontSize:9,color:DG,letterSpacing:"0.05em",lineHeight:1.8 }}>
              <span style={{ color:"#004400" }}>// METHODOLOGY // </span>
              LOG-ODDS ADJUSTMENT MODEL · AFROBAROMETER R9 · TABLES A.3–A.5 + FIG 5–7 · URBAN/RURAL + EDUCATION APPLIED AS ADDITIVE LOG-ODDS OFFSETS · COUNTRY OFFSETS ANCHORED AT NULL-POVERTY BASELINE · ASSUMES FACTOR INDEPENDENCE (V1 LIMITATION) · JOINT DISTRIBUTIONS PENDING V2
              <span style={{ color:RD }}> · RESTRICTED DISTRIBUTION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

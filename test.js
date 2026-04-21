// ════════════════════════════════════════════════════════════════
// KASPER MOBILE APP — Connected to Supabase
// ════════════════════════════════════════════════════════════════

// ── CONFIG (fill these in) ────────────────────────────────────────
const SUPA_URL  = 'https://qxnggifmmozngzguteen.supabase.co';
const SUPA_KEY  = 'sb_publishable_gUOvqITZjbThOGB6_ZBadg_I7mNT6kM';
const EMAILJS_SVC  = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TPL  = 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';
const SITE_URL  = window.location.origin; // Auto-detected from current domain

// ── Supabase helpers ──────────────────────────────────────────────
const sb = {
  h: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
  async get(q)    { const r = await fetch(`${SUPA_URL}/rest/v1/${q}`, { headers: this.h }); return r.json(); },
  async post(t,d) { const r = await fetch(`${SUPA_URL}/rest/v1/${t}`, { method:'POST', headers:{...this.h,'Prefer':'return=representation'}, body:JSON.stringify(d) }); return r.json(); },
  async patch(q,d){ return fetch(`${SUPA_URL}/rest/v1/${q}`, { method:'PATCH', headers:{...this.h,'Prefer':'return=minimal'}, body:JSON.stringify(d) }); },
};

// ── EmailJS helper ────────────────────────────────────────────────
async function sendConfirmationEmail(job) {
  // Ensure EmailJS is loaded
  if (!window.emailjs) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  emailjs.init(EMAILJS_KEY);
  const approveUrl = `${SITE_URL}/approve.html?job_id=${encodeURIComponent(job.job_code)}`;
  const svc = job.service_type === 'equipment'
    ? `Equipment: ${job.equipment_type||''} (${job.duration||''})`
    : `Freight: ${job.origin||''} → ${job.destination||''}`;
  return emailjs.send(EMAILJS_SVC, EMAILJS_TPL, {
    to_name:    job.client_name || 'Valued Client',
    to_email:   job.client_email,
    job_code:   job.job_code,
    service:    svc,
    price:      `AED ${Number(job.quoted_price).toLocaleString()}`,
    notes:      job.quote_notes || '',
    approve_url: approveUrl,
    valid_hours: '48',
  });
}

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:'#131313',surf:'#1b1c1c',surf2:'#1f2020',
  teal:'#00F2FF',tealDim:'rgba(0,242,255,.12)',
  amber:'#FF6B00',amberDim:'rgba(255,107,0,.12)',
  red:'#E24B4A',text:'#e5e2e1',muted:'#8c90a0',border:'rgba(66,71,84,0.3)',
};
const SL = {
  label:{enquiry:'Enquiry',quoted:'Quoted',po_pending:'PO Pending',confirmed:'Confirmed',assigned:'Assigned',
    in_transit:'In Transit',delivered:'Delivered',epod_pending:'ePOD Pending',
    epod_done:'ePOD Done',invoiced:'Invoiced',paid:'Paid'},
  color:{enquiry:'#8c90a0',quoted:'#afc6ff',po_pending:'#FF6B00',confirmed:'#9F7AEA',assigned:'#FF6B00',
    in_transit:'#00F2FF',delivered:'#9F7AEA',epod_pending:'#FF6B00',
    epod_done:'#00F2FF',invoiced:'#afc6ff',paid:'#00F2FF'},
};

// ── App state ─────────────────────────────────────────────────────
let state = {
  view:'login', driverTab:'home', opsTab:'dashboard', sub:null, selId:null, vendor_id:null,
  jobs:[], loading:false, tracking:false, location:null,
  schedOn:true, schedFrom:'06:00', schedTo:'20:00',
  epodPhoto:null, epodHasSig:false, busy:false,
};
let watchId=null, schedIv=null;

// ── Fleet ─────────────────────────────────────────────────────────
const FLEET = [
  { id: 1, name: 'Ahmed Al Rashidi', plate: 'Dubai A 12345', type: 'Flatbed 12m' },
  { id: 2, name: 'Mohammed Hassan', plate: 'Abu Dhabi B 54321', type: 'Boom Truck 10T' },
  { id: 3, name: 'Sanjay Kumar', plate: 'Sharjah C 99871', type: 'Curtain Sider 15m' },
  { id: 4, name: 'Usman Ali', plate: 'Dubai D 76543', type: 'Lowbed 30T' },
  { id: 5, name: 'Khan Transport LLC', plate: 'Ajman E 11223', type: 'Subcontractor - 3 Ton' }
];

// ── DOM helpers ───────────────────────────────────────────────────
const el=(tag,attrs={})=>{
  const e=document.createElement(tag);
  for(const[k,v] of Object.entries(attrs)){
    if(k==='class')e.className=v;
    else if(k.startsWith('on'))e.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='style'&&typeof v==='object')Object.assign(e.style,v);
    else e.setAttribute(k,v);
  }
  return e;
};
const txt=(tag,text,cls='')=>{ const e=el(tag,{class:cls}); e.textContent=text; return e; };

const badge=(s)=>{
  const col=SL.color[s]||C.muted;
  const e=el('span',{class:'tag',style:{background:col+'33',color:col,border:`1px solid ${col}55`}});
  e.textContent=SL.label[s]||s; return e;
};

const btn=(text,bg,onClick,disabled=false)=>{
  const b=el('button',{class:'btn',onclick:disabled?null:onClick});
  b.textContent=text; b.disabled=disabled;
  b.style.cssText=`background:${disabled?C.border:bg};color:#fff;border-color:${disabled?C.border:bg};opacity:${disabled?.6:1}`;
  return b;
};

const outlineBtn=(text,color,onClick,disabled=false)=>{
  const b=el('button',{class:'btn btn-out',onclick:disabled?null:onClick});
  b.textContent=text; b.disabled=disabled;
  b.style.cssText=`color:${disabled?C.muted:color};border-color:${disabled?C.muted:color};background:transparent`;
  return b;
};

const card=(style='')=>{const d=el('div',{class:'card'}); if(style)d.style.cssText+=style; return d;};

// ── Location — Live GPS push to Supabase ─────────────────────────
let gpsInterval=null;
async function pushGPS(lat,lng){
  // Push to active in_transit job
  const activeJob=state.jobs.find(j=>j.status==='in_transit' && (j.driver_name==='Ahmed Al Rashidi'||j.driverId===1));
  if(!activeJob) return;
  try{
    await sb.patch(`jobs?job_code=eq.${encodeURIComponent(activeJob.job_code)}`,{
      driver_lat:lat, driver_lng:lng, driver_location_updated_at:new Date().toISOString()
    });
  }catch(e){console.warn('GPS push failed',e);}
}

function startTracking(){
  if(state.tracking) return;
  if(navigator.geolocation){
    watchId=navigator.geolocation.watchPosition(
      p=>{
        const lat=p.coords.latitude, lng=p.coords.longitude;
        state.location={lat:lat.toFixed(5),lng:lng.toFixed(5)};
        render();
      },
      ()=>{state.location={lat:'25.20480',lng:'55.27080'};render();},
      {enableHighAccuracy:true,timeout:10000,maximumAge:5000}
    );
    // Push GPS to Supabase every 10 seconds
    gpsInterval=setInterval(()=>{
      if(state.location) pushGPS(parseFloat(state.location.lat),parseFloat(state.location.lng));
    },10000);
    // Also push immediately on first fix
    setTimeout(()=>{
      if(state.location) pushGPS(parseFloat(state.location.lat),parseFloat(state.location.lng));
    },2000);
  } else {
    state.location={lat:'25.20480',lng:'55.27080'};
  }
  state.tracking=true; render();
}
function stopTracking(){
  if(watchId)navigator.geolocation.clearWatch(watchId);
  if(gpsInterval)clearInterval(gpsInterval);
  watchId=null; gpsInterval=null;
  state.tracking=false; state.location=null; render();
}
function inWindow(){
  if(!state.schedOn) return false;
  const now=new Date(),cur=now.getHours()*60+now.getMinutes();
  const[sh,sm]=state.schedFrom.split(':').map(Number);
  const[eh,em]=state.schedTo.split(':').map(Number);
  return cur>=sh*60+sm&&cur<eh*60+em;
}
function checkSchedule(){
  if(state.view!=='driver'||!state.schedOn) return;
  if(inWindow()&&!state.tracking)startTracking();
  if(!inWindow()&&state.tracking)stopTracking();
}

// ── Data loading ──────────────────────────────────────────────────
async function loadJobs(){
  state.loading=true; render();
  try{
    let endpoint = 'jobs?order=created_at.desc';
    if(state.vendor_id) endpoint += `&vendor_id=eq.${state.vendor_id}`;
    const rows=await sb.get(endpoint);
    state.jobs=Array.isArray(rows)?rows:[];
  }catch(e){console.error('loadJobs',e);}
  state.loading=false; render();
}

async function updateJobStatus(jobCode, updates){
  await sb.patch(`jobs?job_code=eq.${encodeURIComponent(jobCode)}`, updates);
  await loadJobs();
}

function selJob(){ return state.jobs.find(j=>j.job_code===state.selId||j.id===state.selId); }

// ── Force Next Step pipeline ──────────────────────────────────────
const STATUS_PIPELINE=['enquiry','quoted','po_pending','confirmed','assigned','in_transit','delivered','epod_pending','epod_done','invoiced','paid'];
function nextStatus(current){
  const idx=STATUS_PIPELINE.indexOf(current);
  if(idx<0||idx>=STATUS_PIPELINE.length-1) return null;
  return STATUS_PIPELINE[idx+1];
}
async function forceNextStep(job){
  const ns=nextStatus(job.status);
  if(!ns) return;
  const extras={};
  if(ns==='quoted') extras.quoted_price=job.quoted_price||2500;
  if(ns==='po_pending'){ extras.approval_timestamp=new Date().toISOString(); extras.quoted_price=job.quoted_price||2500; }
  if(ns==='assigned'){ extras.driver_name=extras.driver_name||'Ahmed Al Rashidi'; extras.vehicle_plate='Dubai A 12345'; extras.driver_phone='+971501234567'; }
  await updateJobStatus(job.job_code,{status:ns,...extras});
}

// ── Reset Demo Data ───────────────────────────────────────────────
async function resetDemoData(){
  if(!confirm('Restore demo jobs to an ideal testing layout?')) return;
  try{
    // Fetch latest 10 jobs for current vendor
    const params = state.vendor_id ? `&vendor_id=eq.${state.vendor_id}` : '';
    const rows = await sb.get(`jobs?order=created_at.desc&limit=10${params}`);
    if(!rows || rows.length < 5){ alert('Not enough jobs to arrange a spread. Please create a few more.'); return; }
    
    // We want a perfect spread for the demo
    const spread = [
      { status:'enquiry', quoted_price:null },
      { status:'quoted', quoted_price:2500 },
      { status:'po_pending', quoted_price:3500, approval_timestamp:new Date().toISOString() },
      { status:'confirmed', quoted_price:3800, approval_timestamp:new Date().toISOString() },
      { status:'assigned', quoted_price:1200, driver_name:'Ahmed Al Rashidi', vehicle_plate:'Dubai A 12345', driver_phone:'+971501234567' },
      { status:'in_transit', quoted_price:4500, driver_name:'Salim Khoury', vehicle_plate:'Sharjah C 44521', driver_phone:'+971559887766', driver_lat:25.2048, driver_lng:55.2708 },
      { status:'delivered', driver_name:'John Smith', epod_client_done:false }
    ];

    const tasks = [];
    const clearOpts = { quote_notes:null, quote_sent_at:null, approval_timestamp:null, driver_name:null, vehicle_plate:null, driver_phone:null, driver_lat:null, driver_lng:null, epod_client_done:false };

    for(let i=0; i<Math.min(rows.length, spread.length); i++){
      const job = rows[i];
      const target = spread[i];
      tasks.push(sb.patch(`jobs?job_code=eq.${job.job_code}`, { ...clearOpts, ...target }));
    }

    // Set any remaining jobs to enquiry
    for(let i=spread.length; i<rows.length; i++){
      tasks.push(sb.patch(`jobs?job_code=eq.${rows[i].job_code}`, { status:'enquiry', ...clearOpts }));
    }

    await Promise.all(tasks);
    await loadJobs();
    alert('✅ Dashboard layout magically restored!');
  }catch(e){ console.error('Reset failed',e); alert('Reset failed — see console.'); }
}

// ── Signature pad ─────────────────────────────────────────────────
let sigDrawing=false,sigLast=null;
function initSig(canvas){
  if(!canvas)return;
  canvas.width=600;canvas.height=160;
  const ctx=canvas.getContext('2d');
  const xy=e=>{
    const r=canvas.getBoundingClientRect();
    const s=e.touches?e.touches[0]:e;
    return{x:(s.clientX-r.left)*(600/r.width),y:(s.clientY-r.top)*(160/r.height)};
  };
  const start=e=>{e.preventDefault();sigDrawing=true;sigLast=xy(e);};
  const move=e=>{
    e.preventDefault();if(!sigDrawing)return;
    const p=xy(e);
    ctx.strokeStyle='#131313';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(sigLast.x,sigLast.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    sigLast=p;state.epodHasSig=true;
  };
  const end=()=>{sigDrawing=false;};
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);
  canvas.addEventListener('mouseup',end);canvas.addEventListener('mouseleave',end);
  canvas.addEventListener('touchstart',start,{passive:false});
  canvas.addEventListener('touchmove',move,{passive:false});
  canvas.addEventListener('touchend',end);
}

// ── CSS injection ─────────────────────────────────────────────────
const css=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:${C.bg};font-family:'Inter',system-ui,-apple-system,sans-serif;color:${C.text}}
#app{min-height:100vh;display:flex;flex-direction:column}
.topbar{background:${C.surf};padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid ${C.border};position:sticky;top:0;z-index:20}
.back-btn{background:none;border:none;color:${C.teal};cursor:pointer;font-size:28px;line-height:1;padding:0}
.switch-btn{background:none;border:none;color:${C.muted};font-size:12px;cursor:pointer;padding:4px 8px}
.topbar-title{flex:1;font-weight:700;font-size:16px;color:${C.text}}
.bottom-nav{background:${C.surf};border-top:1px solid ${C.border};display:flex;padding:6px 0}
.nav-btn{flex:1;background:none;border:none;cursor:pointer;padding:4px 2px;display:flex;flex-direction:column;align-items:center;gap:2px}
.nav-icon{font-size:20px}.nav-label{font-size:10px;font-weight:600}
.scroll-area{flex:1;overflow-y:auto}
.pad{padding:16px}
.card{background:${C.surf};border:1px solid ${C.border};border-radius:12px;padding:14px;margin-bottom:10px}
.card-teal{border-color:${C.teal};background:${C.tealDim}}
.card-amber{border-color:${C.amber};background:${C.amberDim}}
.tag{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.lbl{font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.btn{width:100%;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:.3px;border:1.5px solid;color:#fff}
.btn-out{background:transparent!important;border-width:1.5px}
.btn-sm{padding:8px 16px;font-size:13px}
canvas{display:block;touch-action:none;cursor:crosshair;background:#fff;border-radius:8px;width:100%}
input,select,textarea{width:100%;background:${C.bg};border:1px solid ${C.border};border-radius:8px;padding:10px 12px;color:${C.text};font-size:15px;font-family:inherit}
textarea{resize:none;height:76px}
.sep{height:1px;background:${C.border};margin:10px 0}
.mono{font-family:monospace}
.pill{display:flex;align-items:center;gap:8px;border-radius:20px;padding:5px 12px;border:1px solid}
.dot8{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:flex-end;padding:0}
.modal{background:${C.surf};border-radius:16px 16px 0 0;padding:24px 16px 32px;width:100%;max-height:85vh;overflow-y:auto}
.loading-pulse{opacity:.5;animation:pulse 1s infinite alternate}
@keyframes pulse{to{opacity:.2}}`;
const sEl=document.createElement('style');sEl.textContent=css;document.head.appendChild(sEl);

// ── TOP BAR ───────────────────────────────────────────────────────
function renderTopBar(title,onBack,right){
  const bar=el('div',{class:'topbar'});
  if(onBack){const b=el('button',{class:'back-btn',onclick:onBack});b.textContent='‹';bar.append(b);}
  
  const tc=el('div',{style:{flex:'1',display:'flex',alignItems:'center',gap:'8px'}});
  if(!onBack){
     const isAHC = state.vendor_id === '22222222-2222-2222-2222-222222222222';
     const lg=txt('span', isAHC ? '⬢ AL HAMD' : '⬢ KASPER');
     lg.style.cssText=`font-weight:800;color:${isAHC?C.amber:C.teal};letter-spacing:1px;font-size:16px`;
     tc.append(lg);
  }
  const t=txt('span', onBack ? title : `—  ${title}`);
  t.style.cssText=`font-size:${onBack?'16px':'13px'};color:${onBack?C.text:C.muted};font-weight:${onBack?'700':'500'};`;
  tc.append(t);
  bar.append(tc);

  if(right)bar.append(right);
  return bar;
}
function topbarRight(view){
  const wrap=el('div',{style:{display:'flex',alignItems:'center',gap:'6px'}});
  if(view==='ops'){
    const rb=el('button',{class:'switch-btn',onclick:()=>loadJobs()});
    rb.style.color=C.teal;rb.textContent='↻';
    const rst=el('button',{class:'switch-btn',onclick:()=>resetDemoData()});
    rst.style.cssText=`color:${C.amber};font-size:10px;opacity:.8`;
    rst.textContent='🔄 RST';
    wrap.append(rb,rst);
  }
  const x=el('button',{class:'switch-btn',onclick:()=>{state.view='login';state.sub=null;state.vendor_id=null;stopTracking();render();}});
  x.style.color=C.red;x.textContent='⏏️';
  wrap.append(x);
  return wrap;
}

// ── BOTTOM NAV ────────────────────────────────────────────────────
function renderBottomNav(tabs,active,onClick){
  const nav=el('div',{class:'bottom-nav'});
  tabs.forEach(t=>{
    const b=el('button',{class:'nav-btn',onclick:()=>onClick(t.key)});
    const i=txt('span',t.icon,'nav-icon');
    const l=txt('span',t.label,'nav-label');
    l.style.color=active===t.key?C.teal:C.muted;
    b.append(i,l);nav.append(b);
  });
  return nav;
}

// ════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════
function renderLogin(){
  const d=el('div',{style:{background:C.bg,padding:'40px 24px',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center'}});
  
  const logo=txt('div','⬢ KASPER');logo.style.cssText=`font-size:36px;font-weight:800;color:${C.teal};letter-spacing:3px;text-align:center;margin-bottom:6px`;
  const sub=txt('div','Digital Iron OS');sub.style.cssText=`font-size:14px;color:${C.muted};text-align:center;margin-bottom:30px`;
  d.append(logo, sub);

  const container = el('div', {style:{display:'flex',flexDirection:'column',gap:'20px',width:'100%',maxWidth:'400px'}});

  // --- CARD 1: Kasper Staff ---
  const card1=el('div',{class:'card',style:{padding:'30px 24px'}});
  const title1=txt('h2','Kasper Staff Access');title1.style.cssText=`font-size:20px;margin-bottom:20px;text-align:center;color:${C.text}`;
  const f1=el('form');
  f1.onsubmit = (e) => {
    e.preventDefault();
    state.vendor_id = '11111111-1111-1111-1111-111111111111';
    state.view = roleSelect1.value;
    state.sub = null; loadJobs(); checkSchedule(); render();
  };
  const id1=el('input',{type:'text',placeholder:'Staff ID or Email',value:'ops@kasper.ae',style:{width:'100%',padding:'14px',background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:'8px',marginBottom:'12px'}});
  const pw1=el('input',{type:'password',placeholder:'Password',value:'12345',style:{width:'100%',padding:'14px',background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:'8px',marginBottom:'12px'}});
  const roleSelect1=el('select',{style:{width:'100%',padding:'14px',background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:'8px',marginBottom:'20px',appearance:'none'}});
  roleSelect1.append(el('option',{value:'ops',textContent:'Operations Manager'}), el('option',{value:'driver',textContent:'Fleet Driver App'}));
  roleSelect1.children[0].textContent = 'Operations Manager';
  roleSelect1.children[1].textContent = 'Fleet Driver App';
  const btn1=el('button',{type:'submit',style:{width:'100%',padding:'14px',background:C.teal,color:'#fff',border:'none',borderRadius:'8px',fontWeight:'bold',cursor:'pointer'}});
  btn1.textContent = 'Login';
  f1.append(id1, pw1, roleSelect1, btn1);
  card1.append(title1, f1);

  // --- CARD 2: Vendor SaaS ---
  const card2=el('div',{class:'card',style:{padding:'30px 24px',border:`1px solid ${C.amber}55`}});
  const title2=txt('h2','Partner SaaS Portal');title2.style.cssText=`font-size:20px;margin-bottom:6px;text-align:center;color:${C.amber}`;
  const sub2=txt('div','White-label Vendor UI');sub2.style.cssText='font-size:12px;color:'+C.muted+';text-align:center;margin-bottom:20px';
  const f2=el('form');
  f2.onsubmit = async (e) => {
    e.preventDefault();
    state.vendor_id = '22222222-2222-2222-2222-222222222222'; // Al Hamd Demo
    state.view = 'ops';
    state.sub = null; loadJobs(); checkSchedule(); render();
  };
  const id2=el('input',{type:'text',placeholder:'Partner Email',value:'admin@alhamd-transport.ae',style:{width:'100%',padding:'14px',background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:'8px',marginBottom:'12px'}});
  const pw2=el('input',{type:'password',placeholder:'Password',value:'12345',style:{width:'100%',padding:'14px',background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:'8px',marginBottom:'20px'}});
  const btn2=el('button',{type:'submit',style:{width:'100%',padding:'14px',background:C.amber,color:'#fff',border:'none',borderRadius:'8px',fontWeight:'bold',cursor:'pointer'}});
  btn2.textContent = 'Login as Vendor';
  f2.append(id2, pw2, btn2);
  card2.append(title2, sub2, f2);

  container.append(card1, card2);
  
  const bypass=txt('div','Demo Mode: Click Login to bypass credentials');bypass.style.cssText=`font-size:12px;color:${C.muted};text-align:center;margin-top:20px`;
  
  const homeLink=el('a',{href:'index.html',style:{display:'block',textAlign:'center',color:C.teal,fontSize:'13px',marginTop:'30px',textDecoration:'none'}});
  homeLink.textContent='← Back to Homepage';
  
  d.append(container, bypass, homeLink);
  return d;
}

// ════════════════════════════════════════════════════════════════
// DRIVER SCREENS
// ════════════════════════════════════════════════════════════════
function renderDriverHome(){
  const{jobs,tracking,location,schedOn,schedFrom,schedTo,loading}=state;
  const myJobs=jobs.filter(j=>j.driver_name==='Ahmed Al Rashidi'||j.driverId===1);
  const active=myJobs.find(j=>j.status==='in_transit');
  const epodPending=myJobs.filter(j=>j.status==='delivered'&&!j.epod_client_done);
  const d=el('div',{class:'pad'});

  if(loading){const l=txt('div','Loading jobs…','loading-pulse');l.style.cssText=`color:${C.muted};text-align:center;padding:40px`;d.append(l);return d;}

  // Driver card
  const dc=el('div',{class:'card card-teal'});
  const dcTop=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}});
  const dn=el('div');
  const dnName=txt('div','Ahmed Al Rashidi');dnName.style.cssText=`font-size:17px;font-weight:700;color:${C.text}`;
  const dnPlate=txt('div','Dubai A 12345');dnPlate.style.cssText=`font-size:13px;color:${C.muted}`;
  dn.append(dnName,dnPlate);
  const dutyTag=txt('span','On Duty','tag');dutyTag.style.cssText=`background:${C.tealDim};color:${C.teal};border:1px solid ${C.teal}33`;
  dcTop.append(dn,dutyTag);dc.append(dcTop);
  // Location pill
  const pill=el('div',{class:tracking?'pill':'pill',style:{background:tracking?C.tealDim:'transparent',borderColor:tracking?C.teal:C.border}});
  const dot=el('div',{class:'dot8'});dot.style.cssText=`background:${tracking?C.teal:C.muted};${tracking?`box-shadow:0 0 6px ${C.teal}`:''}`;
  const plText=txt('div',tracking?(location?`${location.lat}, ${location.lng}`:'Locating…'):'Location Off');
  plText.style.cssText=`font-size:12px;font-weight:600;color:${tracking?C.teal:C.muted}`;
  pill.append(dot,plText);dc.append(pill);
  if(schedOn){const si=txt('div',`Auto-share: ${schedFrom} – ${schedTo}  `);si.style.cssText=`font-size:12px;color:${C.muted};margin:8px 0`;const win=txt('span',inWindow()?'● In window':'○ Outside window');win.style.color=inWindow()?C.teal:C.amber;si.append(win);dc.append(si);}
  const btns=el('div',{style:{display:'flex',gap:'10px',marginTop:'12px'}});
  const tb=btn(tracking?'■ End Trip':'▶ Start Trip',tracking?C.red:C.teal,()=>{tracking?stopTracking():startTracking();});
  tb.style.flex='1';
  const sb2=outlineBtn('⚙ Schedule',C.teal,()=>{state.sub='location';render();});
  sb2.style.cssText+=';flex:1';
  btns.append(tb,sb2);dc.append(btns);d.append(dc);

  // Active job
  if(active){
    const ac=el('div',{class:'card card-teal',style:{cursor:'pointer'}});
    ac.onclick=()=>{state.selId=active.job_code;state.sub='job-detail';render();};
    const at=el('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px'}});
    const al=txt('span','ACTIVE JOB');al.style.cssText=`font-size:11px;font-weight:700;color:${C.teal}`;
    at.append(al,badge(active.status));ac.append(at);
    const ai=txt('div',active.job_code,'mono');ai.style.cssText=`font-size:14px;font-weight:700;color:${C.text};margin-bottom:4px`;
    const acl=txt('div',active.client_name||active.company_name||'—');acl.style.cssText=`font-size:13px;color:${C.muted};margin-bottom:2px`;
    const rt=active.service_type==='logistics'?`${active.origin||''} → ${active.destination||''}`:active.equipment_type||'';
    const arr=txt('div',rt);arr.style.cssText=`font-size:12px;color:${C.muted}`;
    const tap=txt('div','Tap to manage →');tap.style.cssText=`font-size:11px;font-weight:700;color:${C.teal};margin-top:10px`;
    ac.append(ai,acl,arr,tap);d.append(ac);
  } else {
    const nj=el('div',{class:'card'});nj.style.cssText=`text-align:center;color:${C.muted};padding:20px`;nj.textContent='No active trip right now';d.append(nj);
  }

  // ePOD alerts
  if(epodPending.length){
    const ea=el('div',{class:'card card-amber'});
    const et=txt('div',`⚠ ${epodPending.length} delivery awaiting ePOD sign-off`);
    et.style.cssText=`font-size:13px;font-weight:700;color:${C.amber};margin-bottom:10px`;ea.append(et);
    epodPending.forEach(j=>{
      const er=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}});
      const em=el('div');em.append(txt('div',j.job_code,'mono'),txt('div',j.client_name||''));
      const eb=btn('Sign ePOD',C.teal,()=>{state.selId=j.job_code;state.sub='job-detail';render();});
      eb.style.cssText='width:auto;padding:6px 14px;font-size:13px;';er.append(em,eb);ea.append(er);
    });
    d.append(ea);
  }

  // All jobs list
  const jc=el('div',{class:'card'});
  const jh=txt('div','All My Jobs');jh.style.cssText=`font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px`;
  jc.append(jh);
  (myJobs.length?myJobs:[]).forEach((j,i,arr)=>{
    const jr=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',cursor:'pointer',borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none'}});
    jr.onclick=()=>{state.selId=j.job_code;state.sub='job-detail';render();};
    const jm=el('div');jm.append(txt('div',j.job_code,'mono'),txt('div',j.client_name||j.company_name||''));
    jr.append(jm,badge(j.status));jc.append(jr);
  });
  d.append(jc);return d;
}

function renderLocationSettings(){
  const{schedOn,schedFrom,schedTo,tracking}=state;
  const d=el('div',{class:'pad'});

  // Schedule card
  const sc=el('div',{class:'card'});
  const sTop=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}});
  const sLabel=el('div');sLabel.append(txt('div','Scheduled Sharing'),txt('div','Auto-share location in your work window'));
  sLabel.children[0].style.cssText=`font-size:15px;font-weight:700;color:${C.text};margin-bottom:4px`;
  sLabel.children[1].style.cssText=`font-size:12px;color:${C.muted}`;
  const toggle=el('label',{style:{position:'relative',display:'inline-block',width:'48px',height:'26px',cursor:'pointer',flexShrink:'0'}});
  const chk=el('input',{type:'checkbox'});chk.checked=schedOn;chk.style.cssText='opacity:0;width:0;height:0;position:absolute';
  chk.onchange=()=>{state.schedOn=chk.checked;checkSchedule();render();};
  const track=el('span');track.style.cssText=`position:absolute;inset:0;border-radius:26px;background:${schedOn?C.teal:C.border};transition:.2s`;
  const thumb=el('span');thumb.style.cssText=`position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:3px;left:${schedOn?'25px':'3px'};transition:.2s`;
  toggle.append(chk,track,thumb);sTop.append(sLabel,toggle);sc.append(sTop);

  if(schedOn){
    const sg=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginTop:'8px',opacity:schedOn?1:.4}});
    ['schedFrom','schedTo'].forEach((key,i)=>{
      const g=el('div');
      const l=txt('div',i===0?'START sharing at':'STOP sharing at','lbl');
      const inp=el('input',{type:'time'});inp.value=state[key];
      inp.onchange=e=>{state[key]=e.target.value;checkSchedule();};
      g.append(l,inp);sg.append(g);
    });
    sc.append(sg);
  }
  d.append(sc);

  // Manual override
  const mc=el('div',{class:'card'});
  mc.append(txt('div','Manual Override'),txt('div','Force-start or stop location sharing regardless of schedule.'));
  mc.children[0].style.cssText=`font-size:15px;font-weight:700;color:${C.text};margin-bottom:4px`;
  mc.children[1].style.cssText=`font-size:12px;color:${C.muted};margin-bottom:14px;line-height:1.6`;
  const mbr=el('div',{style:{display:'flex',gap:'10px'}});
  const sb3=btn(tracking?'Currently Active':'Start Now',tracking?C.border:C.teal,()=>{if(!tracking)startTracking();},tracking);sb3.style.flex='1';
  const eb=outlineBtn('Stop Now',C.red,()=>{if(tracking)stopTracking();},!tracking);eb.style.flex='1';
  mbr.append(sb3,eb);mc.append(mbr);d.append(mc);

  const ic=el('div',{class:'card',style:{fontSize:'12px',color:C.muted,lineHeight:'1.7'}});
  ic.textContent='Location is shared only during the scheduled window or when manually started. It is visible to your dispatcher and client on the live tracking link.';
  d.append(ic);return d;
}

function renderDriverJobDetail(){
  const j=selJob();if(!j)return el('div');
  const isMyJob=true;
  const d=el('div',{class:'pad'});
  const hdr=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}});
  hdr.append(txt('span',j.job_code,'mono'),badge(j.status));d.append(hdr);

  const cc=el('div',{class:'card'});cc.append(txt('div','Client','lbl'),txt('div',j.client_name||j.company_name||'—'),txt('div',j.client_email||j.client_phone||'—'));
  cc.children[1].style.cssText=`font-size:15px;font-weight:600;color:${C.text}`;
  cc.children[2].style.cssText=`font-size:13px;color:${C.muted}`;
  d.append(cc);

  const rc=el('div',{class:'card'});rc.append(txt('div','Route','lbl'));
  const route=j.service_type==='logistics'?`${j.origin||'—'} → ${j.destination||'—'}`:j.equipment_type||'—';
  rc.append(txt('div',`▲ ${j.origin||j.equipment_type||'—'}`),txt('div',`◉ ${j.destination||j.emirate||'—'}`));
  rc.children[1].style.cssText=`font-size:13px;color:${C.text};margin-bottom:4px`;
  rc.children[2].style.cssText=`font-size:13px;color:${C.text}`;d.append(rc);

  const g2=el('div',{class:'grid2'});
  const pc=el('div',{class:'card'});pc.append(txt('div','Amount','lbl'));
  const prv=txt('div',j.quoted_price?`AED ${Number(j.quoted_price).toLocaleString()}`:'Pending');
  prv.style.cssText=`font-size:16px;font-weight:700;color:${C.teal}`;pc.append(prv);
  const dc2=el('div',{class:'card'});dc2.append(txt('div','Date','lbl'),txt('div',j.pickup_date||j.start_date||'—'));
  g2.append(pc,dc2);d.append(g2);

  if(j.driver_name){
    const drv=el('div',{class:'card'});drv.append(txt('div','Driver','lbl'),txt('div',j.driver_name),txt('div',`${j.vehicle_plate||''}  ${j.driver_phone||''}`));
    drv.children[1].style.cssText=`font-size:14px;font-weight:600;color:${C.text}`;
    drv.children[2].style.cssText=`font-size:12px;color:${C.muted}`;d.append(drv);
  }

  // ePOD status
  if(j.epod_client_done){
    const ec=el('div',{class:'card card-teal'});ec.append(txt('div','Client ePOD: Signed ✓'),txt('div',j.epod_notes||''));
    ec.children[0].style.cssText=`font-size:14px;font-weight:700;color:${C.teal}`;d.append(ec);
  }

  const acts=el('div',{style:{display:'flex',flexDirection:'column',gap:'10px',marginTop:'16px'}});
  if(j.status==='assigned'){
    const sb4=btn('▶ Start Trip',C.teal,async()=>{
      sb4.disabled=true;sb4.textContent='Updating…';
      await updateJobStatus(j.job_code,{status:'in_transit'});startTracking();
    });acts.append(sb4);
  }
  if(j.status==='in_transit'){
    const eb=btn('Mark as Delivered',C.amber,async()=>{
      eb.disabled=true;eb.textContent='Updating…';
      await updateJobStatus(j.job_code,{status:'delivered'});stopTracking();
    });acts.append(eb);
  }
  if(j.status==='delivered'&&!j.epod_client_done){
    const ep=btn('Complete ePOD Sign-off →',C.teal,()=>{state.selId=j.job_code;state.sub='epod';state.epodHasSig=false;render();});
    acts.append(ep);
  }
  d.append(acts);

  // ── FORCE NEXT STEP (Driver) ──────────────────────────────────
  const ns=nextStatus(j.status);
  if(ns){
    const sep2=el('div');sep2.style.cssText=`height:1px;background:${C.border};margin:16px 0 10px`;
    const fnLabel=txt('div','⚡ Force Next Step');fnLabel.style.cssText=`font-size:11px;color:${C.amber};text-align:center;margin-bottom:8px`;
    const fnb=outlineBtn(`Force → ${SL.label[ns]||ns}`,C.amber,async()=>{
      fnb.textContent='Advancing…';fnb.disabled=true;
      await forceNextStep(j);
    });
    fnb.style.cssText+=`;font-size:12px;padding:8px 16px;width:100%;opacity:.8`;
    d.append(sep2,fnLabel,fnb);
  }

  return d;
}

function renderEPODCapture(){
  const j=selJob();if(!j)return el('div');
  const d=el('div',{class:'pad'});
  const jc=el('div',{class:'card',style:{marginBottom:'16px'}});
  jc.append(txt('div','Completing delivery for'),txt('div',j.job_code,'mono'),txt('div',j.client_name||j.company_name||''));
  jc.children[0].style.cssText=`font-size:13px;color:${C.muted};margin-bottom:4px`;
  jc.children[1].style.cssText=`font-size:16px;font-weight:700;color:${C.text};margin-bottom:2px`;
  d.append(jc);

  // Photo
  const ph=el('div',{style:{marginBottom:'18px'}});
  const phl=el('div');phl.innerHTML=`<span style="font-size:14px;font-weight:700;color:${C.text}">Step 1 — Delivery Photo</span> <span style="color:${C.red}">*</span>`;
  ph.append(phl,txt('div','Take a clear photo at the drop-off point'));
  ph.children[1].style.cssText=`font-size:12px;color:${C.muted};margin:6px 0 10px`;
  const photoLabel=el('label',{style:{display:'block',border:`2px dashed ${state.epodPhoto?C.teal:C.border}`,borderRadius:'12px',padding:state.epodPhoto?'8px':'28px',textAlign:'center',cursor:'pointer',background:state.epodPhoto?C.tealDim:'transparent'}});
  const photoInput=el('input',{type:'file',accept:'image/*',capture:'environment'});photoInput.style.display='none';
  photoInput.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=ev=>{state.epodPhoto=ev.target.result;render();};r.readAsDataURL(f);
  };
  if(state.epodPhoto){
    const img=el('img');img.src=state.epodPhoto;img.style.cssText='width:100%;border-radius:8px;max-height:220px;object-fit:cover;display:block';
    photoLabel.append(photoInput,img);
  } else {
    const plc=el('div');plc.innerHTML=`<div style="font-size:36px;margin-bottom:8px">📷</div><div style="font-size:14px;color:${C.muted};font-weight:600">Take photo</div><div style="font-size:12px;color:${C.muted};margin-top:4px">or upload from gallery</div>`;
    photoLabel.append(photoInput,plc);
  }
  ph.append(photoLabel);d.append(ph);

  // Sig
  const sg=el('div',{style:{marginBottom:'18px'}});
  const sgl=el('div');sgl.innerHTML=`<span style="font-size:14px;font-weight:700;color:${C.text}">Step 2 — Your Signature</span> <span style="color:${C.red}">*</span>`;
  sg.append(sgl,txt('div','Sign to confirm you completed the delivery'));
  sg.children[1].style.cssText=`font-size:12px;color:${C.muted};margin:6px 0 10px`;
  const cnv=el('canvas',{id:'sig-canvas'});sg.append(cnv);
  if(state.epodHasSig){const clr=txt('button','Clear signature');clr.style.cssText=`background:none;border:none;color:${C.amber};font-size:12px;cursor:pointer;padding:4px 0`;clr.onclick=()=>{const c=document.getElementById('sig-canvas');if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);state.epodHasSig=false;};sg.append(clr);}
  d.append(sg);

  // Notes
  const nt=el('div',{style:{marginBottom:'20px'}});nt.append(txt('div','Step 3 — Condition Notes (optional)'));nt.children[0].style.cssText=`font-size:14px;font-weight:700;color:${C.text};margin-bottom:6px`;
  const ta=el('textarea',{id:'epod-notes-input',placeholder:'Any exceptions, damage, or delivery notes…'});nt.append(ta);d.append(nt);

  const canSubmit=state.epodPhoto&&state.epodHasSig&&!state.busy;
  const sbBtn=btn(state.busy?'Submitting…':'Submit & Generate Client Sign-off Link',canSubmit?C.teal:C.border,async()=>{
    if(!canSubmit)return;
    state.busy=true;render();
    const code=Math.random().toString(36).slice(2,8).toUpperCase();
    const link=`${SITE_URL}/track-result.html?job_id=${encodeURIComponent(j.job_code)}`;
    const notes=document.getElementById('epod-notes-input')?.value||'';
    await updateJobStatus(j.job_code,{status:'epod_pending',epod_client_done:false,epod_client_link:link,epod_notes:notes,epod_timestamp:new Date().toISOString()});
    state.busy=false;state.sub='epod-success';render();
  });sbBtn.disabled=!canSubmit;d.append(sbBtn);

  setTimeout(()=>{const c=document.getElementById('sig-canvas');if(c)initSig(c);},50);
  return d;
}

function renderEPODSuccess(){
  const j=selJob();if(!j)return el('div');
  const d=el('div',{class:'pad'});
  const hero=el('div',{style:{textAlign:'center',padding:'28px 0 20px'}});
  hero.append(txt('div','✅'),txt('div','ePOD Submitted'),txt('div','Your delivery is confirmed. The client sign-off link is ready.'));
  hero.children[0].style.cssText='font-size:56px;margin-bottom:12px';
  hero.children[1].style.cssText=`font-size:20px;font-weight:700;color:${C.text};margin-bottom:6px`;
  hero.children[2].style.cssText=`font-size:14px;color:${C.muted};max-width:260px;margin:0 auto`;d.append(hero);

  const lc=el('div',{class:'card card-teal'});
  lc.append(txt('div','CLIENT SIGN-OFF LINK','lbl'));
  const lv=txt('div',j.epod_client_link||'—');lv.style.cssText=`font-size:13px;color:${C.teal};word-break:break-all;margin-bottom:12px`;
  let copied=false;
  const cp=outlineBtn('Copy Link',C.teal,async()=>{try{await navigator.clipboard.writeText(j.epod_client_link);}catch{}cp.textContent='✓ Copied';setTimeout(()=>cp.textContent='Copy Link',2000);});
  lc.append(lv,cp);d.append(lc);

  const hb=btn('Back to Home',C.teal,()=>{state.sub=null;state.selId=null;state.driverTab='home';render();});
  d.append(hb);return d;
}

// ════════════════════════════════════════════════════════════════
// OPS SCREENS
// ════════════════════════════════════════════════════════════════
function renderOpsDashboard(){
  const{jobs,loading}=state;
  const d=el('div',{class:'pad'});
  if(loading){const l=txt('div','Loading…','loading-pulse');l.style.cssText=`color:${C.muted};text-align:center;padding:40px`;d.append(l);return d;}

  const counts={transit:jobs.filter(j=>j.status==='in_transit').length,
    assigned:jobs.filter(j=>j.status==='assigned').length,
    epod:jobs.filter(j=>j.status==='epod_pending').length,
    enquiry:jobs.filter(j=>j.status==='enquiry').length};
  const g=el('div',{class:'grid2',style:{marginBottom:'16px'}});
  [{l:'New Enquiries',v:counts.enquiry,c:'#5B8AF0'},{l:'In Transit',v:counts.transit,c:C.teal},
   {l:'ePOD Pending',v:counts.epod,c:C.red},{l:'Assigned',v:counts.assigned,c:C.amber}].forEach(s=>{
    const sc=el('div',{class:'card'});
    const sv=txt('div',String(s.v));sv.style.cssText=`font-size:30px;font-weight:800;color:${s.c};margin-bottom:4px`;
    const sl=txt('div',s.l);sl.style.cssText=`font-size:12px;color:${C.muted};font-weight:600`;
    sc.append(sv,sl);g.append(sc);
  });d.append(g);

  const lc=el('div',{class:'card'});
  const lh=txt('div','All Jobs');lh.style.cssText=`font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px`;lc.append(lh);
  jobs.forEach((j,i)=>{
    const r=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<jobs.length-1?`1px solid ${C.border}`:'none',cursor:'pointer'}});
    r.onclick=()=>{state.selId=j.job_code;state.sub='ops-job-detail';render();};
    const m=el('div');m.append(txt('div',j.job_code,'mono'),txt('div',j.client_name||j.company_name||'—'));
    m.children[0].style.cssText=`font-size:13px;font-weight:600;color:${C.text}`;
    m.children[1].style.cssText=`font-size:12px;color:${C.muted}`;
    r.append(m,badge(j.status));lc.append(r);
  });
  if(!jobs.length){const nj=txt('div','No jobs yet. Waiting for bookings…');nj.style.cssText=`color:${C.muted};font-size:14px;text-align:center;padding:20px`;lc.append(nj);}
  d.append(lc);return d;
}

function renderOpsJobs(){
  const{jobs,loading}=state;
  const d=el('div',{class:'pad'});
  if(loading){const l=txt('div','Loading…','loading-pulse');l.style.cssText=`color:${C.muted};text-align:center;padding:40px`;d.append(l);return d;}

  const groups=[{key:'enquiry',label:'New Enquiries'},{key:'quoted',label:'Quoted'},{key:'po_pending',label:'PO Pending'},{key:'confirmed',label:'Confirmed'},
    {key:'assigned',label:'Assigned'},{key:'in_transit',label:'In Transit'},{key:'delivered',label:'Delivered'},
    {key:'epod_pending',label:'ePOD Pending'},{key:'invoiced',label:'Invoiced'}];
  groups.forEach(g=>{
    const list=jobs.filter(j=>j.status===g.key);if(!list.length)return;
    const gh=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}});
    const gl=txt('span',g.label);gl.style.cssText=`font-size:11px;color:${C.muted};font-weight:700;text-transform:uppercase;letter-spacing:.5px`;
    const gc=txt('span',String(list.length),'tag');gc.style.cssText=`background:${SL.color[g.key]||C.muted}22;color:${SL.color[g.key]||C.muted}`;
    gh.append(gl,gc);d.append(gh);
    list.forEach(j=>{
      const jc=el('div',{class:'card',style:{marginBottom:'8px',cursor:'pointer'}});
      jc.onclick=()=>{state.selId=j.job_code;state.sub='ops-job-detail';render();};
      const jh=el('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'6px'}});
      jh.append(txt('span',j.job_code,'mono'),badge(j.status));
      const rt=j.service_type==='logistics'?`${j.origin||'—'} → ${j.destination||'—'}`:j.equipment_type||'—';
      const jcl=txt('div',j.client_name||j.company_name||'—');jcl.style.cssText=`font-size:13px;color:${C.text};margin-bottom:2px`;
      const jrt=txt('div',rt);jrt.style.cssText=`font-size:12px;color:${C.muted}`;
      jc.append(jh,jcl,jrt);d.append(jc);
    });
  });
  return d;
}

// ── OPS JOB DETAIL (with quote-send) ─────────────────────────────
function renderOpsJobDetail(){
  const j=selJob();if(!j)return el('div');
  const d=el('div',{class:'pad'});
  const hdr=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}});
  hdr.append(txt('span',j.job_code,'mono'),badge(j.status));d.append(hdr);

  const g2=el('div',{class:'grid2'});
  const cc=el('div',{class:'card'});cc.append(txt('div','CLIENT','lbl'),txt('div',j.client_name||j.company_name||'—'),txt('div',j.client_phone||'—'),txt('div',j.client_email||'—'));
  cc.children[1].style.cssText=`font-size:13px;font-weight:600;color:${C.text}`;
  cc.children[2].style.cssText=`font-size:12px;color:${C.muted}`;
  cc.children[3].style.cssText=`font-size:12px;color:${C.teal}`;
  const sc=el('div',{class:'card'});
  sc.append(txt('div','SERVICE','lbl'),txt('div',j.service_type==='equipment'?'Equipment Rental':'Freight Booking'));
  if(j.quoted_price){const pr=txt('div',`AED ${Number(j.quoted_price).toLocaleString()}`);pr.style.cssText=`font-size:16px;font-weight:700;color:${C.teal};margin-top:4px`;sc.append(pr);}
  g2.append(cc,sc);d.append(g2);

  const rc=el('div',{class:'card'});
  const rt=j.service_type==='logistics'?`${j.origin||'—'} → ${j.destination||'—'}`:j.equipment_type||'—';
  rc.append(txt('div','ROUTE / SERVICE','lbl'),txt('div',rt));
  rc.children[1].style.cssText=`font-size:14px;color:${C.text}`;d.append(rc);

  // Timeline
  const tc=el('div',{class:'card'});tc.append(txt('div','TIMELINE','lbl'));
  const steps=['enquiry','quoted','po_pending','confirmed','assigned','in_transit','delivered','epod_pending','invoiced'];
  const labels=['Enquiry','Quoted','PO Pending','Confirmed','Assigned','In Transit','Delivered','ePOD Pending','Invoiced'];
  const curIdx=steps.indexOf(j.status);
  steps.forEach((s,i)=>{
    const r=el('div',{style:{display:'flex',gap:'12px',marginBottom:i<steps.length-1?'10px':'0'}});
    const lft=el('div',{style:{display:'flex',flexDirection:'column',alignItems:'center'}});
    const dot=el('div');dot.style.cssText=`width:10px;height:10px;border-radius:50%;background:${i<=curIdx?C.teal:C.border};flex-shrink:0;margin-top:3px`;
    lft.append(dot);
    if(i<steps.length-1){const ln=el('div');ln.style.cssText=`width:1px;flex:1;background:${i<curIdx?C.teal:C.border};min-height:14px;margin-top:2px`;lft.append(ln);}
    const lb=txt('div',labels[i]);lb.style.cssText=`font-size:13px;color:${i<=curIdx?C.text:C.muted};font-weight:${i===curIdx?'600':'400'};padding-bottom:${i<steps.length-1?'6px':'0'}`;
    r.append(lft,lb);tc.append(r);
  });
  d.append(tc);

  // ── Action buttons ────────────────────────────────────────────
  const acts=el('div',{style:{display:'flex',flexDirection:'column',gap:'10px',marginTop:'4px'}});

  // ── SEND QUOTE TO CLIENT (Primary workflow) ────────────────────
  if(j.status==='enquiry'){
    const qpc = el('div',{class:'card',style:{borderColor:C.teal,background:C.tealDim,marginTop:'10px'}});
    qpc.append(txt('div','SEND QUOTE TO CLIENT','lbl'));
    
    const inpRate = el('input',{type:'number',placeholder:'Price (AED)',style:{marginBottom:'10px',marginTop:'6px'}});
    if(j.quoted_price) inpRate.value = j.quoted_price;
    
    const inpNote = el('input',{type:'text',placeholder:'Notes for client (optional)',style:{marginBottom:'10px'}});
    if(j.quote_notes) inpNote.value = j.quote_notes;
    
    const hasEmail=!!j.client_email;
    const emailInfo=txt('div',hasEmail?`✓ Quote will be emailed to: ${j.client_email}`:`⚠ No email — share the approval link manually after sending.`);
    emailInfo.style.cssText=`font-size:11.5px;color:${hasEmail?C.teal:C.amber};margin-bottom:14px;`;
    
    let sending=false;
    const sqb = btn('📩 Send Quote to Client',C.teal,async()=>{
      if(sending)return;
      const price=parseFloat(inpRate.value);
      if(!price||price<=0){inpRate.style.borderColor=C.red;return;}
      sending=true;sqb.textContent='Sending…';sqb.disabled=true;
      
      await sb.patch(`jobs?job_code=eq.${encodeURIComponent(j.job_code)}`, {
        quoted_price:price, quote_notes:inpNote.value||null,
        status:'quoted', quote_sent_at:new Date().toISOString()
      });

      if(hasEmail){
        try{ 
          const updatedJob={...j, quoted_price:price, quote_notes:inpNote.value||null, status:'quoted'};
          await sendConfirmationEmail(updatedJob); 
        }
        catch(e){ console.warn('Email failed',e); }
      }
      state.sub=null; await loadJobs();
    });
    
    qpc.append(inpRate, inpNote, emailInfo, sqb);
    d.append(qpc);
  }

  // Show the approval link for quoted jobs so ops can share manually
  if(j.status==='quoted'){
    const wc = el('div',{class:'card card-amber',style:{marginTop:'10px'}});
    wc.append(txt('div','WAITING FOR CLIENT APPROVAL','lbl'));
    const wt=txt('div','The client has been sent a quote. Waiting for them to approve.');
    wt.style.cssText=`font-size:13px;color:${C.amber};margin:8px 0 12px`;
    const approveUrl=`${window.location.origin}/approve.html?job_id=${encodeURIComponent(j.job_code)}`;
    const linkBox=el('input',{type:'text',value:approveUrl,readonly:true,style:{fontSize:'12px',marginBottom:'10px',cursor:'text'}});
    linkBox.onclick=()=>{linkBox.select();navigator.clipboard?.writeText(approveUrl);};
    const copyHint=txt('div','Tap to copy the approval link');
    copyHint.style.cssText=`font-size:11px;color:${C.muted};margin-bottom:12px`;
    wc.append(wt,linkBox,copyHint);
    d.append(wc);
  }

  // ── FORCE APPROVE (Override — small secondary button) ──────────
  if(j.status==='enquiry'||j.status==='quoted'){
    const sep=el('div');sep.style.cssText=`height:1px;background:${C.border};margin:16px 0 10px`;
    d.append(sep);
    
    const faLabel=txt('div','⚡ Internal Override');
    faLabel.style.cssText=`font-size:11px;color:${C.muted};text-align:center;margin-bottom:8px`;
    
    const fab = outlineBtn('Force Approve (Skip Client)',C.muted,async()=>{
      const price = j.quoted_price || parseFloat(prompt('Enter price (AED):'));
      if(!price||price<=0) return;
      fab.textContent='Approving…';fab.disabled=true;
      await sb.patch(`jobs?job_code=eq.${encodeURIComponent(j.job_code)}`, {
        quoted_price:price, status:'confirmed', 
        approval_timestamp:new Date().toISOString(),
        quote_sent_at:new Date().toISOString()
      });
      state.sub=null; await loadJobs();
    });
    fab.style.cssText+=`;font-size:12px;padding:8px 16px;width:100%;opacity:.7`;
    d.append(faLabel,fab);
  }

  // PO Approval (Pending Verification)
  if(j.status==='po_pending'){
    const poc = el('div',{class:'card',style:{borderColor:C.amber,background:C.amberDim,marginTop:'10px',textAlign:'center',padding:'20px 16px'}});
    poc.append(txt('div','CLIENT SUBMITTED PO','lbl'), txt('div', 'The client has approved the quote. Please verify their Purchase Order or credit terms before confirming this dispatch.'));
    poc.children[1].style.cssText=`font-size:13px;color:${C.text};margin:6px 0 16px;`;
    
    const vpo = btn('✓ Approve PO & Confirm Order', C.teal, async()=>{
      if(!confirm("Have you verified the client's PO or payment terms?")) return;
      vpo.textContent='Approving…';vpo.disabled=true;
      await updateJobStatus(j.job_code, { status: 'confirmed' });
      state.sub=null; await loadJobs();
    });
    vpo.style.fontWeight = '700';
    poc.append(vpo);
    acts.append(poc);
  }

  // Assign driver (confirmed)
  if(j.status==='confirmed'){
    const ab=btn('Assign Driver',C.amber,()=>openAssignModal(j));acts.append(ab);
  }

  // In transit → delivered
  if(j.status==='in_transit'){
    const db=btn('Mark Delivered',C.amber,async()=>{
      db.disabled=true;db.textContent='Updating…';
      await updateJobStatus(j.job_code,{status:'delivered'});state.sub=null;
    });acts.append(db);
  }

  // Generate invoice after ePOD
  if(j.status==='epod_pending'&&j.epod_client_done){
    const ib=btn('Generate & Send Invoice',C.teal,async()=>{
      ib.disabled=true;ib.textContent='Updating…';
      await updateJobStatus(j.job_code,{status:'invoiced'});
    });acts.append(ib);
  }

  d.append(acts);

  // ── FORCE NEXT STEP (Ops) ─────────────────────────────────────
  const ns2=nextStatus(j.status);
  if(ns2){
    const sep3=el('div');sep3.style.cssText=`height:1px;background:${C.border};margin:16px 0 10px`;
    const fnLabel2=txt('div','⚡ Demo Shortcut');fnLabel2.style.cssText=`font-size:11px;color:${C.muted};text-align:center;margin-bottom:8px`;
    const fnb2=outlineBtn(`Force → ${SL.label[ns2]||ns2}`,C.amber,async()=>{
      fnb2.textContent='Advancing…';fnb2.disabled=true;
      await forceNextStep(j);
    });
    fnb2.style.cssText+=`;font-size:12px;padding:8px 16px;width:100%;opacity:.8`;
    d.append(sep3,fnLabel2,fnb2);
  }

  return d;
}


// ── ASSIGN DRIVER MODAL ───────────────────────────────────────────
function openAssignModal(job) {
  const overlay=el('div',{class:'modal-overlay'});
  const modal=el('div',{class:'modal',style:{padding:'16px'}});
  
  modal.append(txt('div','Assign Vehicle'));
  modal.children[0].style.cssText=`font-size:18px;font-weight:700;color:${C.text};margin-bottom:16px`;

  // 7-day calendar header
  const calHeader = el('div', {style:{display:'flex', width:'100%', marginBottom:'8px'}});
  const vcol = el('div', {style:{width:'110px', flexShrink:0}}); 
  calHeader.append(vcol);
  const now = new Date();
  for(let i=0; i<7; i++){
    const d=new Date(now); d.setDate(now.getDate()+i);
    const day = txt('div', d.toLocaleDateString('en-US',{weekday:'short'}));
    const dt = txt('div', d.getDate());
    const cell = el('div', {style:{flex:1, textAlign:'center', fontSize:'10px', color:C.muted}});
    cell.append(day, dt);
    calHeader.append(cell);
  }
  modal.append(calHeader);

  // Vehicle Rows
  const vrw = el('div', {style:{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px'}});
  let selectedVehicle = null;
  const updateSelection = () => {
    Array.from(vrw.children).forEach(r => {
      const isSel = selectedVehicle && r.dataset.vid == selectedVehicle.id;
      r.style.borderColor = isSel ? C.teal : C.border;
      r.style.background = isSel ? C.tealDim : C.surf;
    });
  };

  FLEET.forEach(v => {
    const row = el('div', {class:'card', style:{display:'flex', alignItems:'center', padding:'8px 4px', cursor:'pointer', margin:0, borderWidth:'2px'}});
    row.dataset.vid = v.id;
    row.onclick = () => { selectedVehicle = v; updateSelection(); };

    const info = el('div', {style:{width:'110px', flexShrink:0, padding:'0 4px'}});
    const name = txt('div', v.name); 
    name.style.cssText = `font-size:12px;font-weight:700;color:${C.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    const typ = txt('div', v.type); 
    typ.style.cssText = `font-size:10px;color:${C.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    info.append(name, typ);
    row.append(info);

    // Fake availability blocks
    for(let i=0; i<7; i++){
      const isAvail = (v.id * i + new Date().getDate()) % 5 !== 0; 
      const cell = el('div', {style:{flex:1, padding:'2px'}});
      const box = el('div', {style:{width:'100%', height:'20px', borderRadius:'4px', background:isAvail?C.tealDim:C.red}});
      if(isAvail) box.style.border=`1px solid ${C.teal}55`;
      else box.style.opacity='0.4';
      cell.append(box);
      row.append(cell);
    }
    vrw.append(row);
  });
  modal.append(vrw);

  // Tracking link input
  const l=txt('div','Traccar GPS Link (optional)','lbl');l.style.marginBottom='6px';
  const traccar_link=el('input',{type:'url',placeholder:'https://traccar.kasper.ae/share/abc123'});
  traccar_link.style.marginBottom='16px';
  if(job.traccar_link) traccar_link.value = job.traccar_link;
  modal.append(l, traccar_link);

  const assignBtn=btn('Assign & Notify',C.teal,async()=>{
    if(!selectedVehicle){ alert('Please select a vehicle from the calendar.'); return; }
    assignBtn.disabled=true;assignBtn.textContent='Saving…';
    
    await sb.patch(`jobs?job_code=eq.${encodeURIComponent(job.job_code)}`,{
      driver_name: selectedVehicle.name,
      vehicle_plate: selectedVehicle.plate,
      driver_phone: '+971 50 000 0000',
      traccar_link: traccar_link.value || null,
      status:'assigned',
    });
    
    overlay.remove();
    await loadJobs();
  });
  
  const cancelBtn=outlineBtn('Cancel',C.muted,()=>overlay.remove());
  const btnRow=el('div',{style:{display:'flex',gap:'10px'}});
  btnRow.append(cancelBtn,assignBtn);assignBtn.style.flex='1';cancelBtn.style.flex='1';
  modal.append(btnRow);overlay.append(modal);
  document.getElementById('app').append(overlay);
}

// ─── FLEET SCREEN ─────────────────────────────────────────────────
function renderOpsFleet(){
  const{jobs}=state;
  const d=el('div',{class:'pad'});

  // Minimal UAE map
  const mc=el('div',{class:'card',style:{padding:'0',overflow:'hidden',marginBottom:'14px'}});
  const mv=el('div',{style:{position:'relative',width:'100%',paddingBottom:'60%',background:'#07111C'}});
  const hl=txt('div','UAE — LIVE FLEET VIEW');hl.style.cssText=`position:absolute;top:10px;left:14px;font-size:9px;color:${C.muted};font-weight:700;letter-spacing:1px`;mv.append(hl);
  // City labels
  [{n:'Dubai',x:62,y:68},{n:'Abu Dhabi',x:22,y:82},{n:'Sharjah',x:68,y:52},{n:'Fujairah',x:88,y:26}].forEach(c=>{
    const cl=txt('div',c.n);cl.style.cssText=`position:absolute;left:${c.x}%;top:${c.y}%;font-size:9px;color:${C.muted};opacity:.6`;mv.append(cl);
  });
  // Grid lines
  [25,50,75].forEach(x=>{const l=el('div');l.style.cssText=`position:absolute;left:${x}%;top:0;bottom:0;width:1px;background:${C.border};opacity:.3`;mv.append(l);});
  [33,66].forEach(y=>{const l=el('div');l.style.cssText=`position:absolute;top:${y}%;left:0;right:0;height:1px;background:${C.border};opacity:.3`;mv.append(l);});
  // Driver dots from live jobs
  const drivers=new Map();
  jobs.filter(j=>j.driver_name&&['assigned','in_transit'].includes(j.status)).forEach(j=>{
    if(!drivers.has(j.driver_name)) drivers.set(j.driver_name,{job:j,active:j.status==='in_transit'});
  });
  const positions=[{x:62,y:58},{x:28,y:74},{x:72,y:38}];
  let pi=0;
  drivers.forEach((data,name)=>{
    const pos=positions[pi++]||{x:50,y:50};
    const dv=el('div');dv.style.cssText=`position:absolute;left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%)`;
    const lb=txt('div',name.split(' ')[0]+(data.active?' 🔴':''));lb.style.cssText=`position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:${C.surf2};border:1px solid ${C.border};border-radius:6px;padding:2px 7px;font-size:9px;color:${C.text};white-space:nowrap;margin-bottom:4px`;
    const dot=el('div');dot.style.cssText=`width:14px;height:14px;border-radius:50%;background:${data.active?C.teal:C.muted};border:2px solid #fff;${data.active?`box-shadow:0 0 10px ${C.teal}88`:''}`;
    dv.append(lb,dot);mv.append(dv);
  });
  mc.append(mv);d.append(mc);

  // Driver list
  const seen=new Set();
  jobs.filter(j=>j.driver_name).forEach(j=>{
    if(seen.has(j.driver_name))return;seen.add(j.driver_name);
    const isActive=j.status==='in_transit';
    const dc=el('div',{class:'card',style:{marginBottom:'10px'}});
    const dt=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}});
    const dm=el('div');dm.append(txt('div',j.driver_name),txt('div',j.vehicle_plate||'—'));
    dm.children[0].style.cssText=`font-size:14px;font-weight:700;color:${C.text}`;
    dm.children[1].style.cssText=`font-size:12px;color:${C.muted};margin-top:2px`;
    const ds=txt('span',isActive?'● Active':'○ Idle','tag');
    ds.style.cssText=`background:${isActive?C.tealDim:`${C.border}44`};color:${isActive?C.teal:C.muted};border:1px solid ${isActive?C.teal:C.border}`;
    dt.append(dm,ds);dc.append(dt);
    if(j.destination){const ji=txt('div',`→ ${j.destination.split(',')[0]}`);ji.style.cssText=`font-size:12px;color:${C.muted}`;dc.append(ji);}
    d.append(dc);
  });
  if(!seen.size){const nj=txt('div','No drivers assigned yet.');nj.style.cssText=`color:${C.muted};text-align:center;padding:20px`;d.append(nj);}
  return d;
}

// ════════════════════════════════════════════════════════════════
// MAIN RENDER
// ════════════════════════════════════════════════════════════════
function render(){
  const app=document.getElementById('app');
  // Remove modals before full re-render
  const modals=app.querySelectorAll('.modal-overlay');
  app.innerHTML='';
  modals.forEach(m=>app.append(m));

  app.style.cssText='min-height:100vh;display:flex;flex-direction:column;background:'+C.bg;

  const{view,sub,driverTab,opsTab}=state;
  if(view==='login'){app.append(renderLogin());return;}

  const getTitle=()=>{
    if(sub==='job-detail'){const j=selJob();return j?j.job_code:'Job Detail';}
    if(sub==='ops-job-detail'){const j=selJob();return j?j.job_code:'Job Detail';}
    if(sub==='location') return 'Location Settings';
    if(sub==='epod')return 'ePOD Sign-off';
    if(sub==='epod-success')return 'ePOD Submitted';
    if(view==='driver')return driverTab==='home'?'My Dashboard':driverTab==='jobs'?'My Jobs':'Location';
    return opsTab==='dashboard'?'Ops Dashboard':opsTab==='jobs'?'All Jobs':'Fleet Tracker';
  };

  const onBack=sub?()=>{state.sub=null;state.selId=null;render();}:null;
  const rightEl=sub?null:topbarRight(view);

  app.append(renderTopBar(getTitle(),onBack,rightEl));

  const scroll=el('div',{class:'scroll-area',style:{flex:'1',overflowY:'auto',paddingBottom:'16px'}});

  if(view==='driver'){
    if(sub==='job-detail')scroll.append(renderDriverJobDetail());
    else if(sub==='location')scroll.append(renderLocationSettings());
    else if(sub==='epod')scroll.append(renderEPODCapture());
    else if(sub==='epod-success')scroll.append(renderEPODSuccess());
    else if(driverTab==='home')scroll.append(renderDriverHome());
    else if(driverTab==='jobs'){
      const pd=el('div',{class:'pad'});
      const myJobs=state.jobs.filter(j=>j.driver_name==='Ahmed Al Rashidi');
      myJobs.forEach(j=>{
        const jc=el('div',{class:'card',style:{marginBottom:'10px',cursor:'pointer'}});
        jc.onclick=()=>{state.selId=j.job_code;state.sub='job-detail';render();};
        const jh=el('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'6px'}});
        jh.append(txt('span',j.job_code,'mono'),badge(j.status));
        const rt=j.service_type==='logistics'?`${j.origin||'—'} → ${j.destination||'—'}`:j.equipment_type||'—';
        jc.append(jh,txt('div',j.client_name||j.company_name||'—'),txt('div',rt));
        jc.children[2].style.cssText=`font-size:13px;color:${C.text};margin-bottom:2px`;
        jc.children[3].style.cssText=`font-size:12px;color:${C.muted}`;pd.append(jc);
      });
      if(!myJobs.length){const nj=txt('div','No jobs assigned yet.');nj.style.cssText=`color:${C.muted};text-align:center;padding:40px`;pd.append(nj);}
      scroll.append(pd);
    } else scroll.append(renderLocationSettings());
  } else {
    if(sub==='ops-job-detail')scroll.append(renderOpsJobDetail());
    else if(opsTab==='dashboard')scroll.append(renderOpsDashboard());
    else if(opsTab==='jobs')scroll.append(renderOpsJobs());
    else scroll.append(renderOpsFleet());
  }

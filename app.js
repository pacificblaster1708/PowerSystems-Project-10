'use strict';
const $=id=>document.getElementById(id);
let lastTrace=null,lastCct=null,busy=false,sequence=0;
let worker;
try{worker=location.protocol==='file:'?null:new Worker('worker.js');}catch(e){worker=null;}
const pending=new Map();
if(worker){worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.ok?p.resolve(data):p.reject(Error(data.error));};worker.onerror=()=>{worker.terminate();worker=null;for(const [id,p]of pending){p.reject(Error('Worker could not load. Open the page through a web server or GitHub Pages.'));pending.delete(id);}};}
function settings(){const rf=Number($('rf').value),loading=Number($('loading').value);if(!Number.isFinite(rf)||rf<0||$('rf').value.trim()==='')throw Error('Enter a nonnegative fault resistance.');return {rf,loading};}
async function compute(type,extra={}){const s=settings(),id=++sequence;
  if(worker)return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({...s,type,id,...extra});});
  await new Promise(resolve=>setTimeout(resolve,30));const m=Stability.makeModel(s.rf,s.loading);
  return {ok:true,type,result:type==='search'?Stability.search(m):Stability.simulate(m,extra.duration),pf:m.pf.mismatch,pm:m.pm};}
function setBusy(value,message){busy=value;for(const id of ['run','find','loading','rf','duration','try-stable','try-unstable'])$(id).disabled=value;if(message)$('simulation-note').textContent=message;}
function drawChart(r){const svg=$('chart'),W=900,H=320,L=57,R=22,T=35,B=43;
  const all=r.rows.flatMap(row=>row.delta),mn=Math.min(...all),mx=Math.max(...all),pad=Math.max(8,(mx-mn)*.12),ymin=mn-pad,ymax=mx+pad;
  const xmax=r.endTime,x=t=>L+t/xmax*(W-L-R),y=a=>H-B-(a-ymin)/(ymax-ymin)*(H-T-B);
  const parts=[`<title>Rotor response for ${r.duration.toFixed(4)} second fault duration</title><desc>${r.stable?'No pole slip observed':'Pole slip detected'}. Angles relative to the inertia-weighted centre of inertia.</desc>`];
  for(let i=0;i<=4;i++){const val=ymin+i*(ymax-ymin)/4,py=y(val);parts.push(`<path d="M${L} ${py}H${W-R}" stroke="#edf0e9"/><text x="${L-9}" y="${py+3}" fill="#849080" text-anchor="end">${val.toFixed(0)}°</text>`);}
  for(let i=0;i<=5;i++){const val=i*xmax/5,px=x(val);parts.push(`<text x="${px}" y="${H-B+21}" fill="#849080" text-anchor="middle">${val.toFixed(1)}</text>`);}
  const onset=.1,clear=.1+r.duration;parts.push(`<rect x="${x(onset)}" y="${T}" width="${Math.max(0,x(clear)-x(onset))}" height="${H-T-B}" fill="#cb572d" opacity=".06"/>`);
  for(const [time,label,anchor]of [[onset,'Fault','start'],[clear,'Clear','end']])parts.push(`<path d="M${x(time)} ${T-3}V${H-B}" stroke="#b2bcae" stroke-dasharray="3 4"/><text x="${x(time)+(anchor==='start'?4:-4)}" y="${anchor==='start'?15:28}" fill="#849080" text-anchor="${anchor}">${label}</text>`);
  const colors=['#000000','#555555','#999999'];for(let g=0;g<3;g++){const path=r.rows.map((row,i)=>`${i?'L':'M'}${x(row.t).toFixed(2)},${y(row.delta[g]).toFixed(2)}`).join(' ');parts.push(`<path d="${path}" stroke="${colors[g]}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>`);}
  parts.push(`<text x="${(W+L-R)/2}" y="${H-4}" text-anchor="middle" fill="#849080">Time (seconds)</text>`);svg.innerHTML=parts.join('');}
async function run(duration=Number($('duration').value)){
  if(busy)return;setBusy(true,'Integrating the three-machine response…');
  try{const data=await compute('simulate',{duration}),r=data.result;lastTrace=r;
    $('state').textContent=r.stable?'No pole slip':'Pole slip';$('state').className=r.stable?'green':'red';$('state-note').textContent=`${(Number($('loading').value)*100).toFixed(0)}% loading · Rf ${Number($('rf').value)} Ω`;
    $('spread').textContent=`${r.maxSpread.toFixed(1)}°`;
    $('simulation-note').textContent=`Duration ${duration.toFixed(4)} s · clear at ${(duration+.1).toFixed(4)} s · RK4 2 ms · ${r.stable?'20 s post-clear observation':`stopped at pole slip (${r.endTime.toFixed(2)} s)`}`;
    $('chart-subtitle').textContent=`Unwrapped electrical angles · ${r.stable?'no pole slip observed':'unstable under the stated criterion'}`;drawChart(r);
  }catch(e){$('simulation-note').textContent=e.message;$('state').textContent='Check inputs';$('state').className='red';}finally{setBusy(false);}
}
async function find(){if(busy)return;setBusy(true,'Scanning durations and refining the first stability boundary…');
  try{const {result:r}=await compute('search');lastCct=r;
    if(r.status==='bracketed'){$('cct').textContent=`${r.lower.toFixed(4)}–${r.upper.toFixed(4)} s`;$('cct-note').textContent=`Midpoint ${r.estimate.toFixed(4)} s · ≤ 1 ms bracket`;$('compare').hidden=false;
      $('try-stable').textContent=`Try ${(r.lower-.02).toFixed(3)} s · shorter`;$('try-unstable').textContent=`Try ${(r.upper+.02).toFixed(3)} s · longer`;
      $('simulation-note').textContent=`Boundary found. ${r.sweep.length} scan cases; ${r.iterations.length} bisection cases. Compare the two clearing times below.`;
    }else if(r.status==='no-boundary'){$('cct').textContent='Not found ≤ 3 s';$('cct-note').textContent='All scanned durations passed; no claim of infinite CCT';$('compare').hidden=true;$('simulation-note').textContent='No unstable case found in the 0–3 s scan. This operating point has no identified finite CCT in the search range.';}
    else{$('cct').textContent='0 s fails';$('cct-note').textContent='Post-fault topology fails even with immediate clearing';$('compare').hidden=true;$('simulation-note').textContent='The line outage itself fails the chosen stability test.';}
  }catch(e){$('simulation-note').textContent=e.message;}finally{setBusy(false);}}
function invalidate(){lastCct=null;$('cct').textContent='—';$('cct-note').textContent='Recalculate after changing the operating point';$('compare').hidden=true;$('state').textContent='Rerun needed';$('state').className='';$('state-note').textContent='Chart retains the previous run until recalculated';}
$('duration').addEventListener('input',()=>{$('duration-value').textContent=`${Number($('duration').value).toFixed(3)} s`;});
$('run').addEventListener('click',()=>run());$('find').addEventListener('click',find);
$('loading').addEventListener('change',invalidate);$('rf').addEventListener('input',invalidate);
for(const [id,sign]of [['try-stable',-1],['try-unstable',1]])$(id).addEventListener('click',()=>{if(!lastCct)return;const raw=sign<0?Math.max(0,lastCct.lower-.02):lastCct.upper+.02,d=Math.round(raw*1000)/1000;$('duration').value=d;$('duration-value').textContent=`${d.toFixed(3)} s`;run(d);});
$('csv').addEventListener('click',()=>{if(!lastTrace)return;const lines=['time_s,delta1_coi_deg,delta2_coi_deg,delta3_coi_deg,df1_Hz,df2_Hz,df3_Hz,pairwise_spread_deg',...lastTrace.rows.map(r=>[r.t,...r.delta,...r.speed,r.spread].map(v=>v.toFixed(9)).join(','))];const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='akarsh_g4_m1_trajectory.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);});
window.addEventListener('beforeprint',()=>document.querySelectorAll('details').forEach(d=>d.open=true));
(async()=>{await run(.1);await find();})();

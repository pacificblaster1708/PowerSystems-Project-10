/* Regenerate reference data with Node.js; base MATLAB users need not run this. */
'use strict';
const fs=require('fs'),path=require('path'),S=require('../solver.js');
const out=path.resolve(__dirname,'../results');fs.mkdirSync(out,{recursive:true});
const m=S.makeModel(7,1),r=S.search(m),baseline=S.search(S.makeModel(7,1));
const fine=S.search(m,{dt:.001}),long=S.search(m,{dt:.001,after:40});
const summary={name:'Akarsh J',roll:'240002007',group:4,member:1,projectLead:'Akarsh J',
  engine:'JavaScript reference implementation (not native MATLAB)',rf_ohm:7,loadScale:1,
  onset_s:.1,dt_s:.002,postclear_observation_s:20,threshold_deg:360,
  cct:{status:r.status,lower:r.lower,upper:r.upper,midpoint:r.estimate},
  baseline:{loadScale:1,status:baseline.status,lastScannedDuration:baseline.lower},
  halfstep:{lower:fine.lower,upper:fine.upper},longerHorizon:{lower:long.lower,upper:long.upper},
  powerFlowMismatch:m.pf.mismatch,initialAcceleration:m.initialAcceleration,
  pm_pu:m.pm,zbase_ohm:m.zbase,rf_pu:m.rfpu,z2:m.z2,z0:m.z0,
  busVoltages:m.pf.V.map((z,i)=>({bus:i+1,vm:Math.hypot(...z),angle_deg:Math.atan2(z[1],z[0])*180/Math.PI})),
  sweep:r.sweep.map(x=>({duration:x.duration,stable:x.stable,maxSpread:x.maxSpread,endTime:x.endTime})),iterations:r.iterations};
fs.writeFileSync(path.join(out,'reference_summary.json'),JSON.stringify(summary,null,2)+'\n');
function csv(file,header,rows){fs.writeFileSync(path.join(out,file),header+'\n'+rows.map(row=>row.join(',')).join('\n')+'\n');}
csv('clearing_time_scan.csv','fault_duration_s,stable_1_or_0,max_pairwise_angle_deg,end_time_s',r.sweep.map(x=>[x.duration,+x.stable,x.maxSpread,x.endTime]));
csv('bisection.csv','fault_duration_s,stable_1_or_0,max_pairwise_angle_deg',(r.iterations||[]).map(x=>[x.duration,+x.stable,x.maxSpread]));
for(const duration of [.1,3]){const trace=S.simulate(m,duration);csv(`trajectory_${duration===.1?'short':'long'}.csv`,
  'time_s,delta1_coi_deg,delta2_coi_deg,delta3_coi_deg,df1_Hz,df2_Hz,df3_Hz,pairwise_spread_deg',trace.rows.map(x=>[x.t,...x.delta,...x.speed,x.spread]));}
if(r.status!=='no-boundary'||fine.status!==r.status||long.status!==r.status)throw Error('Scan verification failed');
if(fine.lower!==r.lower||long.lower!==r.lower)throw Error('Numerical sensitivity check failed');
console.log(JSON.stringify({status:'passed',cct:summary.cct,baseline:summary.baseline,powerFlowMismatch:m.pf.mismatch}));

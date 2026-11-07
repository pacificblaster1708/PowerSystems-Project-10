/* EE315 Assignment 10 -- Akarsh J, Group 4, Member 1.
 * Standalone classical-machine / sequence-network solver; no dependencies.
 * See README.md for every modeling assumption and data source.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Stability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const c=(re=0,im=0)=>[re,im], add=(a,b)=>[a[0]+b[0],a[1]+b[1]],
    sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],
    div=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];if(d<1e-26)throw Error('Singular network matrix');return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];},
    conj=a=>[a[0],-a[1]], abs=a=>Math.hypot(...a), polar=(r,a)=>[r*Math.cos(a),r*Math.sin(a)],
    zeros=(n,m=n)=>Array.from({length:n},()=>Array.from({length:m},()=>c())),
    clone=A=>A.map(r=>r.map(z=>z.slice())), mv=(A,x)=>A.map(row=>row.reduce((s,z,j)=>add(s,mul(z,x[j])),c()));
  function solve(A,b) {
    const n=A.length, M=clone(A), v=b.map(z=>z.slice());
    for(let k=0;k<n;k++){
      let p=k;for(let i=k+1;i<n;i++)if(abs(M[i][k])>abs(M[p][k]))p=i;
      [M[k],M[p]]=[M[p],M[k]];[v[k],v[p]]=[v[p],v[k]];
      for(let i=k+1;i<n;i++){
        const q=div(M[i][k],M[k][k]);
        for(let j=k+1;j<n;j++)M[i][j]=sub(M[i][j],mul(q,M[k][j]));
        v[i]=sub(v[i],mul(q,v[k]));M[i][k]=c();
      }
    }
    const x=Array.from({length:n},()=>c());
    for(let i=n-1;i>=0;i--){let s=v[i];for(let j=i+1;j<n;j++)s=sub(s,mul(M[i][j],x[j]));x[i]=div(s,M[i][i]);}
    return x;
  }
  // f, t, R1, X1, total B1, transformer (all on 100 MVA).
  const branches=[
    [1,4,0,.0576,0,1],[4,5,.017,.092,.158,0],
    [5,6,.039,.17,.358,0],[3,6,0,.0586,0,1],
    [6,7,.0119,.1008,.209,0],[7,8,.0085,.072,.149,0],
    [8,2,0,.0625,0,1],[8,9,.032,.161,.306,0],
    [9,4,.01,.085,.176,0]];
  branches.forEach(b=>b[2]=0); // Lecture 30: ignore transmission resistance.
  const loads=[[5,.9,.3],[7,1,.35],[9,1.25,.5]], H=[23.64,6.4,3.01], xd=[.0608,.1198,.1813];
  function stamp(Y,b){const [f,t,r,x,B]=b,i=f-1,j=t-1,y=div(c(1),c(r,x));
    Y[i][i]=add(Y[i][i],add(y,c(0,B/2)));Y[j][j]=add(Y[j][j],add(y,c(0,B/2)));
    Y[i][j]=sub(Y[i][j],y);Y[j][i]=sub(Y[j][i],y);}
  function ybus(n,bs){const Y=zeros(n);bs.forEach(b=>stamp(Y,b));return Y;}
  function powerFlow(loadScale=1){
    const Y=ybus(9,branches),V=Array.from({length:9},()=>c(1));
    const S=Array.from({length:9},()=>c());S[1]=c(1.63*loadScale);S[2]=c(.85*loadScale);loads.forEach(([b,p,q])=>S[b-1]=c(-p*loadScale,-q*loadScale));
    let err=Infinity,it=0;
    // Gauss-Seidel with PV magnitude restoration. Slack/PV magnitudes = 1 pu.
    for(;it<20000;it++){
      for(let i=1;i<9;i++){
        let Qi=S[i][1];
        if(i<3){const Ii=Y[i].reduce((s,y,j)=>add(s,mul(y,V[j])),c());Qi=mul(V[i],conj(Ii))[1];}
        let sum=c();for(let j=0;j<9;j++)if(j!==i)sum=add(sum,mul(Y[i][j],V[j]));
        V[i]=div(sub(div(c(S[i][0],-Qi),conj(V[i])),sum),Y[i][i]);
        if(i<3)V[i]=polar(1,Math.atan2(V[i][1],V[i][0]));
      }
      const inj=mv(Y,V).map((z,i)=>mul(V[i],conj(z)));
      err=0;for(let i=1;i<9;i++){err=Math.max(err,Math.abs(inj[i][0]-S[i][0]));if(i>=3)err=Math.max(err,Math.abs(inj[i][1]-S[i][1]));}
      if(err<1e-10)break;
    }
    if(err>=1e-10)throw Error('Power flow did not converge');
    return {Y,V,iterations:it+1,mismatch:err};
  }
  function reduce(Y){
    const n=Y.length,A=clone(Y),B=zeros(n,3),D=zeros(3);
    for(let g=0;g<3;g++){const y=c(0,-1/xd[g]);A[g][g]=add(A[g][g],y);B[g][g]=sub(c(),y);D[g][g]=y;}
    const out=clone(D);
    for(let j=0;j<3;j++){const z=solve(A,B.map(row=>row[j]));for(let i=0;i<3;i++)out[i][j]=sub(D[i][j],mul(B[i][i],z[i]));}
    return out;
  }
  function makeModel(rf=7,loadScale=1,event={lineIndex:5,fraction:.99}){
    if(!Number.isFinite(rf)||rf<0)throw Error('Fault resistance must be nonnegative');
    const pf=powerFlow(loadScale),I=mv(pf.Y,pf.V),E=I.slice(0,3).map((z,g)=>add(pf.V[g],mul(c(0,xd[g]),z)));
    const yl=Array.from({length:9},()=>c());loads.forEach(([b,p,q])=>yl[b-1]=div(c(p*loadScale,-q*loadScale),c(abs(pf.V[b-1])**2)));
    function addLoads(Y){yl.forEach((z,i)=>Y[i][i]=add(Y[i][i],z));return Y;}
    const Ypre=reduce(addLoads(clone(pf.Y)));
    // Fault on line 7-8, 1% from bus 8. Auxiliary algebraic bus 10.
    const line=branches[event.lineIndex],fraction=event.fraction;
    const faultBranches=branches.filter((_,i)=>i!==event.lineIndex).map(b=>b.slice());
    faultBranches.push([line[0],10,line[2]*fraction,line[3]*fraction,line[4]*fraction,0]);
    faultBranches.push([10,line[1],line[2]*(1-fraction),line[3]*(1-fraction),line[4]*(1-fraction),0]);
    const Yf=addLoads(ybus(10,faultBranches)),Y2=clone(Yf);
    for(let g=0;g<3;g++)Y2[g][g]=add(Y2[g][g],c(0,-1/xd[g]));
    const unit=Array.from({length:10},(_,i)=>c(i===9?1:0)),z2=solve(Y2,unit)[9];
    // Zero sequence: buses 4..10 only. Delta generator windings block I0;
    // grounded-wye transmission windings create shunts through transformer X.
    const Y0=zeros(7);
    faultBranches.forEach(b=>{
      if(b[5]){const t=Math.max(b[0],b[1])-4;Y0[t][t]=add(Y0[t][t],div(c(1),c(b[2],b[3])));}
      else stamp(Y0,[b[0]-3,b[1]-3,3*b[2],3*b[3],b[4]/3,0]);
    });
    const z0=solve(Y0,Array.from({length:7},(_,i)=>c(i===6?1:0)))[6];
    const zbase=345**2/100,rfpu=rf/zbase,zsh=add(add(z2,z0),c(3*rfpu));
    Yf[9][9]=add(Yf[9][9],div(c(1),zsh));
    const Yfault=reduce(Yf),Ypost=reduce(addLoads(ybus(9,branches.filter((_,i)=>i!==event.lineIndex))));
    const initial=E.map(z=>Math.atan2(z[1],z[0])).concat([0,0,0]),emag=E.map(abs);
    const pm=mv(Ypre,E).map((z,i)=>mul(E[i],conj(z))[0]);
    const m={rf,rfpu,zbase,z2,z0,zsh,Ypre,Yfault,Ypost,initial,emag,pm,H,xd,freq:50,D:[0,0,0],pf,event,loadScale};
    m.initialAcceleration=Math.max(...derivative(initial,Ypre,m).slice(3).map(Math.abs));
    return m;
  }
  function derivative(x,Y,m){const E=x.slice(0,3).map((a,i)=>polar(m.emag[i],a)),I=mv(Y,E),dx=[];
    for(let i=0;i<3;i++)dx[i]=2*Math.PI*m.freq*x[i+3];
    for(let i=0;i<3;i++)dx[i+3]=(m.pm[i]-mul(E[i],conj(I[i]))[0]-m.D[i]*x[i+3])/(2*m.H[i]);return dx;}
  function rk4(x,h,Y,m){const k1=derivative(x,Y,m),k2=derivative(x.map((a,i)=>a+h*k1[i]/2),Y,m),
    k3=derivative(x.map((a,i)=>a+h*k2[i]/2),Y,m),k4=derivative(x.map((a,i)=>a+h*k3[i]),Y,m);
    return x.map((a,i)=>a+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
  function simulate(m,duration,opts={}){
    const dt=opts.dt||.002,after=opts.after||20,onset=.1,end=onset+duration+after;
    let x=m.initial.slice(),t=0,stable=true,maxSpread=0,rows=[];
    const save=opts.record!==false;
    function record(){const coi=x.slice(0,3).reduce((s,a,i)=>s+a*H[i],0)/H.reduce((a,b)=>a+b);
      if(save)rows.push({t,delta:x.slice(0,3).map(a=>(a-coi)*180/Math.PI),speed:x.slice(3).map(w=>w*m.freq),spread:(Math.max(...x.slice(0,3))-Math.min(...x.slice(0,3)))*180/Math.PI});}
    record();let count=0;
    // Segment boundaries avoid integrating any RK stage through a switch.
    const segments=[[onset,m.Ypre],[onset+duration,m.Yfault],[end,m.Ypost]];
    for(const [stop,Y] of segments){
      while(t<stop-1e-12){const h=Math.min(dt,stop-t);x=rk4(x,h,Y,m);t+=h;count++;
        const spread=Math.max(...x.slice(0,3))-Math.min(...x.slice(0,3));maxSpread=Math.max(maxSpread,spread);
        if(!x.every(Number.isFinite)||spread>=2*Math.PI){stable=false;record();break;}
        if(count%5===0||t>=stop-1e-12)record();
      }
      if(!stable)break;
    }
    return {duration,stable,maxSpread:maxSpread*180/Math.PI,endTime:t,rows,dt,after};
  }
  function search(m,opts={}){
    const step=opts.step||.05,max=opts.max||3,tol=opts.tol||.001,base={dt:opts.dt||.002,after:opts.after||20,record:false};
    const sweep=[];let lo=0,hi=null;
    const zero=simulate(m,0,base);sweep.push(zero);
    if(!zero.stable)return {status:'postfault-unstable',sweep,lower:0,upper:0};
    for(let d=step;d<=max+1e-9;d+=step){const r=simulate(m,Math.min(d,max),base);sweep.push(r);if(!r.stable){hi=r.duration;break;}lo=r.duration;}
    if(hi===null)return {status:'no-boundary',lower:lo,upper:null,sweep};
    const iterations=[];
    while(hi-lo>tol){const mid=(lo+hi)/2,r=simulate(m,mid,base);iterations.push({duration:mid,stable:r.stable,maxSpread:r.maxSpread});if(r.stable)lo=mid;else hi=mid;}
    return {status:'bracketed',lower:lo,upper:hi,estimate:(lo+hi)/2,sweep,iterations};
  }
  return {makeModel,simulate,search,branches,loads,solve,powerFlow,derivative};
});

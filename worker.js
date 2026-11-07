importScripts('solver.js');
self.onmessage=({data})=>{
  try{const m=Stability.makeModel(data.rf,data.loading);
    const result=data.type==='search'?Stability.search(m):Stability.simulate(m,data.duration);
    self.postMessage({ok:true,id:data.id,type:data.type,result,pf:m.pf.mismatch,pm:m.pm});
  }catch(e){self.postMessage({ok:false,id:data.id,error:e.message});}
};

"""Independent NumPy/SciPy check of the model and JS solver's CCT bracket.
Optional developer validation; not needed to run MATLAB or the website.
Power flow uses Newton's method; dynamics use adaptive DOP853, not RK4.
Run: python3 validation/independent_check.py
"""
import json
from pathlib import Path
import numpy as np
from scipy.optimize import root
from scipy.integrate import solve_ivp

BR = np.array([[1,4,0,.0576,0,1],[4,5,.017,.092,.158,0],
 [5,6,.039,.17,.358,0],[3,6,0,.0586,0,1],[6,7,.0119,.1008,.209,0],
 [7,8,.0085,.072,.149,0],[8,2,0,.0625,0,1],
 [8,9,.032,.161,.306,0],[9,4,.01,.085,.176,0]], float)
BR[:,2]=0 # Lecture 30: neglect line resistance.
XD=np.array([.0608,.1198,.1813]); H=np.array([23.64,6.4,3.01])
def ybus(n, branches):
    Y=np.zeros((n,n),complex)
    for f,t,r,x,b,_ in branches:
        i,j=int(f)-1,int(t)-1; y=1/complex(r,x)
        Y[i,i]+=y+1j*b/2;Y[j,j]+=y+1j*b/2;Y[i,j]-=y;Y[j,i]-=y
    return Y
def model(scale=1,rf=7):
    Y=ybus(9,BR); demand=np.zeros(9,complex)
    demand[[4,6,8]]=scale*np.array([.9+.3j,1+.35j,1.25+.5j])
    target=-demand;target[1:3]=scale*np.array([1.63,.85])
    def voltage(x):return np.r_[np.ones(3),x[8:]]*np.exp(1j*np.r_[0,x[:8]])
    def mismatch(x):
        v=voltage(x);s=v*np.conj(Y@v)-target
        return np.r_[s.real[1:],s.imag[3:]]
    pf=root(mismatch,np.r_[np.zeros(8),np.ones(6)],tol=1e-11)
    assert pf.success
    V=voltage(pf.x); yl=np.conj(demand)/abs(V)**2
    E=V[:3]+1j*XD*(Y@V)[:3]
    def reduce(A):
        A=A.copy();B=np.zeros((len(A),3),complex);D=np.diag(1/(1j*XD))
        A[:3,:3]+=D;B[:3,:]=-D
        return D-B.T@np.linalg.solve(A,B)
    pre=reduce(Y+np.diag(yl));keep=np.delete(BR,5,axis=0);line=BR[5];s=.99
    bf=np.vstack([keep,[7,10,*(s*line[2:5]),0],[10,8,*((1-s)*line[2:5]),0]])
    yf=ybus(10,bf)+np.diag(np.r_[yl,0]);y2=yf.copy();y2[:3,:3]+=np.diag(1/(1j*XD))
    z2=np.linalg.inv(y2);y0=np.zeros((7,7),complex)
    for f,t,r,x,b,transformer in bf:
        if transformer:
            i=int(max(f,t))-4;y0[i,i]+=1/complex(r,x)
        else:y0+=ybus(7,[[f-3,t-3,3*r,3*x,b/3,0]])
    z0=np.linalg.inv(y0);rfpu=rf/(345**2/100)
    zsh=z2[-1,-1]+z0[-1,-1]+3*rfpu
    yf[-1,-1]+=1/zsh;fault=reduce(yf);post=reduce(ybus(9,keep)+np.diag(yl))
    x0=np.r_[np.angle(E),np.zeros(3)];pm=(E*np.conj(pre@E)).real
    # Direct phase-domain fault boundary: Va=Rf*Ia, Ib=Ic=0.
    a=yf.copy();a[:3,:3]+=np.diag(1/(1j*XD));j=np.zeros(10,complex);j[:3]=E/(1j*XD)
    v1=np.linalg.solve(a,j);i1=v1[-1]/zsh
    va=v1[-1]-z2[-1,-1]*i1-z0[-1,-1]*i1
    fault_residual=abs(va-3*rfpu*i1)
    assert fault_residual<1e-10
    def rhs(t,x,A):
        e=abs(E)*np.exp(1j*x[:3]);pe=(e*np.conj(A@e)).real
        return np.r_[2*np.pi*50*x[3:],(pm-pe)/(2*H)]
    return dict(V=V,E=E,pre=pre,fault=fault,post=post,x0=x0,pm=pm,rhs=rhs,
                mismatch=max(abs(mismatch(pf.x))),fault_residual=fault_residual)
def simulate(m,d,after=20):
    x=m['x0'].copy();start=0
    def slip(t,x):return 2*np.pi-np.ptp(x[:3])
    slip.terminal=True;slip.direction=-1
    for stop,A in [(0.1,m['pre']),(.1+d,m['fault']),(.1+d+after,m['post'])]:
        if stop<=start:continue
        r=solve_ivp(lambda t,x:m['rhs'](t,x,A),(start,stop),x,method='DOP853',
          rtol=1e-10,atol=1e-12,max_step=.01,events=slip)
        if len(r.t_events[0]):return False,float(r.t_events[0][0])
        x=r.y[:,-1];start=stop
    return True,float(stop)
if __name__=='__main__':
    m=model();checks={}
    for d in [0,.1,1,3]:
        checks[str(d)]={'stable':simulate(m,d)[0],'end_time':simulate(m,d)[1]}
    assert all(c['stable'] for c in checks.values())
    b=model(scale=1);assert simulate(b,3)[0]
    result={'independent_method':'Newton power flow + DOP853 adaptive integration',
      'power_flow_mismatch_pu':m['mismatch'],'slg_boundary_residual_pu':m['fault_residual'],
      'Pm_pu':m['pm'].tolist(),'cases':checks,'original_loading_3s_stable':True,
      'native_matlab_executed':False}
    print(json.dumps(result,indent=2))
    p=Path(__file__).resolve().parents[1]/'results'/'independent_validation.json'
    p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(result,indent=2)+'\n')

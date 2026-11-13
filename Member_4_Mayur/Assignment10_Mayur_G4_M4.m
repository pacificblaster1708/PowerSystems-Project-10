function results = Assignment10_Mayur_G4_M4(Rf_ohm, loadScale, makePlots)
% EE315 ASSIGNMENT 10: 9-bus transient stability / SLG fault / CCT.
% Mayur Soni | Roll 240002037 | Group 4 | Member 4 | Project Lead: Akarsh J.
%
% RUN:  results = Assignment10_Mayur_G4_M4;
%       results = Assignment10_Mayur_G4_M4(7, 1.0); % original loading
% Base MATLAB only; no MATPOWER or Simulink installation is required.
%
% Network: MATPOWER case9, 100 MVA, 345 kV transmission base.
% Study: 50 Hz; SLG fault on line 7-8, 1% from bus 8, at t=0.1 s.
% Clearing: both ends of line 7-8 open; no reclosure.
% Original case9 load and generation schedules; transmission R set to zero
% following Lecture 30. Fault resistance is retained.
%
% Additional declared assumptions (not contained in MATPOWER case9):
% classical machines; H and Xd' on the common 100-MVA base; D=0;
% X2g=Xd'; Z2line=Z1line; Z0line=3*Z1line; B0=B1/3;
% delta(generator)/grounded-wye(transmission) step-up transformers;
% delta equivalent loads (zero-sequence open), constant impedance in dynamics.
% Positive-sequence classical electrical torque; negative-sequence rotor
% heating/torque ripple, exciters and governors are outside this model.
%
% CCT means the FIRST boundary found on a 50-ms scan, refined by bisection
% to a <=1-ms bracket. No pairwise unwrapped angle may reach 360 degrees
% during the fault plus 20 seconds after clearing. This finite-horizon
% numerical criterion is not a proof of asymptotic stability.
% See README.md for sources, equations, limitations and GitHub Pages steps.

if nargin < 1 || isempty(Rf_ohm), Rf_ohm = 7; end
if nargin < 2 || isempty(loadScale), loadScale = 1; end
if nargin < 3, makePlots = true; end
validateattributes(Rf_ohm, {'numeric'}, {'scalar','real','finite','nonnegative'});
validateattributes(loadScale, {'numeric'}, {'scalar','real','finite','positive'});
cfg.dt = 0.002; cfg.after = 20; cfg.onset = 0.1;
cfg.scanStep = 0.05; cfg.maxDuration = 3; cfg.tolerance = 0.001;
model = makeModel(Rf_ohm, loadScale);
results = findCCT(model, cfg);
results.name = 'Mayur Soni'; results.roll = '240002037';
results.group = 4; results.member = 4; results.projectLead = 'Akarsh J';
results.Rf_ohm = Rf_ohm; results.loadScale = loadScale; results.settings = cfg;
results.model = model;

fprintf('\nEE315 Assignment 10 | Mayur Soni | Group 4 | Member 4 | Project Lead: Akarsh J\n');
fprintf('Roll: 240002037 | Rf = %.6g ohm | loading = %.0f%%\n', Rf_ohm, 100*loadScale);
fprintf('SLG fault on line 7-8, 1%% from bus 8; line trips at both ends.\n');
fprintf('Power-flow mismatch = %.3e pu; equilibrium acceleration = %.3e pu/s\n', ...
    model.pf.mismatch, model.initialAcceleration);
fprintf('Zbase = %.6f ohm; Rf = %.9f pu\n', model.zbase, model.rfpu);
fprintf('Pm on common base [pu]: %.6f %.6f %.6f\n', model.pm);
if strcmp(results.status, 'bracketed')
    fprintf('CCT bracket: [%.9f, %.9f] s of FAULT DURATION\n', results.lower, results.upper);
    fprintf('Midpoint estimate = %.9f s; absolute clearing instant ~ %.9f s\n', ...
        results.estimate, cfg.onset + results.estimate);
    durations = [max(0, results.lower-0.02), results.upper+0.02];
elseif strcmp(results.status, 'no-boundary')
    fprintf('No unstable case found on the scan through %.3f s.\n', results.lower);
    fprintf('No finite CCT identified in this search; do not report infinity.\n');
    durations = [0.1, cfg.maxDuration];
else
    fprintf('Even instantaneous line clearing failed the chosen criterion.\n');
    durations = [0, 0.1];
end
results.traces = cell(1, 2);
for k = 1:2, results.traces{k} = simulate(model, durations(k), cfg, true); end

% A named baseline prevents confusing the stressed case with original case9.
if abs(loadScale-1) > 1e-12
    baseModel = makeModel(Rf_ohm, 1);
    results.originalLoading = findCCT(baseModel, cfg);
    fprintf('Original 100%% loading: %s, scan through %.3f s.\n', ...
        results.originalLoading.status, results.originalLoading.lower);
end

% Numerical sensitivity: repeat the boundary with half the integration step.
fineCfg = cfg; fineCfg.dt = cfg.dt/2;
results.halfStep = findCCT(model, fineCfg);
fprintf('Half-step check (%g s): %s', fineCfg.dt, results.halfStep.status);
if strcmp(results.halfStep.status, 'bracketed')
    fprintf(', [%.9f, %.9f] s\n', results.halfStep.lower, results.halfStep.upper);
else, fprintf('\n'); end

out = fullfile(fileparts(mfilename('fullpath')), 'results_matlab');
if ~exist(out, 'dir'), mkdir(out); end
writeRows(fullfile(out,'clearing_time_scan.csv'), ...
    'fault_duration_s,stable_1_or_0,max_pairwise_angle_deg,end_time_s', results.sweep);
for k = 1:2
    r = results.traces{k};
    writeRows(fullfile(out,sprintf('trajectory_%d.csv', k)), ...
        'time_s,delta1_coi_deg,delta2_coi_deg,delta3_coi_deg,df1_Hz,df2_Hz,df3_Hz,pairwise_spread_deg', r.rows);
end
fid = fopen(fullfile(out, 'summary.txt'), 'w');
assert(fid >= 0, 'Cannot write summary');
fprintf(fid, 'Mayur Soni | Roll 240002037 | Group 4 | Member 4 | Project Lead: Akarsh J\n');
fprintf(fid, 'Rf=%.6g ohm; loadScale=%.6g; status=%s\n', Rf_ohm, loadScale, results.status);
fprintf(fid, 'dt=%.6g s; post-clear observation=%.6g s; threshold=360 deg\n', cfg.dt, cfg.after);
if strcmp(results.status, 'bracketed')
    fprintf(fid, 'CCT bracket=[%.9f, %.9f] s; midpoint=%.9f s\n', results.lower, results.upper, results.estimate);
end
fprintf(fid, 'Conditional classical-model result. Read README.md before reporting.\n');
fclose(fid);
save(fullfile(out, 'assignment10_results.mat'), 'results');

if makePlots
    fig = figure('Name', 'Assignment 10 - Mayur Soni - Group 4', 'Color', 'w', ...
        'Position', [80 80 1100 740]);
    for k = 1:2
        r = results.traces{k};
        subplot(2,2,k); plot(r.rows(:,1), r.rows(:,2:4), 'LineWidth', 1.25);
        grid on; xlabel('Time (s)'); ylabel('Rotor angle relative to COI (deg)');
        if r.stable, label = 'No pole slip observed'; else, label = 'Pole slip detected'; end
        title(sprintf('Duration %.4f s: %s', r.duration, label));
        legend('G1','G2','G3','Location','best');
        yl = ylim; hold on;
        plot([cfg.onset cfg.onset], yl, 'k:');
        tc = cfg.onset+r.duration; plot([tc tc], yl, 'k--'); hold off;
        subplot(2,2,k+2); plot(r.rows(:,1), r.rows(:,5:7), 'LineWidth', 1.25);
        grid on; xlabel('Time (s)'); ylabel('Frequency deviation (Hz)');
        title('Generator speed deviations'); legend('G1','G2','G3','Location','best');
    end
    print(fig, fullfile(out,'rotor_angle_and_speed.png'), '-dpng', '-r180');
end
fprintf('Saved results to: %s\n', out);
end

function m = makeModel(rf, scale)
% fbus tbus R1 X1 totalB1 transformerFlag
br = [1 4 0 .0576 0 1; 4 5 .017 .092 .158 0; ...
      5 6 .039 .17 .358 0; 3 6 0 .0586 0 1; ...
      6 7 .0119 .1008 .209 0; 7 8 .0085 .072 .149 0; ...
      8 2 0 .0625 0 1; 8 9 .032 .161 .306 0; 9 4 .01 .085 .176 0];
br(:,3)=0; % Lecture 30: neglect transmission resistance, retain fault R.
loads = [5 .9 .3; 7 1 .35; 9 1.25 .5];
m.H = [23.64; 6.4; 3.01]; m.xd = [.0608; .1198; .1813];
m.D = zeros(3,1); m.freq = 50; m.rf = rf; m.loadScale = scale;
Y = ybus(9, br); [V, mismatch, iterations] = powerFlow(Y, loads, scale);
m.pf.V = V; m.pf.mismatch = mismatch; m.pf.iterations = iterations;
I = Y*V; E = V(1:3) + 1i*m.xd.*I(1:3);
yl = zeros(9,1);
for k=1:size(loads,1)
    b=loads(k,1); yl(b)=scale*(loads(k,2)-1i*loads(k,3))/abs(V(b))^2;
end
m.Ypre = reduce(Y+diag(yl), m.xd);
% Split line 7-8 with an algebraic fault point. This is still a 9-bus
% benchmark; the extra node is only a location on the line.
line = br(6,:); fraction = .99; keep = br; keep(6,:) = [];
bf = [keep; 7 10 fraction*line(3:5) 0; 10 8 (1-fraction)*line(3:5) 0];
Yf = ybus(10,bf)+diag([yl;0]);
Y2 = Yf; Y2(1:3,1:3) = Y2(1:3,1:3)+diag(1./(1i*m.xd));
u = zeros(10,1); u(10)=1; z=Y2\u; m.z2=z(10);
Y0 = zeros(7); % buses 4 through 10; generator delta windings are open
for k=1:size(bf,1)
    b=bf(k,:);
    if b(6)==1
        t=max(b(1:2))-3; Y0(t,t)=Y0(t,t)+1/(b(3)+1i*b(4));
    else
        Y0=stamp(Y0,[b(1:2)-3 3*b(3:4) b(5)/3 0]);
    end
end
u=zeros(7,1); u(7)=1; z=Y0\u; m.z0=z(7);
m.zbase=345^2/100; m.rfpu=rf/m.zbase;
% SLG: I1=V1f/(Z2ff+Z0ff+3*Rfpu). The positive-sequence self
% impedance is already inside Yf and MUST NOT be added a second time.
m.zsh=m.z2+m.z0+3*m.rfpu;
Yf(10,10)=Yf(10,10)+1/m.zsh;
m.Yfault=reduce(Yf,m.xd); m.Ypost=reduce(ybus(9,keep)+diag(yl),m.xd);
m.emag=abs(E); m.initial=[angle(E);zeros(3,1)];
m.pm=real(E.*conj(m.Ypre*E));
dx=rhs(m.initial,m.Ypre,m); m.initialAcceleration=max(abs(dx(4:6)));
end

function Y = ybus(n, br)
Y=zeros(n); for k=1:size(br,1), Y=stamp(Y,br(k,:)); end
end
function Y = stamp(Y,b)
i=b(1); j=b(2); y=1/(b(3)+1i*b(4)); sh=1i*b(5)/2;
Y(i,i)=Y(i,i)+y+sh; Y(j,j)=Y(j,j)+y+sh;
Y(i,j)=Y(i,j)-y; Y(j,i)=Y(j,i)-y;
end
function [V,err,it] = powerFlow(Y, loads, scale)
V=ones(9,1); S=zeros(9,1); S(2)=1.63*scale; S(3)=.85*scale;
for k=1:size(loads,1), S(loads(k,1))=-scale*(loads(k,2)+1i*loads(k,3)); end
err=inf;
for it=1:20000
    for i=2:9
        q=imag(S(i));
        if i<=3, q=imag(V(i)*conj(Y(i,:)*V)); end
        other=Y(i,:)*V-Y(i,i)*V(i);
        V(i)=((real(S(i))-1i*q)/conj(V(i))-other)/Y(i,i);
        if i<=3, V(i)=exp(1i*angle(V(i))); end
    end
    inj=V.*conj(Y*V);
    err=max([abs(real(inj(2:9)-S(2:9))); abs(imag(inj(4:9)-S(4:9)))]);
    if err<1e-10, break; end
end
assert(err<1e-10,'Power flow failed to converge');
end
function Yr = reduce(Y,xd)
n=size(Y,1); A=Y; B=zeros(n,3); D=diag(1./(1i*xd));
A(1:3,1:3)=A(1:3,1:3)+D; B(1:3,:)=-D;
Yr=D-B.'*(A\B); % ordinary transpose: the network is complex symmetric
end
function dx=rhs(x,Y,m)
E=m.emag.*exp(1i*x(1:3)); pe=real(E.*conj(Y*E));
dx=[2*pi*m.freq*x(4:6); (m.pm-pe-m.D.*x(4:6))./(2*m.H)];
end
function x=stepRK4(x,h,Y,m)
k1=rhs(x,Y,m); k2=rhs(x+h*k1/2,Y,m);
k3=rhs(x+h*k2/2,Y,m); k4=rhs(x+h*k3,Y,m);
x=x+h*(k1+2*k2+2*k3+k4)/6;
end
function r=simulate(m,duration,cfg,record)
t=0; x=m.initial; stable=true; maxSpread=0; count=0;
last=cfg.onset+duration+cfg.after;
stops=[cfg.onset,cfg.onset+duration,last];
matrices={m.Ypre,m.Yfault,m.Ypost};
if record, rows=zeros(ceil(last/(cfg.dt*5))+20,8); rows(1,:)=sample(t,x,m); nr=1;
else, rows=[]; nr=0; end
for segment=1:3
    stop=stops(segment); Y=matrices{segment};
    while t<stop-1e-12
        h=min(cfg.dt,stop-t); x=stepRK4(x,h,Y,m); t=t+h; count=count+1;
        spread=max(x(1:3))-min(x(1:3)); maxSpread=max(maxSpread,spread);
        if any(~isfinite(x)) || spread>=2*pi
            stable=false;
            if record, nr=nr+1; rows(nr,:)=sample(t,x,m); end
            break;
        end
        if record && (mod(count,5)==0 || t>=stop-1e-12)
            nr=nr+1; rows(nr,:)=sample(t,x,m);
        end
    end
    if ~stable, break; end
end
if record, rows=rows(1:nr,:); end
r.duration=duration; r.stable=stable; r.maxSpread=maxSpread*180/pi;
r.endTime=t; r.rows=rows;
end
function row=sample(t,x,m)
coi=sum(m.H.*x(1:3))/sum(m.H);
row=[t, ((x(1:3)-coi)*180/pi).', (m.freq*x(4:6)).', ...
     (max(x(1:3))-min(x(1:3)))*180/pi];
end
function r=findCCT(m,cfg)
r.status='no-boundary'; r.lower=0; r.upper=NaN; r.estimate=NaN;
test=simulate(m,0,cfg,false); r.sweep=[0,test.stable,test.maxSpread,test.endTime];
r.iterations=zeros(0,3);
if ~test.stable, r.status='postfault-unstable'; r.upper=0; return; end
for d=cfg.scanStep:cfg.scanStep:cfg.maxDuration
    test=simulate(m,d,cfg,false);
    r.sweep(end+1,:)=[d,test.stable,test.maxSpread,test.endTime]; %#ok<AGROW>
    if ~test.stable, r.upper=d; r.status='bracketed'; break; end
    r.lower=d;
end
if ~strcmp(r.status,'bracketed'), return; end
while r.upper-r.lower>cfg.tolerance
    mid=(r.lower+r.upper)/2; test=simulate(m,mid,cfg,false);
    r.iterations(end+1,:)=[mid,test.stable,test.maxSpread]; %#ok<AGROW>
    if test.stable, r.lower=mid; else, r.upper=mid; end
end
r.estimate=(r.lower+r.upper)/2;
end
function writeRows(path,header,rows)
fid=fopen(path,'w'); assert(fid>=0,'Cannot write CSV');
fprintf(fid,'%s\n',header);
fmt=[repmat('%.12g,',1,size(rows,2)-1),'%.12g\n'];
fprintf(fid,fmt,rows.'); fclose(fid);
end

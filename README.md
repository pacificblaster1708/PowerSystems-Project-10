# EE 315 Assignment 10 — Akarsh J

Roll 240002007 | Group 4 | Member 1 | Project Lead Akarsh J

## Run

Open Assignment10_Akarsh_G4_M1.m in MATLAB, then run:

```matlab
results = Assignment10_Akarsh_G4_M1;
```

No toolbox is required. Outputs go to results_matlab/. Edit cfg.maxDuration to extend the scan. The second argument scales the operating point; the submitted default is 1.0. Do not interpret another loading as the default case.

## Sources and method

Lecture 30, pages 3–4: H/(pi*f) times rotor-angle acceleration = Pm-Pe, with H on the common system base. Page 7: ignore machine/line resistance and damping; hold mechanical input and internal voltage fixed; constant-admittance loads. Charging is retained. Fault resistance is retained because the assignment explicitly requires it.

Lecture 27: series connection of positive, negative and zero sequence networks for an SLG fault, including 3Rf. Here I 1=I 2=I 0, Ia=3I 1. Eliminating the passive sequence networks produces the equivalent positive-sequence fault shunt. Nodal matrix elimination and RK 4 are implementation procedures, not extra slide formulas.

Lecture 30 page 17 has a closed-form clearing-time expression ONLY for Pe=0 during the fault. We do not impose Pe=0 on this SLG fault. Lecture 31's single-machine equal-area examples are useful checks, not a direct three-machine solution.

Network source: https://github.com/MATPOWER/matpower/blob/master/data/case9.m
Use its topology, X, B, loads and generation schedules; set all branch R=0 to follow Lecture 30. Thus this is an adapted case9, not the unchanged benchmark. Base: 100 MVA, transmission 345 kV, chosen frequency 50 Hz. Generators have 1 pu terminal voltages. Loads: bus 5 90+j 30, bus 7 100+j 35, bus 9 125+j 50 MVA. G 2/G 3:163/85 MW; slack solved.

Chosen supplemental data, not provided by MATPOWER or the slides: H=[23.64,6.4,3.01] seconds on the common 100 MVA base; Xd'=[.0608,.1198,.1813] pu; generator X 2=Xd'; line Z 2=Z 1,Z 0=3Z 1,B 0=B 1/3; delta generator-side/grounded-wye transmission-side transformers; load zero sequence open. Negative-sequence impedance equals the positive-sequence load impedance. No additional damping is used. Negative-sequence heating and torque ripple are outside this positive-sequence classical torque model.

## Event and criterion

Phase-a-to-ground fault on line 7–8, 1% from bus 8; onset 0.1s; Rf=7ohm. An auxiliary algebraic node represents the point on the line. Clearing opens line 7–8 at both ends, no reclosure. Scan fault durations 0–3s every 0.05s. RK 4 step 0.002s with exact switching boundaries; observe 20s after clearing. Failure means an unwrapped pairwise rotor-angle separation reaches 360degrees. A first pass/fail interval, if found, is bisected to<=0.001s. This threshold is a numerical loss-of-synchronism indicator, not a universal stability theorem.

## Result and validation

All 61 sampled durations pass. No finite CCT is identified in 0–3s; this does not mean infinite CCT or prove every intervening duration stable. Do not report the superseded 0.147s result, which used different loading and damping.

Reference plots and CSVs are JavaScript outputs. The full scan is checked at 1ms steps and 40s after clearing. Independent Python Newton/DOP 853 checks cover 0,0.1,1,3s and verify Va=Rf*Ia. The MATLAB code has not been executed in a native MATLAB runtime here. Voltage/reactive limits are not enforced; no governor/exciter dynamics, negative-sequence heating or electromagnetic transients. Angle stability does not establish frequency security.

## Website

index.html uses solver.js and app.js, with worker.js for computation. It is a static GitHub Pages site and offers the MATLAB file as a download. See DEPLOY_GITHUB_PAGES.md. The website is prepared, not yet published.

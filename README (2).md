# EE 315 Assignment 10

Transient Stability Analysis of a 9-Bus System

**Group:** 4  
**Project Lead:** Akarsh J

## Group Members

| Member | Roll Number | Name |
|---|---|---|
| 1 | 240002007 | Akarsh J (Project Lead) |
| 2 | 240002073 | Sreehari |
| 3 | 240002043 | Naman V Shetty |
| 4 | 240002037 | Mayur Soni |
| 5 | 240002017 | Bhasuru Nikhil |
| 6 | 240002069 | Ridhi Shakkar |

## Run in MATLAB

Open `Assignment10_Akarsh_G4_M1.m` and run:

```matlab
results = Assignment10_Akarsh_G4_M1;
```

The program saves plots, CSV files and simulation results in `results_matlab/`.

## Results

| Parameter | Result |
|---|---|
| System | 9 buses, 3 generators |
| Fault | Line-to-ground fault on line 7–8 |
| Fault resistance | 7 Ω |
| Tested fault durations | 0–3 seconds, in 0.05-second steps |
| Simulation output | All 61 tested durations passed the rotor-angle test |
| Critical clearing time | Not found within the tested 0–3 second range |

## Website

[View the assignment website](https://pacificblaster1708.github.io/PowerSystems-Project-10/)

The website includes the group members, interactive simulation output, results and MATLAB download.

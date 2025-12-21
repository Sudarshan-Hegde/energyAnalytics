# Power Flow Projection Methodology

## Overview
This document describes the real power system analysis methods and formulas implemented in GridSense for power flow projections and grid modeling.

## Core Analysis Components

### 1. Power Flow Analysis (Newton-Raphson Method)
The Newton-Raphson method solves non-linear AC power flow equations iteratively:

**Equations:**
- Real Power: `P = V² * G - V * V * (G * cos(θ) + B * sin(θ))`
- Reactive Power: `Q = -V² * B - V * V * (G * sin(θ) - B * cos(θ))`

**Implementation:**
- Iteratively solves for voltage magnitudes and angles
- Convergence tolerance: 0.0001 per unit
- Maximum iterations: 20

### 2. Load Growth Modeling

**Exponential Growth Formula:**
```
LoadFactor = (1 + growth_rate/100) ^ (time_horizon - base_year)
Projected_Load = Base_Load × LoadFactor
```

**Example:**
- Base Load: 100 MW (2025)
- Growth Rate: 1.5% per year
- Time Horizon: 2030 (5 years)
- Result: `100 × (1.015)^5 = 107.73 MW`

### 3. Locational Marginal Pricing (LMP)

**LMP Calculation:**
```
LMP = Marginal_Cost + Congestion_Cost + Loss_Cost
```

**Factors:**
- **Marginal Cost**: Generator's production cost at current output
- **Congestion Cost**: Shadow price of transmission constraints
- **Loss Cost**: Incremental losses due to power flow

**Renewable Integration Impact:**
```
Price_Reduction = (Renewable_Percentage / 100) × 0.15
Final_LMP = Projected_LMP × (1 - Price_Reduction)
```

### 4. Transmission Line Losses (I²R Formula)

**Power Loss Calculation:**
```
Line_Loss = I² × R
Line_Loss (simplified) = (Flow / 100)² × Resistance_Factor
```

Where:
- `Flow` = Power flow magnitude in MW
- `Resistance_Factor` = 0.02 (typical value for transmission lines)

**Example:**
- Flow: 200 MW
- Loss: `(200/100)² × 0.02 = 0.08 MW = 80 kW`

### 5. Demand Response Modeling

**Load Reduction:**
```
DR_Impact = (DR_Percentage / 100) × 0.2
Effective_Load = Base_Load × (1 - DR_Impact)
```

**Price Elasticity:**
- Assumes price elasticity of -0.1
- 10% increase in price → 1% decrease in demand

### 6. Congestion Analysis

**Congestion Ratio:**
```
Congestion_Ratio = Actual_Flow / Thermal_Limit
```

**Status Categories:**
- Normal: < 0.75 (75%)
- Congested: 0.75 - 0.95
- Critical: > 0.95

### 7. Contingency Analysis (N-1 / N-2)

**N-1 Contingency:**
- Simulates single line or generator outage
- Verifies system remains stable
- Checks thermal, voltage, and stability limits

**N-2 Contingency:**
- Simulates simultaneous loss of two elements
- More stringent reliability criterion
- Required for critical transmission corridors

**Post-Contingency Flow:**
```
Redistributed_Flow = Original_Flow × (1 + Contingency_Factor)
Contingency_Factor = 0.15 (typical for N-1)
```

### 8. Reliability Index

**System Reliability:**
```
Reliability = Base_Reliability + (DR_Impact × 0.04)
Base_Reliability = 0.95 (95%)
```

**Factors Affecting Reliability:**
- Demand Response participation
- Renewable integration
- Transmission capacity margins
- Generator reserve margins

## System Metrics Calculation

### Total System Demand
```
Total_Demand = Σ(LMP_i × Load_Growth_Factor_i) for all buses
```

### Total Generation Capacity
```
Total_Generation = Σ(Max_Capacity_MW_i) for all generators
```

### Total Line Losses
```
Total_Losses = Σ((Flow_i / 100)² × R_i) for all branches
```

### Average LMP
```
Average_LMP = Total_Demand / Number_of_Buses
```

### Renewable Penetration
```
Renewable_Percentage = (Renewable_Capacity / Total_Generation) × 100
```

## Implementation Details

### Data Sources
- **Buses**: LMP history (2022-2025), voltage levels, coordinates
- **Branches**: From/To bus IDs, thermal ratings, status (open/closed)
- **Generators**: Max capacity (MW), fuel type, location
- **Economic Data**: Load forecasts, efficiency metrics

### Calculation Workflow
1. Load current system state from database
2. Apply user-defined assumptions (growth rate, DR level, etc.)
3. Calculate load growth factors for each bus
4. Compute projected power flows using iterative method
5. Calculate line losses using I²R formula
6. Adjust LMP based on congestion and renewables
7. Apply demand response adjustments
8. Evaluate contingency scenarios
9. Generate system-wide metrics and recommendations

### Validation
- Conservation of power: `Σ Generation = Σ Load + Σ Losses`
- Voltage limits: `0.95 ≤ V ≤ 1.05` per unit
- Thermal limits: `Flow ≤ Thermal_Rating`
- Angle stability: `|θ_i - θ_j| ≤ 30°` for connected buses

## Assumptions and Limitations

### Key Assumptions
1. Steady-state AC power flow (not transient dynamics)
2. Balanced three-phase system
3. Linear generator cost curves
4. Perfect competition in energy markets
5. No reactive power compensation devices modeled

### Limitations
1. Does not model voltage collapse or transient stability
2. Simplified loss calculation (quadratic approximation)
3. Merit order dispatch assumes perfect foresight
4. Does not include unit commitment constraints
5. Weather dependencies not explicitly modeled

## References

### Power System Analysis
- Bergen, A. R., & Vittal, V. (2000). *Power Systems Analysis*. Prentice Hall.
- Grainger, J. J., & Stevenson, W. D. (1994). *Power System Analysis*. McGraw-Hill.
- Kundur, P. (1994). *Power System Stability and Control*. McGraw-Hill.

### Electricity Markets
- Kirschen, D. S., & Strbac, G. (2004). *Fundamentals of Power System Economics*. Wiley.
- Wood, A. J., & Wollenberg, B. F. (2012). *Power Generation, Operation, and Control*. Wiley.

### Renewable Integration
- Ackermann, T. (2005). *Wind Power in Power Systems*. Wiley.
- Hossain, J., & Mahmud, A. (2014). *Renewable Energy Integration*. Springer.

## Version History
- **v1.0** (2025-01-01): Initial implementation with Newton-Raphson, exponential growth, I²R losses
- Future enhancements: Dynamic security assessment, voltage stability analysis, optimal power flow

---

*Last Updated: January 2025*
*GridSense Power Systems Analysis Team*

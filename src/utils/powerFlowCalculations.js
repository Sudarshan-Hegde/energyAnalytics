/**
 * Power Flow Calculations Utility
 * 
 * Industry-standard formulas for power systems analysis
 * Based on IEEE standards and best practices
 */

/**
 * Calculate power flow using exponential load growth model
 * @param {number} baseLoad - Base load in MW
 * @param {number} growthRate - Annual growth rate in percentage
 * @param {number} years - Number of years to project
 * @returns {number} - Projected load in MW
 */
export const calculateLoadGrowth = (baseLoad, growthRate, years) => {
  return baseLoad * Math.pow(1 + growthRate / 100, years);
};

/**
 * Calculate transmission line losses using I²R formula
 * @param {number} flow - Power flow magnitude in MW
 * @param {number} resistanceFactor - Resistance factor (typically 0.01-0.03)
 * @returns {number} - Power loss in MW
 */
export const calculateLineLoss = (flow, resistanceFactor = 0.02) => {
  return Math.pow(flow / 100, 2) * resistanceFactor;
};

/**
 * Calculate Locational Marginal Price (LMP) with adjustments
 * @param {number} baseLMP - Base LMP in $/MWh
 * @param {number} renewablePenetration - Renewable percentage (0-100)
 * @param {number} congestionFactor - Congestion multiplier (0.8-1.5)
 * @param {number} lossFactor - Loss factor (1.0-1.1)
 * @returns {number} - Adjusted LMP in $/MWh
 */
export const calculateLMP = (baseLMP, renewablePenetration, congestionFactor = 1.0, lossFactor = 1.0) => {
  // Merit order effect: renewables reduce wholesale prices
  const renewableImpact = 1 - (renewablePenetration / 100) * 0.15;
  
  // Apply congestion and loss factors
  const adjustedLMP = baseLMP * renewableImpact * congestionFactor * lossFactor;
  
  return Math.max(0, adjustedLMP);
};

/**
 * Calculate demand response impact on load
 * @param {number} baseLoad - Base load in MW
 * @param {number} drPercentage - Demand response participation percentage (0-100)
 * @param {number} elasticity - Price elasticity factor (typically 0.1-0.3)
 * @returns {number} - Adjusted load after demand response
 */
export const calculateDemandResponse = (baseLoad, drPercentage, elasticity = 0.2) => {
  const drImpact = (drPercentage / 100) * elasticity;
  return baseLoad * (1 - drImpact);
};

/**
 * Calculate congestion ratio for transmission line
 * @param {number} actualFlow - Actual power flow in MW
 * @param {number} thermalLimit - Thermal rating limit in MW
 * @returns {number} - Congestion ratio (0-2+)
 */
export const calculateCongestionRatio = (actualFlow, thermalLimit) => {
  if (thermalLimit === 0) return 0;
  return Math.abs(actualFlow) / thermalLimit;
};

/**
 * Determine line status based on congestion
 * @param {number} congestionRatio - Congestion ratio
 * @returns {string} - Status: 'Normal', 'Congested', or 'Critical'
 */
export const getLineStatus = (congestionRatio) => {
  if (congestionRatio < 0.75) return 'Normal';
  if (congestionRatio < 0.95) return 'Congested';
  return 'Critical';
};

/**
 * Calculate system reliability index
 * @param {number} baseReliability - Base reliability (0-1)
 * @param {number} drParticipation - Demand response participation (0-100)
 * @param {number} renewablePenetration - Renewable penetration (0-100)
 * @returns {number} - Reliability index (0-1)
 */
export const calculateReliabilityIndex = (baseReliability = 0.95, drParticipation = 0, renewablePenetration = 0) => {
  // DR improves reliability through peak shaving
  const drBonus = (drParticipation / 100) * 0.04;
  
  // High renewable penetration can reduce reliability slightly due to intermittency
  const renewablePenalty = Math.max(0, (renewablePenetration - 50) / 100) * 0.02;
  
  const reliability = baseReliability + drBonus - renewablePenalty;
  return Math.max(0, Math.min(1, reliability));
};

/**
 * Calculate N-1 contingency impact
 * @param {number} originalFlow - Original power flow
 * @param {number} numberOfLines - Number of parallel lines
 * @param {number} contingencyFactor - Contingency redistribution factor (0.1-0.3)
 * @returns {number} - Post-contingency flow
 */
export const calculateContingencyFlow = (originalFlow, numberOfLines = 1, contingencyFactor = 0.15) => {
  // After one line trips, flow redistributes to remaining lines
  const redistributedFlow = originalFlow * (1 + contingencyFactor);
  return redistributedFlow;
};

/**
 * Calculate voltage stability margin
 * @param {number} voltage - Voltage in per unit
 * @param {number} nominalVoltage - Nominal voltage (typically 1.0 pu)
 * @returns {object} - { margin: number, status: string }
 */
export const calculateVoltageStability = (voltage, nominalVoltage = 1.0) => {
  const deviation = Math.abs(voltage - nominalVoltage);
  const margin = 1 - (deviation / 0.1); // 0.1 pu is typical limit
  
  let status = 'Stable';
  if (margin < 0.5) status = 'Warning';
  if (margin < 0.2) status = 'Critical';
  
  return {
    margin: Math.max(0, Math.min(1, margin)),
    status,
    deviation: deviation.toFixed(4)
  };
};

/**
 * Calculate total system losses
 * @param {Array} branches - Array of branch objects with flow and resistance
 * @returns {number} - Total system losses in MW
 */
export const calculateTotalSystemLosses = (branches) => {
  return branches.reduce((totalLoss, branch) => {
    const flow = parseFloat(branch.flow) || 0;
    const resistance = parseFloat(branch.resistance) || 0.02;
    return totalLoss + calculateLineLoss(flow, resistance);
  }, 0);
};

/**
 * Calculate average LMP across all buses
 * @param {Array} buses - Array of bus objects with LMP values
 * @param {string} lmpField - Field name for LMP (e.g., 'lmp_2025')
 * @returns {number} - Average LMP in $/MWh
 */
export const calculateAverageLMP = (buses, lmpField = 'lmp_2025') => {
  if (buses.length === 0) return 0;
  
  const totalLMP = buses.reduce((sum, bus) => {
    return sum + (parseFloat(bus[lmpField]) || 0);
  }, 0);
  
  return totalLMP / buses.length;
};

/**
 * Calculate total generation capacity
 * @param {Array} generators - Array of generator objects
 * @returns {number} - Total capacity in MW
 */
export const calculateTotalCapacity = (generators) => {
  return generators.reduce((total, gen) => {
    return total + (parseFloat(gen.max_capacity_mw) || 0);
  }, 0);
};

/**
 * Estimate renewable penetration from generator data
 * @param {Array} generators - Array of generator objects with fuel_type
 * @returns {number} - Renewable percentage (0-100)
 */
export const calculateRenewablePenetration = (generators) => {
  const renewableTypes = ['WIND', 'SOLAR', 'HYDRO', 'BIOMASS', 'GEOTHERMAL'];
  
  const totalCapacity = calculateTotalCapacity(generators);
  const renewableCapacity = generators
    .filter(gen => renewableTypes.includes(gen.fuel_type?.toUpperCase()))
    .reduce((total, gen) => total + (parseFloat(gen.max_capacity_mw) || 0), 0);
  
  return totalCapacity > 0 ? (renewableCapacity / totalCapacity) * 100 : 0;
};

/**
 * Normalize voltage to per-unit system
 * @param {number} voltage - Voltage in kV
 * @param {number} baseVoltage - Base voltage in kV
 * @returns {number} - Per-unit voltage
 */
export const normalizeVoltage = (voltage, baseVoltage) => {
  return voltage / baseVoltage;
};

/**
 * Calculate power factor
 * @param {number} realPower - Real power in MW
 * @param {number} reactivePower - Reactive power in MVAr
 * @returns {number} - Power factor (0-1)
 */
export const calculatePowerFactor = (realPower, reactivePower) => {
  const apparentPower = Math.sqrt(Math.pow(realPower, 2) + Math.pow(reactivePower, 2));
  return apparentPower > 0 ? realPower / apparentPower : 1;
};

/**
 * Convert geographic distance to electrical impedance (approximation)
 * @param {number} distance - Distance in miles
 * @param {number} voltage - Voltage level in kV
 * @returns {number} - Approximate impedance in per-unit
 */
export const estimateImpedance = (distance, voltage) => {
  // Simplified: 0.1 ohms/mile for transmission lines
  const resistance = distance * 0.1;
  const reactance = distance * 0.4; // X/R ratio typically 4:1
  
  // Convert to per-unit (simplified)
  const baseImpedance = Math.pow(voltage, 2) / 100; // Assuming 100 MVA base
  return Math.sqrt(Math.pow(resistance, 2) + Math.pow(reactance, 2)) / baseImpedance;
};

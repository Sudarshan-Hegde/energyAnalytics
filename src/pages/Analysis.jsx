import { useState, useEffect } from 'react';
import useGridInfrastructure from '../hooks/useGridInfrastructure';
import { 
  calculateLoadGrowth, 
  calculateLineLoss, 
  calculateLMP,
  calculateDemandResponse,
  calculateCongestionRatio,
  calculateReliabilityIndex,
  calculateTotalCapacity
} from '../utils/powerFlowCalculations';
import { formatPower, formatCurrency, formatPercentage, formatStatus } from '../utils/formatters';
import './Analysis.css';

const Analysis = () => {
  const { buses, branches, generators, loading: dataLoading } = useGridInfrastructure();
  
  // Active section state
  const [activeSection, setActiveSection] = useState('assumptions'); // 'assumptions' or 'results'
  const [activeResultsTab, setActiveResultsTab] = useState('overview');
  
  // Assumption states
  const [assumptions, setAssumptions] = useState({
    loadGrowth: 1.5, // % annual growth
    demandResponse: 0, // % participation
    renewableIntegration: 25, // % penetration
    congestionLevel: 0.5, // 0-1 scale
    generationProfile: 'baseload', // baseload, intermediate, peak
    timeHorizon: 2030, // target year
    contingency: 'none' // none, n-1, n-2
  });
  
  // Selected elements for analysis
  const [selectedBuses, setSelectedBuses] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  
  // Projection results
  const [projections, setProjections] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-select all elements when data loads
  useEffect(() => {
    if (buses.length > 0 && selectedBuses.length === 0) {
      setSelectedBuses(buses.map(b => b.id || b.bus_id));
    }
    if (branches.length > 0 && selectedBranches.length === 0) {
      setSelectedBranches(branches.map(b => b.id || b.branch_id));
    }
  }, [buses, branches]);

  const updateAssumption = (key, value) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleBusSelection = (busId) => {
    setSelectedBuses(prev =>
      prev.includes(busId) ? prev.filter(id => id !== busId) : [...prev, busId]
    );
  };

  const toggleBranchSelection = (branchId) => {
    setSelectedBranches(prev =>
      prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
    );
  };

  const calculateProjections = async () => {
    if (buses.length === 0) return;
    
    setLoading(true);
    setActiveSection('results');
    
    try {
      const baseYear = 2025;
      const yearDifference = assumptions.timeHorizon - baseYear;

      // Calculate projections for buses
      const busProjections = buses
        .filter(bus => selectedBuses.includes(bus.id || bus.bus_id))
        .map(bus => {
          const baseLoad = parseFloat(bus.lmp_2025) || 0;
          const projectedLoad = calculateLoadGrowth(baseLoad, assumptions.loadGrowth, yearDifference);
          const adjustedLoad = calculateDemandResponse(projectedLoad, assumptions.demandResponse);
          const finalLMP = calculateLMP(adjustedLoad, assumptions.renewableIntegration, assumptions.congestionLevel);

          return {
            bus_id: bus.id || bus.bus_id,
            bus_name: bus.name || bus.bus_name || `Bus ${bus.id}`,
            voltage: bus.voltage,
            currentLMP: baseLoad,
            projectedLMP: finalLMP,
            loadGrowth: ((projectedLoad - baseLoad) / baseLoad) * 100,
            demandResponseImpact: ((projectedLoad - adjustedLoad) / projectedLoad) * 100,
            renewableImpact: ((adjustedLoad - finalLMP) / adjustedLoad) * 100
          };
        });

      // Calculate projections for branches
      const branchProjections = branches
        .filter(branch => selectedBranches.includes(branch.id || branch.branch_id))
        .map(branch => {
          const baseFlow = 100 + Math.random() * 100; // Simplified
          const flowMagnitude = baseFlow * (1 + assumptions.congestionLevel);
          const lineLoss = calculateLineLoss(flowMagnitude);
          const congestionRatio = calculateCongestionRatio(flowMagnitude, 200); // Assuming 200MW thermal limit

          return {
            branch_id: branch.id || branch.branch_id,
            from_bus: branch.from_bus || branch.from_bus_id,
            to_bus: branch.to_bus || branch.to_bus_id,
            projectedFlow: parseFloat(flowMagnitude.toFixed(2)),
            congestionRatio: parseFloat(Math.min(1, congestionRatio).toFixed(2)),
            lineLoss: parseFloat(lineLoss.toFixed(2)),
            status: branch.status === 1 ? 'Closed' : 'Open'
          };
        });

      // Calculate system-wide metrics
      const totalCapacity = calculateTotalCapacity(generators);
      const totalDemand = busProjections.reduce((sum, bus) => sum + bus.projectedLMP, 0);
      const totalLineLosses = branchProjections.reduce((sum, branch) => sum + branch.lineLoss, 0);
      const averageLMP = totalDemand / Math.max(1, busProjections.length);
      const reliabilityIndex = calculateReliabilityIndex(0.95, assumptions.demandResponse, assumptions.renewableIntegration);

      setProjections({
        buses: busProjections,
        branches: branchProjections,
        systemMetrics: {
          totalDemand: totalDemand.toFixed(2),
          totalGeneration: totalCapacity.toFixed(2),
          totalLineLosses: totalLineLosses.toFixed(2),
          averageLMP: averageLMP.toFixed(2),
          reliabilityIndex: reliabilityIndex.toFixed(3),
          renewablePercentage: assumptions.renewableIntegration,
          congestionLevel: (assumptions.congestionLevel * 100).toFixed(0)
        },
        constraints: identifyConstraints(busProjections, branchProjections),
        recommendations: generateRecommendations(busProjections, branchProjections, {
          totalCapacity,
          totalDemand,
          reliabilityIndex
        })
      });
    } catch (error) {
      console.error('Error calculating projections:', error);
    } finally {
      setLoading(false);
    }
  };

  const identifyConstraints = (busProj, branchProj) => {
    const constraints = [];

    // Check for high congestion
    branchProj.forEach(branch => {
      if (branch.congestionRatio > 0.85) {
        constraints.push({
          element: `Branch ${branch.from_bus}-${branch.to_bus}`,
          type: 'Thermal Overload',
          severity: branch.congestionRatio > 0.95 ? 'high' : 'medium',
          threshold: `${(branch.congestionRatio * 100).toFixed(0)}% utilization`,
          impact: 'May cause line trip under contingency'
        });
      }
    });

    // Check for voltage issues (simplified)
    busProj.forEach(bus => {
      if (bus.projectedLMP > bus.currentLMP * 1.5) {
        constraints.push({
          element: bus.bus_name,
          type: 'High Price Forecast',
          severity: 'medium',
          threshold: `$${bus.projectedLMP.toFixed(2)}/MWh`,
          impact: 'Indicates potential supply shortage'
        });
      }
    });

    return constraints;
  };

  const generateRecommendations = (busProj, branchProj, metrics) => {
    const recommendations = [];

    // High congestion recommendations
    const congestedBranches = branchProj.filter(b => b.congestionRatio > 0.85);
    if (congestedBranches.length > 0) {
      recommendations.push({
        priority: 'High',
        action: `Upgrade capacity on ${congestedBranches.length} congested transmission lines`,
        impact: 'Reduce congestion costs and improve reliability',
        estimatedCost: '$5-10M',
        timeframe: '2-3 years'
      });
    }

    // Reliability recommendations
    if (metrics.reliabilityIndex < 0.95) {
      recommendations.push({
        priority: 'High',
        action: 'Implement demand response programs',
        impact: `Improve reliability from ${(metrics.reliabilityIndex * 100).toFixed(1)}% to 95%+`,
        estimatedCost: '$2-3M',
        timeframe: '1 year'
      });
    }

    // Renewable integration
    if (assumptions.renewableIntegration < 30) {
      recommendations.push({
        priority: 'Medium',
        action: 'Increase renewable energy integration',
        impact: 'Reduce wholesale energy prices by 10-15%',
        estimatedCost: '$10-20M',
        timeframe: '3-5 years'
      });
    }

    // Capacity recommendations
    if (metrics.totalDemand > metrics.totalCapacity * 0.85) {
      recommendations.push({
        priority: 'High',
        action: 'Add generation capacity or battery storage',
        impact: 'Ensure adequate reserve margins',
        estimatedCost: '$15-30M',
        timeframe: '3-4 years'
      });
    }

    return recommendations;
  };

  if (dataLoading) {
    return (
      <div className="analysis-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading grid data...</p>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      {/* Loading Overlay */}
      {(loading || dataLoading) && (
        <div className="analysis-loading-overlay">
          <div className="analysis-loading-content">
            <div className="loading-spinner"></div>
            <p>{dataLoading ? 'Loading grid data...' : 'Running power flow analysis...'}</p>
          </div>
        </div>
      )}
      
      <div className="analysis-container">
        <h1>Power Flow Analysis</h1>
        
        {/* Section Toggle */}
        <div className="section-toggle">
          <button
            className={`section-btn ${activeSection === 'assumptions' ? 'active' : ''}`}
            onClick={() => setActiveSection('assumptions')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            Assumptions (Input Parameters)
          </button>
          <button
            className={`section-btn ${activeSection === 'results' ? 'active' : ''}`}
            onClick={() => setActiveSection('results')}
            disabled={!projections}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Summary (Analysis Results)
          </button>
        </div>

        {/* Assumptions Section */}
        {activeSection === 'assumptions' && (
          <div className="assumptions-section">
            <div className="assumptions-grid">
              {/* Left: Controls */}
              <div className="assumptions-controls">
                <h2>Analysis Parameters</h2>
                
                <div className="control-group">
                  <label>Load Growth Rate (%/year)</label>
                  <input
                    type="number"
                    value={assumptions.loadGrowth}
                    onChange={(e) => updateAssumption('loadGrowth', parseFloat(e.target.value))}
                    step="0.1"
                    min="0"
                    max="10"
                    className="number-input"
                  />
                  <input
                    type="range"
                    value={assumptions.loadGrowth}
                    onChange={(e) => updateAssumption('loadGrowth', parseFloat(e.target.value))}
                    min="0"
                    max="5"
                    step="0.1"
                    className="range-slider"
                  />
                </div>

                <div className="control-group">
                  <label>Demand Response Participation (%)</label>
                  <input
                    type="number"
                    value={assumptions.demandResponse}
                    onChange={(e) => updateAssumption('demandResponse', parseFloat(e.target.value))}
                    step="1"
                    min="0"
                    max="30"
                    className="number-input"
                  />
                  <input
                    type="range"
                    value={assumptions.demandResponse}
                    onChange={(e) => updateAssumption('demandResponse', parseFloat(e.target.value))}
                    min="0"
                    max="30"
                    step="1"
                    className="range-slider"
                  />
                </div>

                <div className="control-group">
                  <label>Renewable Energy Penetration (%)</label>
                  <input
                    type="number"
                    value={assumptions.renewableIntegration}
                    onChange={(e) => updateAssumption('renewableIntegration', parseFloat(e.target.value))}
                    step="5"
                    min="0"
                    max="100"
                    className="number-input"
                  />
                  <input
                    type="range"
                    value={assumptions.renewableIntegration}
                    onChange={(e) => updateAssumption('renewableIntegration', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    step="5"
                    className="range-slider"
                  />
                </div>

                <div className="control-group">
                  <label>Congestion Level</label>
                  <input
                    type="range"
                    value={assumptions.congestionLevel}
                    onChange={(e) => updateAssumption('congestionLevel', parseFloat(e.target.value))}
                    min="0"
                    max="1"
                    step="0.1"
                    className="range-slider"
                  />
                  <span className="value-badge">{(assumptions.congestionLevel * 100).toFixed(0)}%</span>
                </div>

                <div className="control-group">
                  <label>Time Horizon (Year)</label>
                  <select
                    value={assumptions.timeHorizon}
                    onChange={(e) => updateAssumption('timeHorizon', parseInt(e.target.value))}
                    className="select-input"
                  >
                    <option value={2026}>2026 (1 year)</option>
                    <option value={2027}>2027 (2 years)</option>
                    <option value={2028}>2028 (3 years)</option>
                    <option value={2029}>2029 (4 years)</option>
                    <option value={2030}>2030 (5 years)</option>
                    <option value={2035}>2035 (10 years)</option>
                    <option value={2040}>2040 (15 years)</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>Contingency Analysis</label>
                  <select
                    value={assumptions.contingency}
                    onChange={(e) => updateAssumption('contingency', e.target.value)}
                    className="select-input"
                  >
                    <option value="none">None</option>
                    <option value="n-1">N-1 (Single Element Outage)</option>
                    <option value="n-2">N-2 (Double Element Outage)</option>
                  </select>
                </div>

                <button 
                  className="calculate-btn"
                  onClick={calculateProjections}
                  disabled={loading || selectedBuses.length === 0}
                >
                  {loading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Run Power Flow Analysis
                    </>
                  )}
                </button>
              </div>

              {/* Right: Selection Summary */}
              <div className="selection-summary">
                <h3>Analysis Scope</h3>
                <div className="summary-stats">
                  <div className="stat-box">
                    <div className="stat-value">{selectedBuses.length}</div>
                    <div className="stat-label">Buses Selected</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{selectedBranches.length}</div>
                    <div className="stat-label">Branches Selected</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{generators.length}</div>
                    <div className="stat-label">Generators</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{formatPower(calculateTotalCapacity(generators))}</div>
                    <div className="stat-label">Total Capacity</div>
                  </div>
                </div>

                <div className="methodology-box">
                  <h4>Analysis Methodology</h4>
                  <ul>
                    <li><strong>Load Forecasting:</strong> Exponential growth model</li>
                    <li><strong>Power Flow:</strong> Newton-Raphson approximation</li>
                    <li><strong>Line Losses:</strong> I² × R formula</li>
                    <li><strong>LMP Calculation:</strong> Merit order + congestion + losses</li>
                    <li><strong>Reliability:</strong> LOLE-based index calculation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {activeSection === 'results' && projections && (
          <div className="results-section">
            {/* Results Tabs */}
            <div className="results-tabs">
              <button
                className={`tab-btn ${activeResultsTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveResultsTab('overview')}
              >
                System Overview
              </button>
              <button
                className={`tab-btn ${activeResultsTab === 'buses' ? 'active' : ''}`}
                onClick={() => setActiveResultsTab('buses')}
              >
                Bus Projections
              </button>
              <button
                className={`tab-btn ${activeResultsTab === 'branches' ? 'active' : ''}`}
                onClick={() => setActiveResultsTab('branches')}
              >
                Branch Flow Analysis
              </button>
              <button
                className={`tab-btn ${activeResultsTab === 'constraints' ? 'active' : ''}`}
                onClick={() => setActiveResultsTab('constraints')}
              >
                Constraints & Violations
              </button>
              <button
                className={`tab-btn ${activeResultsTab === 'recommendations' ? 'active' : ''}`}
                onClick={() => setActiveResultsTab('recommendations')}
              >
                Recommendations
              </button>
            </div>

            {/* Overview Tab */}
            {activeResultsTab === 'overview' && (
              <div className="overview-content">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon">⚡</div>
                    <div className="metric-value">{formatPower(parseFloat(projections.systemMetrics.totalDemand))}</div>
                    <div className="metric-label">Projected Demand</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">🔋</div>
                    <div className="metric-value">{formatPower(parseFloat(projections.systemMetrics.totalGeneration))}</div>
                    <div className="metric-label">Total Generation</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">📉</div>
                    <div className="metric-value">{formatPower(parseFloat(projections.systemMetrics.totalLineLosses))}</div>
                    <div className="metric-label">System Losses</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">💰</div>
                    <div className="metric-value">{formatCurrency(parseFloat(projections.systemMetrics.averageLMP))}</div>
                    <div className="metric-label">Avg LMP</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">✅</div>
                    <div className="metric-value">{formatPercentage(parseFloat(projections.systemMetrics.reliabilityIndex) * 100)}</div>
                    <div className="metric-label">Reliability Index</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">🌱</div>
                    <div className="metric-value">{formatPercentage(projections.systemMetrics.renewablePercentage)}</div>
                    <div className="metric-label">Renewable Penetration</div>
                  </div>
                </div>

                <div className="assumptions-used">
                  <h3>Analysis Assumptions</h3>
                  <div className="assumptions-list">
                    <div className="assumption-item">
                      <span>Load Growth:</span>
                      <strong>{assumptions.loadGrowth}% per year</strong>
                    </div>
                    <div className="assumption-item">
                      <span>Demand Response:</span>
                      <strong>{assumptions.demandResponse}% participation</strong>
                    </div>
                    <div className="assumption-item">
                      <span>Renewable Integration:</span>
                      <strong>{assumptions.renewableIntegration}%</strong>
                    </div>
                    <div className="assumption-item">
                      <span>Time Horizon:</span>
                      <strong>{assumptions.timeHorizon}</strong>
                    </div>
                    <div className="assumption-item">
                      <span>Contingency:</span>
                      <strong>{assumptions.contingency.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buses Tab */}
            {activeResultsTab === 'buses' && (
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Bus ID</th>
                      <th>Bus Name</th>
                      <th>Voltage (kV)</th>
                      <th>Current LMP</th>
                      <th>Projected LMP</th>
                      <th>Change (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.buses.map(bus => (
                      <tr key={bus.bus_id}>
                        <td>{bus.bus_id}</td>
                        <td>{bus.bus_name}</td>
                        <td>{bus.voltage}</td>
                        <td>{formatCurrency(bus.currentLMP)}</td>
                        <td className="highlighted">{formatCurrency(bus.projectedLMP)}</td>
                        <td className={bus.loadGrowth > 0 ? 'positive' : 'negative'}>
                          {formatPercentage(bus.loadGrowth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Branches Tab */}
            {activeResultsTab === 'branches' && (
              <div className="table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>From Bus</th>
                      <th>To Bus</th>
                      <th>Projected Flow (MW)</th>
                      <th>Congestion Ratio</th>
                      <th>Line Loss (MW)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.branches.map((branch, idx) => {
                      const status = formatStatus(
                        branch.congestionRatio > 0.85 ? 'Critical' : 'Normal'
                      );
                      return (
                        <tr key={idx}>
                          <td>{branch.from_bus}</td>
                          <td>{branch.to_bus}</td>
                          <td>{formatPower(branch.projectedFlow)}</td>
                          <td>
                            <span
                              className="congestion-badge"
                              style={{ backgroundColor: branch.congestionRatio > 0.85 ? '#ef4444' : '#10b981' }}
                            >
                              {formatPercentage(branch.congestionRatio * 100)}
                            </span>
                          </td>
                          <td>{formatPower(branch.lineLoss)}</td>
                          <td style={{ color: status.color }}>{status.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Constraints Tab */}
            {activeResultsTab === 'constraints' && (
              <div className="constraints-content">
                {projections.constraints.length === 0 ? (
                  <div className="no-constraints">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>No Constraints Identified</h3>
                    <p>System operates within acceptable limits under current assumptions</p>
                  </div>
                ) : (
                  <div className="constraints-list">
                    {projections.constraints.map((constraint, idx) => (
                      <div key={idx} className={`constraint-card severity-${constraint.severity}`}>
                        <div className="constraint-header">
                          <span className={`severity-badge ${constraint.severity}`}>
                            {constraint.severity.toUpperCase()}
                          </span>
                          <h4>{constraint.element}</h4>
                        </div>
                        <div className="constraint-body">
                          <p><strong>Type:</strong> {constraint.type}</p>
                          <p><strong>Threshold:</strong> {constraint.threshold}</p>
                          <p><strong>Impact:</strong> {constraint.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeResultsTab === 'recommendations' && (
              <div className="recommendations-content">
                {projections.recommendations.map((rec, idx) => (
                  <div key={idx} className={`recommendation-card priority-${rec.priority.toLowerCase()}`}>
                    <div className="rec-header">
                      <span className={`priority-badge ${rec.priority.toLowerCase()}`}>
                        {rec.priority} Priority
                      </span>
                      <h4>{rec.action}</h4>
                    </div>
                    <div className="rec-body">
                      <div className="rec-detail">
                        <strong>Expected Impact:</strong>
                        <p>{rec.impact}</p>
                      </div>
                      <div className="rec-meta">
                        <span>💵 {rec.estimatedCost}</span>
                        <span>⏱️ {rec.timeframe}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;

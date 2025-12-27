import { useState, useEffect, useMemo } from 'react';
import useGridInfrastructure from '../hooks/useGridInfrastructure';
import './Analysis.css';

const Analysis = () => {
  const { buses, branches, generators, loading: dataLoading } = useGridInfrastructure();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('coverage'); // 'coverage' or 'assumption'
  
  // Coverage metrics state
  const [voltageThreshold, setVoltageThreshold] = useState(200);
  const [tempThreshold, setTempThreshold] = useState(200);
  const [busThreshold, setBusThreshold] = useState(200);
  const [tempBusThreshold, setTempBusThreshold] = useState(200);
  const [headroomScenario, setHeadroomScenario] = useState('summer-peak');
  
  // Real metrics from backend
  const [coverageMetrics, setCoverageMetrics] = useState({
    iso_count: 0,
    state_count: 0,
    substation_count: 0,
    total_headroom: 0,
    buses_above_threshold: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  
  // Tables state (admin editable)
  const [roadmapData, setRoadmapData] = useState([
    { iso: 'ISO-NE', study_vintage: '2028 CCIS Build', queue_window_close: 'Q4 2025', recommended_purchase_timing: '6-9 months before window close', next_refresh_eta: 'Q1 2026', scope_of_change: 'Update to 2030 LMPs & revised headroom', status: 'Available' },
    { iso: 'PJM', study_vintage: '2030 PCM baseline', queue_window_close: 'Q2 2026', recommended_purchase_timing: '6-9 months before window close', next_refresh_eta: 'Q4 2025', scope_of_change: 'Curtailment model refresh + queue overlay', status: 'In progress' },
    { iso: 'MISO', study_vintage: 'FTR 2029 study', queue_window_close: 'Q3 2026', recommended_purchase_timing: '6-9 months before window close', next_refresh_eta: 'Q2 2026', scope_of_change: 'Update price forwards & constraint library', status: 'Planned' }
  ]);
  
  const [releaseNotes, setReleaseNotes] = useState([
    { iso: 'ISO-NE', release_date: '2025-01-15 00:00:00', version: 'ISO_NE_CCIS_2028_v1.1', change_summary: 'Refreshed curtailment model with 2024 constraints; updated 5-yr LMP strip.', tags: 'curtailment, pricing' },
    { iso: 'PJM', release_date: '2024-12-20 00:00:00', version: 'PJM_PCM_2030_v1.0', change_summary: 'Initial PCM baseline with queue overlay and headroom robustness scoring.', tags: 'headroom, queue' },
    { iso: 'MISO', release_date: '2024-11-05 00:00:00', version: 'MISO_FTR_2029_beta', change_summary: 'Added preliminary nodal basis curves and constraint frequency estimates.', tags: 'basis, constraints' }
  ]);
  
  // Fetch real coverage metrics from backend
  useEffect(() => {
    const fetchCoverageMetrics = async () => {
      setMetricsLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/grid-data/coverage-metrics?threshold=${voltageThreshold}`);
        const data = await res.json();
        if (data.success) {
          setCoverageMetrics(data.data);
        }
      } catch (error) {
        console.error('Error fetching coverage metrics:', error);
      } finally {
        setMetricsLoading(false);
      }
    };
    
    fetchCoverageMetrics();
  }, [voltageThreshold]);
  
  // Calculate metrics (using real data from backend)
  const totalSubstations = coverageMetrics.substation_count;
  const busesAboveThreshold = coverageMetrics.buses_above_threshold;
  
  // Graph data states
  const [isoSummaryMetric, setIsoSummaryMetric] = useState('avg'); // avg, min, max
  const [isoSummaryScenario, setIsoSummaryScenario] = useState('summer-peak');
  
  const [constraintView, setConstraintView] = useState('preexisting');
  const [constraintScenario, setConstraintScenario] = useState('summer-peak');
  
  const [queueFuelType, setQueueFuelType] = useState('solar'); // Task 1
  
  // NU Investment graph
  const [investmentYear, setInvestmentYear] = useState(1);
  
  // Typical Day Profile graph (separate from Typical Day LMP)
  const [typicalDayProfileISO, setTypicalDayProfileISO] = useState('ISO-NE');
  const [typicalDayProfileScenario, setTypicalDayProfileScenario] = useState('summer-peak');
  
  // Typical Day LMP graph (Task 3)
  const [typicalDayMetric, setTypicalDayMetric] = useState('avg-future'); // min, max, avg-future, avg-historical
  const [typicalDayLMPScenario, setTypicalDayLMPScenario] = useState('summer-peak');
  
  // Assumptions tab states
  const [powerFlowFuelType, setPowerFlowFuelType] = useState('all');
  const [powerFlowScenario, setPowerFlowScenario] = useState('summer-peak'); // Task 5
  const [powerFlowYear, setPowerFlowYear] = useState(2025); // Task 5
  const [lmpFuelType, setLmpFuelType] = useState('all');
  const [assumptionsData, setAssumptionsData] = useState({
    model: 'PCM 2030 Baseline',
    scenario: 'Summer Peak Load',
    outlook: '2030 Horizon',
    majorNuLRTP: ' - '
  });
  
  // Dummy data for graphs
  const isos = ['ISO-NE', 'PJM', 'MISO', 'CAISO', 'ERCOT', 'SPP', 'NYISO'];
  const fuelTypes = ['All', 'Solar', 'Wind', 'Gas', 'Coal', 'Nuclear', 'Hydro', 'Biomass', 'Geothermal', 'Oil', 'Battery Storage'];
  const queueFuelTypes = ['Solar', 'Wind', 'Gas', 'Battery Storage', 'Nuclear', 'Hydro', 'Biomass'];
  
  // Memoized graph data - each graph gets its own stable dataset
  const isoSummaryData = useMemo(() => 
    isos.map(iso => ({
      iso,
      avg: 1200 + Math.random() * 800,
      min: 800 + Math.random() * 400,
      max: 1600 + Math.random() * 800
    })), []);
  
  const constraintData = useMemo(() => 
    isos.map(iso => ({
      iso,
      preexisting: 150 + Math.random() * 300,
      new: 100 + Math.random() * 250
    })), []);
  
  const queueData = useMemo(() => 
    queueFuelTypes.reduce((acc, fuel) => {
      acc[fuel.toLowerCase()] = isos.map(iso => ({
        iso,
        active: (30 + Math.random() * 50) * (fuel === 'Solar' ? 1.5 : fuel === 'Wind' ? 1.3 : 1),
        withdrawn: (25 + Math.random() * 40) * (fuel === 'Solar' ? 1.5 : fuel === 'Wind' ? 1.3 : 1),
        done: (20 + Math.random() * 35) * (fuel === 'Solar' ? 1.5 : fuel === 'Wind' ? 1.3 : 1)
      }));
      return acc;
    }, {}), []);
  
  const fleetData = useMemo(() => 
    isos.map(iso => ({
      iso,
      solar: 15 + Math.random() * 25,
      wind: 20 + Math.random() * 30,
      gas: 35 + Math.random() * 45,
      coal: 10 + Math.random() * 20,
      nuclear: 25 + Math.random() * 35,
      hydro: 15 + Math.random() * 25,
      biomass: 8 + Math.random() * 15
    })), []);
  
  const investmentData = useMemo(() => 
    isos.map(iso => ({
      iso,
      investment: 50 + Math.random() * 200
    })), []);
  
  const typicalDayLMPData = useMemo(() => ({
    min: Array.from({length: 25}, (_, h) => {
      let factor = 1;
      if (h >= 0 && h <= 6) factor = 0.6;
      else if (h >= 7 && h <= 9) factor = 0.85;
      else if (h >= 10 && h <= 16) factor = 1.2;
      else if (h >= 17 && h <= 20) factor = 1.4;
      else factor = 0.9;
      return 25 * factor + (Math.random() - 0.5) * 10;
    }),
    max: Array.from({length: 25}, (_, h) => {
      let factor = 1;
      if (h >= 0 && h <= 6) factor = 0.6;
      else if (h >= 7 && h <= 9) factor = 0.85;
      else if (h >= 10 && h <= 16) factor = 1.2;
      else if (h >= 17 && h <= 20) factor = 1.4;
      else factor = 0.9;
      return 85 * factor + (Math.random() - 0.5) * 10;
    }),
    'avg-future': Array.from({length: 25}, (_, h) => {
      let factor = 1;
      if (h >= 0 && h <= 6) factor = 0.6;
      else if (h >= 7 && h <= 9) factor = 0.85;
      else if (h >= 10 && h <= 16) factor = 1.2;
      else if (h >= 17 && h <= 20) factor = 1.4;
      else factor = 0.9;
      return 55 * factor + (Math.random() - 0.5) * 10;
    }),
    'avg-historical': Array.from({length: 25}, (_, h) => {
      let factor = 1;
      if (h >= 0 && h <= 6) factor = 0.6;
      else if (h >= 7 && h <= 9) factor = 0.85;
      else if (h >= 10 && h <= 16) factor = 1.2;
      else if (h >= 17 && h <= 20) factor = 1.4;
      else factor = 0.9;
      return 48 * factor + (Math.random() - 0.5) * 10;
    })
  }), []);
  
  const systemPriceData = useMemo(() => 
    isos.slice(0, 4).map((iso, isoIdx) => {
      const basePrice = 45 + isoIdx * 5;
      return {
        iso,
        prices: [2020, 2025, 2030, 2035, 2040].map((year, i) => ({
          year,
          value: basePrice * (1 + i * 0.15) + (Math.random() - 0.5) * 8
        }))
      };
    }), []);
  
  const typicalDayProfileData = useMemo(() => 
    Array.from({length: 24}, (_, i) => 40 + Math.random() * 80), []);
  
  const powerFlowData = useMemo(() => 
    ['Solar', 'Wind', 'Gas', 'Coal', 'Nuclear'].map((fuel, i) => {
      // Base values adjusted for scenario and year
      const yearMultiplier = (powerFlowYear - 2024) * 0.05 + 1;
      const scenarioMultiplier = powerFlowScenario === 'summer-peak' ? 1.2 : 
                                 powerFlowScenario === 'winter-peak' ? 1.15 : 
                                 powerFlowScenario === 'summer-offpeak' ? 0.85 : 0.75;
      
      return {
        fuel,
        base: (50 + i * 15) * yearMultiplier * scenarioMultiplier,
        demand: (120 + i * 15) * yearMultiplier * (scenarioMultiplier * 0.9)
      };
    }), [powerFlowScenario, powerFlowYear]);
  
  const lmpForecastData = useMemo(() => 
    [2025, 2026, 2027, 2028, 2029, 2030].map((year, i) => ({
      year,
      lmp: 35 + (45 + Math.random() * 35) * (1 + i * 0.08) * 0.5,
      demand: 210 + i * 8
    })), []);
  
  const handleThresholdChange = (e) => {
    if (e.key === 'Enter') {
      setVoltageThreshold(tempThreshold);
    }
  };
  
  const handleBusThresholdChange = (e) => {
    if (e.key === 'Enter') {
      setBusThreshold(tempBusThreshold);
    }
  };
  
  return (
    <div className="analysis-page">
      <div className="analysis-container">
        {/* Page Header */}
        <div className="page-header">
          <h1>Coverage & Summary</h1>
          <p className="page-subtitle">Comprehensive grid coverage metrics and system analysis</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'coverage' ? 'active' : ''}`}
            onClick={() => setActiveTab('coverage')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Coverage
          </button>
          <button 
            className={`tab-button ${activeTab === 'assumption' ? 'active' : ''}`}
            onClick={() => setActiveTab('assumption')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Assumptions
          </button>
        </div>
        
        {/* Coverage Tab Content */}
        {activeTab === 'coverage' && (
          <div className="tab-content">
            {/* Horizontal Stats Bar */}
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">ISO & States</div>
                  <div className="stat-value">
                    {metricsLoading ? 'Loading...' : `${coverageMetrics.iso_count} ISO / ${coverageMetrics.state_count} States`}
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Substations Monitored</div>
                  <div className="stat-value">{totalSubstations.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Headroom (Bus &gt; {voltageThreshold} MW)</div>
                  <div className="stat-value">
                    {metricsLoading ? 'Calculating...' : `${coverageMetrics.total_headroom.toLocaleString()} MW`}
                  </div>
                  <div className="stat-value stat-editable" style={{fontSize: '12px', marginTop: '4px'}}>
                    <span>Threshold:</span>
                    <input 
                      type="number" 
                      value={tempThreshold} 
                      onChange={(e) => setTempThreshold(Number(e.target.value))}
                      onKeyDown={handleThresholdChange}
                      className="threshold-input"
                      style={{width: '60px', fontSize: '12px'}}
                    />
                    <span>MW</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Buses Count</div>
                  <div className="stat-value stat-editable">
                    <span>Bus &gt;</span>
                    <input 
                      type="number" 
                      value={tempBusThreshold} 
                      onChange={(e) => setTempBusThreshold(Number(e.target.value))}
                      onKeyDown={handleBusThresholdChange}
                      className="threshold-input"
                    />
                    <span>MW</span>
                  </div>
                  <div className="stat-count-display">{busesAboveThreshold}</div>
                </div>
              </div>
            </div>
            
            {/* Tables Section */}
            <div className="tables-section">
              {/* ISO Release Roadmap Table */}
              <div className="data-table-container">
                <div className="table-header">
                  <h2>ISO Release Roadmap & Planned Updates</h2>
                  <p className="table-subtitle">High-level view of current DB vintages and upcoming study refreshes by ISO. We typically provide siting analytics ~6 months before each ISO interconnection queue window closes.</p>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ISO</th>
                        <th>study_vintage</th>
                        <th>queue_window_close</th>
                        <th>recommended_purchase_timing</th>
                        <th>next_refresh_eta</th>
                        <th>scope_of_change</th>
                        <th>status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roadmapData.map((row, idx) => (
                        <tr key={idx}>
                          <td><span className="iso-badge">{row.iso}</span></td>
                          <td>{row.study_vintage}</td>
                          <td>{row.queue_window_close}</td>
                          <td>{row.recommended_purchase_timing}</td>
                          <td>{row.next_refresh_eta}</td>
                          <td>{row.scope_of_change}</td>
                          <td>
                            <span className={`status-badge status-${row.status.toLowerCase().replace(' ', '-')}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Recent Changes & Release Notes Table */}
              <div className="data-table-container">
                <div className="table-header">
                  <h2>Recent Changes & Release Notes</h2>
                  <p className="table-subtitle">Key updates in the latest DB drops - use this to confirm you are working off the latest ISO vintage.</p>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ISO</th>
                        <th>release_date</th>
                        <th>version</th>
                        <th>change_summary</th>
                        <th>tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {releaseNotes.map((row, idx) => (
                        <tr key={idx}>
                          <td><span className="iso-badge">{row.iso}</span></td>
                          <td>{new Date(row.release_date).toLocaleDateString()}</td>
                          <td><code className="version-code">{row.version}</code></td>
                          <td>{row.change_summary}</td>
                          <td>
                            {row.tags.split(',').map((tag, i) => (
                              <span key={i} className="tag-badge">{tag.trim()}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Graphs Section */}
            <div className="graphs-section">
              <div className="section-header">
                <h2>System Analytics & Insights</h2>
                <p className="section-subtitle">Comprehensive visualization of grid metrics across ISOs</p>
              </div>
              
              <div className="graphs-grid">
                {/* Graph 1: ISO wise summary */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>ISO-wise Summary</h3>
                    <div className="graph-controls">
                      <select value={isoSummaryScenario} onChange={(e) => setIsoSummaryScenario(e.target.value)} className="graph-select">
                        <option value="summer-peak">Summer Peak</option>
                        <option value="summer-offpeak">Summer Off-Peak</option>
                        <option value="spring-light">Spring Light Load</option>
                      </select>
                      <select value={isoSummaryMetric} onChange={(e) => setIsoSummaryMetric(e.target.value)} className="graph-select">
                        <option value="avg">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {isoSummaryData.map((data, i) => {
                        const value = data[isoSummaryMetric];
                        const height = (value / 2500) * 150;
                        const x = 60 + i * 45;
                        return (
                          <g key={data.iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#3b82f6" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              {value.toFixed(0)}
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">MW</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 2: Constraint Overview */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Constraint Overview</h3>
                    <div className="graph-controls">
                      <select value={constraintView} onChange={(e) => setConstraintView(e.target.value)} className="graph-select">
                        <option value="preexisting">Preexisting</option>
                        <option value="new">New</option>
                      </select>
                      <select value={constraintScenario} onChange={(e) => setConstraintScenario(e.target.value)} className="graph-select">
                        <option value="summer-peak">Summer Peak</option>
                        <option value="summer-offpeak">Summer Off-Peak</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {constraintData.map((data, i) => {
                        const value = data[constraintView];
                        const height = (value / 450) * 140;
                        const x = 60 + i * 45;
                        return (
                          <g key={data.iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#ef4444" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              {value.toFixed(0)}
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">Count</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 3: Interconnection Queue - Task 1 */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Interconnection Queue</h3>
                    <div className="graph-controls">
                      <select value={queueFuelType} onChange={(e) => setQueueFuelType(e.target.value)} className="graph-select">
                        {queueFuelTypes.map(fuel => <option key={fuel} value={fuel.toLowerCase()}>{fuel}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="graph-legend" style={{padding: '0 20px 10px', display: 'flex', gap: '16px', justifyContent: 'center'}}>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#10b981'}}></span>Active</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#f59e0b'}}></span>Withdrawn</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#6366f1'}}></span>Done</span>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {(queueData[queueFuelType] || queueData['solar']).map((data, i) => {
                        const x = 60 + i * 45;
                        const h1 = (data.active / 120) * 80;
                        const h2 = (data.withdrawn / 120) * 80;
                        const h3 = (data.done / 120) * 80;
                        return (
                          <g key={data.iso}>
                            <rect x={x} y={200 - h1 - h2 - h3} width="35" height={h1} fill="#10b981" rx="3"/>
                            <rect x={x} y={200 - h2 - h3} width="35" height={h2} fill="#f59e0b"/>
                            <rect x={x} y={200 - h3} width="35" height={h3} fill="#6366f1"/>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">MW</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 4: Current Fleet - Task 2 */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Current Fleet by Fuel Type</h3>
                  </div>
                  <div className="graph-legend" style={{padding: '0 20px 10px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#fbbf24'}}></span>Solar</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#60a5fa'}}></span>Wind</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#94a3b8'}}></span>Gas</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#1f2937'}}></span>Coal</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#8b5cf6'}}></span>Nuclear</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#10b981'}}></span>Hydro</span>
                    <span className="legend-item"><span className="legend-dot" style={{background: '#f97316'}}></span>Biomass</span>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {fleetData.map((data, i) => {
                        const x = 60 + i * 45;
                        const h1 = (data.solar / 40) * 25;
                        const h2 = (data.wind / 50) * 30;
                        const h3 = (data.gas / 80) * 45;
                        const h4 = (data.coal / 30) * 20;
                        const h5 = (data.nuclear / 60) * 35;
                        const h6 = (data.hydro / 40) * 25;
                        const h7 = (data.biomass / 23) * 15;
                        return (
                          <g key={data.iso}>
                            <rect x={x} y={200 - h1 - h2 - h3 - h4 - h5 - h6 - h7} width="35" height={h1} fill="#fbbf24" rx="3"/>
                            <rect x={x} y={200 - h2 - h3 - h4 - h5 - h6 - h7} width="35" height={h2} fill="#60a5fa"/>
                            <rect x={x} y={200 - h3 - h4 - h5 - h6 - h7} width="35" height={h3} fill="#94a3b8"/>
                            <rect x={x} y={200 - h4 - h5 - h6 - h7} width="35" height={h4} fill="#1f2937"/>
                            <rect x={x} y={200 - h5 - h6 - h7} width="35" height={h5} fill="#8b5cf6"/>
                            <rect x={x} y={200 - h6 - h7} width="35" height={h6} fill="#10b981"/>
                            <rect x={x} y={200 - h7} width="35" height={h7} fill="#f97316"/>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">MW</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 5: NU Investment */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>NU Investment</h3>
                    <div className="graph-controls">
                      <select value={investmentYear} onChange={(e) => setInvestmentYear(Number(e.target.value))} className="graph-select">
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3">3 Years</option>
                        <option value="5">5 Years</option>
                        <option value="10">10 Years</option>
                        <option value="15">15 Years</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {investmentData.map((data, i) => {
                        const height = (data.investment / 250) * 120;
                        const x = 60 + i * 45;
                        return (
                          <g key={data.iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#10b981" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              ${data.investment.toFixed(0)}M
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">$ Million</text>
                    </svg>
                  </div>
                </div>
                
                {/* Task 3 - Graph 1: Typical Day LMP */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Typical Day LMP</h3>
                    <div className="graph-controls">
                      <select value={typicalDayMetric} onChange={(e) => setTypicalDayMetric(e.target.value)} className="graph-select">
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                        <option value="avg-future">Avg Future 5 Years</option>
                        <option value="avg-historical">Avg Historical Last 5 Years</option>
                      </select>
                      <select value={typicalDayLMPScenario} onChange={(e) => setTypicalDayLMPScenario(e.target.value)} className="graph-select">
                        <option value="summer-peak">Summer Peak</option>
                        <option value="summer-offpeak">Summer Off-Peak</option>
                        <option value="spring-light">Spring Light</option>
                        <option value="winter-peak">Winter Peak</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="line-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      <line x1="40" y1="200" x2="40" y2="30" stroke="#e2e8f0" strokeWidth="2"/>
                      {/* Generate hourly LMP curve for selected ISO */}
                      {(() => {
                        const hours = Array.from({length: 25}, (_, i) => i);
                        const values = typicalDayLMPData[typicalDayMetric];
                        const points = hours.map(h => {
                          const value = values[h];
                          const x = 40 + (h * 340 / 24);
                          const y = 200 - (value * 1.5);
                          return {x, y, value};
                        });
                        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return (
                          <>
                            <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2.5"/>
                            {points.filter((_, i) => i % 4 === 0).map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6"/>
                                <text x={p.x} y="220" fontSize="9" fill="#64748b" textAnchor="middle">{i*4}h</text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                      <text x="20" y="120" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 120)">LMP ($/MWh)</text>
                      <text x="210" y="240" fontSize="12" fill="#64748b" textAnchor="middle">Hour of Day</text>
                    </svg>
                  </div>
                </div>
                
                {/* Task 3 - Graph 2: System Wide Avg Price Curve */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>System Wide Avg Price Curve</h3>
                    <div className="graph-legend">
                      {isos.slice(0, 4).map((iso, idx) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                        return <span key={iso} className="legend-item"><span className="legend-dot" style={{background: colors[idx]}}></span>{iso}</span>;
                      })}
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="line-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      <line x1="40" y1="200" x2="40" y2="30" stroke="#e2e8f0" strokeWidth="2"/>
                      {/* Generate 5-year price curves for top ISOs */}
                      {systemPriceData.map((isoData, isoIdx) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                        const points = isoData.prices.map((price, i) => {
                          const x = 40 + (i * 80);
                          const y = 200 - (price.value * 1.8);
                          return {x, y, value: price.value, year: price.year};
                        });
                        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return (
                          <g key={isoData.iso}>
                            <path d={pathData} fill="none" stroke={colors[isoIdx]} strokeWidth="2" opacity="0.8"/>
                            {points.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors[isoIdx]}/>
                            ))}
                          </g>
                        );
                      })}
                      {/* X-axis labels */}
                      {[2020, 2025, 2030, 2035, 2040].map((year, i) => (
                        <text key={year} x={40 + i * 80} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{year}</text>
                      ))}
                      <text x="20" y="120" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 120)">Avg Price ($/MWh)</text>
                      <text x="210" y="240" fontSize="12" fill="#64748b" textAnchor="middle">Year</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 6: Typical Day Profile */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Typical Day Profile</h3>
                    <div className="graph-controls">
                      <select value={typicalDayProfileISO} onChange={(e) => setTypicalDayProfileISO(e.target.value)} className="graph-select">
                        {isos.map(iso => <option key={iso} value={iso}>{iso}</option>)}
                      </select>
                      <select value={typicalDayProfileScenario} onChange={(e) => setTypicalDayProfileScenario(e.target.value)} className="graph-select">
                        <option value="summer-peak">Summer Peak</option>
                        <option value="summer-offpeak">Summer Off-Peak</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="line-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {typicalDayProfileData.map((value, i) => {
                        const x = 50 + i * 14;
                        const height = (value / 120) * 180;
                        return (
                          <rect key={i} x={x} y={200 - height} width="10" height={height} fill="#3b82f6" rx="2"/>
                        );
                      })}
                      
                      {/* Grid lines */}
                      {[0, 6, 12, 18, 24].map(hour => (
                        <text key={hour} x={40 + (hour / 24) * 340} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{hour}h</text>
                      ))}
                      
                      <text x="20" y="125" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">MW</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Assumptions Tab Content */}
        {activeTab === 'assumption' && (
          <div className="tab-content">
            <div className="assumptions-container">
              <h2>System Assumptions & Modeling Parameters</h2>
              <p className="section-subtitle">Configure baseline assumptions, view forecasting graphs, and edit model parameters</p>
              
              {/* Main 4 Fields */}
              <div className="main-fields-grid">
                <div className="main-field-card">
                  <div className="field-header">
                    <div className="field-icon" style={{background: '#3b82f6'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M3 9h18M9 21V9"/>
                      </svg>
                    </div>
                    <h3>Model Selected</h3>
                  </div>
                  <div className="field-value">{assumptionsData.model}</div>
                </div>
                
                <div className="main-field-card">
                  <div className="field-header">
                    <div className="field-icon" style={{background: '#10b981'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                    </div>
                    <h3>Scenario</h3>
                  </div>
                  <div className="field-value">{assumptionsData.scenario}</div>
                </div>
                
                <div className="main-field-card">
                  <div className="field-header">
                    <div className="field-icon" style={{background: '#f59e0b'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <h3>Outlook</h3>
                  </div>
                  <div className="field-value">{assumptionsData.outlook}</div>
                </div>
                
                <div className="main-field-card">
                  <div className="field-header">
                    <div className="field-icon" style={{background: '#ef4444'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <h3>Major NU-LRTP</h3>
                  </div>
                  <div className="field-value">{assumptionsData.majorNuLRTP}</div>
                </div>
              </div>
              
              {/* Two Graphs Side by Side */}
              <div className="assumption-graphs-section">
                <h2>Forecasting & Analysis</h2>
                <div className="assumption-graphs-grid">
                  {/* Task 5: Power Flow Analysis - Dual Axis */}
                  <div className="assumption-graph-card">
                    <div className="graph-header">
                      <h3>Power Flow Analysis (Max Demand)</h3>
                      <div className="graph-controls">
                        <select value={powerFlowScenario} onChange={(e) => setPowerFlowScenario(e.target.value)} className="graph-select">
                          <option value="summer-peak">Summer Peak</option>
                          <option value="summer-offpeak">Summer Off-Peak</option>
                          <option value="spring-light">Spring Light</option>
                          <option value="winter-peak">Winter Peak</option>
                        </select>
                        <select value={powerFlowYear} onChange={(e) => setPowerFlowYear(Number(e.target.value))} className="graph-select">
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                          <option value="2029">2029</option>
                          <option value="2030">2030</option>
                        </select>
                      </div>
                    </div>
                    <div className="graph-legend" style={{padding: '0 20px 10px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#fbbf24'}}></span>Solar</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#60a5fa'}}></span>Wind</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#94a3b8'}}></span>Gas</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#1f2937'}}></span>Coal</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#8b5cf6'}}></span>Nuclear</span>
                      <span className="legend-item" style={{borderLeft: '2px solid #e5e7eb', paddingLeft: '12px', marginLeft: '4px'}}><span className="legend-dot" style={{background: '#ef4444', width: '4px', height: '12px', borderRadius: '1px'}}></span>Max Demand</span>
                    </div>
                    <div className="graph-content">
                      <svg viewBox="0 0 400 250" className="bar-chart-svg">
                        {/* Dual Y-axes */}
                        <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        <line x1="40" y1="30" x2="40" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        <line x1="380" y1="30" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 2"/>
                        
                        {/* Bars for each fuel type */}
                        {powerFlowData.map((data, i) => {
                          const height = data.base * 0.8;
                          const x = 70 + i * 60;
                          const colors = ['#fbbf24', '#60a5fa', '#94a3b8', '#1f2937', '#8b5cf6'];
                          return (
                            <g key={data.fuel}>
                              <rect x={x} y={200 - height} width="45" height={height} fill={colors[i]} rx="3" opacity="0.85"/>
                              <text x={x + 22.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                                {(data.base * 8).toFixed(0)}
                              </text>
                              <text x={x + 22.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.fuel}</text>
                            </g>
                          );
                        })}
                        
                        {/* Line for Max Demand (right Y-axis) */}
                        {(() => {
                          const demandPoints = powerFlowData.map((data, i) => {
                            const x = 70 + i * 60 + 22.5;
                            const y = 200 - (data.demand * 0.65);
                            return {x, y, value: data.demand};
                          });
                          const pathData = demandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          return (
                            <>
                              <path d={pathData} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                              {demandPoints.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="4" fill="#ef4444"/>
                                  <text x={p.x} y={p.y - 10} fontSize="10" fontWeight="600" fill="#ef4444" textAnchor="middle">{p.value.toFixed(0)}</text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                        
                        <text x="20" y="125" fontSize="11" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">Generation (MW)</text>
                        <text x="390" y="125" fontSize="11" fill="#ef4444" textAnchor="middle" transform="rotate(90 390 125)">Max Demand (%)</text>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Task 4: LMP Forecasting - Dual Axis (Bars + Line) */}
                  <div className="assumption-graph-card">
                    <div className="graph-header">
                      <h3>LMP Forecasting</h3>
                      <div className="graph-legend">
                        <span className="legend-item"><span className="legend-dot" style={{background: '#3b82f6', width: '12px', height: '12px'}}></span>Fuel Mix ($/MWh)</span>
                        <span className="legend-item"><span className="legend-dot" style={{background: '#f59e0b', width: '4px', height: '12px', borderRadius: '1px'}}></span>Demand (GW)</span>
                      </div>
                    </div>
                    <div className="graph-content">
                      <svg viewBox="0 0 400 250" className="bar-chart-svg">
                        {/* Dual Y-axes */}
                        <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        <line x1="40" y1="30" x2="40" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        <line x1="380" y1="30" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 2"/>
                        
                        {/* Bars showing LMP by year (similar to attached image) */}
                        {lmpForecastData.map((data, i) => {
                          const height = (data.lmp * 1.5);
                          const x = 60 + i * 50;
                          return (
                            <g key={data.year}>
                              <rect x={x} y={200 - height} width="42" height={height} fill="#3b82f6" rx="3" opacity="0.8"/>
                              <text x={x + 21} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                                ${data.lmp.toFixed(0)}
                              </text>
                              <text x={x + 21} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{data.year}</text>
                            </g>
                          );
                        })}
                        
                        {/* Line showing demand trend (right Y-axis) - aligned with bar tops */}
                        {(() => {
                          const demandPoints = lmpForecastData.map((data, i) => {
                            const x = 60 + i * 50 + 21;
                            const barHeight = (data.lmp * 1.5);
                            const y = 200 - barHeight; // Align with top of bars
                            return {x, y, value: data.demand};
                          });
                          const pathData = demandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                          return (
                            <>
                              <path d={pathData} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
                              {demandPoints.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="4" fill="#f59e0b"/>
                                  <text x={p.x} y={p.y - 10} fontSize="10" fontWeight="600" fill="#f59e0b" textAnchor="middle">{p.value}</text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                        
                        {/* Y-axis labels */}
                        <text x="20" y="125" fontSize="11" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">MW</text>
                        <text x="390" y="125" fontSize="11" fill="#f59e0b" textAnchor="middle" transform="rotate(90 390 125)">Demand (GW)</text>
                        <text x="210" y="240" fontSize="12" fill="#64748b" textAnchor="middle">Year</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Containment Field */}
              <div className="containment-section">
                <h2>System Containment Parameters</h2>
                <div className="containment-card">
                  <div className="containment-grid">
                    <div className="containment-item">
                      <label>Thermal Limit (MW)</label>
                      <input type="number" className="containment-input" defaultValue="200" />
                    </div>
                    <div className="containment-item">
                      <label>Voltage Limit (kV)</label>
                      <input type="number" className="containment-input" defaultValue="345" />
                    </div>
                    <div className="containment-item">
                      <label>Stability Margin (%)</label>
                      <input type="number" className="containment-input" defaultValue="15" />
                    </div>
                    <div className="containment-item">
                      <label>N-1 Contingency</label>
                      <select className="containment-select">
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Assumptions Made Field (Admin Editable) */}
              <div className="assumptions-made-section">
                <h2>Assumptions Made (Admin Editable)</h2>
                <div className="assumptions-made-card">
                  <div className="assumptions-edit-grid">
                    <div className="assumption-edit-item">
                      <label className="edit-label">Model Selected</label>
                      <input 
                        type="text" 
                        className="edit-input" 
                        value={assumptionsData.model}
                        onChange={(e) => setAssumptionsData({...assumptionsData, model: e.target.value})}
                      />
                    </div>
                    
                    <div className="assumption-edit-item">
                      <label className="edit-label">Scenario</label>
                      <select 
                        className="edit-select" 
                        value={assumptionsData.scenario}
                        onChange={(e) => setAssumptionsData({...assumptionsData, scenario: e.target.value})}
                      >
                        <option value="Summer Peak Load">Summer Peak Load</option>
                        <option value="Summer Off-Peak Load">Summer Off-Peak Load</option>
                        <option value="Spring Light Load">Spring Light Load</option>
                        <option value="Winter Peak Load">Winter Peak Load</option>
                      </select>
                    </div>
                    
                    <div className="assumption-edit-item">
                      <label className="edit-label">Outlook</label>
                      <input 
                        type="text" 
                        className="edit-input" 
                        value={assumptionsData.outlook}
                        onChange={(e) => setAssumptionsData({...assumptionsData, outlook: e.target.value})}
                      />
                    </div>
                    
                    <div className="assumption-edit-item">
                      <label className="edit-label">Major NU-LRTP</label>
                      <input 
                        type="text" 
                        className="edit-input" 
                        value={assumptionsData.majorNuLRTP}
                        onChange={(e) => setAssumptionsData({...assumptionsData, majorNuLRTP: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="assumptions-description">
                    <label className="edit-label">Additional Notes</label>
                    <textarea 
                      className="edit-textarea" 
                      rows="4" 
                      defaultValue="Model based on latest ISO-NE CCIS 2028 build with updated LMP forecasts and constraint library. Includes renewable integration targets and demand response participation rates as per regional planning assumptions."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;

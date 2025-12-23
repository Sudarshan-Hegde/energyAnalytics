import { useState, useEffect } from 'react';
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
  const [selectedScenario, setSelectedScenario] = useState('summer-peak');
  const [headroomScenario, setHeadroomScenario] = useState('summer-peak');
  
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
  
  // Calculate metrics
  const totalSubstations = buses.length;
  const busesAboveThreshold = buses.filter(bus => {
    const lmpValue = parseFloat(bus.lmp_2025) || 0;
    return lmpValue > busThreshold;
  }).length;
  
  // Graph data states
  const [isoSummaryMetric, setIsoSummaryMetric] = useState('avg'); // avg, min, max
  const [isoSummaryScenario, setIsoSummaryScenario] = useState('summer-peak');
  
  const [constraintView, setConstraintView] = useState('preexisting');
  const [constraintScenario, setConstraintScenario] = useState('summer-peak');
  
  const [queueStatus, setQueueStatus] = useState('active');
  
  const [investmentYear, setInvestmentYear] = useState(1);
  
  const [typicalDayISO, setTypicalDayISO] = useState('ISO-NE');
  const [typicalDayScenario, setTypicalDayScenario] = useState('summer-peak');
  
  // Assumptions tab states
  const [powerFlowFuelType, setPowerFlowFuelType] = useState('all');
  const [lmpFuelType, setLmpFuelType] = useState('all');
  const [assumptionsData, setAssumptionsData] = useState({
    model: 'PCM 2030 Baseline',
    scenario: 'Summer Peak Load',
    outlook: '2030 Horizon',
    majorNuLRTP: 'ISO-NE LRTP 2024'
  });
  
  // Dummy data for graphs
  const isos = ['ISO-NE', 'PJM', 'MISO', 'CAISO', 'ERCOT', 'SPP', 'NYISO'];
  const fuelTypes = ['All', 'Solar', 'Wind', 'Gas', 'Coal', 'Nuclear', 'Hydro'];
  
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
                  <div className="stat-value">7 ISO / 50 States</div>
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
                  <div className="stat-label">Total Headroom</div>
                  <div className="stat-value stat-editable">
                    <span>Bus &gt;</span>
                    <input 
                      type="number" 
                      value={tempThreshold} 
                      onChange={(e) => setTempThreshold(Number(e.target.value))}
                      onKeyDown={handleThresholdChange}
                      className="threshold-input"
                    />
                    <span>MW</span>
                  </div>
                  <select 
                    value={headroomScenario} 
                    onChange={(e) => setHeadroomScenario(e.target.value)}
                    className="stat-scenario-select"
                  >
                    <option value="summer-peak">Summer Peak</option>
                    <option value="summer-offpeak">Summer Off-Peak</option>
                    <option value="spring-light">Spring Light Load</option>
                  </select>
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
                      {isos.map((iso, i) => {
                        const height = 50 + Math.random() * 130;
                        const x = 60 + i * 45;
                        return (
                          <g key={iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#3b82f6" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              {(1200 + Math.random() * 800).toFixed(0)}
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{iso}</text>
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
                      {isos.map((iso, i) => {
                        const height = 40 + Math.random() * 140;
                        const x = 60 + i * 45;
                        return (
                          <g key={iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#ef4444" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              {(150 + Math.random() * 300).toFixed(0)}
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">Count</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 3: Interconnection Queue */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Interconnection Queue</h3>
                    <div className="graph-legend">
                      <span className="legend-item"><span className="legend-dot" style={{background: '#10b981'}}></span>Active</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#f59e0b'}}></span>Withdrawn</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#6366f1'}}></span>Done</span>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {isos.map((iso, i) => {
                        const x = 60 + i * 45;
                        const h1 = 30 + Math.random() * 50;
                        const h2 = 25 + Math.random() * 40;
                        const h3 = 20 + Math.random() * 35;
                        return (
                          <g key={iso}>
                            <rect x={x} y={200 - h1 - h2 - h3} width="35" height={h1} fill="#10b981" rx="3"/>
                            <rect x={x} y={200 - h2 - h3} width="35" height={h2} fill="#f59e0b"/>
                            <rect x={x} y={200 - h3} width="35" height={h3} fill="#6366f1"/>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">MW</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 4: Current Fleet */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Current Fleet by Fuel Type</h3>
                    <div className="graph-legend">
                      <span className="legend-item"><span className="legend-dot" style={{background: '#fbbf24'}}></span>Solar</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#60a5fa'}}></span>Wind</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#94a3b8'}}></span>Gas</span>
                      <span className="legend-item"><span className="legend-dot" style={{background: '#1f2937'}}></span>Coal</span>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="bar-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      {isos.map((iso, i) => {
                        const x = 60 + i * 45;
                        const h1 = 20 + Math.random() * 30;
                        const h2 = 25 + Math.random() * 35;
                        const h3 = 35 + Math.random() * 50;
                        const h4 = 15 + Math.random() * 25;
                        return (
                          <g key={iso}>
                            <rect x={x} y={200 - h1 - h2 - h3 - h4} width="35" height={h1} fill="#fbbf24" rx="3"/>
                            <rect x={x} y={200 - h2 - h3 - h4} width="35" height={h2} fill="#60a5fa"/>
                            <rect x={x} y={200 - h3 - h4} width="35" height={h3} fill="#94a3b8"/>
                            <rect x={x} y={200 - h4} width="35" height={h4} fill="#1f2937"/>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{iso}</text>
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
                      {isos.map((iso, i) => {
                        const height = 50 + Math.random() * 120;
                        const x = 60 + i * 45;
                        return (
                          <g key={iso}>
                            <rect x={x} y={200 - height} width="35" height={height} fill="#10b981" rx="3"/>
                            <text x={x + 17.5} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                              ${(50 + Math.random() * 200).toFixed(0)}M
                            </text>
                            <text x={x + 17.5} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{iso}</text>
                          </g>
                        );
                      })}
                      <text x="20" y="105" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 105)">$ Million</text>
                    </svg>
                  </div>
                </div>
                
                {/* Graph 6: Typical Day */}
                <div className="graph-card">
                  <div className="graph-header">
                    <h3>Typical Day Profile</h3>
                    <div className="graph-controls">
                      <select value={typicalDayISO} onChange={(e) => setTypicalDayISO(e.target.value)} className="graph-select">
                        {isos.map(iso => <option key={iso} value={iso}>{iso}</option>)}
                      </select>
                      <select value={typicalDayScenario} onChange={(e) => setTypicalDayScenario(e.target.value)} className="graph-select">
                        <option value="summer-peak">Summer Peak</option>
                        <option value="summer-offpeak">Summer Off-Peak</option>
                      </select>
                    </div>
                  </div>
                  <div className="graph-content">
                    <svg viewBox="0 0 400 250" className="line-chart-svg">
                      <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      <line x1="40" y1="50" x2="40" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                      
                      {/* Demand line */}
                      <polyline
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="2.5"
                        points="40,180 60,170 80,150 100,120 120,100 140,90 160,85 180,80 200,85 220,95 240,110 260,130 280,140 300,145 320,155 340,170 360,180 380,185"
                      />
                      
                      {/* Solar */}
                      <polyline
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        points="40,200 60,195 80,185 100,160 120,130 140,110 160,100 180,95 200,100 220,110 240,135 260,165 280,185 300,195 320,200 340,200 360,200 380,200"
                      />
                      
                      {/* Wind */}
                      <polyline
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                        points="40,200 60,190 80,185 100,175 120,165 140,160 160,155 180,150 200,155 220,165 240,170 260,175 280,180 300,185 320,190 340,195 360,198 380,200"
                      />
                      
                      {/* Grid lines */}
                      {[0, 6, 12, 18, 24].map(hour => (
                        <text key={hour} x={40 + (hour / 24) * 340} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{hour}h</text>
                      ))}
                      
                      <text x="20" y="125" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">MW</text>
                      
                      {/* Legend */}
                      <g transform="translate(100, 30)">
                        <line x1="0" y1="5" x2="20" y2="5" stroke="#1e293b" strokeWidth="2.5"/>
                        <text x="25" y="10" fontSize="11" fill="#64748b">Demand</text>
                        
                        <line x1="80" y1="5" x2="100" y2="5" stroke="#fbbf24" strokeWidth="2"/>
                        <text x="105" y="10" fontSize="11" fill="#64748b">Solar</text>
                        
                        <line x1="160" y1="5" x2="180" y2="5" stroke="#60a5fa" strokeWidth="2"/>
                        <text x="185" y="10" fontSize="11" fill="#64748b">Wind</text>
                      </g>
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
                  {/* Graph 1: Power Flow */}
                  <div className="assumption-graph-card">
                    <div className="graph-header">
                      <h3>Power Flow Analysis</h3>
                      <select 
                        value={powerFlowFuelType} 
                        onChange={(e) => setPowerFlowFuelType(e.target.value)}
                        className="graph-select"
                      >
                        {fuelTypes.map(fuel => (
                          <option key={fuel} value={fuel.toLowerCase()}>{fuel}</option>
                        ))}
                      </select>
                    </div>
                    <div className="graph-content">
                      <svg viewBox="0 0 400 250" className="bar-chart-svg">
                        <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        {fuelTypes.slice(1).map((fuel, i) => {
                          const height = 50 + Math.random() * 130;
                          const x = 60 + i * 50;
                          const colors = ['#fbbf24', '#60a5fa', '#94a3b8', '#1f2937', '#8b5cf6', '#10b981'];
                          return (
                            <g key={fuel}>
                              <rect x={x} y={200 - height} width="40" height={height} fill={colors[i]} rx="3"/>
                              <text x={x + 20} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                                {(800 + Math.random() * 600).toFixed(0)}
                              </text>
                              <text x={x + 20} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{fuel}</text>
                            </g>
                          );
                        })}
                        <text x="20" y="125" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">MW</text>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Graph 2: LMP Forecasting */}
                  <div className="assumption-graph-card">
                    <div className="graph-header">
                      <h3>LMP Forecasting</h3>
                      <select 
                        value={lmpFuelType} 
                        onChange={(e) => setLmpFuelType(e.target.value)}
                        className="graph-select"
                      >
                        {fuelTypes.map(fuel => (
                          <option key={fuel} value={fuel.toLowerCase()}>{fuel}</option>
                        ))}
                      </select>
                    </div>
                    <div className="graph-content">
                      <svg viewBox="0 0 400 250" className="bar-chart-svg">
                        <line x1="40" y1="200" x2="380" y2="200" stroke="#e2e8f0" strokeWidth="2"/>
                        {fuelTypes.slice(1).map((fuel, i) => {
                          const height = 40 + Math.random() * 140;
                          const x = 60 + i * 50;
                          const colors = ['#fbbf24', '#60a5fa', '#94a3b8', '#1f2937', '#8b5cf6', '#10b981'];
                          return (
                            <g key={fuel}>
                              <rect x={x} y={200 - height} width="40" height={height} fill={colors[i]} rx="3"/>
                              <text x={x + 20} y={195 - height} fontSize="11" fontWeight="600" fill="#1e293b" textAnchor="middle">
                                ${(25 + Math.random() * 50).toFixed(1)}
                              </text>
                              <text x={x + 20} y="220" fontSize="10" fill="#64748b" textAnchor="middle">{fuel}</text>
                            </g>
                          );
                        })}
                        <text x="20" y="125" fontSize="12" fill="#64748b" textAnchor="middle" transform="rotate(-90 20 125)">$/MWh</text>
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

import { useState, useEffect } from 'react';
import './Analytics.css';

const Analytics = () => {
  const [activeFuelTab, setActiveFuelTab] = useState('Coal');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [newFuelType, setNewFuelType] = useState('');
  
  // Dashboard panels configuration with dimensions (2x2 grid layout)
  const [panels, setPanels] = useState([
    { id: 1, chartType: null, dataSource: null, title: 'Panel 1', width: 50, height: 50, row: 0, col: 0 },
    { id: 2, chartType: null, dataSource: null, title: 'Panel 2', width: 50, height: 50, row: 0, col: 1 },
    { id: 3, chartType: null, dataSource: null, title: 'Panel 3', width: 50, height: 50, row: 1, col: 0 },
    { id: 4, chartType: null, dataSource: null, title: 'Panel 4', width: 50, height: 50, row: 1, col: 1 }
  ]);
  
  // Resizable panel state
  const [resizing, setResizing] = useState(null); // { panelId, edge, startX, startY, startWidth, startHeight }
  const [containerRect, setContainerRect] = useState(null);
  
  // Fuel types
  const [fuelTypes, setFuelTypes] = useState([
    'Coal', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass'
  ]);
  
  // Chart configuration modal
  const [activePanel, setActivePanel] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Available chart types
  const chartTypes = [
    { id: 'bar', name: 'Bar Chart', icon: '📊', supportsSecondaryAxis: true },
    { id: 'line', name: 'Line Chart', icon: '📈', supportsSecondaryAxis: true },
    { id: 'pie', name: 'Pie Chart', icon: '🥧', supportsSecondaryAxis: false },
    { id: 'area', name: 'Area Chart', icon: '📉', supportsSecondaryAxis: true },
    { id: 'scatter', name: 'Scatter Plot', icon: '⚫', supportsSecondaryAxis: true },
    { id: 'table', name: 'Data Table', icon: '📋', supportsSecondaryAxis: false },
    { id: 'gauge', name: 'Gauge', icon: '⏱️', supportsSecondaryAxis: false },
    { id: 'map', name: 'Heat Map', icon: '🗺️', supportsSecondaryAxis: false },
    { id: 'combo', name: 'Combo Chart', icon: '📊📈', supportsSecondaryAxis: true }
  ];
  
  // Available data sources (Database tables/views)
  const dataSources = [
    'LMP Historical Data',
    'Generation by Fuel Type',
    'Load Forecast',
    'Capacity Utilization',
    'Efficiency Metrics',
    'Cost Analysis',
    'Emissions Data',
    'Real-time Power Flow'
  ];
  
  // Available database fields for configuration
  const availableFields = {
    dimensions: [
      { id: 'bus_id', name: 'Bus ID', table: 'buses', type: 'categorical' },
      { id: 'bus_name', name: 'Bus Name', table: 'buses', type: 'categorical' },
      { id: 'state', name: 'State', table: 'buses', type: 'categorical' },
      { id: 'county', name: 'County', table: 'buses', type: 'categorical' },
      { id: 'voltage', name: 'Voltage Level', table: 'buses', type: 'categorical' },
      { id: 'fuel_type', name: 'Fuel Type', table: 'generators', type: 'categorical' },
      { id: 'generator_name', name: 'Generator Name', table: 'generators', type: 'categorical' },
      { id: 'date', name: 'Date', table: 'all', type: 'temporal' },
      { id: 'year', name: 'Year', table: 'all', type: 'temporal' },
      { id: 'month', name: 'Month', table: 'all', type: 'temporal' },
      { id: 'hour', name: 'Hour', table: 'all', type: 'temporal' },
      { id: 'scenario', name: 'Scenario', table: 'constraints', type: 'categorical' },
      { id: 'status', name: 'Status', table: 'branches', type: 'categorical' }
    ],
    measures: [
      { id: 'lmp_2024', name: 'LMP 2024', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'lmp_2023', name: 'LMP 2023', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'capacity_mw', name: 'Capacity (MW)', table: 'generators', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'generation_mw', name: 'Generation (MW)', table: 'generators', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'load_mw', name: 'Load (MW)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'short_circuit', name: 'Short Circuit (MVA)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'power_flow', name: 'Power Flow (MW)', table: 'branches', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'efficiency', name: 'Efficiency (%)', table: 'generators', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'utilization', name: 'Utilization (%)', table: 'generators', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'emissions', name: 'Emissions (tons)', table: 'generators', type: 'numeric', aggregation: ['sum', 'avg'] },
      { id: 'cost', name: 'Cost ($)', table: 'all', type: 'numeric', aggregation: ['sum', 'avg', 'min', 'max'] },
      { id: 'count', name: 'Count', table: 'all', type: 'numeric', aggregation: ['count'] }
    ]
  };
  
  // Panel configuration state (Power BI style)
  const [panelConfig, setPanelConfig] = useState({
    chartType: null,
    dataSource: null,
    xAxis: null,
    primaryYAxis: [],
    secondaryYAxis: [],
    legend: null,
    filters: [],
    aggregations: {},
    sorting: { field: null, order: 'asc' },
    colorScheme: 'default',
    showDataLabels: false,
    showGridLines: true
  });
  
  // Generate sample data based on configuration
  const generateSampleData = (config) => {
    if (!config || !config.xAxis || config.primaryYAxis.length === 0) return [];
    
    const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    return categories.map(cat => {
      const dataPoint = { category: cat };
      config.primaryYAxis.forEach(field => {
        dataPoint[field.id] = Math.floor(Math.random() * 1000) + 200;
      });
      config.secondaryYAxis.forEach(field => {
        dataPoint[field.id] = Math.floor(Math.random() * 100) + 10;
      });
      return dataPoint;
    });
  };
  
  // Render chart based on configuration
  const renderChart = (panel) => {
    if (!panel.config || !panel.config.chartType || !panel.config.xAxis || panel.config.primaryYAxis.length === 0) {
      return (
        <div className="panel-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <p>Click configure to add a visualization</p>
        </div>
      );
    }
    
    const config = panel.config;
    const data = generateSampleData(config);
    const chartType = config.chartType;
    
    // Color schemes
    const colors = {
      default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      cool: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16'],
      warm: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'],
      professional: ['#1e40af', '#7c3aed', '#db2777', '#dc2626', '#ea580c']
    };
    
    const colorPalette = colors[config.colorScheme] || colors.default;
    
    // Bar Chart
    if (chartType === 'bar') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const barWidth = chartWidth / (data.length * config.primaryYAxis.length + data.length + 1);
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`}>
          {/* Grid lines */}
          {config.showGridLines && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}
          
          {/* Bars */}
          {data.map((d, i) => (
            <g key={i}>
              {config.primaryYAxis.map((field, j) => {
                const value = d[field.id] || 0;
                const barHeight = (value / maxValue) * chartHeight;
                const x = padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (j * barWidth) + barWidth / 2;
                const y = padding.top + chartHeight - barHeight;
                
                return (
                  <g key={field.id}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth * 0.8}
                      height={barHeight}
                      fill={colorPalette[j % colorPalette.length]}
                      rx="2"
                    />
                    {config.showDataLabels && (
                      <text
                        x={x + barWidth * 0.4}
                        y={y - 5}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#374151"
                        fontWeight="500"
                      >
                        {value}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* X-axis labels */}
              <text
                x={padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (config.primaryYAxis.length * barWidth) / 2}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#374151"
              >
                {d.category}
              </text>
            </g>
          ))}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 35} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {config.xAxis.name}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {config.primaryYAxis[0].name}
          </text>
        </svg>
      );
    }
    
    // Line Chart
    if (chartType === 'line') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const pointSpacing = chartWidth / (data.length - 1);
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`}>
          {/* Grid lines */}
          {config.showGridLines && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}
          
          {/* Lines and points */}
          {config.primaryYAxis.map((field, j) => {
            const points = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              const value = d[field.id] || 0;
              const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <g key={field.id}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={colorPalette[j % colorPalette.length]}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={colorPalette[j % colorPalette.length]}
                        stroke="white"
                        strokeWidth="2"
                      />
                      {config.showDataLabels && (
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#374151"
                          fontWeight="500"
                        >
                          {value}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + i * pointSpacing}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#374151"
            >
              {d.category}
            </text>
          ))}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 35} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {config.xAxis.name}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {config.primaryYAxis[0].name}
          </text>
        </svg>
      );
    }
    
    // Pie Chart
    if (chartType === 'pie') {
      const total = data.reduce((sum, d) => sum + (d[config.primaryYAxis[0].id] || 0), 0);
      const cx = 250;
      const cy = 140;
      const radius = 100;
      let currentAngle = -90;
      
      return (
        <svg width="100%" height="100%" viewBox="0 0 500 280">
          {data.map((d, i) => {
            const value = d[config.primaryYAxis[0].id] || 0;
            const percentage = value / total;
            const angle = percentage * 360;
            
            const startAngle = (currentAngle * Math.PI) / 180;
            const endAngle = ((currentAngle + angle) * Math.PI) / 180;
            
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${cx} ${cy}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <g key={i}>
                <path
                  d={pathData}
                  fill={colorPalette[i % colorPalette.length]}
                  stroke="white"
                  strokeWidth="2"
                />
                {config.showDataLabels && percentage > 0.05 && (
                  <text
                    x={cx + (radius * 0.6) * Math.cos((startAngle + endAngle) / 2)}
                    y={cy + (radius * 0.6) * Math.sin((startAngle + endAngle) / 2)}
                    textAnchor="middle"
                    fontSize="11"
                    fill="white"
                    fontWeight="600"
                  >
                    {Math.round(percentage * 100)}%
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Legend */}
          {data.map((d, i) => (
            <g key={i} transform={`translate(360, ${30 + i * 25})`}>
              <rect x="0" y="0" width="15" height="15" fill={colorPalette[i % colorPalette.length]} rx="2" />
              <text x="20" y="12" fontSize="11" fill="#374151">
                {d.category}: {d[config.primaryYAxis[0].id]}
              </text>
            </g>
          ))}
        </svg>
      );
    }
    
    // Area Chart
    if (chartType === 'area') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const pointSpacing = chartWidth / (data.length - 1);
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`}>
          <defs>
            {config.primaryYAxis.map((field, j) => (
              <linearGradient key={field.id} id={`gradient-${j}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorPalette[j % colorPalette.length]} stopOpacity="0.6" />
                <stop offset="100%" stopColor={colorPalette[j % colorPalette.length]} stopOpacity="0.1" />
              </linearGradient>
            ))}
          </defs>
          
          {/* Grid lines */}
          {config.showGridLines && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          ))}
          
          {/* Areas */}
          {config.primaryYAxis.map((field, j) => {
            const points = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              const value = d[field.id] || 0;
              const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            
            const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${points} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;
            
            return (
              <g key={field.id}>
                <path
                  d={areaPath}
                  fill={`url(#gradient-${j})`}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={colorPalette[j % colorPalette.length]}
                  strokeWidth="2"
                />
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + i * pointSpacing}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#374151"
            >
              {d.category}
            </text>
          ))}
        </svg>
      );
    }
    
    // Default fallback for other chart types
    return (
      <div className="chart-preview">
        <div className="chart-icon">{chartTypes.find(c => c.id === chartType)?.icon}</div>
        <p>{chartTypes.find(c => c.id === chartType)?.name}</p>
        <small>{config.xAxis.name} × {config.primaryYAxis.map(f => f.name).join(', ')}</small>
        <div className="chart-config-summary">
          <span>🎨 {config.colorScheme}</span>
          {config.showDataLabels && <span>🏷️ Labels</span>}
          {config.showGridLines && <span>📏 Grid</span>}
        </div>
      </div>
    );
  };
  
  // Handle tile edge resizing
  const handleResizeStart = (panelId, edge, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const container = document.querySelector('.analytics-grid-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    setContainerRect(rect);
    
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Add resizing class to body for cursor override
    document.body.classList.add('resizing');
    
    setResizing({
      panelId,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panel.width,
      startHeight: panel.height
    });
  };
  
  const handleResizeMove = (e) => {
    if (!resizing || !containerRect) return;
    
    const deltaX = ((e.clientX - resizing.startX) / containerRect.width) * 100;
    const deltaY = ((e.clientY - resizing.startY) / containerRect.height) * 100;
    
    setPanels(prevPanels => {
      const currentPanel = prevPanels.find(p => p.id === resizing.panelId);
      if (!currentPanel) return prevPanels;
      
      const newPanels = prevPanels.map(p => ({ ...p }));
      const currentPanelIndex = newPanels.findIndex(p => p.id === resizing.panelId);
      
      // Handle horizontal (right edge) resize
      if (resizing.edge === 'right' || resizing.edge.includes('right')) {
        const newWidth = Math.max(10, Math.min(90, resizing.startWidth + deltaX));
        const widthDelta = newWidth - resizing.startWidth;
        
        // Find and adjust all panels in the same row
        newPanels.forEach((panel, idx) => {
          if (panel.row === currentPanel.row) {
            if (panel.col === currentPanel.col) {
              // Current panel being resized
              panel.width = newWidth;
            } else if (panel.col === currentPanel.col + 1) {
              // Panel to the right - adjust inversely
              panel.width = resizing.startWidth - widthDelta;
              panel.width = Math.max(10, Math.min(90, panel.width));
            }
          }
        });
        
        // Maintain same width ratios for other row
        const otherRow = currentPanel.row === 0 ? 1 : 0;
        newPanels.forEach((panel, idx) => {
          if (panel.row === otherRow) {
            if (panel.col === currentPanel.col) {
              panel.width = newPanels.find(p => p.row === currentPanel.row && p.col === currentPanel.col).width;
            } else if (panel.col === currentPanel.col + 1) {
              panel.width = newPanels.find(p => p.row === currentPanel.row && p.col === currentPanel.col + 1).width;
            }
          }
        });
      }
      
      // Handle vertical (bottom edge) resize
      if (resizing.edge === 'bottom' || (resizing.edge.includes('bottom') && !resizing.edge.includes('right'))) {
        const newHeight = Math.max(10, Math.min(90, resizing.startHeight + deltaY));
        const heightDelta = newHeight - resizing.startHeight;
        
        // Find and adjust all panels in the same column
        newPanels.forEach((panel, idx) => {
          if (panel.col === currentPanel.col) {
            if (panel.row === currentPanel.row) {
              // Current panel being resized
              panel.height = newHeight;
            } else if (panel.row === currentPanel.row + 1) {
              // Panel below - adjust inversely
              panel.height = resizing.startHeight - heightDelta;
              panel.height = Math.max(10, Math.min(90, panel.height));
            }
          }
        });
        
        // Maintain same height ratios for other column
        const otherCol = currentPanel.col === 0 ? 1 : 0;
        newPanels.forEach((panel, idx) => {
          if (panel.col === otherCol) {
            if (panel.row === currentPanel.row) {
              panel.height = newPanels.find(p => p.col === currentPanel.col && p.row === currentPanel.row).height;
            } else if (panel.row === currentPanel.row + 1) {
              panel.height = newPanels.find(p => p.col === currentPanel.col && p.row === currentPanel.row + 1).height;
            }
          }
        });
      }
      
      // Handle corner resize (both width and height simultaneously)
      if (resizing.edge === 'right-bottom') {
        const newWidth = Math.max(10, Math.min(90, resizing.startWidth + deltaX));
        const newHeight = Math.max(10, Math.min(90, resizing.startHeight + deltaY));
        const widthDelta = newWidth - resizing.startWidth;
        const heightDelta = newHeight - resizing.startHeight;
        
        // Adjust all panels to maintain grid structure
        newPanels.forEach((panel, idx) => {
          // Same row as current panel
          if (panel.row === currentPanel.row) {
            if (panel.col === currentPanel.col) {
              panel.width = newWidth;
              panel.height = newHeight;
            } else if (panel.col === currentPanel.col + 1) {
              panel.width = resizing.startWidth - widthDelta;
              panel.width = Math.max(10, Math.min(90, panel.width));
              panel.height = newHeight;
            }
          }
          // Row below current panel
          else if (panel.row === currentPanel.row + 1) {
            if (panel.col === currentPanel.col) {
              panel.width = newWidth;
              panel.height = resizing.startHeight - heightDelta;
              panel.height = Math.max(10, Math.min(90, panel.height));
            } else if (panel.col === currentPanel.col + 1) {
              panel.width = resizing.startWidth - widthDelta;
              panel.width = Math.max(10, Math.min(90, panel.width));
              panel.height = resizing.startHeight - heightDelta;
              panel.height = Math.max(10, Math.min(90, panel.height));
            }
          }
        });
      }
      
      return newPanels;
    });
  };
  
  const handleResizeEnd = () => {
    // Remove resizing class from body
    document.body.classList.remove('resizing');
    setResizing(null);
    setContainerRect(null);
  };
  
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, containerRect]);
  
  // Open configuration modal for a panel
  const openPanelConfig = (panelId) => {
    setActivePanel(panelId);
    const panel = panels.find(p => p.id === panelId);
    // Load existing configuration if available
    if (panel && panel.config) {
      setPanelConfig(panel.config);
    } else {
      // Reset to default
      setPanelConfig({
        chartType: null,
        dataSource: null,
        xAxis: null,
        primaryYAxis: [],
        secondaryYAxis: [],
        legend: null,
        filters: [],
        aggregations: {},
        sorting: { field: null, order: 'asc' },
        colorScheme: 'default',
        showDataLabels: false,
        showGridLines: true
      });
    }
    setShowConfigModal(true);
  };
  
  // Save panel configuration
  const savePanelConfig = () => {
    const title = panelConfig.chartType 
      ? `${chartTypes.find(c => c.id === panelConfig.chartType)?.name} - ${panelConfig.dataSource || 'No Data'}`
      : 'Unconfigured Panel';
    
    setPanels(panels.map(panel => 
      panel.id === activePanel 
        ? { ...panel, config: panelConfig, title }
        : panel
    ));
    setShowConfigModal(false);
    setActivePanel(null);
  };
  
  // Add field to axis
  const addFieldToAxis = (axisType, field) => {
    setPanelConfig(prev => {
      if (axisType === 'xAxis') {
        return { ...prev, xAxis: field };
      } else if (axisType === 'legend') {
        return { ...prev, legend: field };
      } else if (axisType === 'primaryYAxis') {
        if (!prev.primaryYAxis.find(f => f.id === field.id)) {
          return { ...prev, primaryYAxis: [...prev.primaryYAxis, { ...field, aggregation: 'sum' }] };
        }
      } else if (axisType === 'secondaryYAxis') {
        if (!prev.secondaryYAxis.find(f => f.id === field.id)) {
          return { ...prev, secondaryYAxis: [...prev.secondaryYAxis, { ...field, aggregation: 'sum' }] };
        }
      }
      return prev;
    });
  };
  
  // Remove field from axis
  const removeFieldFromAxis = (axisType, fieldId) => {
    setPanelConfig(prev => {
      if (axisType === 'xAxis' && prev.xAxis?.id === fieldId) {
        return { ...prev, xAxis: null };
      } else if (axisType === 'legend' && prev.legend?.id === fieldId) {
        return { ...prev, legend: null };
      } else if (axisType === 'primaryYAxis') {
        return { ...prev, primaryYAxis: prev.primaryYAxis.filter(f => f.id !== fieldId) };
      } else if (axisType === 'secondaryYAxis') {
        return { ...prev, secondaryYAxis: prev.secondaryYAxis.filter(f => f.id !== fieldId) };
      }
      return prev;
    });
  };
  
  // Update aggregation for a field
  const updateAggregation = (axisType, fieldId, aggregation) => {
    setPanelConfig(prev => {
      if (axisType === 'primaryYAxis') {
        return {
          ...prev,
          primaryYAxis: prev.primaryYAxis.map(f => 
            f.id === fieldId ? { ...f, aggregation } : f
          )
        };
      } else if (axisType === 'secondaryYAxis') {
        return {
          ...prev,
          secondaryYAxis: prev.secondaryYAxis.map(f => 
            f.id === fieldId ? { ...f, aggregation } : f
          )
        };
      }
      return prev;
    });
  };
  
  // Add new fuel type
  const handleAddFuel = () => {
    if (newFuelType.trim() && !fuelTypes.includes(newFuelType.trim())) {
      setFuelTypes([...fuelTypes, newFuelType.trim()]);
      setNewFuelType('');
      setShowAddFuelModal(false);
    }
  };

  return (
    <div className="analytics-page">
      
      {/* Fuel Type Tabs - Horizontal bar below navbar */}
      <div className="fuel-tabs-bar">
        <div className="fuel-tabs-container">
          {fuelTypes.map(fuel => (
            <button
              key={fuel}
              className={`fuel-tab ${activeFuelTab === fuel ? 'active' : ''}`}
              onClick={() => setActiveFuelTab(fuel)}
            >
              {fuel}
            </button>
          ))}
          <button 
            className="fuel-tab add-fuel-tab"
            onClick={() => setShowAddFuelModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Any
          </button>
        </div>
      </div>
      
      {/* 4-Panel Grid with Individual Resizable Tiles */}
      <div className="analytics-grid-container">
        <div className="panels-grid">
          {panels.map((panel, index) => (
            <div 
              key={panel.id}
              className="dashboard-panel resizable"
              style={{ 
                width: `calc(${panel.width}% - 4px)`,
                height: `calc(${panel.height}% - 4px)`,
                margin: '2px',
                position: 'relative'
              }}
            >
              <div className="panel-header">
                <h3>{panel.title}</h3>
                <button 
                  className="panel-config-btn"
                  onClick={() => openPanelConfig(panel.id)}
                  title="Configure Panel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M23 12h-6m-6 0H5"/>
                  </svg>
                </button>
              </div>
              <div className="panel-content">
                {renderChart(panel)}
              </div>
              
              {/* Resize Handles */}
              <div 
                className="resize-handle resize-handle-right"
                onMouseDown={(e) => handleResizeStart(panel.id, 'right', e)}
                title="Drag to resize width"
              />
              <div 
                className="resize-handle resize-handle-bottom"
                onMouseDown={(e) => handleResizeStart(panel.id, 'bottom', e)}
                title="Drag to resize height"
              />
              <div 
                className="resize-handle resize-handle-corner"
                onMouseDown={(e) => handleResizeStart(panel.id, 'right-bottom', e)}
                title="Drag to resize both"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Panel Configuration Modal - Power BI Style */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="powerbi-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="powerbi-modal-header">
              <div>
                <h2>Configure Visualization - Panel {activePanel}</h2>
                <p className="modal-subtitle">Design your chart with Power BI-style field configuration</p>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="powerbi-modal-body">
              {/* Left Sidebar - Field List (Power BI Fields Pane) */}
              <div className="fields-pane">
                <div className="pane-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                  </svg>
                  <h3>Fields</h3>
                </div>
                
                {/* Data Source Selector */}
                <div className="data-source-selector">
                  <label>Data Source</label>
                  <select 
                    value={panelConfig.dataSource || ''}
                    onChange={(e) => setPanelConfig({ ...panelConfig, dataSource: e.target.value })}
                  >
                    <option value="">Select data source...</option>
                    {dataSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                
                {/* Dimensions Section */}
                <div className="field-category">
                  <div className="category-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    <h4>Dimensions</h4>
                  </div>
                  <div className="field-list">
                    {availableFields.dimensions.map(field => (
                      <div 
                        key={field.id} 
                        className="field-item"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('field', JSON.stringify(field))}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                        <span>{field.name}</span>
                        <span className="field-table">{field.table}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Measures Section */}
                <div className="field-category">
                  <div className="category-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M12 20V10M18 20V4M6 20v-6"/>
                    </svg>
                    <h4>Measures</h4>
                  </div>
                  <div className="field-list">
                    {availableFields.measures.map(field => (
                      <div 
                        key={field.id} 
                        className="field-item"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('field', JSON.stringify(field))}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M12 20V10M18 20V4M6 20v-6"/>
                        </svg>
                        <span>{field.name}</span>
                        <span className="field-table">{field.table}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Center - Visualization Pane */}
              <div className="visualization-pane">
                <div className="pane-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <h3>Visualization</h3>
                </div>
                
                {/* Chart Type Selector */}
                <div className="chart-type-selector">
                  <div className="chart-type-grid">
                    {chartTypes.map(chart => (
                      <button
                        key={chart.id}
                        className={`chart-type-btn ${panelConfig.chartType === chart.id ? 'active' : ''}`}
                        onClick={() => setPanelConfig({ ...panelConfig, chartType: chart.id })}
                        title={chart.name}
                      >
                        <span className="chart-icon">{chart.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Field Wells (Power BI Style) */}
                <div className="field-wells">
                  <h4>Field Configuration</h4>
                  
                  {/* X-Axis Drop Zone */}
                  <div className="field-well"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const field = JSON.parse(e.dataTransfer.getData('field'));
                      addFieldToAxis('xAxis', field);
                    }}
                  >
                    <div className="well-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <polyline points="8 17 3 12 8 7"/>
                        <polyline points="16 17 21 12 16 7"/>
                      </svg>
                      <span>X-Axis (Category)</span>
                    </div>
                    <div className="well-drop-zone">
                      {panelConfig.xAxis ? (
                        <div className="field-chip">
                          <span>{panelConfig.xAxis.name}</span>
                          <button onClick={() => removeFieldFromAxis('xAxis', panelConfig.xAxis.id)}>×</button>
                        </div>
                      ) : (
                        <span className="drop-hint">Drag field here</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Primary Y-Axis Drop Zone */}
                  <div className="field-well"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const field = JSON.parse(e.dataTransfer.getData('field'));
                      addFieldToAxis('primaryYAxis', field);
                    }}
                  >
                    <div className="well-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                        <line x1="12" y1="3" x2="12" y2="21"/>
                        <polyline points="7 8 12 3 17 8"/>
                        <polyline points="7 16 12 21 17 16"/>
                      </svg>
                      <span>Primary Y-Axis (Values)</span>
                    </div>
                    <div className="well-drop-zone multi">
                      {panelConfig.primaryYAxis.length > 0 ? (
                        panelConfig.primaryYAxis.map(field => (
                          <div key={field.id} className="field-chip with-agg">
                            <select 
                              value={field.aggregation}
                              onChange={(e) => updateAggregation('primaryYAxis', field.id, e.target.value)}
                              className="agg-selector"
                            >
                              {field.aggregation && availableFields.measures.find(f => f.id === field.id)?.aggregation?.map(agg => (
                                <option key={agg} value={agg}>{agg.toUpperCase()}</option>
                              ))}
                            </select>
                            <span>{field.name}</span>
                            <button onClick={() => removeFieldFromAxis('primaryYAxis', field.id)}>×</button>
                          </div>
                        ))
                      ) : (
                        <span className="drop-hint">Drag measures here</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Secondary Y-Axis Drop Zone (if supported) */}
                  {panelConfig.chartType && chartTypes.find(c => c.id === panelConfig.chartType)?.supportsSecondaryAxis && (
                    <div className="field-well"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const field = JSON.parse(e.dataTransfer.getData('field'));
                        addFieldToAxis('secondaryYAxis', field);
                      }}
                    >
                      <div className="well-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                          <line x1="12" y1="3" x2="12" y2="21"/>
                          <polyline points="7 8 12 3 17 8"/>
                          <polyline points="7 16 12 21 17 16"/>
                        </svg>
                        <span>Secondary Y-Axis (Optional)</span>
                      </div>
                      <div className="well-drop-zone multi">
                        {panelConfig.secondaryYAxis.length > 0 ? (
                          panelConfig.secondaryYAxis.map(field => (
                            <div key={field.id} className="field-chip with-agg">
                              <select 
                                value={field.aggregation}
                                onChange={(e) => updateAggregation('secondaryYAxis', field.id, e.target.value)}
                                className="agg-selector"
                              >
                                {field.aggregation && availableFields.measures.find(f => f.id === field.id)?.aggregation?.map(agg => (
                                  <option key={agg} value={agg}>{agg.toUpperCase()}</option>
                                ))}
                              </select>
                              <span>{field.name}</span>
                              <button onClick={() => removeFieldFromAxis('secondaryYAxis', field.id)}>×</button>
                            </div>
                          ))
                        ) : (
                          <span className="drop-hint">Drag measures here (optional)</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Legend Drop Zone */}
                  <div className="field-well"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const field = JSON.parse(e.dataTransfer.getData('field'));
                      addFieldToAxis('legend', field);
                    }}
                  >
                    <div className="well-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      <span>Legend (Series)</span>
                    </div>
                    <div className="well-drop-zone">
                      {panelConfig.legend ? (
                        <div className="field-chip">
                          <span>{panelConfig.legend.name}</span>
                          <button onClick={() => removeFieldFromAxis('legend', panelConfig.legend.id)}>×</button>
                        </div>
                      ) : (
                        <span className="drop-hint">Drag field here (optional)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Sidebar - Format Pane */}
              <div className="format-pane">
                <div className="pane-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M23 12h-6m-6 0H5"/>
                  </svg>
                  <h3>Format</h3>
                </div>
                
                <div className="format-options">
                  {/* Color Scheme */}
                  <div className="format-section">
                    <label>Color Scheme</label>
                    <select 
                      value={panelConfig.colorScheme}
                      onChange={(e) => setPanelConfig({ ...panelConfig, colorScheme: e.target.value })}
                    >
                      <option value="default">Default</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="red">Red</option>
                      <option value="gradient">Gradient</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  {/* Display Options */}
                  <div className="format-section">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={panelConfig.showDataLabels}
                        onChange={(e) => setPanelConfig({ ...panelConfig, showDataLabels: e.target.checked })}
                      />
                      <span>Show Data Labels</span>
                    </label>
                  </div>
                  
                  <div className="format-section">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={panelConfig.showGridLines}
                        onChange={(e) => setPanelConfig({ ...panelConfig, showGridLines: e.target.checked })}
                      />
                      <span>Show Grid Lines</span>
                    </label>
                  </div>
                  
                  {/* Sorting */}
                  <div className="format-section">
                    <label>Sort By</label>
                    <select 
                      value={panelConfig.sorting.field || ''}
                      onChange={(e) => setPanelConfig({ 
                        ...panelConfig, 
                        sorting: { ...panelConfig.sorting, field: e.target.value }
                      })}
                    >
                      <option value="">None</option>
                      {panelConfig.xAxis && <option value={panelConfig.xAxis.id}>{panelConfig.xAxis.name}</option>}
                      {panelConfig.primaryYAxis.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="format-section">
                    <label>Sort Order</label>
                    <select 
                      value={panelConfig.sorting.order}
                      onChange={(e) => setPanelConfig({ 
                        ...panelConfig, 
                        sorting: { ...panelConfig.sorting, order: e.target.value }
                      })}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="powerbi-modal-footer">
              <button className="btn-cancel" onClick={() => setShowConfigModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={savePanelConfig}
                disabled={!panelConfig.chartType || !panelConfig.dataSource}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Fuel Type Modal */}
      {showAddFuelModal && (
        <div className="modal-overlay" onClick={() => setShowAddFuelModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Fuel Type</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAddFuelModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <input
                type="text"
                className="fuel-input"
                placeholder="Enter fuel type name..."
                value={newFuelType}
                onChange={(e) => setNewFuelType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFuel()}
              />
              <button className="add-fuel-btn" onClick={handleAddFuel}>
                Add Fuel Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

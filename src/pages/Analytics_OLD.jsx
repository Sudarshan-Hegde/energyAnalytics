import { useState, useEffect, useRef } from 'react';
import './Analytics.css';

const Analytics = () => {
  const [activeFuelTab, setActiveFuelTab] = useState('Coal');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [newFuelType, setNewFuelType] = useState('');
  
  // Dashboard panels configuration
  const [panels, setPanels] = useState([
    { id: 1, chartType: null, dataSource: null, title: 'Panel 1' },
    { id: 2, chartType: null, dataSource: null, title: 'Panel 2' },
    { id: 3, chartType: null, dataSource: null, title: 'Panel 3' },
    { id: 4, chartType: null, dataSource: null, title: 'Panel 4' }
  ]);
  
  // Resizable panel state
  const [horizontalSplit, setHorizontalSplit] = useState(50); // percentage
  const [verticalSplit1, setVerticalSplit1] = useState(50); // top row split
  const [verticalSplit2, setVerticalSplit2] = useState(50); // bottom row split
  const [isDragging, setIsDragging] = useState(null);
  
  // Fuel types
  const [fuelTypes, setFuelTypes] = useState([
    'Coal', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Biomass'
  ]);
  
  // Chart configuration modal
  const [activePanel, setActivePanel] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Fetch real economic data
  const {
    historicalLMP,
    zoneEfficiency,
    avgForecast,
    statistics,
    loading: dataLoading,
    error: dataError
  } = useEconomicData();

  // Historical LMP chart (replaces power consumption)
  const getLMPHistoryOption = () => {
    if (historicalLMP.length === 0) {
      return null;
    }

    const years = historicalLMP.map(d => d.year);
    const values = historicalLMP.map(d => d.value);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        formatter: (params) => {
          const param = params[0];
          return `${param.name}<br/>Avg LMP: $${param.value.toFixed(2)}/MWh`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      yAxis: {
        type: 'value',
        name: '$/MWh',
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.6)' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [{
        name: 'LMP',
        type: 'line',
        smooth: true,
        data: values,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#00d4ff', width: 2 },
        itemStyle: { color: '#00d4ff' }
      }]
    };
  };

  // Real-time power consumption chart (kept for non-economic data)
  const getPowerConsumptionOption = () => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = hours.map(() => Math.random() * 500 + 800);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      yAxis: {
        type: 'value',
        name: 'MW',
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.6)' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [{
        name: 'Power',
        type: 'line',
        smooth: true,
        data: data,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#00d4ff', width: 2 },
        itemStyle: { color: '#00d4ff' }
      }]
    };
  };

  // Grid efficiency by zone - using real data
  const getEfficiencyOption = () => {
    if (zoneEfficiency.length === 0) {
      return null;
    }

    const colors = ['#00d4ff', '#4caf50', '#ffc107', '#9c27b0', '#ff5722', '#3b82f6', '#10b981'];
    const data = zoneEfficiency.slice(0, 7).map((zone, index) => ({
      value: zone.efficiency,
      name: zone.zone,
      itemStyle: { color: colors[index % colors.length] }
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        formatter: (params) => {
          return `${params.name}<br/>Efficiency: ${params.value.toFixed(1)}%`;
        }
      },
      legend: {
        bottom: '5%',
        left: 'center',
        textStyle: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      series: [{
        name: 'Efficiency',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#0f0f1e',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#fff',
            formatter: '{b}\n{d}%'
          }
        },
        labelLine: { show: false },
        data: data
      }]
    };
  };

  // Load distribution
  const getLoadDistributionOption = () => {
    const substations = ['Sub-A', 'Sub-B', 'Sub-C', 'Sub-D', 'Sub-E', 'Sub-F'];
    const loads = [87, 92, 78, 98, 65, 83];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: substations,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      yAxis: {
        type: 'value',
        name: 'Load %',
        max: 100,
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.6)' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [{
        name: 'Load',
        type: 'bar',
        data: loads.map(value => ({
          value,
          itemStyle: {
            color: value > 95 ? '#f44336' : value > 85 ? '#ffc107' : '#4caf50'
          }
        })),
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  };

  // Forecast chart - using real forecast data
  const getForecastOption = () => {
    if (historicalLMP.length === 0 || !avgForecast.base) {
      return null;
    }

    const years = historicalLMP.map(d => d.year);
    const actualData = historicalLMP.map(d => d.value);
    
    // Extend with forecast for next year
    const forecastYears = [...years, '2026'];
    const forecastData = [...actualData, avgForecast.base];
    const highData = [...actualData, avgForecast.high];
    const lowData = [...actualData, avgForecast.low];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        formatter: (params) => {
          let result = `${params[0].name}<br/>`;
          params.forEach(param => {
            result += `${param.marker}${param.seriesName}: $${param.value.toFixed(2)}/MWh<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['Actual', 'Base Forecast', 'High Case', 'Low Case'],
        top: '5%',
        textStyle: { color: 'rgba(255, 255, 255, 0.8)' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: forecastYears,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      yAxis: {
        type: 'value',
        name: '$/MWh',
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.6)' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.6)' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [
        {
          name: 'Actual',
          type: 'line',
          data: actualData,
          smooth: true,
          lineStyle: { color: '#00d4ff', width: 2 },
          itemStyle: { color: '#00d4ff' }
        },
        {
          name: 'Base Forecast',
          type: 'line',
          data: forecastData,
          smooth: true,
          lineStyle: { 
            color: '#9c27b0', 
            width: 2,
            type: 'dashed'
          },
          itemStyle: { color: '#9c27b0' }
        },
        {
          name: 'High Case',
          type: 'line',
          data: highData,
          smooth: true,
          lineStyle: { 
            color: '#ef4444', 
            width: 1.5,
            type: 'dotted'
          },
          itemStyle: { color: '#ef4444' }
        },
        {
          name: 'Low Case',
          type: 'line',
          data: lowData,
          smooth: true,
          lineStyle: { 
            color: '#10b981', 
            width: 1.5,
            type: 'dotted'
          },
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  };

  // Show loading state
  if (dataLoading) {
    return (
      <div className="analytics-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading economic data...</p>
      </div>
    );
  }

  // Show info message if no data (backend not connected)
  if (!dataLoading && historicalLMP.length === 0 && !dataError) {
    console.log('No economic data available - backend API not connected');
  }

  return (
    <div className="analytics-page">
      
      {/* Backend Not Connected Banner */}
      {!dataLoading && historicalLMP.length === 0 && (
        <div className="backend-warning-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Backend API not connected. Analytics will show without real data. See INTEGRATION_GUIDE.md for setup instructions.</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Real economic insights from ISO-NE market data</p>
        </div>
        <div className="time-range-selector">
          {['1h', '24h', '7d', '30d'].map(range => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
              <path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">${statistics.avgLMP}/MWh</div>
            <div className="metric-label">Avg LMP (2025)</div>
            <div className={`metric-change ${statistics.lmpChange >= 0 ? 'positive' : 'negative'}`}>
              {statistics.lmpChange >= 0 ? '+' : ''}{statistics.lmpChange}%
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">{statistics.avgEfficiency}%</div>
            <div className="metric-label">Avg Efficiency</div>
            <div className="metric-change positive">System-wide</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(156, 39, 176, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">${statistics.forecastBase.toFixed(2)}</div>
            <div className="metric-label">5Y Forecast</div>
            <div className="metric-change neutral">Base Case</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">{statistics.totalZones}</div>
            <div className="metric-label">Active Zones</div>
            <div className="metric-change neutral">{statistics.dataPoints} records</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Historical Average LMP (2022-2025)</h3>
          {getLMPHistoryOption() && <ReactECharts option={getLMPHistoryOption()} style={{ height: '300px' }} />}
        </div>

        <div className="chart-card">
          <h3>Zone Efficiency Distribution</h3>
          {getEfficiencyOption() && <ReactECharts option={getEfficiencyOption()} style={{ height: '300px' }} />}
        </div>

        <div className="chart-card">
          <h3>Load Distribution by Substation</h3>
          <ReactECharts option={getLoadDistributionOption()} style={{ height: '300px' }} />
        </div>

        <div className="chart-card">
          <h3>LMP Forecast (5-Year Outlook)</h3>
          {getForecastOption() && <ReactECharts option={getForecastOption()} style={{ height: '300px' }} />}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import './Analytics.css';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('power');

  // Real-time power consumption chart
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

  // Grid efficiency by zone
  const getEfficiencyOption = () => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' }
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
            color: '#fff'
          }
        },
        labelLine: { show: false },
        data: [
          { value: 94.5, name: 'Zone A', itemStyle: { color: '#00d4ff' } },
          { value: 91.2, name: 'Zone B', itemStyle: { color: '#4caf50' } },
          { value: 88.7, name: 'Zone C', itemStyle: { color: '#ffc107' } },
          { value: 92.3, name: 'Zone D', itemStyle: { color: '#9c27b0' } },
          { value: 89.8, name: 'Zone E', itemStyle: { color: '#ff5722' } }
        ]
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

  // Forecast chart
  const getForecastOption = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const actual = [820, 932, 901, 934, 1290, 1330, 1320];
    const forecast = [820, 932, 901, 934, 1290, 1400, 1450];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: '#00d4ff',
        borderWidth: 1,
        textStyle: { color: '#fff' }
      },
      legend: {
        data: ['Actual', 'AI Forecast'],
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
        data: days,
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
      series: [
        {
          name: 'Actual',
          type: 'line',
          data: actual,
          smooth: true,
          lineStyle: { color: '#00d4ff', width: 2 },
          itemStyle: { color: '#00d4ff' }
        },
        {
          name: 'AI Forecast',
          type: 'line',
          data: forecast,
          smooth: true,
          lineStyle: { 
            color: '#9c27b0', 
            width: 2,
            type: 'dashed'
          },
          itemStyle: { color: '#9c27b0' }
        }
      ]
    };
  };

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>AI-powered insights and real-time grid analytics</p>
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
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">1,247 MW</div>
            <div className="metric-label">Total Load</div>
            <div className="metric-change positive">+5.2%</div>
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
            <div className="metric-value">94.5%</div>
            <div className="metric-label">Avg Efficiency</div>
            <div className="metric-change positive">+2.1%</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">237 MWh</div>
            <div className="metric-label">Storage</div>
            <div className="metric-change neutral">0%</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="metric-info">
            <div className="metric-value">3</div>
            <div className="metric-label">Active Alerts</div>
            <div className="metric-change negative">+1</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card large">
          <div className="chart-header">
            <h3>Power Consumption - 24 Hour Trend</h3>
            <span className="chart-badge">Real-time</span>
          </div>
          <ReactECharts 
            option={getPowerConsumptionOption()} 
            style={{ height: '300px' }}
          />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Grid Efficiency by Zone</h3>
          </div>
          <ReactECharts 
            option={getEfficiencyOption()} 
            style={{ height: '300px' }}
          />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Substation Load Distribution</h3>
          </div>
          <ReactECharts 
            option={getLoadDistributionOption()} 
            style={{ height: '300px' }}
          />
        </div>

        <div className="chart-card large">
          <div className="chart-header">
            <h3>AI-Powered Load Forecast</h3>
            <span className="chart-badge ml">ML Model: LSTM</span>
          </div>
          <ReactECharts 
            option={getForecastOption()} 
            style={{ height: '300px' }}
          />
        </div>
      </div>

      <div className="insights-panel">
        <h3>AI Insights & Recommendations</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon warning">⚠️</div>
            <div className="insight-content">
              <h4>High Load Alert - Substation D</h4>
              <p>Current load at 98%. Consider load balancing to prevent overload.</p>
              <span className="insight-time">2 mins ago</span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon success">✓</div>
            <div className="insight-content">
              <h4>Efficiency Optimization</h4>
              <p>Zone A efficiency improved by 3.2% after recent optimizations.</p>
              <span className="insight-time">15 mins ago</span>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon info">ℹ️</div>
            <div className="insight-content">
              <h4>Forecast Update</h4>
              <p>Peak demand expected tomorrow at 6 PM - prepare reserves.</p>
              <span className="insight-time">1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

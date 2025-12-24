import { useState, useEffect } from 'react';
import './Analytics.css';
import { gridDataAPI } from '../services/api';

const Analytics = () => {
  const [activeFuelTab, setActiveFuelTab] = useState('Wind');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [newFuelType, setNewFuelType] = useState('');
  
  // Dashboard panels configuration with dimensions (2x2 grid layout)
  const [panels, setPanels] = useState([
    { id: 1, title: 'Panel 1', width: 50, height: 50, row: 0, col: 0, config: null },
    { id: 2, title: 'Panel 2', width: 50, height: 50, row: 0, col: 1, config: null },
    { id: 3, title: 'Panel 3', width: 50, height: 50, row: 1, col: 0, config: null },
    { id: 4, title: 'Panel 4', width: 50, height: 50, row: 1, col: 1, config: null }
  ]);
  
  // Resizable panel state
  const [resizing, setResizing] = useState(null); // { panelId, edge, startX, startY, startWidth, startHeight }
  const [containerRect, setContainerRect] = useState(null);
  
  // Energy resource types (Task 4: Only Wind, Solar, Data Center, Storage)
  const [fuelTypes, setFuelTypes] = useState([
    'Wind', 'Solar', 'Data Center', 'Storage'
  ]);
  
  // Chart configuration modal
  const [activePanel, setActivePanel] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Available chart types (Task 3: More graph types with names displayed below)
  const chartTypes = [
    { id: 'bar', name: 'Bar', svg: '<rect x="3" y="8" width="3" height="8"/><rect x="8" y="5" width="3" height="11"/><rect x="13" y="2" width="3" height="14"/>', supportsSecondaryAxis: true },
    { id: 'line', name: 'Line', svg: '<polyline points="2,14 6,10 10,12 14,6 18,8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="2" cy="14" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="10" cy="12" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="18" cy="8" r="1.5"/>', supportsSecondaryAxis: true },
    { id: 'pie', name: 'Pie', svg: '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10,2 A8,8 0 0,1 18,10 L10,10 Z" fill="currentColor" opacity="0.3"/>', supportsSecondaryAxis: false },
    { id: 'area', name: 'Area', svg: '<path d="M2,14 L5,10 L9,12 L13,6 L17,8 L17,16 L2,16 Z" fill="currentColor" opacity="0.3"/><polyline points="2,14 5,10 9,12 13,6 17,8" fill="none" stroke="currentColor" stroke-width="2"/>', supportsSecondaryAxis: true },
    { id: 'scatter', name: 'Scatter', svg: '<circle cx="3" cy="14" r="1.5"/><circle cx="6" cy="8" r="1.5"/><circle cx="9" cy="11" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="17" cy="13" r="1.5"/>', supportsSecondaryAxis: true },
    { id: 'combo', name: 'Combo', svg: '<rect x="3" y="10" width="2.5" height="6"/><rect x="7" y="7" width="2.5" height="9"/><polyline points="11,6 13.5,4 16,8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="6" r="1"/><circle cx="13.5" cy="4" r="1"/><circle cx="16" cy="8" r="1"/>', supportsSecondaryAxis: true },
    { id: 'stacked-bar', name: 'Stacked Bar', svg: '<rect x="3" y="6" width="3" height="4" fill="currentColor"/><rect x="3" y="10" width="3" height="6" opacity="0.6"/><rect x="8" y="4" width="3" height="5" fill="currentColor"/><rect x="8" y="9" width="3" height="7" opacity="0.6"/><rect x="13" y="8" width="3" height="3" fill="currentColor"/><rect x="13" y="11" width="3" height="5" opacity="0.6"/>', supportsSecondaryAxis: false },
    { id: 'stacked-area', name: 'Stacked Area', svg: '<path d="M2,16 L5,12 L9,13 L13,10 L17,11 L17,16 Z" fill="currentColor" opacity="0.5"/><path d="M2,10 L5,8 L9,9 L13,6 L17,7 L17,11 L13,10 L9,13 L5,12 L2,16 Z" fill="currentColor" opacity="0.3"/>', supportsSecondaryAxis: false },
    { id: 'horizontal-bar', name: 'Horizontal Bar', svg: '<rect x="2" y="3" width="8" height="3"/><rect x="2" y="8" width="11" height="3"/><rect x="2" y="13" width="14" height="3"/>', supportsSecondaryAxis: true },
    { id: 'table', name: 'Table', svg: '<rect x="2" y="2" width="16" height="3" fill="currentColor" opacity="0.3"/><line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" stroke-width="1"/><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="0.5"/><line x1="2" y1="11" x2="18" y2="11" stroke="currentColor" stroke-width="0.5"/><line x1="2" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="0.5"/><line x1="7" y1="2" x2="7" y2="16" stroke="currentColor" stroke-width="0.5"/><line x1="13" y1="2" x2="13" y2="16" stroke="currentColor" stroke-width="0.5"/>', supportsSecondaryAxis: false },
    { id: 'gauge', name: 'Gauge', svg: '<path d="M4,14 A6,6 0 1,1 16,14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="10" x2="13" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/>', supportsSecondaryAxis: false },
    { id: 'donut', name: 'Donut', svg: '<circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="4"/><path d="M10,3 A7,7 0 0,1 17,10" fill="none" stroke="currentColor" stroke-width="4" opacity="0.5"/><circle cx="10" cy="10" r="4" fill="white"/>', supportsSecondaryAxis: false },
    { id: 'heatmap', name: 'Heatmap', svg: '<rect x="2" y="2" width="3" height="3" fill="currentColor" opacity="0.8"/><rect x="6" y="2" width="3" height="3" opacity="0.4"/><rect x="10" y="2" width="3" height="3" opacity="0.6"/><rect x="14" y="2" width="3" height="3" opacity="0.3"/><rect x="2" y="6" width="3" height="3" opacity="0.5"/><rect x="6" y="6" width="3" height="3" opacity="0.9"/><rect x="10" y="6" width="3" height="3" opacity="0.7"/><rect x="14" y="6" width="3" height="3" opacity="0.4"/><rect x="2" y="10" width="3" height="3" opacity="0.6"/><rect x="6" y="10" width="3" height="3" opacity="0.5"/><rect x="10" y="10" width="3" height="3" opacity="0.8"/><rect x="14" y="10" width="3" height="3" opacity="0.6"/>', supportsSecondaryAxis: false },
    { id: 'waterfall', name: 'Waterfall', svg: '<rect x="2" y="8" width="3" height="8" fill="currentColor" opacity="0.7"/><line x1="5" y1="8" x2="7" y2="6" stroke="currentColor" stroke-width="1" stroke-dasharray="1,1"/><rect x="7" y="6" width="3" height="4" fill="currentColor" opacity="0.5"/><line x1="10" y1="6" x2="12" y2="10" stroke="currentColor" stroke-width="1" stroke-dasharray="1,1"/><rect x="12" y="10" width="3" height="6" fill="currentColor" opacity="0.7"/>', supportsSecondaryAxis: false },
    { id: 'funnel', name: 'Funnel', svg: '<path d="M4,2 L16,2 L14,7 L6,7 Z" fill="currentColor" opacity="0.8"/><path d="M6,7 L14,7 L12.5,11 L7.5,11 Z" fill="currentColor" opacity="0.6"/><path d="M7.5,11 L12.5,11 L11,16 L9,16 Z" fill="currentColor" opacity="0.4"/>', supportsSecondaryAxis: false },
    { id: 'radar', name: 'Radar', svg: '<polygon points="10,3 16,7 14,14 6,14 4,7" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/><polygon points="10,6 13,8 12,12 8,12 7,8" fill="currentColor" opacity="0.3"/><line x1="10" y1="10" x2="10" y2="3" stroke="currentColor" stroke-width="0.5"/><line x1="10" y1="10" x2="16" y2="7" stroke="currentColor" stroke-width="0.5"/><line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="0.5"/><line x1="10" y1="10" x2="6" y2="14" stroke="currentColor" stroke-width="0.5"/><line x1="10" y1="10" x2="4" y2="7" stroke="currentColor" stroke-width="0.5"/>', supportsSecondaryAxis: false },
    { id: 'bubble', name: 'Bubble', svg: '<circle cx="4" cy="13" r="2" opacity="0.7"/><circle cx="9" cy="9" r="3" opacity="0.6"/><circle cx="14" cy="7" r="2.5" opacity="0.7"/><circle cx="17" cy="12" r="1.5" opacity="0.8"/>', supportsSecondaryAxis: true },
    { id: 'treemap', name: 'Treemap', svg: '<rect x="2" y="2" width="8" height="8" fill="currentColor" opacity="0.7"/><rect x="11" y="2" width="7" height="5" fill="currentColor" opacity="0.5"/><rect x="11" y="8" width="7" height="5" fill="currentColor" opacity="0.6"/><rect x="2" y="11" width="4" height="5" fill="currentColor" opacity="0.4"/><rect x="7" y="11" width="3" height="5" fill="currentColor" opacity="0.8"/>', supportsSecondaryAxis: false },
    { id: 'box-plot', name: 'Box Plot', svg: '<rect x="3" y="6" width="4" height="8" fill="none" stroke="currentColor" stroke-width="1"/><line x1="3" y1="10" x2="7" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="4" x2="5" y2="6" stroke="currentColor" stroke-width="1"/><line x1="5" y1="14" x2="5" y2="16" stroke="currentColor" stroke-width="1"/><rect x="10" y="5" width="4" height="9" fill="none" stroke="currentColor" stroke-width="1"/><line x1="10" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="3" x2="12" y2="5" stroke="currentColor" stroke-width="1"/><line x1="12" y1="14" x2="12" y2="16" stroke="currentColor" stroke-width="1"/>', supportsSecondaryAxis: false },
    { id: 'violin', name: 'Violin', svg: '<path d="M5,2 Q3,10 5,18 Q7,10 5,2" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1"/><line x1="5" y1="2" x2="5" y2="18" stroke="currentColor" stroke-width="1"/><path d="M12,3 Q10,10 12,17 Q14,10 12,3" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1"/><line x1="12" y1="3" x2="12" y2="17" stroke="currentColor" stroke-width="1"/>', supportsSecondaryAxis: false },
    { id: 'sankey', name: 'Sankey', svg: '<path d="M2,5 Q10,5 10,8 Q10,11 18,11" fill="none" stroke="currentColor" stroke-width="3" opacity="0.5"/><path d="M2,8 Q10,8 10,11 Q10,14 18,14" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/><path d="M2,11 Q10,11 10,14 Q10,16 18,16" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>', supportsSecondaryAxis: false },
    { id: 'network', name: 'Network', svg: '<circle cx="10" cy="5" r="2" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="10" cy="15" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><line x1="10" y1="7" x2="4" y2="11" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="10" y1="7" x2="16" y2="11" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="4" y1="12" x2="10" y2="14" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="16" y1="12" x2="10" y2="14" stroke="currentColor" stroke-width="1" opacity="0.5"/>', supportsSecondaryAxis: false },
    { id: 'candlestick', name: 'Candlestick', svg: '<line x1="4" y1="3" x2="4" y2="16" stroke="currentColor" stroke-width="0.5"/><rect x="3" y="6" width="2" height="6" fill="currentColor"/><line x1="9" y1="5" x2="9" y2="15" stroke="currentColor" stroke-width="0.5"/><rect x="8" y="8" width="2" height="4" fill="none" stroke="currentColor" stroke-width="1"/><line x1="14" y1="4" x2="14" y2="14" stroke="currentColor" stroke-width="0.5"/><rect x="13" y="7" width="2" height="5" fill="currentColor"/>', supportsSecondaryAxis: false },
    { id: 'histogram', name: 'Histogram', svg: '<rect x="2" y="10" width="2.5" height="6"/><rect x="5" y="7" width="2.5" height="9"/><rect x="8" y="4" width="2.5" height="12"/><rect x="11" y="6" width="2.5" height="10"/><rect x="14" y="9" width="2.5" height="7"/><rect x="17" y="12" width="2.5" height="4"/>', supportsSecondaryAxis: true },
    { id: 'polar', name: 'Polar', svg: '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/><circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/><path d="M10,2 L12,8 L10,10 Z" fill="currentColor" opacity="0.6"/><path d="M14,4 L16,9 L10,10 Z" fill="currentColor" opacity="0.7"/><path d="M17,8 L15,12 L10,10 Z" fill="currentColor" opacity="0.5"/><path d="M16,13 L12,14 L10,10 Z" fill="currentColor" opacity="0.6"/>', supportsSecondaryAxis: false }
  ];
  
  // Available databases (Task 1: Only database files)
  const availableDatabases = [
    { id: 'gridsense_iso_ne.db', name: 'gridsense_iso_ne.db' },
    { id: 'economic_data.db', name: 'economic_data.db' },
    { id: 'operational_data.db', name: 'operational_data.db' },
    { id: 'environmental_data.db', name: 'environmental_data.db' },
    { id: 'asset_management.db', name: 'asset_management.db' },
    { id: 'market_data.db', name: 'market_data.db' },
    { id: 'weather_data.db', name: 'weather_data.db' },
    { id: 'reliability_metrics.db', name: 'reliability_metrics.db' }
  ];
  
  // Selected database (Task 2: No table dropdown needed)
  const [selectedDatabase, setSelectedDatabase] = useState('gridsense_iso_ne.db');
  
  // Available database fields for configuration (Task 3: All attributes from selected database/table)
  const availableFields = {
    dimensions: [
      // Buses table - Categorical dimensions
      { id: 'bus_id', name: 'Bus ID', table: 'buses', type: 'categorical' },
      { id: 'bus_model_id', name: 'Bus Model ID', table: 'buses', type: 'categorical' },
      { id: 'bus_name', name: 'Bus Name', table: 'buses', type: 'categorical' },
      { id: 'bus_name_econ', name: 'Bus Name (Economic)', table: 'buses', type: 'categorical' },
      { id: 'area', name: 'Area', table: 'buses', type: 'categorical' },
      { id: 'area_econ', name: 'Area (Economic)', table: 'buses', type: 'categorical' },
      { id: 'zone', name: 'Zone', table: 'buses', type: 'categorical' },
      { id: 'state', name: 'State', table: 'buses', type: 'categorical' },
      { id: 'county', name: 'County', table: 'buses', type: 'categorical' },
      { id: 'iso', name: 'ISO', table: 'buses', type: 'categorical' },
      { id: 'confidence_level', name: 'Confidence Level', table: 'buses', type: 'categorical' },
      { id: 'pre_existing_issues_substation_discharging', name: 'Pre-existing Issues (Discharging)', table: 'buses', type: 'categorical' },
      { id: 'pre_existing_issues_substation_charging', name: 'Pre-existing Issues (Charging)', table: 'buses', type: 'categorical' },
      // Generators
      { id: 'fuel_type', name: 'Fuel Type', table: 'generators', type: 'categorical' },
      { id: 'generator_name', name: 'Generator Name', table: 'generators', type: 'categorical' },
      { id: 'generator_type', name: 'Generator Type', table: 'generators', type: 'categorical' },
      // Temporal dimensions
      { id: 'date', name: 'Date', table: 'all', type: 'temporal' },
      { id: 'year', name: 'Year', table: 'all', type: 'temporal' },
      { id: 'month', name: 'Month', table: 'all', type: 'temporal' },
      { id: 'quarter', name: 'Quarter', table: 'all', type: 'temporal' },
      { id: 'hour', name: 'Hour', table: 'all', type: 'temporal' },
      { id: 'day_of_week', name: 'Day of Week', table: 'all', type: 'temporal' },
      // Constraints
      { id: 'scenario', name: 'Scenario', table: 'constraints', type: 'categorical' },
      { id: 'status', name: 'Status', table: 'branches', type: 'categorical' }
    ],
    measures: [
      // LMP Data from buses table
      { id: 'historical_average_lmp_2022', name: 'LMP 2022 (Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'historical_average_lmp_2023', name: 'LMP 2023 (Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'historical_average_lmp_2024', name: 'LMP 2024 (Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'historical_average_lmp_2025', name: 'LMP 2025 (Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'historical_average_lmp', name: 'LMP (Historical Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // Congestion components
      { id: 'average_congestion_component_in_lmp_2022', name: 'Congestion Component 2022', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_congestion_component_in_lmp_2023', name: 'Congestion Component 2023', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_congestion_component_in_lmp_2024', name: 'Congestion Component 2024', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_congestion_component_in_lmp_2025', name: 'Congestion Component 2025', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_congestion_component_in_lmp', name: 'Congestion Component (Avg)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // Loss components
      { id: 'average_loss_component_in_lmp_2022', name: 'Loss Component 2022', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_loss_component_in_lmp_2023', name: 'Loss Component 2023', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_loss_component_in_lmp_2024', name: 'Loss Component 2024', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'average_loss_component_in_lmp_2025', name: 'Loss Component 2025', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // Voltage and capacity
      { id: 'nominal_voltage', name: 'Nominal Voltage (kV)', table: 'buses', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'nominal_voltage_econ', name: 'Nominal Voltage (Economic)', table: 'buses', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'headroom_capacity_substation_discharging', name: 'Headroom Capacity (Discharging)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'headroom_capacity_substation_charging', name: 'Headroom Capacity (Charging)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // Short circuit
      { id: '3_phase_short_circuit', name: '3-Phase Short Circuit (MVA)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: '3_phase_short_circuit_current', name: '3-Phase Short Circuit Current (A)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // Geographic
      { id: 'latitude', name: 'Latitude', table: 'buses', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'longitude', name: 'Longitude', table: 'buses', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'fips_code', name: 'FIPS Code', table: 'buses', type: 'numeric', aggregation: ['count'] },
      // Generation metrics
      { id: 'capacity_mw', name: 'Capacity (MW)', table: 'generators', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'generation_mw', name: 'Generation (MW)', table: 'generators', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      { id: 'efficiency', name: 'Efficiency (%)', table: 'generators', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'utilization', name: 'Utilization (%)', table: 'generators', type: 'numeric', aggregation: ['avg', 'min', 'max'] },
      { id: 'emissions', name: 'Emissions (tons)', table: 'generators', type: 'numeric', aggregation: ['sum', 'avg'] },
      // Branches
      { id: 'power_flow', name: 'Power Flow (MW)', table: 'branches', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
      // General
      { id: 'load_mw', name: 'Load (MW)', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] },
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
  
  // Real database data
  const [databaseData, setDatabaseData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Fetch data from gridsense_iso_ne.db
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch buses data first (primary data source)
        const response = await gridDataAPI.getBuses();
        console.log('API Response:', response);
        const busesData = response?.data?.data || response?.data || [];
        console.log('Fetched buses data:', busesData.length, 'records');
        
        setDatabaseData({
          buses: busesData
        });
      } catch (error) {
        console.error('Error fetching database data:', error);
        setDatabaseData({ buses: [] });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Get real data from database based on configuration
  const getRealData = (config) => {
    console.log('getRealData called with config:', config);
    console.log('Database data buses:', databaseData?.buses?.length);
    
    if (!config || !config.xAxis || config.primaryYAxis.length === 0) {
      console.log('Config validation failed');
      return [];
    }
    
    if (!databaseData || !databaseData.buses || !Array.isArray(databaseData.buses) || databaseData.buses.length === 0) {
      console.log('No buses data available or not an array');
      return [];
    }
    
    // Use buses data as the primary source from gridsense_iso_ne.db
    const sourceData = databaseData.buses;
    
    // Map field IDs to actual API column names
    const fieldMapping = {
      'historical_average_lmp_2022': 'lmp_2022',
      'historical_average_lmp_2023': 'lmp_2023',
      'historical_average_lmp_2024': 'lmp_2024',
      'historical_average_lmp_2025': 'lmp_2025',
      'nominal_voltage': 'base_kv'
    };
    
    const getFieldValue = (row, fieldId) => {
      const mappedId = fieldMapping[fieldId] || fieldId;
      return row[mappedId];
    };
    
    // Group data by x-axis field
    const groupedData = {};
    sourceData.forEach(row => {
      const xValue = getFieldValue(row, config.xAxis.id) || 'Unknown';
      if (!groupedData[xValue]) {
        groupedData[xValue] = [];
      }
      groupedData[xValue].push(row);
    });
    
    // Aggregate data based on configuration
    return Object.keys(groupedData).map(xValue => {
      const dataPoint = { category: xValue };
      
      // Calculate primary Y-axis values
      config.primaryYAxis.forEach(field => {
        const values = groupedData[xValue]
          .map(row => parseFloat(getFieldValue(row, field.id)) || 0)
          .filter(v => !isNaN(v));
        
        if (values.length > 0) {
          const aggregation = field.aggregation || 'sum';
          if (aggregation === 'sum') {
            dataPoint[field.id] = values.reduce((a, b) => a + b, 0);
          } else if (aggregation === 'avg') {
            dataPoint[field.id] = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (aggregation === 'min') {
            dataPoint[field.id] = Math.min(...values);
          } else if (aggregation === 'max') {
            dataPoint[field.id] = Math.max(...values);
          } else if (aggregation === 'count') {
            dataPoint[field.id] = values.length;
          }
        } else {
          dataPoint[field.id] = 0;
        }
      });
      
      // Calculate secondary Y-axis values
      config.secondaryYAxis.forEach(field => {
        const values = groupedData[xValue]
          .map(row => parseFloat(getFieldValue(row, field.id)) || 0)
          .filter(v => !isNaN(v));
        
        if (values.length > 0) {
          const aggregation = field.aggregation || 'sum';
          if (aggregation === 'sum') {
            dataPoint[field.id] = values.reduce((a, b) => a + b, 0);
          } else if (aggregation === 'avg') {
            dataPoint[field.id] = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (aggregation === 'min') {
            dataPoint[field.id] = Math.min(...values);
          } else if (aggregation === 'max') {
            dataPoint[field.id] = Math.max(...values);
          } else if (aggregation === 'count') {
            dataPoint[field.id] = values.length;
          }
        } else {
          dataPoint[field.id] = 0;
        }
      });
      
      return dataPoint;
    });
  };
  
  // Render chart based on configuration
  const renderChart = (panel) => {
    console.log('renderChart called for panel:', panel.id, 'config:', panel.config);
    
    if (!panel.config || !panel.config.chartType || !panel.config.xAxis || panel.config.primaryYAxis.length === 0) {
      console.log('Panel missing config');
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
    const data = getRealData(config);
    const chartType = config.chartType;
    
    console.log('Chart type:', chartType, 'Data length:', data.length);
    
    if (loading) {
      return (
        <div className="panel-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <p>Loading data...</p>
        </div>
      );
    }
    
    if (data.length === 0) {
      return (
        <div className="panel-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <p>No data available</p>
        </div>
      );
    }
    
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
      // Reset to default with current selected database
      setPanelConfig({
        chartType: null,
        dataSource: selectedDatabase, // Initialize with current database selection
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
    
    console.log('Saving panel config:', panelConfig);
    
    setPanels(panels.map(panel => 
      panel.id === activePanel 
        ? { ...panel, config: { ...panelConfig }, title }
        : panel
    ));
    
    console.log('Panel configuration saved');
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
                
                {/* Data Source Selector (Task 1 & 2: Database files only, no table dropdown) */}
                <div className="data-source-selector">
                  <label>Database Source</label>
                  <select 
                    value={panelConfig.dataSource || selectedDatabase}
                    onChange={(e) => {
                      setSelectedDatabase(e.target.value);
                      setPanelConfig({ ...panelConfig, dataSource: e.target.value });
                    }}
                  >
                    {availableDatabases.map(db => (
                      <option key={db.id} value={db.id}>{db.name}</option>
                    ))}
                  </select>
                  <p className="data-source-info">All tables and attributes from selected database are available below</p>
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
                
                {/* Chart Type Selector (Task 3: Display names below icons) */}
                <div className="chart-type-selector">
                  <div className="chart-type-grid">
                    {chartTypes.map(chart => (
                      <button
                        key={chart.id}
                        className={`chart-type-btn ${panelConfig.chartType === chart.id ? 'active' : ''}`}
                        onClick={() => setPanelConfig({ ...panelConfig, chartType: chart.id })}
                        title={chart.name}
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="chart-icon" dangerouslySetInnerHTML={{__html: chart.svg}}></svg>
                        <span className="chart-type-name">{chart.name}</span>
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
                disabled={!panelConfig.chartType || !panelConfig.dataSource || !panelConfig.xAxis || panelConfig.primaryYAxis.length === 0}
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

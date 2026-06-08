import { useState, useEffect } from 'react';
import './Analytics.css';
import { gridDataAPI } from '../services/api';

const Analytics = () => {
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedState = localStorage.getItem('analyticsState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('📂 Loading persisted Analytics state:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading persisted Analytics state:', error);
    }
    return null;
  };
  
  const persistedState = loadPersistedState();
  
  // Task 1 & 2: Multi-tab analytics with separate panel states
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState(persistedState?.activeAnalyticsTab || 'resource');
  const [activeFuelTab, setActiveFuelTab] = useState(persistedState?.activeFuelTab || 'Wind');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [newFuelType, setNewFuelType] = useState('');
  
  // Analytics tabs - removed, now using fuel types for all tabs
  const analyticsTabs = [];
  
  // Default panel layout
  const defaultPanels = [
    { id: 1, title: 'Panel 1', width: 50, height: 50, row: 0, col: 0, config: null },
    { id: 2, title: 'Panel 2', width: 50, height: 50, row: 0, col: 1, config: null },
    { id: 3, title: 'Panel 3', width: 50, height: 50, row: 1, col: 0, config: null },
    { id: 4, title: 'Panel 4', width: 50, height: 50, row: 1, col: 1, config: null }
  ];
  
  // Separate panel states for each tab (using fuel types as keys)
  const [panelsByTab, setPanelsByTab] = useState(persistedState?.panelsByTab || {
    'Wind': persistedState?.panels || [...defaultPanels],
    'Solar': [...defaultPanels],
    'Data Center': [...defaultPanels],
    'Storage': [...defaultPanels],
    'LMP Analytics': [...defaultPanels],
    'Bus Score Analytics': [...defaultPanels]
  });
  
  // Current active panels based on selected tab
  const [panels, setPanels] = useState(panelsByTab[activeFuelTab] || [...defaultPanels]);
  
  // Resizable panel state
  const [resizing, setResizing] = useState(null); // { panelId, edge, startX, startY, startWidth, startHeight }
  const [containerRect, setContainerRect] = useState(null);
  
  // Energy resource types (Task 1 & 4: Wind, Solar, Data Center, Storage, LMP Analytics, Bus Score Analytics)
  const [fuelTypes, setFuelTypes] = useState([
    'Wind', 'Solar', 'Data Center', 'Storage', 'LMP Analytics', 'Bus Score Analytics'
  ]);
  
  // Chart configuration modal
  const [activePanel, setActivePanel] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Task 3: Preconfigured graphs dropdown
  const [showQuickGraphs, setShowQuickGraphs] = useState(false);
  const [customSavedGraphs, setCustomSavedGraphs] = useState(persistedState?.customSavedGraphs || []);
  
  // Task 5: Filter popup
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [filteredData, setFilteredData] = useState(null);
  
  // Available chart types (Task 3: More graph types with names displayed below)
  const chartTypes = [
    { id: 'bar', name: 'Bar', svg: '<rect x="3" y="8" width="3" height="8"/><rect x="8" y="5" width="3" height="11"/><rect x="13" y="2" width="3" height="14"/>', supportsSecondaryAxis: true },
    { id: 'line', name: 'Line', svg: '<polyline points="2,14 6,10 10,12 14,6 18,8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="2" cy="14" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="10" cy="12" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="18" cy="8" r="1.5"/>', supportsSecondaryAxis: true },
    { id: 'pie', name: 'Pie', svg: '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10,2 A8,8 0 0,1 18,10 L10,10 Z" fill="currentColor" opacity="0.3"/>', supportsSecondaryAxis: false },
    { id: 'area', name: 'Area', svg: '<path d="M2,14 L5,10 L9,12 L13,6 L17,8 L17,16 L2,16 Z" fill="currentColor" opacity="0.3"/><polyline points="2,14 5,10 9,12 13,6 17,8" fill="none" stroke="currentColor" stroke-width="2"/>', supportsSecondaryAxis: true },
    { id: 'scatter', name: 'Scatter', svg: '<circle cx="3" cy="14" r="1.5"/><circle cx="6" cy="8" r="1.5"/><circle cx="9" cy="11" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="17" cy="13" r="1.5"/>', supportsSecondaryAxis: true },
    
    // Combination chart types
    { id: 'line-bar', name: 'Line + Bar', svg: '<rect x="3" y="10" width="2.5" height="6"/><rect x="7" y="7" width="2.5" height="9"/><polyline points="11,6 13.5,4 16,8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="6" r="1"/><circle cx="13.5" cy="4" r="1"/><circle cx="16" cy="8" r="1"/>', supportsSecondaryAxis: true },
    { id: 'area-line', name: 'Area + Line', svg: '<path d="M2,14 L6,12 L10,14 L10,16 L2,16 Z" fill="currentColor" opacity="0.3"/><polyline points="2,14 6,12 10,14" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="10,8 13,6 16,9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="8" r="1"/><circle cx="13" cy="6" r="1"/><circle cx="16" cy="9" r="1"/>', supportsSecondaryAxis: true },
    { id: 'bar-scatter', name: 'Bar + Scatter', svg: '<rect x="3" y="10" width="2" height="6"/><rect x="7" y="8" width="2" height="8"/><circle cx="11" cy="7" r="1.2"/><circle cx="13" cy="11" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="17" cy="6" r="1.2"/>', supportsSecondaryAxis: true },
    { id: 'line-area', name: 'Line + Area', svg: '<polyline points="2,10 6,8 10,10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="10" r="1"/><path d="M10,12 L13,10 L16,13 L16,16 L10,16 Z" fill="currentColor" opacity="0.3"/>', supportsSecondaryAxis: true },
    { id: 'stacked-bar-line', name: 'Stacked Bar + Line', svg: '<rect x="3" y="8" width="2" height="4" opacity="0.7"/><rect x="3" y="12" width="2" height="4" opacity="0.4"/><rect x="7" y="6" width="2" height="5" opacity="0.7"/><rect x="7" y="11" width="2" height="5" opacity="0.4"/><polyline points="11,5 13.5,3 16,6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="5" r="0.8"/><circle cx="13.5" cy="3" r="0.8"/><circle cx="16" cy="6" r="0.8"/>', supportsSecondaryAxis: true },
    
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
    { id: 'gridsense_iso_ne_sample.db', name: 'gridsense_iso_ne_sample.db' },
    { id: 'economic_data.db', name: 'economic_data.db' },
    { id: 'operational_data.db', name: 'operational_data.db' },
    { id: 'environmental_data.db', name: 'environmental_data.db' },
    { id: 'asset_management.db', name: 'asset_management.db' },
    { id: 'market_data.db', name: 'market_data.db' },
    { id: 'weather_data.db', name: 'weather_data.db' },
    { id: 'reliability_metrics.db', name: 'reliability_metrics.db' }
  ];
  
  // Selected database (Task 2: No table dropdown needed)
  const [selectedDatabase, setSelectedDatabase] = useState('gridsense_iso_ne_sample.db');
  
  // Available database fields for configuration (Task 3: All attributes from selected database/table)
  const [availableFields, setAvailableFields] = useState({
    dimensions: [
      // Default fields - will be replaced by API data
      { id: 'bus_id', name: 'Bus ID', table: 'buses', type: 'categorical' },
      { id: 'zone', name: 'Zone', table: 'buses', type: 'categorical' }
    ],
    measures: [
      // Default fields - will be replaced by API data
      { id: 'lmp_2022', name: 'LMP 2022', table: 'buses', type: 'numeric', aggregation: ['avg', 'sum', 'min', 'max'] }
    ]
  });
  
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
    showGridLines: true // TASK 3: Grid lines enabled by default
  });
  
  // Real database data
  const [databaseData, setDatabaseData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Task 2: Resizable measurement column state
  const [measureColumnWidth, setMeasureColumnWidth] = useState(280); // Default width
  const [isResizingMeasureColumn, setIsResizingMeasureColumn] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // Vertical resize state for dimensions and measures lists
  const [dimensionsHeight, setDimensionsHeight] = useState(300); // Default height
  const [measuresHeight, setMeasuresHeight] = useState(300); // Default height
  const [isResizingDimensions, setIsResizingDimensions] = useState(false);
  const [isResizingMeasures, setIsResizingMeasures] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  
  // Task 1: Fetch database schema dynamically
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await gridDataAPI.getSchema();
        if (response.data.success) {
          setAvailableFields(response.data.data);
          console.log('📊 Loaded database schema:', response.data.data);
        }
      } catch (error) {
        console.error('Error fetching database schema:', error);
      }
    };
    
    fetchSchema();
  }, []);
  
  // Fetch data from gridsense_iso_ne_sample.db
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
  
  // Persist state to localStorage whenever panels, tabs, or custom graphs change
  useEffect(() => {
    const stateToSave = {
      panelsByTab,
      activeFuelTab,
      activeAnalyticsTab,
      customSavedGraphs
    };
    localStorage.setItem('analyticsState', JSON.stringify(stateToSave));
    console.log('💾 Saved Analytics state to localStorage');
  }, [panelsByTab, activeFuelTab, activeAnalyticsTab, customSavedGraphs]);
  
  // Sync panels when tab changes
  useEffect(() => {
    // If the tab doesn't have panels yet, initialize with default panels
    if (!panelsByTab[activeFuelTab]) {
      setPanelsByTab(prev => ({
        ...prev,
        [activeFuelTab]: [...defaultPanels]
      }));
      setPanels([...defaultPanels]);
    } else {
      setPanels(panelsByTab[activeFuelTab]);
    }
  }, [activeFuelTab, panelsByTab]);
  
  // Task 3: Preconfigured Graphs Definitions (CORRECTED - All fields mapped to econ table)
  const preconfiguredGraphs = {
    solar: [
      // S1 - Solar Feasibility Quadrant: curtailment % vs solar score, sized by headroom
      { id: 'S1', name: 'Solar Feasibility Quadrant', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_solarscore'], legend: 'zone', size: 'headroom_capacity_substation_discharging' },
      // S2 - Headroom vs Curtailment, colored by solar score
      { id: 'S2', name: 'Headroom vs Curtailment', chartType: 'scatter', xAxis: 'headroom_capacity_substation_discharging', yAxis: ['curtailment_with_500_mw'], color: '5_year_forecast_solarscore' },
      // S3 - Solar Revenue Proxy vs Curtailment, by zone
      { id: 'S3', name: 'Solar Revenue vs Curtailment', chartType: 'scatter', xAxis: '5_year_forecast_solar_capture_lmp', yAxis: ['curtailment_with_500_mw'], legend: 'zone' },
      // S4 - Solar Revenue Proxy vs Basis
      { id: 'S4', name: 'Solar Revenue vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_basis_vs_hub_base_case', yAxis: ['5_year_forecast_solar_capture_lmp'] },
      // S5 - Curtailment Risk vs Congestion Activity
      { id: 'S5', name: 'Curtailment Risk vs Congestion', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_pct_hours_congested'] },
      // S6 - SolarScore Distribution by Zone (boxplot)
      { id: 'S6', name: 'SolarScore by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['5_year_forecast_solarscore'] },
      // S7 - Curtailment Distribution by Zone (boxplot)
      { id: 'S7', name: 'Curtailment by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['curtailment_with_500_mw'] },
      // S8 - Top-25 SolarScore Ranking (bar chart)
      { id: 'S8', name: 'Top-25 SolarScore', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_solarscore'], legend: 'zone', limit: 25 },
      // S9 - Headroom Across Scenarios (BAU, Stressed, I39)
      { id: 'S9', name: 'Headroom Scenarios', chartType: 'bar', xAxis: 'bus_name', yAxis: ['headroom_capacity_substation_discharging', 'headroom_capacity_substation_discharging_1'], limit: 15 },
      // S10 - Solar Decision Gate Table
      { id: 'S10', name: 'Solar Decision Gate', chartType: 'table', columns: ['bus_name', 'zone', 'state', 'nominal_voltage', '5_year_forecast_solarscore', 'curtailment_with_500_mw', 'headroom_capacity_substation_discharging', '5_year_forecast_basis_vs_hub_base_case', '5_year_forecast_solar_capture_lmp'] }
    ],
    wind: [
      // W1 - Wind Feasibility Quadrant: curtailment % vs wind score
      { id: 'W1', name: 'Wind Feasibility Quadrant', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_wind_capture_lmp'], legend: 'zone', size: 'headroom_capacity_substation_discharging' },
      // W2 - Wind Revenue Proxy vs Curtailment
      { id: 'W2', name: 'Wind Revenue vs Curtailment', chartType: 'scatter', xAxis: '5_year_forecast_wind_capture_lmp', yAxis: ['curtailment_with_500_mw'] },
      // W3 - Wind Revenue Proxy vs Basis
      { id: 'W3', name: 'Wind Revenue vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_basis_vs_hub_base_case', yAxis: ['5_year_forecast_wind_capture_lmp'] },
      // W4 - Curtailment Risk vs Congestion (queue pressure overlay)
      { id: 'W4', name: 'Curtailment Risk vs Congestion', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_pct_hours_congested'], size: 'existing_gen_mw' },
      // W5 - WindScore Distribution by Zone
      { id: 'W5', name: 'WindScore by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['5_year_forecast_wind_capture_lmp'] },
      // W6 - Curtailment Distribution by Zone
      { id: 'W6', name: 'Curtailment by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['curtailment_with_500_mw'] },
      // W7 - Top-25 WindScore Ranking
      { id: 'W7', name: 'Top-25 WindScore', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_wind_capture_lmp'], legend: 'zone', limit: 25 },
      // W8 - Headroom Across Scenarios (Wind candidates)
      { id: 'W8', name: 'Headroom Scenarios', chartType: 'bar', xAxis: 'bus_name', yAxis: ['headroom_capacity_substation_discharging', 'headroom_capacity_substation_discharging_1'], limit: 15 },
      // W9 - Wind Decision Gate Table
      { id: 'W9', name: 'Wind Decision Gate', chartType: 'table', columns: ['bus_name', 'zone', '5_year_forecast_wind_capture_lmp', 'curtailment_with_500_mw', '5_year_forecast_pct_hours_congested', '5_year_forecast_basis_vs_hub_base_case', 'existing_gen_mw'] }
    ],
    storage: [
      // ST1 - Arbitrage Spread vs Negative Hours (Primary storage graph)
      { id: 'ST1', name: 'Arbitrage Spread vs Negative Hours', chartType: 'scatter', xAxis: '5_year_forecast_tb4_avg', yAxis: ['5_year_forecast_hours_lmp_lt_0'], color: '5_year_forecast_storagescore' },
      // ST2 - On-peak vs Off-peak LMP (arbitrage spread sizing)
      { id: 'ST2', name: 'On-peak vs Off-peak LMP', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_lowest_5pct', yAxis: ['5_year_forecast_avg_lmp_base_case'], size: '5_year_forecast_tb4_avg' },
      // ST3 - Volatility vs Negative-price Opportunity
      { id: 'ST3', name: 'Volatility vs Negative-price', chartType: 'scatter', xAxis: '5_year_forecast_lmp_stddev', yAxis: ['5_year_forecast_pct_hours_lt_0'] },
      // ST4 - Negative-price Opportunity vs Congestion
      { id: 'ST4', name: 'Negative-price vs Congestion', chartType: 'scatter', xAxis: '5_year_forecast_pct_hours_lt_0', yAxis: ['5_year_forecast_pct_hours_congested'] },
      // ST5 - StorageScore vs Arbitrage Spread
      { id: 'ST5', name: 'StorageScore vs Arbitrage', chartType: 'scatter', xAxis: '5_year_forecast_tb4_avg', yAxis: ['5_year_forecast_storagescore'] },
      // ST6 - StorageScore vs Curtailment (co-location readiness)
      { id: 'ST6', name: 'StorageScore vs Curtailment', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_storagescore'], size: 'headroom_capacity_substation_discharging' },
      // ST7 - Basis vs StorageScore
      { id: 'ST7', name: 'Basis vs StorageScore', chartType: 'scatter', xAxis: '5_year_forecast_basis_vs_hub_base_case', yAxis: ['5_year_forecast_storagescore'] },
      // ST8 - Headroom vs Congestion
      { id: 'ST8', name: 'Headroom vs Congestion', chartType: 'scatter', xAxis: 'headroom_capacity_substation_discharging', yAxis: ['5_year_forecast_pct_hours_congested'] },
      // ST9 - Arbitrage Spread Distribution by Zone
      { id: 'ST9', name: 'Arbitrage by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['5_year_forecast_tb4_avg'] },
      // ST10 - Top-25 StorageScore Ranking
      { id: 'ST10', name: 'Top-25 StorageScore', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_storagescore'], limit: 25 },
      // ST11 - Storage Decision Gate Table
      { id: 'ST11', name: 'Storage Decision Gate', chartType: 'table', columns: ['bus_name', 'zone', '5_year_forecast_storagescore', '5_year_forecast_tb4_avg', '5_year_forecast_hours_lmp_lt_0', 'headroom_capacity_substation_discharging', '5_year_forecast_lmp_stddev', '5_year_forecast_pct_hours_lt_0', '5_year_forecast_pct_hours_congested'] }
    ],
    datacenter: [
      // DC1 - Price Stability vs Headroom Robustness (Primary)
      { id: 'DC1', name: 'Price Stability vs Headroom', chartType: 'scatter', xAxis: '5_year_forecast_lmp_stddev', yAxis: ['headroom_capacity_substation_discharging_1'], color: '5_year_forecast_loadscore' },
      // DC2 - DataCenterScore vs Basis
      { id: 'DC2', name: 'DataCenterScore vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_basis_vs_hub_base_case', yAxis: ['5_year_forecast_loadscore'] },
      // DC3 - DataCenterScore vs Queue MW Radius
      { id: 'DC3', name: 'DataCenterScore vs Queue MW', chartType: 'scatter', xAxis: 'existing_gen_mw', yAxis: ['5_year_forecast_loadscore'] },
      // DC4 - Queue Competitiveness vs DataCenterScore
      { id: 'DC4', name: 'Queue Competitiveness', chartType: 'scatter', xAxis: 'existing_gen_capacity_mw', yAxis: ['5_year_forecast_loadscore'] },
      // DC5 - Congestion vs DataCenterScore (queue overlay)
      { id: 'DC5', name: 'Congestion vs DataCenterScore', chartType: 'scatter', xAxis: '5_year_forecast_pct_hours_congested', yAxis: ['5_year_forecast_loadscore'], size: 'existing_gen_mw' },
      // DC6 - Expansion Readiness (Scale lens)
      { id: 'DC6', name: 'Expansion Readiness', chartType: 'scatter', xAxis: 'headroom_capacity_substation_discharging', yAxis: ['existing_gen_mw'] },
      // DC7 - Avg DataCenterScore by Zone
      { id: 'DC7', name: 'Avg DataCenterScore by Zone', chartType: 'bar', xAxis: 'zone', yAxis: ['5_year_forecast_loadscore'], aggregation: 'mean' },
      // DC8 - Top-25 DataCenterScore Ranking
      { id: 'DC8', name: 'Top-25 DataCenterScore', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_loadscore'], limit: 25 },
      // DC9 - Data Center Readiness Gate Table
      { id: 'DC9', name: 'Data Center Readiness Gate', chartType: 'table', columns: ['bus_name', 'zone', '5_year_forecast_loadscore', '5_year_forecast_lmp_stddev', 'headroom_capacity_substation_discharging_1', 'headroom_capacity_substation_discharging', '5_year_forecast_basis_vs_hub_base_case', 'existing_gen_mw'] }
    ]
  };
  
  const lmpGraphs = [
    // LMP1 - Avg LMP vs Basis
    { id: 'LMP1', name: 'Avg LMP vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_base_case', yAxis: ['5_year_forecast_basis_vs_hub_base_case'] },
    // LMP2 - Volatility vs Avg LMP
    { id: 'LMP2', name: 'Volatility vs Avg LMP', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_base_case', yAxis: ['5_year_forecast_lmp_stddev'] },
    // LMP3 - Negative-price Opportunity vs Avg LMP
    { id: 'LMP3', name: 'Negative-price vs Avg LMP', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_base_case', yAxis: ['5_year_forecast_pct_hours_lt_0'] },
    // LMP4 - Hours LMP<0 vs Avg LMP
    { id: 'LMP4', name: 'Hours LMP<0 vs Avg LMP', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_base_case', yAxis: ['5_year_forecast_hours_lmp_lt_0'] },
    // LMP5 - Congestion vs Basis (Curtailment overlay)
    { id: 'LMP5', name: 'Congestion vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_pct_hours_congested', yAxis: ['5_year_forecast_basis_vs_hub_base_case'], size: 'curtailment_with_500_mw' },
    // LMP6 - On-peak vs Off-peak (volatility size)
    { id: 'LMP6', name: 'On-peak vs Off-peak', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_lowest_5pct', yAxis: ['5_year_forecast_avg_lmp_base_case'], size: '5_year_forecast_lmp_stddev' },
    // LMP7 - Avg LMP by Zone
    { id: 'LMP7', name: 'Avg LMP by Zone', chartType: 'bar', xAxis: 'zone', yAxis: ['5_year_forecast_avg_lmp_base_case'], aggregation: 'mean' },
    // LMP8 - Basis Distribution by Zone
    { id: 'LMP8', name: 'Basis Distribution by Zone', chartType: 'box-plot', xAxis: 'zone', yAxis: ['5_year_forecast_basis_vs_hub_base_case'] },
    // LMP9 - Merchant Risk Envelope (LMP, volatility, basis)
    { id: 'LMP9', name: 'Merchant Risk Envelope', chartType: 'scatter', xAxis: '5_year_forecast_avg_lmp_base_case', yAxis: ['5_year_forecast_lmp_stddev'], size: '5_year_forecast_basis_vs_hub_base_case', legend: 'zone' }
  ];
  
  const busScoreGraphs = [
    // BS1 - Tech Score Comparison (multi-series bar)
    { id: 'BS1', name: 'Tech Score Comparison', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_solarscore', '5_year_forecast_wind_capture_lmp', '5_year_forecast_storagescore', '5_year_forecast_loadscore'], limit: 15 },
    // BS2 - HybridScore vs SolarScore
    { id: 'BS2', name: 'HybridScore vs SolarScore', chartType: 'scatter', xAxis: '5_year_forecast_solarscore', yAxis: ['5_year_forecast_storagescore'] },
    // BS3 - HybridScore vs StorageScore
    { id: 'BS3', name: 'HybridScore vs StorageScore', chartType: 'scatter', xAxis: '5_year_forecast_storagescore', yAxis: ['5_year_forecast_solarscore'] },
    // BS4 - Score vs Headroom Robustness
    { id: 'BS4', name: 'Score vs Headroom Robustness', chartType: 'scatter', xAxis: 'headroom_capacity_substation_discharging_1', yAxis: ['5_year_forecast_solarscore'] },
    // BS5 - Score vs Curtailment
    { id: 'BS5', name: 'Score vs Curtailment', chartType: 'scatter', xAxis: 'curtailment_with_500_mw', yAxis: ['5_year_forecast_solarscore'] },
    // BS6 - Score vs Basis
    { id: 'BS6', name: 'Score vs Basis', chartType: 'scatter', xAxis: '5_year_forecast_basis_vs_hub_base_case', yAxis: ['5_year_forecast_solarscore'] },
    // BS7 - Score vs Upgradeability
    { id: 'BS7', name: 'Score vs Upgradeability', chartType: 'scatter', xAxis: 'headroom_capacity_substation_charging_1', yAxis: ['5_year_forecast_solarscore'] },
    // BS8 - Composite Score Ranking (top 25 solar scores)
    { id: 'BS8', name: 'Composite Score Ranking', chartType: 'bar', xAxis: 'bus_name', yAxis: ['5_year_forecast_solarscore'], limit: 25 },
    // BS9 - Go/No-Go Matrix Table
    { id: 'BS9', name: 'Go/No-Go Matrix', chartType: 'table', columns: ['bus_name', 'zone', '5_year_forecast_solarscore', '5_year_forecast_wind_capture_lmp', '5_year_forecast_storagescore', '5_year_forecast_loadscore'] }
  ];
  
  // Get available quick graphs based on current tab
  const getQuickGraphs = () => {
    if (activeFuelTab === 'LMP Analytics') return lmpGraphs;
    if (activeFuelTab === 'Bus Score Analytics') return busScoreGraphs;
    
    // Resource analytics - check fuel type
    const fuelMap = {
      'Solar': preconfiguredGraphs.solar,
      'Wind': preconfiguredGraphs.wind,
      'Storage': preconfiguredGraphs.storage,
      'Data Center': preconfiguredGraphs.datacenter
    };
    return fuelMap[activeFuelTab] || [];
  };
  
  // Get real data from database based on configuration
  const getRealData = (config) => {
    if (!config || !config.xAxis || config.primaryYAxis.length === 0) {
      return [];
    }
    
    if (!databaseData || !databaseData.buses || !Array.isArray(databaseData.buses) || databaseData.buses.length === 0) {
      return [];
    }
    
  // Use buses data as the primary source from gridsense_iso_ne_sample.db (which contains econ table data)
    const sourceData = databaseData.buses;
    
    // Field mapping is no longer needed - we use exact econ table column names
    // All quick graphs are configured with actual database column names
    
    // Direct property access with type conversion (used for all chart types)
    const getValue = (row, fieldId) => {
      let value = row[fieldId];
      // Convert string numbers to actual numbers
      if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        value = parseFloat(value);
      }
      return value;
    };
    
    // For scatter plots, box plots, table charts, and bar charts with unique identifiers (bus_name, bus_id), return raw data without aggregation
    const uniqueIdentifiers = ['bus_name', 'bus_id', 'substation_name'];
    const isUniqueXAxis = uniqueIdentifiers.includes(config.xAxis.id);
    const shouldReturnRawData = config.chartType === 'scatter' || 
                                config.chartType === 'box-plot' || 
                                config.chartType === 'table' || 
                                config.chartType === 'bubble' ||
                                (config.chartType === 'bar' && isUniqueXAxis);
    
    console.log('🔍 getRealData config:', {
      chartType: config.chartType,
      xAxisId: config.xAxis.id,
      yAxisFields: config.primaryYAxis.map(f => f.id),
      isUniqueXAxis,
      shouldReturnRawData,
      sourceDataRows: sourceData.length
    });
    
    if (shouldReturnRawData) {
      // Map data directly from database rows
      const rawData = sourceData.map((row, index) => {
        const dataPoint = {}; 
        // Add x-axis field - if NULL, use bus_name or index as fallback
        let xVal = getValue(row, config.xAxis.id);
        if (xVal === null || xVal === undefined || xVal === '') {
          // Fallback to bus_name if x-axis is NULL
          xVal = row.bus_name || `Bus ${index + 1}`;
        }
        dataPoint[config.xAxis.id] = xVal;
        
        // Add all y-axis fields
        config.primaryYAxis.forEach(field => {
          dataPoint[field.id] = getValue(row, field.id);
        });
        // Add any additional fields that might be used for color, size, etc.
        if (config.legend) {
          const legendFieldId = typeof config.legend === 'string' ? config.legend : (config.legend?.id || config.legend?.name);
          if (legendFieldId) dataPoint[legendFieldId] = getValue(row, legendFieldId);
        }
        if (config.color) {
          const colorFieldId = typeof config.color === 'string' ? config.color : (config.color?.id || config.color?.name);
          if (colorFieldId) dataPoint[colorFieldId] = getValue(row, colorFieldId);
        }
        if (config.size) {
          const sizeFieldId = typeof config.size === 'string' ? config.size : (config.size?.id || config.size?.name);
          if (sizeFieldId) dataPoint[sizeFieldId] = getValue(row, sizeFieldId);
        }
        // ALWAYS add 'zone' field for scatter plots (common color field)
        if (config.chartType === 'scatter' && row.zone) {
          dataPoint.zone = row.zone;
        }
        // Add category for display (use x-axis value or bus_name)
        dataPoint.category = row.bus_name || xVal || 'Unknown';
        return dataPoint;
      });
      
      // RELAXED FILTER - only require at least ONE y-axis to have a valid numeric value
      // X-axis is always populated (fallback to bus_name), so we only check Y values
      const filteredData = rawData.filter(row => {
        // At least ONE y-axis field must have a valid numeric value
        const hasValidY = config.primaryYAxis.some(f => {
          const yValue = row[f.id];
          return typeof yValue === 'number' && !isNaN(yValue) && yValue !== null;
        });
        
        return hasValidY;
      });
      
      // Log data processing details
      console.log('📊 Raw data processing:', {
        rawDataRows: rawData.length,
        filteredDataRows: filteredData.length,
        sampleRawRow: rawData[0],
        sampleFilteredRow: filteredData[0]
      });
      
      if (filteredData.length === 0) {
        console.warn('⚠️ No data available for chart:', {
          chartType: config.chartType,
          xAxis: config.xAxis.id,
          yAxis: config.primaryYAxis.map(f => f.id),
          totalRows: sourceData.length,
          sampleRawData: rawData.slice(0, 3)
        });
      }
      
      // Apply limit for top N results (for bar charts with raw data)
      if (config.limit && config.chartType === 'bar' && filteredData.length > 0) {
        // Sort by the first primary Y-axis field in descending order
        const sortField = config.primaryYAxis[0].id;
        filteredData.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
        const limitedData = filteredData.slice(0, config.limit);
        console.log(`✂️ Applied limit of ${config.limit} to raw data, showing top ${limitedData.length} of ${filteredData.length} results`);
        return limitedData;
      }
      
      console.log('📊 Returning raw data:', filteredData.length, 'rows');
      return filteredData;
    }
    
    // For other chart types (bar, line, pie, area), aggregate data by x-axis
    const groupedData = {};
    sourceData.forEach(row => {
      const xValue = getValue(row, config.xAxis.id) || 'Unknown';
      if (!groupedData[xValue]) {
        groupedData[xValue] = [];
      }
      groupedData[xValue].push(row);
    });
    
    // Aggregate data based on configuration
    let aggregatedData = Object.keys(groupedData).map(xValue => {
      const dataPoint = { category: xValue };
      
      // Calculate primary Y-axis values
      config.primaryYAxis.forEach(field => {
        const values = groupedData[xValue]
          .map(row => parseFloat(getValue(row, field.id)) || 0)
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
    
    // Apply limit for top N results (for bar charts with aggregated data)
    if (config.limit && config.chartType === 'bar' && aggregatedData.length > 0) {
      // Sort by the first primary Y-axis field in descending order
      const sortField = config.primaryYAxis[0].id;
      aggregatedData.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
      aggregatedData = aggregatedData.slice(0, config.limit);
      console.log(`✂️ Applied limit of ${config.limit}, showing top ${aggregatedData.length} results`);
    }
    
    console.log('📈 Final data count:', aggregatedData.length);
    return aggregatedData;
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
    // Task 1: Use filtered data if available, otherwise fetch from database
    const data = config._filteredData || getRealData(config);
    const chartType = config.chartType;
    
    console.log('📈 Render chart:', {
      panelId: panel.id,
      chartType,
      dataRows: data?.length || 0,
      xAxis: config.xAxis?.name,
      yAxis: config.primaryYAxis?.map(f => f.name),
      sampleData: data?.[0]
    });
    
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
    
    if (!data || data.length === 0) {
      return (
        <div className="panel-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <p>No data available</p>
          <small style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
            Check field mappings
          </small>
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
    
    // Helper function to get value from data row
    const getValue = (row, fieldId) => {
      let value = row[fieldId];
      // Convert string numbers to actual numbers
      if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        value = parseFloat(value);
      }
      return value;
    };
    
    // Bar Chart
    if (chartType === 'bar') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      
      console.log('📊 Bar chart data analysis:', {
        dataRows: data.length,
        maxValue,
        sampleValues: data.slice(0, 3).map(d => ({
          category: d[config.xAxis.id],
          values: config.primaryYAxis.map(f => ({
            field: f.id,
            value: d[f.id],
            type: typeof d[f.id]
          }))
        })),
        allYValues: data.flatMap(d => config.primaryYAxis.map(f => d[f.id]))
      });
      
      const chartHeight = 200;
      const chartWidth = 450;
      const barWidth = chartWidth / (data.length * config.primaryYAxis.length + data.length + 1);
      const padding = { top: 20, right: 40, bottom: 60, left: 60 }; // INCREASED bottom padding for rotated labels
      
      // Check if we have filtered data for comparison/highlighting
      const hasFilter = config._highlightValue;
      
      // TASK 2: Smart x-axis label sampling based on data density
      const maxLabelsToShow = 20; // Show max 20 labels
      const labelInterval = Math.max(1, Math.ceil(data.length / maxLabelsToShow));
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* TASK 3: Grid lines - Y-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
                opacity="0.7"
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
          
          {/* TASK 3: Grid lines - X-axis vertical lines */}
          {data.map((d, i) => (
            <line 
              key={`xgrid-${i}`}
              x1={padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (config.primaryYAxis.length * barWidth) / 2}
              y1={padding.top}
              x2={padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (config.primaryYAxis.length * barWidth) / 2}
              y2={padding.top + chartHeight}
              stroke="#f3f4f6"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
          
          {/* Bars */}
          {data.map((d, i) => {
            // Check if this bar matches the filter
            const isHighlighted = hasFilter && Object.values(d).some(val => 
              String(val).toLowerCase().includes(config._highlightValue.toLowerCase())
            );
            
            // Get color based on legend field
            const zoneColors = {
              'CT': '#3b82f6',
              'ISO-NE': '#06b6d4',
              'MA': '#ef4444',
              'ME': '#10b981',
              'NH': '#14b8a6',
              'RI': '#f59e0b',
              'VT': '#f97316'
            };
            const legendValue = config.legend ? d[config.legend] : null;
            const barColor = legendValue ? (zoneColors[legendValue] || colorPalette[i % colorPalette.length]) : colorPalette[i % colorPalette.length];
            
            return (
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
                        fill={isHighlighted ? "#ef4444" : barColor}
                        rx="2"
                        opacity={isHighlighted ? "1" : hasFilter ? "0.4" : "1"}
                        stroke={isHighlighted ? "#fca5a5" : "none"}
                        strokeWidth={isHighlighted ? "2" : "0"}
                      />
                      {config.showDataLabels && (
                        <text
                          x={x + barWidth * 0.4}
                          y={y - 5}
                          textAnchor="middle"
                          fontSize="9"
                          fill={isHighlighted ? "#dc2626" : "#374151"}
                          fontWeight={isHighlighted ? "700" : "500"}
                        >
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* TASK 2: Rotated X-axis labels with smart sampling */}
                {(i % labelInterval === 0 || i === data.length - 1) && (
                  <text
                    x={padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (config.primaryYAxis.length * barWidth) / 2}
                    y={padding.top + chartHeight + 15}
                    textAnchor="end"
                    fontSize="9"
                    fill={isHighlighted ? "#dc2626" : "#374151"}
                    fontWeight={isHighlighted ? "700" : "400"}
                    transform={`rotate(-45 ${padding.left + (i * (config.primaryYAxis.length * barWidth + barWidth)) + (config.primaryYAxis.length * barWidth) / 2} ${padding.top + chartHeight + 15})`}
                  >
                    {String(d.category).length > 25 ? String(d.category).substring(0, 22) + '...' : d.category}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 55} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {config.xAxis.name}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {config.primaryYAxis[0].name}
          </text>
          
          {/* Legend */}
          {config.legend && (() => {
            const colorField = typeof config.legend === 'string' ? config.legend : config.legend.id;
            if (!colorField || !data.length) return null;
            
            const legendCategories = [...new Set(data.map(d => d[colorField]))].filter(Boolean);
            if (legendCategories.length === 0) return null;
            
            const zoneColors = {
              'CT': '#3b82f6',
              'ISO-NE': '#06b6d4',
              'MA': '#ef4444',
              'ME': '#10b981',
              'NH': '#14b8a6',
              'RI': '#f59e0b',
              'VT': '#f97316'
            };
            const isNumericLegend = !isNaN(parseFloat(legendCategories[0]));
            const fieldLabel = typeof colorField === 'string' ? colorField.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Legend';
            
            if (isNumericLegend) {
              // Gradient legend for numeric values
              const minVal = Math.min(...legendCategories.map(c => parseFloat(c)));
              const maxVal = Math.max(...legendCategories.map(c => parseFloat(c)));
              
              return (
                <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top})`}>
                  <text x="0" y="0" fontSize="11" fill="#1f2937" fontWeight="600">
                    {fieldLabel}
                  </text>
                  <defs>
                    <linearGradient id={`bar-legend-gradient-${config.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="10" width="20" height="100" fill={`url(#bar-legend-gradient-${config.id})`} stroke="#d1d5db" strokeWidth="1" rx="2" />
                  <text x="25" y="15" fontSize="10" fill="#6b7280">{maxVal.toFixed(2)}</text>
                  <text x="25" y="115" fontSize="10" fill="#6b7280">{minVal.toFixed(2)}</text>
                </g>
              );
            } else {
              // Categorical legend for zone colors
              return (
                <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top})`}>
                  <text x="0" y="0" fontSize="11" fill="#1f2937" fontWeight="600">
                    {fieldLabel}
                  </text>
                  {legendCategories.map((category, i) => (
                    <g key={category} transform={`translate(0, ${15 + i * 25})`}>
                      <circle cx="10" cy="10" r="6" fill={zoneColors[category] || colorPalette[i % colorPalette.length]} />
                      <text x="25" y="15" fontSize="11" fill="#374151">{category}</text>
                    </g>
                  ))}
                </g>
              );
            }
          })()}
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
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* TASK 3: Grid lines - Always visible */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
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
        <svg width="100%" height="100%" viewBox="0 0 500 280" preserveAspectRatio="xMidYMid meet">
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
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
    
    // Area + Line Combined Chart
    if (chartType === 'area-line') {
      const allYFields = [...config.primaryYAxis, ...(config.secondaryYAxis || [])];
      const maxValue = Math.max(...data.flatMap(d => 
        allYFields.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const pointSpacing = chartWidth / (data.length - 1);
      
      // Split fields: first half as areas, second half as lines
      const areaFields = config.primaryYAxis.slice(0, Math.ceil(config.primaryYAxis.length / 2));
      const lineFields = [...config.primaryYAxis.slice(Math.ceil(config.primaryYAxis.length / 2)), ...(config.secondaryYAxis || [])];
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {areaFields.map((field, j) => (
              <linearGradient key={field.id} id={`gradient-${panel.id}-${j}`} x1="0" x2="0" y1="0" y2="1">
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
          {areaFields.map((field, j) => {
            const points = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              const value = d[field.id] || 0;
              const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            
            const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${points} L ${padding.left + (data.length - 1) * pointSpacing},${padding.top + chartHeight} Z`;
            
            return (
              <g key={field.id}>
                <path
                  d={areaPath}
                  fill={`url(#gradient-${panel.id}-${j})`}
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
          
          {/* Lines */}
          {lineFields.map((field, j) => {
            const colorIndex = areaFields.length + j;
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
                  stroke={colorPalette[colorIndex % colorPalette.length]}
                  strokeWidth="2"
                />
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={colorPalette[colorIndex % colorPalette.length]}
                    />
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
        </svg>
      );
    }
    
    // Scatter Chart - OLD VERSION (DISABLED - using enhanced version below with legends)
    if (false && chartType === 'scatter') {
      // Calculate x and y ranges separately for scatter plots
      const xValues = data.map(d => getValue(d, config.xAxis.id) || 0).filter(v => typeof v === 'number' && !isNaN(v));
      const yValues = data.flatMap(d => 
        config.primaryYAxis.map(f => getValue(d, f.id) || 0).filter(v => typeof v === 'number' && !isNaN(v))
      );
      
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 60, left: 60 };
      
      // TASK 2: Smart x-axis label sampling
      const maxLabelsToShow = 15;
      const labelInterval = Math.max(1, Math.ceil(data.length / maxLabelsToShow));
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* TASK 3: Grid lines - Y-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={`ygrid-${i}`}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
                opacity="0.7"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {(minY + (maxY - minY) * (1 - ratio)).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* TASK 3: Grid lines - X-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={`xgrid-${i}`}>
              <line 
                x1={padding.left + chartWidth * ratio}
                y1={padding.top}
                x2={padding.left + chartWidth * ratio}
                y2={padding.top + chartHeight}
                stroke="#f3f4f6"
                strokeWidth="1"
                opacity="0.5"
              />
              <text 
                x={padding.left + chartWidth * ratio}
                y={padding.top + chartHeight + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {(minX + (maxX - minX) * ratio).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* Scatter points */}
          {config.primaryYAxis.map((field, j) => (
            <g key={field.id}>
              {data.map((d, i) => {
                const xVal = getValue(d, config.xAxis.id) || 0;
                const yVal = getValue(d, field.id) || 0;
                
                // Skip invalid points
                if (typeof xVal !== 'number' || typeof yVal !== 'number' || isNaN(xVal) || isNaN(yVal)) {
                  return null;
                }
                
                const x = padding.left + ((xVal - minX) / (maxX - minX)) * chartWidth;
                const y = padding.top + chartHeight - ((yVal - minY) / (maxY - minY)) * chartHeight;
                
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="5"
                    fill={colorPalette[j % colorPalette.length]}
                    opacity="0.7"
                    stroke="white"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          ))}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 55} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {config.xAxis.name}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {config.primaryYAxis[0].name}
          </text>
        </svg>
      );
    }
    
    // Line + Bar Combined Chart (and 'combo')
    if (chartType === 'line-bar' || chartType === 'combo') {
      const allYFields = [...config.primaryYAxis, ...(config.secondaryYAxis || [])];
      const maxValue = Math.max(...data.flatMap(d => 
        allYFields.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const barWidth = (chartWidth / data.length) * 0.6;
      const pointSpacing = chartWidth / (data.length - 1);
      
      const barFields = config.primaryYAxis.slice(0, Math.ceil(config.primaryYAxis.length / 2));
      const lineFields = [...config.primaryYAxis.slice(Math.ceil(config.primaryYAxis.length / 2)), ...(config.secondaryYAxis || [])];
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
          {data.map((d, i) => {
            const xBase = padding.left + (i * chartWidth) / data.length;
            return (
              <g key={i}>
                {barFields.map((field, j) => {
                  const value = d[field.id] || 0;
                  const barHeight = (value / maxValue) * chartHeight;
                  const xOffset = j * (barWidth / barFields.length);
                  return (
                    <rect
                      key={field.id}
                      x={xBase + xOffset}
                      y={padding.top + chartHeight - barHeight}
                      width={barWidth / barFields.length}
                      height={barHeight}
                      fill={colorPalette[j % colorPalette.length]}
                      opacity="0.8"
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* Lines */}
          {lineFields.map((field, j) => {
            const colorIndex = barFields.length + j;
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
                  stroke={colorPalette[colorIndex % colorPalette.length]}
                  strokeWidth="2.5"
                />
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={colorPalette[colorIndex % colorPalette.length]}
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + (i * chartWidth) / data.length + barWidth / 2}
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
    
    // Line + Area Combined Chart
    if (chartType === 'line-area') {
      const allYFields = [...config.primaryYAxis, ...(config.secondaryYAxis || [])];
      const maxValue = Math.max(...data.flatMap(d => 
        allYFields.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const pointSpacing = chartWidth / (data.length - 1);
      
      const lineFields = config.primaryYAxis.slice(0, Math.ceil(config.primaryYAxis.length / 2));
      const areaFields = [...config.primaryYAxis.slice(Math.ceil(config.primaryYAxis.length / 2)), ...(config.secondaryYAxis || [])];
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {areaFields.map((field, j) => (
              <linearGradient key={field.id} id={`gradient-la-${panel.id}-${j}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorPalette[(lineFields.length + j) % colorPalette.length]} stopOpacity="0.6" />
                <stop offset="100%" stopColor={colorPalette[(lineFields.length + j) % colorPalette.length]} stopOpacity="0.1" />
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
          {areaFields.map((field, j) => {
            const colorIndex = lineFields.length + j;
            const points = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              const value = d[field.id] || 0;
              const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            
            const areaPath = `M ${padding.left},${padding.top + chartHeight} L ${points} L ${padding.left + (data.length - 1) * pointSpacing},${padding.top + chartHeight} Z`;
            
            return (
              <g key={field.id}>
                <path
                  d={areaPath}
                  fill={`url(#gradient-la-${panel.id}-${j})`}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={colorPalette[colorIndex % colorPalette.length]}
                  strokeWidth="2"
                />
              </g>
            );
          })}
          
          {/* Lines */}
          {lineFields.map((field, j) => {
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
                />
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={colorPalette[j % colorPalette.length]}
                    />
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
        </svg>
      );
    }
    
    // Bar + Scatter Combined Chart
    if (chartType === 'bar-scatter') {
      const allYFields = [...config.primaryYAxis, ...(config.secondaryYAxis || [])];
      const maxValue = Math.max(...data.flatMap(d => 
        allYFields.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const barWidth = (chartWidth / data.length) * 0.6;
      const pointSpacing = chartWidth / (data.length - 1);
      
      const barFields = config.primaryYAxis.slice(0, Math.ceil(config.primaryYAxis.length / 2));
      const scatterFields = [...config.primaryYAxis.slice(Math.ceil(config.primaryYAxis.length / 2)), ...(config.secondaryYAxis || [])];
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
          {data.map((d, i) => {
            const xBase = padding.left + (i * chartWidth) / data.length;
            return (
              <g key={i}>
                {barFields.map((field, j) => {
                  const value = d[field.id] || 0;
                  const barHeight = (value / maxValue) * chartHeight;
                  const xOffset = j * (barWidth / barFields.length);
                  return (
                    <rect
                      key={field.id}
                      x={xBase + xOffset}
                      y={padding.top + chartHeight - barHeight}
                      width={barWidth / barFields.length}
                      height={barHeight}
                      fill={colorPalette[j % colorPalette.length]}
                      opacity="0.8"
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* Scatter points */}
          {scatterFields.map((field, j) => {
            const colorIndex = barFields.length + j;
            return (
              <g key={field.id}>
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="5"
                      fill={colorPalette[colorIndex % colorPalette.length]}
                      opacity="0.7"
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + (i * chartWidth) / data.length + barWidth / 2}
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
    
    // Stacked Bar Chart
    if (chartType === 'stacked-bar') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const barWidth = (chartWidth / data.length) * 0.7;
      
      // Calculate stacked totals
      const maxTotal = Math.max(...data.map(d => 
        config.primaryYAxis.reduce((sum, field) => sum + (d[field.id] || 0), 0)
      ));
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
                {Math.round(maxTotal * (1 - ratio))}
              </text>
            </g>
          ))}
          
          {/* Stacked bars */}
          {data.map((d, i) => {
            const xBase = padding.left + (i * chartWidth) / data.length + (chartWidth / data.length - barWidth) / 2;
            let cumulativeHeight = 0;
            
            return (
              <g key={i}>
                {config.primaryYAxis.map((field, j) => {
                  const value = d[field.id] || 0;
                  const segmentHeight = (value / maxTotal) * chartHeight;
                  const rect = (
                    <rect
                      key={field.id}
                      x={xBase}
                      y={padding.top + chartHeight - cumulativeHeight - segmentHeight}
                      width={barWidth}
                      height={segmentHeight}
                      fill={colorPalette[j % colorPalette.length]}
                      opacity="0.85"
                    />
                  );
                  cumulativeHeight += segmentHeight;
                  return rect;
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + (i * chartWidth) / data.length + (chartWidth / data.length) / 2}
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
    
    // Stacked Area Chart
    if (chartType === 'stacked-area') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const pointSpacing = chartWidth / (data.length - 1);
      
      // Calculate stacked totals
      const maxTotal = Math.max(...data.map(d => 
        config.primaryYAxis.reduce((sum, field) => sum + (d[field.id] || 0), 0)
      ));
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {config.primaryYAxis.map((field, j) => (
              <linearGradient key={field.id} id={`gradient-sa-${panel.id}-${j}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={colorPalette[j % colorPalette.length]} stopOpacity="0.7" />
                <stop offset="100%" stopColor={colorPalette[j % colorPalette.length]} stopOpacity="0.3" />
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
                {Math.round(maxTotal * (1 - ratio))}
              </text>
            </g>
          ))}
          
          {/* Stacked areas */}
          {config.primaryYAxis.map((field, j) => {
            const points = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              // Calculate cumulative value up to this field
              let cumulativeValue = 0;
              for (let k = 0; k <= j; k++) {
                cumulativeValue += d[config.primaryYAxis[k].id] || 0;
              }
              const y = padding.top + chartHeight - (cumulativeValue / maxTotal) * chartHeight;
              return `${x},${y}`;
            }).join(' ');
            
            // Bottom line (previous layer or baseline)
            const bottomPoints = data.map((d, i) => {
              const x = padding.left + i * pointSpacing;
              let cumulativeValue = 0;
              for (let k = 0; k < j; k++) {
                cumulativeValue += d[config.primaryYAxis[k].id] || 0;
              }
              const y = padding.top + chartHeight - (cumulativeValue / maxTotal) * chartHeight;
              return `${x},${y}`;
            }).reverse().join(' ');
            
            const areaPath = `M ${points} L ${bottomPoints} Z`;
            
            return (
              <path
                key={field.id}
                d={areaPath}
                fill={`url(#gradient-sa-${panel.id}-${j})`}
                stroke={colorPalette[j % colorPalette.length]}
                strokeWidth="1"
              />
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
    
    // Stacked Bar + Line Combined Chart
    if (chartType === 'stacked-bar-line') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const barWidth = (chartWidth / data.length) * 0.6;
      const pointSpacing = chartWidth / (data.length - 1);
      
      const barFields = config.primaryYAxis.slice(0, Math.ceil(config.primaryYAxis.length / 2));
      const lineFields = [...config.primaryYAxis.slice(Math.ceil(config.primaryYAxis.length / 2)), ...(config.secondaryYAxis || [])];
      
      const maxStackedValue = Math.max(...data.map(d => 
        barFields.reduce((sum, field) => sum + (d[field.id] || 0), 0)
      ));
      const maxLineValue = Math.max(...data.flatMap(d => 
        lineFields.map(f => d[f.id] || 0)
      ));
      const maxValue = Math.max(maxStackedValue, maxLineValue);
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
          
          {/* Stacked bars */}
          {data.map((d, i) => {
            const xBase = padding.left + (i * chartWidth) / data.length + (chartWidth / data.length - barWidth) / 2;
            let cumulativeHeight = 0;
            
            return (
              <g key={i}>
                {barFields.map((field, j) => {
                  const value = d[field.id] || 0;
                  const segmentHeight = (value / maxValue) * chartHeight;
                  const rect = (
                    <rect
                      key={field.id}
                      x={xBase}
                      y={padding.top + chartHeight - cumulativeHeight - segmentHeight}
                      width={barWidth}
                      height={segmentHeight}
                      fill={colorPalette[j % colorPalette.length]}
                      opacity="0.75"
                    />
                  );
                  cumulativeHeight += segmentHeight;
                  return rect;
                })}
              </g>
            );
          })}
          
          {/* Lines */}
          {lineFields.map((field, j) => {
            const colorIndex = barFields.length + j;
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
                  stroke={colorPalette[colorIndex % colorPalette.length]}
                  strokeWidth="2.5"
                />
                {data.map((d, i) => {
                  const x = padding.left + i * pointSpacing;
                  const value = d[field.id] || 0;
                  const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={colorPalette[colorIndex % colorPalette.length]}
                    />
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + (i * chartWidth) / data.length + (chartWidth / data.length) / 2}
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
    
    // Horizontal Bar Chart
    if (chartType === 'horizontal-bar') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 20, left: 80 };
      const barHeight = (chartHeight / data.length) * 0.7;
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {config.showGridLines && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line 
              key={i}
              x1={padding.left + chartWidth * ratio} 
              y1={padding.top}
              x2={padding.left + chartWidth * ratio} 
              y2={padding.top + chartHeight}
              stroke="#e5e7eb" 
              strokeWidth="1"
            />
          ))}
          
          {/* Bars */}
          {data.map((d, i) => {
            const yBase = padding.top + (i * chartHeight) / data.length;
            return (
              <g key={i}>
                {config.primaryYAxis.map((field, j) => {
                  const value = d[field.id] || 0;
                  const barWidth = (value / maxValue) * chartWidth;
                  const yOffset = j * (barHeight / config.primaryYAxis.length);
                  return (
                    <rect
                      key={field.id}
                      x={padding.left}
                      y={yBase + yOffset + (chartHeight / data.length - barHeight) / 2}
                      width={barWidth}
                      height={barHeight / config.primaryYAxis.length}
                      fill={colorPalette[j % colorPalette.length]}
                      opacity="0.85"
                    />
                  );
                })}
                {/* Y-axis labels (categories) */}
                <text
                  x={padding.left - 10}
                  y={yBase + (chartHeight / data.length) / 2 + 5}
                  textAnchor="end"
                  fontSize="11"
                  fill="#374151"
                >
                  {d.category}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Heatmap Chart
    if (chartType === 'heatmap') {
      const chartHeight = 250;
      const chartWidth = 450;
      const padding = { top: 40, right: 60, bottom: 60, left: 80 };
      
      // Calculate min and max values across all fields for color scaling
      const allValues = data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      );
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);
      
      const cellWidth = chartWidth / data.length;
      const cellHeight = chartHeight / config.primaryYAxis.length;
      
      // Color interpolation function
      const getHeatColor = (value) => {
        const ratio = (value - minValue) / (maxValue - minValue || 1);
        if (config.colorScheme === 'warm') {
          const r = 255;
          const g = Math.round(255 * (1 - ratio));
          const b = Math.round(100 * (1 - ratio));
          return `rgb(${r}, ${g}, ${b})`;
        } else if (config.colorScheme === 'cool') {
          const r = Math.round(100 * (1 - ratio));
          const g = Math.round(180 + 75 * (1 - ratio));
          const b = 255;
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // Default blue gradient
          const intensity = Math.round(59 + 196 * ratio);
          return `rgb(59, ${intensity}, 246)`;
        }
      };
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* Heatmap cells */}
          {config.primaryYAxis.map((field, rowIndex) => (
            <g key={field.id}>
              {data.map((d, colIndex) => {
                const value = d[field.id] || 0;
                const x = padding.left + colIndex * cellWidth;
                const y = padding.top + rowIndex * cellHeight;
                
                return (
                  <g key={`${field.id}-${colIndex}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellWidth}
                      height={cellHeight}
                      fill={getHeatColor(value)}
                      stroke="white"
                      strokeWidth="2"
                    />
                    {config.showDataLabels && (
                      <text
                        x={x + cellWidth / 2}
                        y={y + cellHeight / 2 + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fill="white"
                        fontWeight="600"
                      >
                        {Math.round(value)}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Y-axis labels (field names) */}
              <text
                x={padding.left - 10}
                y={padding.top + rowIndex * cellHeight + cellHeight / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fill="#374151"
                fontWeight="500"
              >
                {field.name}
              </text>
            </g>
          ))}
          
          {/* X-axis labels (categories) */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + i * cellWidth + cellWidth / 2}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#374151"
              transform={`rotate(-45 ${padding.left + i * cellWidth + cellWidth / 2} ${padding.top + chartHeight + 20})`}
            >
              {d.category}
            </text>
          ))}
          
          {/* Color scale legend */}
          <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top})`}>
            <text x="0" y="-5" fontSize="10" fill="#6b7280">Max: {Math.round(maxValue)}</text>
            {[...Array(10)].map((_, i) => {
              const ratio = i / 9;
              const value = minValue + (maxValue - minValue) * (1 - ratio);
              return (
                <rect
                  key={i}
                  x="0"
                  y={i * (chartHeight / 10)}
                  width="20"
                  height={chartHeight / 10}
                  fill={getHeatColor(value)}
                />
              );
            })}
            <text x="0" y={chartHeight + 15} fontSize="10" fill="#6b7280">Min: {Math.round(minValue)}</text>
          </g>
        </svg>
      );
    }
    
    // Task 3: Table Chart
    if (chartType === 'table') {
      // Limit data for better performance
      const displayData = data.slice(0, 100);
      
      // Use columns from config if specified, otherwise use xAxis and primaryYAxis
      const displayColumns = config.columns && config.columns.length > 0
        ? config.columns.map(colId => {
            // Find field in available fields or create dynamic field
            const field = availableFields.dimensions.find(f => f.id === colId) ||
                         availableFields.measures.find(f => f.id === colId) || {
                           id: colId,
                           name: colId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                         };
            return field;
          })
        : [config.xAxis, ...config.primaryYAxis];
      
      return (
        <div className="table-chart-container">
          <table className="data-table">
            <thead>
              <tr>
                {displayColumns.map(field => (
                  <th key={field.id}>{field.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i}>
                  {displayColumns.map(field => (
                    <td key={field.id}>
                      {typeof row[field.id] === 'number' 
                        ? row[field.id].toFixed(2) 
                        : row[field.id] || row.category || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 100 && (
            <div className="table-footer">
              Showing 100 of {data.length} rows
            </div>
          )}
        </div>
      );
    }
    
    // Scatter Chart - ENHANCED with color and size legends
    if (chartType === 'scatter') {
      console.log('🎯 SCATTER PLOT RENDERING STARTED', { 
        chartType, 
        dataLength: data.length,
        config: config,
        sampleData: data[0]
      });
      
      // Extract field IDs - handle both string and object formats
      const xAxisFieldId = typeof config.xAxis === 'string' ? config.xAxis : (config.xAxis?.id || config.xAxis?.name);
      const yAxisFieldIds = config.primaryYAxis.map(f => typeof f === 'string' ? f : (f?.id || f?.name));
      
      const xValues = data.map(d => parseFloat(d[xAxisFieldId]) || 0).filter(v => !isNaN(v));
      const yValues = data.flatMap(d => 
        yAxisFieldIds.map(fieldId => parseFloat(d[fieldId]) || 0).filter(v => !isNaN(v))
      );
      
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      
      // Handle edge case where all values are the same
      const xRange = maxX - minX || 1;
      const yRange = maxY - minY || 1;
      
      const chartHeight = 200;
      const chartWidth = 380; // Reduced to make room for legends
      const padding = { top: 20, right: 140, bottom: 60, left: 60 }; // Increased right padding for legends
      
      // Get color field (legend or color) - handle both string and object
      const colorFieldRaw = config.legend || config.color || 'zone';
      const colorField = typeof colorFieldRaw === 'string' ? colorFieldRaw : (colorFieldRaw?.id || colorFieldRaw?.name || 'zone');
      
      // Get size field - handle both string and object
      const sizeFieldRaw = config.size;
      const sizeField = sizeFieldRaw ? (typeof sizeFieldRaw === 'string' ? sizeFieldRaw : (sizeFieldRaw?.id || sizeFieldRaw?.name)) : null;
      
      console.log('🎨 Scatter plot field extraction:', {
        legendConfig: config.legend,
        colorConfig: config.color,
        sizeConfig: config.size,
        colorField,
        sizeField,
        sampleDataKeys: data.length > 0 ? Object.keys(data[0]) : [],
        sampleDataColorValue: data.length > 0 ? data[0][colorField] : null,
        sampleDataSizeValue: sizeField && data.length > 0 ? data[0][sizeField] : null
      });
      
      // Detect if color field is numeric (gradient mode) or categorical (zone mode)
      const colorFieldValues = data.map(d => d[colorField]).filter(v => v != null);
      const isNumericColor = colorFieldValues.length > 0 && !isNaN(parseFloat(colorFieldValues[0]));
      
      let colorCategories = [];
      let minColorValue = 0, maxColorValue = 1, colorRange = 1;
      
      if (isNumericColor) {
        // Gradient mode - extract numeric values
        const numericValues = colorFieldValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
        minColorValue = Math.min(...numericValues);
        maxColorValue = Math.max(...numericValues);
        colorRange = maxColorValue - minColorValue || 1;
      } else {
        // Categorical mode - extract unique categories
        colorCategories = [...new Set(colorFieldValues)].filter(Boolean);
      }
      
      // Color palette for zones/categories
      const zoneColors = {
        'CT': '#3b82f6',      // Blue
        'ISO-NE': '#06b6d4',  // Cyan
        'MA': '#ef4444',      // Red
        'ME': '#10b981',      // Green
        'NH': '#14b8a6',      // Teal
        'RI': '#f59e0b',      // Amber
        'VT': '#f97316'       // Orange
      };
      
      // Fallback color palette for non-zone categories
      const fallbackColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
      
      // Helper function to generate gradient color (blue scale)
      const getGradientColor = (value) => {
        const normalizedValue = (value - minColorValue) / colorRange;
        // Blue gradient: light blue to dark blue
        const intensity = Math.round(135 + normalizedValue * 120); // 135 to 255
        const blueShade = Math.round(255 - normalizedValue * 100); // 255 to 155
        return `rgb(${intensity}, ${intensity + 20}, ${blueShade})`;
      };
      
      // Process size values if configured
      let minSize = 3, maxSize = 12;
      let sizeValues = [];
      
      if (sizeField) {
        sizeValues = data.map(d => parseFloat(d[sizeField]) || 0).filter(v => !isNaN(v) && v > 0);
        if (sizeValues.length > 0) {
          const minSizeValue = Math.min(...sizeValues);
          const maxSizeValue = Math.max(...sizeValues);
          const sizeRange = maxSizeValue - minSizeValue || 1;
          
          // Normalize size calculation
          data.forEach(d => {
            const sizeVal = parseFloat(d[sizeField]) || 0;
            d._normalizedSize = minSize + ((sizeVal - minSizeValue) / sizeRange) * (maxSize - minSize);
          });
        }
      }
      
      console.log('🎨 Enhanced scatter plot:', { 
        dataPoints: data.length, 
        xRange: [minX, maxX], 
        yRange: [minY, maxY],
        colorField,
        isNumericColor,
        colorCategories: !isNumericColor ? colorCategories : `Gradient (${minColorValue.toFixed(1)} - ${maxColorValue.toFixed(1)})`,
        sizeField,
        hasSizes: sizeField && sizeValues.length > 0,
        legendMode: isNumericColor ? 'gradient' : 'categorical',
        firstThreePoints: data.slice(0, 3).map(d => ({
          colorValue: d[colorField],
          sizeValue: sizeField ? d[sizeField] : null,
          normalizedSize: d._normalizedSize
        }))
      });
      
      // Debug info to display on chart
      const debugInfo = {
        colorField: colorField,
        colorFieldExists: data.length > 0 ? (colorField in data[0]) : false,
        sizeField: sizeField || 'none',
        sizeFieldExists: sizeField && data.length > 0 ? (sizeField in data[0]) : false,
        categoriesCount: colorCategories.length,
        hasValidColors: colorCategories.length > 0 || isNumericColor
      };
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid lines - Y-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={`ygrid-${i}`}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
                opacity="0.7"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {(minY + yRange * (1 - ratio)).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* Grid lines - X-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={`xgrid-${i}`}>
              <line 
                x1={padding.left + chartWidth * ratio}
                y1={padding.top}
                x2={padding.left + chartWidth * ratio}
                y2={padding.top + chartHeight}
                stroke="#f3f4f6"
                strokeWidth="1"
                opacity="0.5"
              />
              <text 
                x={padding.left + chartWidth * ratio}
                y={padding.top + chartHeight + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {(minX + xRange * ratio).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* Data points with color and size */}
          {data.map((d, i) => {
            const xVal = parseFloat(d[xAxisFieldId]) || 0;
            const yVal = parseFloat(d[yAxisFieldIds[0]]) || 0;
            
            // Skip invalid points
            if (isNaN(xVal) || isNaN(yVal)) return null;
            
            const x = padding.left + ((xVal - minX) / xRange) * chartWidth;
            const y = padding.top + chartHeight - ((yVal - minY) / yRange) * chartHeight;
            
            // Get color based on mode (gradient or categorical)
            let color;
            if (isNumericColor) {
              const colorValue = parseFloat(d[colorField]) || 0;
              color = getGradientColor(colorValue);
            } else {
              const category = d[colorField];
              const categoryIndex = colorCategories.indexOf(category);
              // Use zone color if exists, otherwise use fallback color based on index (default to first color if not found)
              color = zoneColors[category] || fallbackColors[Math.max(0, categoryIndex) % fallbackColors.length];
            }
            
            // Get size
            const pointSize = d._normalizedSize || 5;
            
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={pointSize}
                fill={color}
                opacity="0.7"
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Color Legend */}
          <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top})`}>
            <text x="0" y="0" fontSize="11" fill="#1f2937" fontWeight="600">
              {typeof colorField === 'string' ? colorField.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Color'}
            </text>
            
            {/* Debug Info */}
            {!debugInfo.hasValidColors && (
              <g transform="translate(0, 20)">
                <text x="0" y="0" fontSize="9" fill="#ef4444" fontWeight="600">⚠️ No Color Data</text>
                <text x="0" y="12" fontSize="8" fill="#6b7280">Field: {debugInfo.colorField}</text>
                <text x="0" y="22" fontSize="8" fill="#6b7280">Exists: {debugInfo.colorFieldExists ? 'Yes' : 'No'}</text>
              </g>
            )}
            
            {/* Categorical Legend (Zone colors) */}
            {!isNumericColor && colorCategories.slice(0, 7).map((category, i) => {
              const color = zoneColors[category] || fallbackColors[i % fallbackColors.length];
              return (
                <g key={i} transform={`translate(0, ${15 + i * 18})`}>
                  <circle cx="6" cy="6" r="5" fill={color} opacity="0.7" stroke="white" strokeWidth="1"/>
                  <text x="16" y="10" fontSize="9" fill="#374151">
                    {String(category).length > 10 ? String(category).substring(0, 8) + '...' : category}
                  </text>
                </g>
              );
            })}
            
            {/* Gradient Legend (Numeric scale) */}
            {isNumericColor && [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, i) => {
              const value = minColorValue + colorRange * ratio;
              const color = getGradientColor(value);
              return (
                <g key={i} transform={`translate(0, ${15 + i * 18})`}>
                  <circle cx="6" cy="6" r="5" fill={color} opacity="0.7" stroke="white" strokeWidth="1"/>
                  <text x="16" y="10" fontSize="9" fill="#374151">
                    {value.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>
          
          {/* Size Legend (if size field configured) */}
          {sizeField && sizeValues.length > 0 && (
            <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top + (isNumericColor ? 130 : Math.min(140, 15 + colorCategories.length * 18 + 20))})`}>
              <text x="0" y="0" fontSize="11" fill="#1f2937" fontWeight="600">
                {typeof sizeField === 'string' ? sizeField.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Size'}
              </text>
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, i) => {
                const size = minSize + (maxSize - minSize) * ratio;
                const value = Math.min(...sizeValues) + (Math.max(...sizeValues) - Math.min(...sizeValues)) * ratio;
                return (
                  <g key={i} transform={`translate(0, ${15 + i * 15})`}>
                    <circle cx="8" cy="6" r={size} fill="#94a3b8" opacity="0.6" stroke="white" strokeWidth="1"/>
                    <text x="20" y="10" fontSize="8" fill="#6b7280">
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          
          {/* Debug: Size field not configured */}
          {!sizeField && (
            <g transform={`translate(${padding.left + chartWidth + 20}, ${padding.top + (isNumericColor ? 130 : Math.min(140, 15 + colorCategories.length * 18 + 20))})`}>
              <text x="0" y="0" fontSize="9" fill="#6b7280">Size: {debugInfo.sizeField}</text>
              <text x="0" y="12" fontSize="8" fill="#9ca3af">Not configured</text>
            </g>
          )}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 55} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {typeof config.xAxis === 'string' ? config.xAxis.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : (config.xAxis?.name || 'X Axis')}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {(() => {
              const firstYAxis = config.primaryYAxis[0];
              if (typeof firstYAxis === 'string') {
                return firstYAxis.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              }
              return firstYAxis?.name || 'Y Axis';
            })()}
          </text>
        </svg>
      );
    }
    
    // Gauge Chart
    if (chartType === 'gauge') {
      const value = data.length > 0 ? (data[0][config.primaryYAxis[0].id] || 0) : 0;
      const maxValue = Math.max(...data.map(d => d[config.primaryYAxis[0].id] || 0));
      const percentage = maxValue > 0 ? (value / maxValue) : 0;
      const angle = -180 + (percentage * 180);
      
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`gauge-gradient-${panel.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke={`url(#gauge-gradient-${panel.id})`}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 314} 314`}
          />
          {/* Needle */}
          <line
            x1="150"
            y1="150"
            x2={150 + 80 * Math.cos((angle * Math.PI) / 180)}
            y2={150 + 80 * Math.sin((angle * Math.PI) / 180)}
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="150" cy="150" r="8" fill="#1f2937" />
          {/* Value display */}
          <text x="150" y="170" textAnchor="middle" fontSize="24" fill="#1f2937" fontWeight="700">
            {value.toFixed(1)}
          </text>
          <text x="150" y="190" textAnchor="middle" fontSize="12" fill="#6b7280">
            {config.primaryYAxis[0].name}
          </text>
        </svg>
      );
    }
    
    // Donut Chart
    if (chartType === 'donut') {
      const total = data.reduce((sum, d) => sum + (d[config.primaryYAxis[0].id] || 0), 0);
      const cx = 250;
      const cy = 140;
      const outerRadius = 100;
      const innerRadius = 60;
      let currentAngle = -90;
      
      return (
        <svg width="100%" height="100%" viewBox="0 0 500 280" preserveAspectRatio="xMidYMid meet">
          {data.map((d, i) => {
            const value = d[config.primaryYAxis[0].id] || 0;
            const percentage = value / total;
            const angle = percentage * 360;
            
            const startAngle = (currentAngle * Math.PI) / 180;
            const endAngle = ((currentAngle + angle) * Math.PI) / 180;
            
            const x1Outer = cx + outerRadius * Math.cos(startAngle);
            const y1Outer = cy + outerRadius * Math.sin(startAngle);
            const x2Outer = cx + outerRadius * Math.cos(endAngle);
            const y2Outer = cy + outerRadius * Math.sin(endAngle);
            
            const x1Inner = cx + innerRadius * Math.cos(startAngle);
            const y1Inner = cy + innerRadius * Math.sin(startAngle);
            const x2Inner = cx + innerRadius * Math.cos(endAngle);
            const y2Inner = cy + innerRadius * Math.sin(endAngle);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${x1Outer} ${y1Outer}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
              `L ${x2Inner} ${y2Inner}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`,
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
              </g>
            );
          })}
          
          {/* Center text */}
          <text x={cx} y={cy} textAnchor="middle" fontSize="32" fill="#1f2937" fontWeight="700">
            {total.toFixed(0)}
          </text>
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fill="#6b7280">
            Total
          </text>
          
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
    
    // Waterfall Chart
    if (chartType === 'waterfall') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const barWidth = chartWidth / (data.length + 1);
      
      let runningTotal = 0;
      const barData = data.map((d, i) => {
        const value = d[config.primaryYAxis[0].id] || 0;
        const start = runningTotal;
        runningTotal += value;
        return { ...d, start, end: runningTotal, value, isPositive: value >= 0 };
      });
      
      const maxValue = Math.max(...barData.map(d => Math.abs(d.end)));
      const minValue = Math.min(...barData.map(d => d.start), 0);
      const range = maxValue - minValue;
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {barData.map((d, i) => {
            const x = padding.left + i * barWidth + barWidth / 4;
            const barHeight = Math.abs(d.value / range) * chartHeight;
            const y = padding.top + chartHeight - ((d.end - minValue) / range) * chartHeight;
            
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth * 0.5}
                  height={barHeight}
                  fill={d.isPositive ? '#10b981' : '#ef4444'}
                  opacity="0.8"
                />
                {i < barData.length - 1 && (
                  <line
                    x1={x + barWidth * 0.5}
                    y1={y}
                    x2={x + barWidth}
                    y2={padding.top + chartHeight - ((barData[i + 1].start - minValue) / range) * chartHeight}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                )}
                <text
                  x={x + barWidth * 0.25}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                >
                  {d.category}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Funnel Chart
    if (chartType === 'funnel') {
      const chartHeight = 250;
      const chartWidth = 400;
      const padding = { top: 20, right: 80, bottom: 20, left: 80 };
      const maxValue = Math.max(...data.map(d => d[config.primaryYAxis[0].id] || 0));
      const segmentHeight = chartHeight / data.length;
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {data.map((d, i) => {
            const value = d[config.primaryYAxis[0].id] || 0;
            const widthRatio = value / maxValue;
            const topWidth = chartWidth * widthRatio;
            const nextValue = i < data.length - 1 ? (data[i + 1][config.primaryYAxis[0].id] || 0) : value * 0.5;
            const bottomWidth = chartWidth * (nextValue / maxValue);
            
            const y = padding.top + i * segmentHeight;
            const topLeft = padding.left + (chartWidth - topWidth) / 2;
            const bottomLeft = padding.left + (chartWidth - bottomWidth) / 2;
            
            return (
              <g key={i}>
                <path
                  d={`M ${topLeft} ${y} L ${topLeft + topWidth} ${y} L ${bottomLeft + bottomWidth} ${y + segmentHeight} L ${bottomLeft} ${y + segmentHeight} Z`}
                  fill={colorPalette[i % colorPalette.length]}
                  opacity="0.85"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={padding.left + chartWidth / 2}
                  y={y + segmentHeight / 2 + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="600"
                >
                  {d.category}: {value}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Radar Chart
    if (chartType === 'radar') {
      const cx = 200;
      const cy = 180;
      const radius = 120;
      const numAxes = data.length;
      const angleStep = (2 * Math.PI) / numAxes;
      
      const maxValue = Math.max(...data.map(d => d[config.primaryYAxis[0].id] || 0));
      
      return (
        <svg width="100%" height="100%" viewBox="0 0 400 360" preserveAspectRatio="xMidYMid meet">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius * ratio}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Axes */}
          {data.map((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            
            return (
              <g key={i}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={cx + (radius + 20) * Math.cos(angle)}
                  y={cy + (radius + 20) * Math.sin(angle)}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#374151"
                >
                  {d.category}
                </text>
              </g>
            );
          })}
          
          {/* Data polygon */}
          {config.primaryYAxis.map((field, j) => {
            const points = data.map((d, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const value = d[field.id] || 0;
              const r = (value / maxValue) * radius;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <g key={field.id}>
                <polygon
                  points={points}
                  fill={colorPalette[j % colorPalette.length]}
                  opacity="0.3"
                  stroke={colorPalette[j % colorPalette.length]}
                  strokeWidth="2"
                />
                {data.map((d, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const value = d[field.id] || 0;
                  const r = (value / maxValue) * radius;
                  const x = cx + r * Math.cos(angle);
                  const y = cy + r * Math.sin(angle);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill={colorPalette[j % colorPalette.length]}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Bubble Chart
    if (chartType === 'bubble') {
      const xValues = data.map(d => parseFloat(d[config.xAxis.id]) || 0);
      const yValues = data.map(d => parseFloat(d[config.primaryYAxis[0].id]) || 0);
      // Use size field from config if available, otherwise use second Y-axis field
      const sizeField = config.size || (config.primaryYAxis.length > 1 ? config.primaryYAxis[1].id : null);
      const sizeValues = sizeField
        ? data.map(d => parseFloat(d[sizeField]) || 1)
        : data.map(() => 5);
      
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      const maxSize = Math.max(...sizeValues);
      
      const xRange = maxX - minX || 1;
      const yRange = maxY - minY || 1;
      
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 50, left: 60 };
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
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
            </g>
          ))}
          
          {data.map((d, i) => {
            const xVal = parseFloat(d[config.xAxis.id]) || 0;
            const yVal = parseFloat(d[config.primaryYAxis[0].id]) || 0;
            const size = sizeValues[i];
            
            const x = padding.left + ((xVal - minX) / xRange) * chartWidth;
            const y = padding.top + chartHeight - ((yVal - minY) / yRange) * chartHeight;
            const r = 5 + (size / maxSize) * 20;
            
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill={colorPalette[i % colorPalette.length]}
                opacity="0.6"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 35} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {config.xAxis.name}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {config.primaryYAxis[0].name}
          </text>
        </svg>
      );
    }
    
    // Treemap Chart
    if (chartType === 'treemap') {
      const chartWidth = 500;
      const chartHeight = 280;
      const total = data.reduce((sum, d) => sum + (d[config.primaryYAxis[0].id] || 0), 0);
      
      // Simple treemap layout (horizontal slicing)
      let currentY = 0;
      const rects = data.map((d, i) => {
        const value = d[config.primaryYAxis[0].id] || 0;
        const percentage = value / total;
        const height = chartHeight * percentage;
        const rect = { x: 0, y: currentY, width: chartWidth, height, value, category: d.category };
        currentY += height;
        return rect;
      });
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
          {rects.map((rect, i) => (
            <g key={i}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={colorPalette[i % colorPalette.length]}
                opacity="0.8"
                stroke="white"
                strokeWidth="2"
              />
              {rect.height > 30 && (
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  fontWeight="600"
                >
                  {rect.category}: {rect.value}
                </text>
              )}
            </g>
          ))}
        </svg>
      );
    }
    
    // Box Plot Chart - FIXED RENDERING LOGIC
    if (chartType === 'box-plot') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 60, left: 60 };
      
      // Helper to extract numeric value
      const getNumericValue = (row, fieldId) => {
        let value = row[fieldId];
        if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          value = parseFloat(value);
        }
        return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : null;
      };
      
      // Extract field IDs - handle both string and object formats
      const xAxisFieldId = typeof config.xAxis === 'string' ? config.xAxis : (config.xAxis?.id || config.xAxis?.name || 'zone');
      const yAxisFieldIds = config.primaryYAxis.map(f => typeof f === 'string' ? f : (f?.id || f?.name));
      
      // Group data by x-axis categories (e.g., zones)
      const categories = [...new Set(data.map(d => d[xAxisFieldId]))].filter(Boolean);
      
      console.log('📦 Box plot debug:', {
        categories,
        totalRows: data.length,
        xAxisField: xAxisFieldId,
        yAxisFields: yAxisFieldIds,
        configXAxis: config.xAxis,
        sampleData: data.slice(0, 3)
      });
      console.log('🔑 FIRST ROW KEYS:', data[0] ? Object.keys(data[0]) : []);
      console.log('📄 FIRST ROW DATA:', data[0]);
      console.log('🎯 X-VALUES EXTRACTED:', data.map(d => d[xAxisFieldId]));
      
      // For each category, collect all Y-axis values
      const boxData = categories.map(category => {
        const categoryData = data.filter(d => d[xAxisFieldId] === category);
        
        // Collect all Y values from all Y-axis fields for this category
        const values = categoryData.flatMap(d => 
          yAxisFieldIds.map(fieldId => getNumericValue(d, fieldId))
        ).filter(v => v !== null).sort((a, b) => a - b);
        
        if (values.length === 0) {
          console.warn(`⚠️ No values for category: ${category}`);
          return null;
        }
        
        // Calculate quartiles with edge case handling
        const n = values.length;
        const q1Index = Math.max(0, Math.floor(n * 0.25));
        const q2Index = Math.max(0, Math.floor(n * 0.50));
        const q3Index = Math.max(0, Math.floor(n * 0.75));
        
        const q1 = values[q1Index] || values[0];
        const median = values[q2Index] || values[0];
        const q3 = values[q3Index] || values[n - 1];
        const iqr = q3 - q1;
        
        // Calculate whiskers (1.5 * IQR rule)
        const lowerWhisker = Math.max(values[0], q1 - 1.5 * iqr);
        const upperWhisker = Math.min(values[n - 1], q3 + 1.5 * iqr);
        
        // Find outliers
        const outliers = values.filter(v => v < lowerWhisker || v > upperWhisker);
        
        console.log(`📦 Category "${category}":`, {
          valueCount: n,
          min: values[0],
          q1,
          median,
          q3,
          max: values[n - 1],
          iqr,
          outlierCount: outliers.length
        });
        
        return { 
          category, 
          min: lowerWhisker, 
          q1, 
          median, 
          q3, 
          max: upperWhisker,
          outliers,
          count: n
        };
      }).filter(Boolean);
      
      if (boxData.length === 0) {
        console.error('❌ No valid box plot data');
        return (
          <div className="panel-placeholder">
            <p>No data available for box plot</p>
          </div>
        );
      }
      
      // Calculate global min/max safely
      const allValues = boxData.flatMap(d => [d.min, d.q1, d.median, d.q3, d.max, ...d.outliers]).filter(v => v !== null && !isNaN(v) && isFinite(v));
      const globalMin = Math.min(...allValues);
      const globalMax = Math.max(...allValues);
      const valueRange = globalMax - globalMin || 1;
      
      console.log('📦 Global stats:', { globalMin, globalMax, valueRange });
      
      const boxWidth = Math.min(60, (chartWidth / boxData.length) * 0.6);
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid lines - Y-axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={`ygrid-${i}`}>
              <line 
                x1={padding.left} 
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth} 
                y2={padding.top + chartHeight * ratio}
                stroke="#e5e7eb" 
                strokeWidth="1"
                opacity="0.7"
              />
              <text 
                x={padding.left - 10} 
                y={padding.top + chartHeight * ratio + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {(globalMin + valueRange * (1 - ratio)).toFixed(1)}
              </text>
            </g>
          ))}
          
          {/* Box plots */}
          {boxData.map((d, i) => {
            const xCenter = padding.left + (i + 0.5) * (chartWidth / boxData.length);
            const x = xCenter - boxWidth / 2;
            
            // Calculate Y positions
            const yMin = padding.top + chartHeight - ((d.min - globalMin) / valueRange) * chartHeight;
            const yQ1 = padding.top + chartHeight - ((d.q1 - globalMin) / valueRange) * chartHeight;
            const yMedian = padding.top + chartHeight - ((d.median - globalMin) / valueRange) * chartHeight;
            const yQ3 = padding.top + chartHeight - ((d.q3 - globalMin) / valueRange) * chartHeight;
            const yMax = padding.top + chartHeight - ((d.max - globalMin) / valueRange) * chartHeight;
            
            return (
              <g key={i}>
                {/* Lower whisker */}
                <line 
                  x1={xCenter} 
                  y1={yMin} 
                  x2={xCenter} 
                  y2={yQ1} 
                  stroke="#64748b" 
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                <line 
                  x1={xCenter - 8} 
                  y1={yMin} 
                  x2={xCenter + 8} 
                  y2={yMin} 
                  stroke="#64748b" 
                  strokeWidth="2"
                />
                
                {/* Upper whisker */}
                <line 
                  x1={xCenter} 
                  y1={yQ3} 
                  x2={xCenter} 
                  y2={yMax} 
                  stroke="#64748b" 
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                <line 
                  x1={xCenter - 8} 
                  y1={yMax} 
                  x2={xCenter + 8} 
                  y2={yMax} 
                  stroke="#64748b" 
                  strokeWidth="2"
                />
                
                {/* IQR Box (Q1 to Q3) */}
                <rect
                  x={x}
                  y={yQ3}
                  width={boxWidth}
                  height={yQ1 - yQ3}
                  fill={colorPalette[i % colorPalette.length]}
                  opacity="0.7"
                  stroke={colorPalette[i % colorPalette.length]}
                  strokeWidth="2"
                  rx="2"
                />
                
                {/* Median line */}
                <line
                  x1={x}
                  y1={yMedian}
                  x2={x + boxWidth}
                  y2={yMedian}
                  stroke="#1f2937"
                  strokeWidth="3"
                />
                
                {/* Outliers */}
                {d.outliers.map((outlier, oi) => {
                  const yOutlier = padding.top + chartHeight - ((outlier - globalMin) / valueRange) * chartHeight;
                  return (
                    <circle
                      key={`outlier-${oi}`}
                      cx={xCenter}
                      cy={yOutlier}
                      r="3"
                      fill={colorPalette[i % colorPalette.length]}
                      stroke="white"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  );
                })}
                
                {/* Category label */}
                <text
                  x={xCenter}
                  y={padding.top + chartHeight + 15}
                  textAnchor="end"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="500"
                  transform={`rotate(-45 ${xCenter} ${padding.top + chartHeight + 15})`}
                >
                  {String(d.category).length > 12 ? String(d.category).substring(0, 10) + '...' : d.category}
                </text>
                
                {/* Count label (n=X) */}
                <text
                  x={xCenter}
                  y={yMax - 10}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  n={d.count}
                </text>
              </g>
            );
          })}
          
          {/* Axis labels */}
          <text x={padding.left + chartWidth / 2} y={padding.top + chartHeight + 55} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600">
            {typeof config.xAxis === 'string' ? config.xAxis.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : (config.xAxis?.name || 'Category')}
          </text>
          <text x={20} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="600" transform={`rotate(-90 20 ${padding.top + chartHeight / 2})`}>
            {(() => {
              const firstYAxis = config.primaryYAxis[0];
              if (typeof firstYAxis === 'string') {
                return firstYAxis.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              }
              return firstYAxis?.name || 'Value';
            })()}
          </text>
        </svg>
      );
    }
    
    // Violin Plot Chart
    if (chartType === 'violin') {
      const chartHeight = 200;
      const chartWidth = 450;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      const violinWidth = (chartWidth / data.length) * 0.8;
      
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {data.map((d, i) => {
            const x = padding.left + (i * chartWidth) / data.length;
            const xCenter = x + (chartWidth / data.length) / 2;
            
            // Create violin shape using average value
            const values = config.primaryYAxis.map(f => d[f.id] || 0);
            const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
            const y = padding.top + chartHeight - (avgValue / maxValue) * chartHeight;
            
            // Simple violin shape (ellipse)
            return (
              <g key={i}>
                <ellipse
                  cx={xCenter}
                  cy={y}
                  rx={violinWidth / 2}
                  ry={chartHeight / 4}
                  fill={colorPalette[i % colorPalette.length]}
                  opacity="0.5"
                  stroke={colorPalette[i % colorPalette.length]}
                  strokeWidth="2"
                />
                <line
                  x1={xCenter}
                  y1={padding.top}
                  x2={xCenter}
                  y2={padding.top + chartHeight}
                  stroke="#1f2937"
                  strokeWidth="2"
                />
                <text
                  x={xCenter}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#374151"
                >
                  {d.category}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Histogram Chart
    if (chartType === 'histogram') {
      const maxValue = Math.max(...data.flatMap(d => 
        config.primaryYAxis.map(f => d[f.id] || 0)
      ));
      const chartHeight = 200;
      const chartWidth = 450;
      const barWidth = (chartWidth / data.length) * 0.9;
      const padding = { top: 20, right: 40, bottom: 40, left: 50 };
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`} preserveAspectRatio="xMidYMid meet">
          {config.showGridLines && [0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line 
              key={i}
              x1={padding.left} 
              y1={padding.top + chartHeight * ratio}
              x2={padding.left + chartWidth} 
              y2={padding.top + chartHeight * ratio}
              stroke="#e5e7eb" 
              strokeWidth="1"
            />
          ))}
          
          {data.map((d, i) => {
            const value = d[config.primaryYAxis[0].id] || 0;
            const barHeight = (value / maxValue) * chartHeight;
            const x = padding.left + (i * chartWidth) / data.length;
            const y = padding.top + chartHeight - barHeight;
            
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colorPalette[0]}
                  opacity="0.8"
                  stroke="white"
                  strokeWidth="1"
                />
                <text
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                >
                  {d.category}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Polar Chart
    if (chartType === 'polar') {
      const cx = 200;
      const cy = 200;
      const maxRadius = 150;
      const numSegments = data.length;
      const angleStep = (2 * Math.PI) / numSegments;
      
      const maxValue = Math.max(...data.map(d => d[config.primaryYAxis[0].id] || 0));
      
      return (
        <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={maxRadius * ratio}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Polar segments */}
          {data.map((d, i) => {
            const value = d[config.primaryYAxis[0].id] || 0;
            const radius = (value / maxValue) * maxRadius;
            const startAngle = i * angleStep;
            const endAngle = (i + 1) * angleStep;
            
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);
            
            const largeArc = angleStep > Math.PI ? 1 : 0;
            
            return (
              <g key={i}>
                <path
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={colorPalette[i % colorPalette.length]}
                  opacity="0.7"
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Axis lines */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + maxRadius * Math.cos(startAngle)}
                  y2={cy + maxRadius * Math.sin(startAngle)}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
      );
    }
    
    // Sankey, Network, and Candlestick require more complex data structures
    // Providing simplified placeholder implementations
    if (chartType === 'sankey' || chartType === 'network' || chartType === 'candlestick') {
      return (
        <div className="chart-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            {chartType === 'sankey' && (
              <>
                <path d="M2,5 Q10,5 10,12 Q10,19 18,19" fill="none" strokeWidth="3" opacity="0.5"/>
                <path d="M2,10 Q10,10 10,15 Q10,20 18,20" fill="none" strokeWidth="2" opacity="0.4"/>
              </>
            )}
            {chartType === 'network' && (
              <>
                <circle cx="12" cy="5" r="2"/>
                <circle cx="5" cy="15" r="2"/>
                <circle cx="19" cy="15" r="2"/>
                <line x1="12" y1="7" x2="7" y2="13"/>
                <line x1="12" y1="7" x2="17" y2="13"/>
                <line x1="7" y1="15" x2="17" y2="15"/>
              </>
            )}
            {chartType === 'candlestick' && (
              <>
                <line x1="6" y1="4" x2="6" y2="20" strokeWidth="1"/>
                <rect x="5" y="8" width="2" height="8" fill="currentColor"/>
                <line x1="12" y1="6" x2="12" y2="18" strokeWidth="1"/>
                <rect x="11" y="10" width="2" height="5" fill="none" stroke="currentColor"/>
                <line x1="18" y1="5" x2="18" y2="17" strokeWidth="1"/>
                <rect x="17" y="9" width="2" height="6" fill="currentColor"/>
              </>
            )}
          </svg>
          <p>{chartTypes.find(c => c.id === chartType)?.name}</p>
          <small>Requires specialized data structure</small>
        </div>
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
  
  // Task 2: Handlers for resizing the measure column (horizontal)
  const handleMeasureColumnResizeStart = (e) => {
    e.preventDefault();
    setIsResizingMeasureColumn(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(measureColumnWidth);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  
  const handleMeasureColumnResizeMove = (e) => {
    if (!isResizingMeasureColumn) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(200, Math.min(500, resizeStartWidth + deltaX));
    setMeasureColumnWidth(newWidth);
  };
  
  const handleMeasureColumnResizeEnd = () => {
    setIsResizingMeasureColumn(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  useEffect(() => {
    if (isResizingMeasureColumn) {
      document.addEventListener('mousemove', handleMeasureColumnResizeMove);
      document.addEventListener('mouseup', handleMeasureColumnResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleMeasureColumnResizeMove);
        document.removeEventListener('mouseup', handleMeasureColumnResizeEnd);
      };
    }
  }, [isResizingMeasureColumn, resizeStartX, resizeStartWidth]);
  
  // Handlers for resizing dimensions list (vertical)
  const handleDimensionsResizeStart = (e) => {
    e.preventDefault();
    setIsResizingDimensions(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(dimensionsHeight);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };
  
  const handleDimensionsResizeMove = (e) => {
    if (!isResizingDimensions) return;
    
    const deltaY = e.clientY - resizeStartY;
    const newHeight = Math.max(100, Math.min(600, resizeStartHeight + deltaY));
    setDimensionsHeight(newHeight);
  };
  
  const handleDimensionsResizeEnd = () => {
    setIsResizingDimensions(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  useEffect(() => {
    if (isResizingDimensions) {
      document.addEventListener('mousemove', handleDimensionsResizeMove);
      document.addEventListener('mouseup', handleDimensionsResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleDimensionsResizeMove);
        document.removeEventListener('mouseup', handleDimensionsResizeEnd);
      };
    }
  }, [isResizingDimensions, resizeStartY, resizeStartHeight]);
  
  // Handlers for resizing measures list (vertical)
  const handleMeasuresResizeStart = (e) => {
    e.preventDefault();
    setIsResizingMeasures(true);
    setResizeStartY(e.clientY);
    setResizeStartHeight(measuresHeight);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };
  
  const handleMeasuresResizeMove = (e) => {
    if (!isResizingMeasures) return;
    
    const deltaY = e.clientY - resizeStartY;
    const newHeight = Math.max(100, Math.min(600, resizeStartHeight + deltaY));
    setMeasuresHeight(newHeight);
  };
  
  const handleMeasuresResizeEnd = () => {
    setIsResizingMeasures(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  useEffect(() => {
    if (isResizingMeasures) {
      document.addEventListener('mousemove', handleMeasuresResizeMove);
      document.addEventListener('mouseup', handleMeasuresResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleMeasuresResizeMove);
        document.removeEventListener('mouseup', handleMeasuresResizeEnd);
      };
    }
  }, [isResizingMeasures, resizeStartY, resizeStartHeight]);
  
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
    
    const updatedPanels = panels.map(panel => 
      panel.id === activePanel 
        ? { ...panel, config: { ...panelConfig }, title }
        : panel
    );
    
    setPanels(updatedPanels);
    // Update the specific tab's panels
    setPanelsByTab(prev => ({
      ...prev,
      [activeFuelTab]: updatedPanels
    }));
    
    console.log('Panel configuration saved');
    setShowConfigModal(false);
    setActivePanel(null);
  };
  
  // Task 4: Save custom graph to quick graphs list
  const saveCustomGraph = () => {
    if (!panelConfig.chartType || !panelConfig.xAxis || panelConfig.primaryYAxis.length === 0) {
      alert('Please configure the graph completely before saving');
      return;
    }
    
    const graphName = prompt('Enter a name for this graph:');
    if (!graphName) return;
    
    const customGraph = {
      id: `CUSTOM_${Date.now()}`,
      name: graphName,
      chartType: panelConfig.chartType,
      xAxis: panelConfig.xAxis.id,
      yAxis: panelConfig.primaryYAxis.map(f => f.id),
      legend: panelConfig.legend?.id,
      config: { ...panelConfig },
      tab: activeFuelTab,
      fuelType: activeFuelTab
    };
    
    setCustomSavedGraphs(prev => [...prev, customGraph]);
    alert(`Graph "${graphName}" saved successfully!`);
  };
  
  // Task 2 & 3: Apply quick graph to current panel - populate fields automatically
  const applyQuickGraph = (quickGraph) => {
    console.log('🎯 Applying quick graph:', quickGraph);
    console.log('📊 Available fields:', availableFields);
    
    // Special handling for table charts with columns property
    if (quickGraph.chartType === 'table' && quickGraph.columns && quickGraph.columns.length > 0) {
      console.log('🔧 Converting table columns to xAxis/yAxis:', {
        chartType: quickGraph.chartType,
        originalColumns: quickGraph.columns,
        convertedXAxis: quickGraph.columns[0],
        convertedYAxis: quickGraph.columns.slice(1)
      });
      // Convert columns to xAxis (first column) and primaryYAxis (remaining columns)
      const tableGraph = {
        ...quickGraph,
        xAxis: quickGraph.columns[0],
        yAxis: quickGraph.columns.slice(1)
      };
      quickGraph = tableGraph;
    }
    
    // Helper function to find field by multiple criteria
    const findField = (fieldId, fieldsList) => {
      if (!fieldId || !fieldsList) return null;
      
      // Try exact ID match
      let field = fieldsList.find(f => f.id === fieldId);
      if (field) return field;
      
      // Try name match (case insensitive)
      field = fieldsList.find(f => f.name && f.name.toLowerCase() === fieldId.toLowerCase());
      if (field) return field;
      
      // Try partial match in name or id
      field = fieldsList.find(f => 
        (f.id && f.id.toLowerCase().includes(fieldId.toLowerCase())) ||
        (f.name && f.name.toLowerCase().includes(fieldId.toLowerCase()))
      );
      if (field) return field;
      
      return null;
    };
    
    // Helper to create a dynamic field if not found
    const createDynamicField = (fieldId, isMeasure = false) => {
      console.log(`⚠️ Creating dynamic field for: ${fieldId}`);
      return {
        id: fieldId,
        name: fieldId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        table: 'buses',
        type: isMeasure ? 'numeric' : 'categorical',
        aggregation: isMeasure ? ['avg', 'sum', 'min', 'max', 'count'] : undefined
      };
    };
    
    // Find or create X-Axis field
    let xAxisField = findField(quickGraph.xAxis, availableFields.dimensions) || 
                     findField(quickGraph.xAxis, availableFields.measures);
    
    if (!xAxisField && quickGraph.xAxis) {
      // Check if it's likely a measure based on common patterns
      const isMeasure = quickGraph.xAxis.includes('score') || 
                       quickGraph.xAxis.includes('pct') || 
                       quickGraph.xAxis.includes('avg') ||
                       quickGraph.xAxis.includes('sum') ||
                       quickGraph.xAxis.includes('lmp') ||
                       quickGraph.xAxis.includes('headroom') ||
                       quickGraph.xAxis.includes('hours');
      xAxisField = createDynamicField(quickGraph.xAxis, isMeasure);
    }
    
    // Find or create Y-Axis fields
    const yAxisFields = (quickGraph.yAxis || []).map(yId => {
      let field = findField(yId, availableFields.measures) ||
                  findField(yId, availableFields.dimensions);
      
      if (!field && yId) {
        field = createDynamicField(yId, true); // Y-axis fields are typically measures
      }
      
      return field;
    }).filter(Boolean);
    
    // Find or create Legend field
    let legendField = null;
    if (quickGraph.legend) {
      legendField = findField(quickGraph.legend, availableFields.dimensions) ||
                    findField(quickGraph.legend, availableFields.measures);
      
      if (!legendField) {
        legendField = createDynamicField(quickGraph.legend, false);
      }
    }
    
    // Find or create Size field (for bubble/scatter charts)
    let sizeField = null;
    if (quickGraph.size) {
      sizeField = findField(quickGraph.size, availableFields.measures) ||
                  findField(quickGraph.size, availableFields.dimensions);
      
      if (!sizeField) {
        sizeField = createDynamicField(quickGraph.size, true);
      }
    }
    
    // Find or create Color field (for scatter charts)
    let colorField = null;
    if (quickGraph.color) {
      colorField = findField(quickGraph.color, availableFields.measures) ||
                   findField(quickGraph.color, availableFields.dimensions);
      
      if (!colorField) {
        colorField = createDynamicField(quickGraph.color, true);
      }
    }
    
    console.log('✅ Mapped fields:', {
      xAxis: xAxisField,
      yAxis: yAxisFields,
      legend: legendField,
      size: sizeField,
      color: colorField
    });
    
    console.log('🎯 Final quick graph configuration:', {
      chartType: quickGraph.chartType,
      quickGraphId: quickGraph.id,
      xAxisField: xAxisField?.name,
      yAxisFields: yAxisFields.map(f => f.name),
      legendField: legendField?.name,
      sizeField: sizeField?.name,
      colorField: colorField?.name,
      limit: quickGraph.limit,
      columns: quickGraph.columns
    });
    
    // Task 2: Populate the configuration with x-axis, y-axis, and other settings
    const newConfig = {
      ...panelConfig,
      chartType: quickGraph.chartType,
      xAxis: xAxisField,
      primaryYAxis: yAxisFields.map(f => ({ 
        ...f, 
        aggregation: quickGraph.aggregation || (f.aggregation ? f.aggregation[0] : 'avg')
      })),
      legend: legendField,
      size: sizeField,
      color: colorField,
      limit: quickGraph.limit,
      columns: quickGraph.columns,
      dataSource: selectedDatabase,
      showDataLabels: false,
      showGridLines: true
    };
    
    console.log('🎨 New panel config:', newConfig);
    
    // Update the panel config state - this will automatically show in field wells
    setPanelConfig(newConfig);
    setShowQuickGraphs(false);
    
    // Scroll to field configuration area so user can see the populated fields
    setTimeout(() => {
      const fieldWells = document.querySelector('.field-wells');
      if (fieldWells) {
        fieldWells.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };
  
  // Task 4: Clear all panels in current tab (tab-specific)
  const clearAllPanels = () => {
    if (!confirm(`Clear all panels in ${activeFuelTab} tab?`)) {
      return;
    }
    
    // Create fresh panels with no configurations
    const clearedPanels = panels.map(panel => ({
      ...panel,
      config: null,
      data: null
    }));
    
    setPanels(clearedPanels);
    setPanelsByTab(prev => ({
      ...prev,
      [activeFuelTab]: clearedPanels
    }));
    
    // Also save to localStorage
    setTimeout(() => {
      localStorage.setItem('analyticsState', JSON.stringify({
        panels: clearedPanels,
        activeFuelTab,
        panelsByTab: {
          ...panelsByTab,
          [activeFuelTab]: clearedPanels
        }
      }));
    }, 100);
  };
  
  // Task 5: Apply filter to data with highlighting support
  const applyFilter = () => {
    if (!activePanel) return;
    
    const panel = panels.find(p => p.id === activePanel);
    if (!panel || !panel.config) return;
    
    const data = getRealData(panel.config);
    if (!filterValue.trim()) {
      // Update panel config to remove filter highlighting
      setPanels(prevPanels => prevPanels.map(p => 
        p.id === activePanel 
          ? { ...p, config: { ...p.config, _filteredData: null, _highlightValue: null } }
          : p
      ));
      setFilteredData(data);
      return;
    }
    
    // Filter data based on any field containing the filter value
    const filtered = data.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(filterValue.toLowerCase())
      );
    });
    
    setFilteredData(filtered);
    
    // Update panel config with filtered data and highlight value for comparison
    setPanels(prevPanels => prevPanels.map(p => 
      p.id === activePanel 
        ? { 
            ...p, 
            config: { 
              ...p.config, 
              _filteredData: filtered, 
              _highlightValue: filterValue,
              _originalData: data // Keep original for comparison
            } 
          }
        : p
    ));
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
      const newFuel = newFuelType.trim();
      setFuelTypes([...fuelTypes, newFuel]);
      // Initialize panels for the new fuel type
      setPanelsByTab(prev => ({
        ...prev,
        [newFuel]: [...defaultPanels]
      }));
      setActiveFuelTab(newFuel);
      setNewFuelType('');
      setShowAddFuelModal(false);
    }
  };

  return (
    <div className="analytics-page">
      
      {/* Task 1: Fuel Type Tabs - All resource types in one horizontal bar */}
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
        
        {/* Task 4: Clear All Panels Button - Tab Specific */}
        <button 
          className="clear-all-panels-btn"
          onClick={clearAllPanels}
          title="Clear all panels in current tab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          Clear All Panels
        </button>
      </div>
      
      {/* 4-Panel Grid with Individual Resizable Tiles */}
      <div className="analytics-grid-container">
        <div className="panels-grid">
          {(panels || []).map((panel, index) => (
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
                <div className="panel-header-actions">
                  {/* Task 2: Filter button moved to panel header */}
                  <button 
                    className="panel-filter-btn"
                    onClick={() => {
                      setActivePanel(panel.id);
                      setShowFilterPopup(true);
                    }}
                    disabled={!panel.config}
                    title="Filter data"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                  </button>
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
              <div className="fields-pane" style={{ width: `${measureColumnWidth}px` }}>
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
                  <div className="field-list" style={{ height: `${dimensionsHeight}px` }}>
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
                  {/* Vertical resize handle for dimensions */}
                  <div 
                    className="field-list-resize-handle"
                    onMouseDown={handleDimensionsResizeStart}
                    title="Drag to resize"
                  >
                    <div className="resize-indicator-horizontal"></div>
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
                  <div className="field-list" style={{ height: `${measuresHeight}px` }}>
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
                  {/* Vertical resize handle for measures */}
                  <div 
                    className="field-list-resize-handle"
                    onMouseDown={handleMeasuresResizeStart}
                    title="Drag to resize"
                  >
                    <div className="resize-indicator-horizontal"></div>
                  </div>
                </div>
                
                {/* Task 2: Resize handle for the fields pane */}
                <div 
                  className="pane-resize-handle"
                  onMouseDown={handleMeasureColumnResizeStart}
                  title="Drag to resize"
                >
                  <div className="resize-indicator"></div>
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
                
                {/* Task 3: Quick Graphs Dropdown in Format Column */}
                <div className="format-section">
                  <label className="format-label">Format Options</label>
                  <div className="quick-graphs-dropdown">
                    <button 
                      className="quick-graphs-btn"
                      onClick={() => setShowQuickGraphs(!showQuickGraphs)}
                      title="Select from preconfigured analytics graphs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      Quick Graphs
                    </button>
                    
                    {showQuickGraphs && (
                      <div className="quick-graphs-menu">
                        <div className="quick-graphs-header">
                          <div className="quick-graphs-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                            </svg>
                            <h4>Quick Analytics</h4>
                          </div>
                          <button onClick={() => setShowQuickGraphs(false)} className="close-btn">×</button>
                        </div>
                        <div className="quick-graphs-category">
                          <div className="category-label">
                            <span className="category-icon">📊</span>
                            <span className="category-name">{activeFuelTab}</span>
                            <span className="category-count">{getQuickGraphs().length} graphs</span>
                          </div>
                        </div>
                        <div className="quick-graphs-list">
                          {getQuickGraphs().map(graph => {
                            const chartType = chartTypes.find(c => c.id === graph.chartType);
                            return (
                              <button
                                key={graph.id}
                                className="quick-graph-item"
                                onClick={() => applyQuickGraph(graph)}
                                title={`${graph.name}\n\nChart: ${chartType?.name || graph.chartType}\nX-Axis: ${graph.xAxis}\nY-Axis: ${Array.isArray(graph.yAxis) ? graph.yAxis.join(', ') : graph.yAxis}${graph.legend ? '\nLegend: ' + graph.legend : ''}`}
                              >
                                <div className="graph-icon-wrapper">
                                  <span className="graph-id">{graph.id}</span>
                                  {chartType && (
                                    <div className="graph-chart-icon-container">
                                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="graph-chart-icon" dangerouslySetInnerHTML={{__html: chartType.svg}}></svg>
                                    </div>
                                  )}
                                </div>
                                <div className="graph-details">
                                  <span className="graph-name">{graph.name}</span>
                                  <div className="graph-meta">
                                    <span className="graph-type">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                      </svg>
                                      {chartType?.name || graph.chartType}
                                    </span>
                                    <span className="graph-axes">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="3" y1="12" x2="21" y2="12"/>
                                        <line x1="12" y1="3" x2="12" y2="21"/>
                                      </svg>
                                      {graph.yAxis?.length || 1} axis
                                    </span>
                                  </div>
                                </div>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="graph-arrow">
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </button>
                            );
                          })}
                          
                          {/* Show custom saved graphs */}
                          {customSavedGraphs.filter(g => g.fuelType === activeFuelTab).length > 0 && (
                            <div className="custom-graphs-divider">
                              <div className="divider-line"></div>
                              <span className="divider-text">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                Custom Saved
                              </span>
                              <div className="divider-line"></div>
                            </div>
                          )}
                          {customSavedGraphs
                            .filter(g => g.fuelType === activeFuelTab)
                            .map(graph => {
                              const chartType = chartTypes.find(c => c.id === graph.chartType);
                              return (
                                <button
                                  key={graph.id}
                                  className="quick-graph-item custom"
                                  onClick={() => applyQuickGraph(graph)}
                                  title={`Custom: ${graph.name}`}
                                >
                                  <div className="graph-icon-wrapper">
                                    <span className="graph-id custom-star">⭐</span>
                                    {chartType && (
                                      <div className="graph-chart-icon-container">
                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="graph-chart-icon" dangerouslySetInnerHTML={{__html: chartType.svg}}></svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="graph-details">
                                    <span className="graph-name">{graph.name}</span>
                                    <div className="graph-meta">
                                      <span className="graph-type">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                        </svg>
                                        {chartType?.name || graph.chartType}
                                      </span>
                                    </div>
                                  </div>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="graph-arrow">
                                    <polyline points="9 18 15 12 9 6"/>
                                  </svg>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
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
              
              {/* Task 4: Save Custom Graph Button */}
              <button 
                className="btn-save-custom"
                onClick={saveCustomGraph}
                disabled={!panelConfig.chartType || !panelConfig.xAxis || panelConfig.primaryYAxis.length === 0}
                title="Save this configuration as a custom quick graph"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save Graph
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
      
      {/* Task 2 & 5: Filter Popup */}
      {showFilterPopup && (
        <div className="modal-overlay filter-popup-overlay" onClick={() => setShowFilterPopup(false)}>
          <div className="filter-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="filter-popup-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filter and Compare Data
              </h2>
              <button 
                className="filter-close-btn"
                onClick={() => setShowFilterPopup(false)}
                title="Close filter"
              >
                ×
              </button>
            </div>
            
            <div className="filter-popup-body">
              <div className="filter-controls">
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Search by bus ID, zone, or any parameter..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                />
                <button 
                  className="filter-apply-btn"
                  onClick={applyFilter}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  Apply Filter
                </button>
                <button 
                  className="filter-clear-btn"
                  onClick={() => {
                    setFilterValue('');
                    setFilteredData(null);
                  }}
                >
                  Clear
                </button>
              </div>
              
              <div className="filter-results">
                {activePanel && panels.find(p => p.id === activePanel)?.config ? (
                  <div className="filtered-chart-container">
                    {filteredData && filteredData.length > 0 ? (
                      <>
                        <p className="filter-count">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {filteredData.length} results found {filterValue && `matching "${filterValue}"`}
                        </p>
                        <div className="filter-info">
                          <span className="filter-legend">
                            <span className="legend-item">
                              <span className="legend-dot highlighted"></span>
                              Matching data
                            </span>
                            <span className="legend-item">
                              <span className="legend-dot dimmed"></span>
                              Other data (dimmed)
                            </span>
                          </span>
                        </div>
                      </>
                    ) : filteredData && filteredData.length === 0 ? (
                      <div className="filter-no-results">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <span>No results match your filter criteria</span>
                      </div>
                    ) : (
                      <p className="filter-instruction">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="M21 21l-4.35-4.35"/>
                        </svg>
                        Enter search criteria above to filter data
                      </p>
                    )}
                    <div className="filtered-chart">
                      {renderChart({
                        ...panels.find(p => p.id === activePanel),
                        config: {
                          ...panels.find(p => p.id === activePanel).config,
                          _filteredData: filteredData && filteredData.length > 0 ? filteredData : null,
                          _highlightValue: filteredData && filteredData.length > 0 ? filterValue : null,
                          _originalData: filteredData && filteredData.length > 0 ? getRealData(panels.find(p => p.id === activePanel).config) : null
                        }
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="filter-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <p>Select a panel with a graph first</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

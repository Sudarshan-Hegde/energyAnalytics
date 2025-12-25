import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Maps.css';
import useGridInfrastructure from '../hooks/useGridInfrastructure';
import { gridDataAPI } from '../services/api';

const Maps = ({ selectedISO }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  
  // Load persisted state from localStorage (Task 6)
  const loadPersistedState = () => {
    try {
      const savedState = localStorage.getItem('mapsState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('📂 Loading persisted Maps state:', parsed);
        
        // Migrate old selectedSubstations data to include bus_id if missing
        if (parsed.selectedSubstations && Array.isArray(parsed.selectedSubstations)) {
          parsed.selectedSubstations = parsed.selectedSubstations.map(sub => ({
            ...sub,
            bus_id: sub.bus_id || sub.id  // Ensure bus_id exists, fallback to id
          }));
          console.log('✅ Migrated selectedSubstations with bus_id:', parsed.selectedSubstations);
        }
        
        return parsed;
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  };
  
  const persistedState = loadPersistedState();
  
  const [selectedSubstations, setSelectedSubstations] = useState(persistedState?.selectedSubstations || []);
  const [selectedHeatmap, setSelectedHeatmap] = useState(persistedState?.selectedHeatmap || '');
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [detailPanelWidth, setDetailPanelWidth] = useState(380);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingDetail, setIsResizingDetail] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  // Store economic data for selected substations
  const [substationEconomics, setSubstationEconomics] = useState({});
  
  // Fetch real grid infrastructure data
  const { 
    buses, 
    branches, 
    generators, 
    busesGeoJSON, 
    branchesGeoJSON, 
    generatorsGeoJSON,
    loading: dataLoading, 
    error: dataError 
  } = useGridInfrastructure();
  
  // Update grid stats from real data
  const [gridStats, setGridStats] = useState({
    totalNodes: 0,
    activeAlerts: 3,
    powerFlow: '0 GW',
    efficiency: 0
  });
  
  // Update stats when data loads
  useEffect(() => {
    if (buses.length > 0 && branches.length > 0) {
      const closedBranches = branches.filter(b => b.status === 'Closed');
      const avgEfficiency = closedBranches.length > 0 
        ? (closedBranches.length / branches.length * 100).toFixed(1)
        : 0;
      
      const totalCapacity = generators.reduce((sum, gen) => sum + (parseFloat(gen.max_capacity_mw) || 0), 0);
      
      setGridStats({
        totalNodes: buses.length,
        activeAlerts: branches.filter(b => b.status === 'Open').length,
        powerFlow: `${(totalCapacity / 1000).toFixed(2)} GW`,
        efficiency: parseFloat(avgEfficiency)
      });
    }
  }, [buses, branches, generators]);

  // Log once when backend is not connected
  useEffect(() => {
    if (!dataLoading && buses.length === 0 && !dataError) {
      console.log('No grid data available - backend API not connected');
    }
  }, [dataLoading, buses.length, dataError]);

  const [currentLayer, setCurrentLayer] = useState(persistedState?.currentLayer || 'satellite');
  const [currentLocation, setCurrentLocation] = useState('Loading location...');
  const [mapCenter, setMapCenter] = useState({ lat: 37.75, lng: -122.4 });
  const [isLayerDropdownOpen, setIsLayerDropdownOpen] = useState(false);
  
  // Dynamic filters state based on actual data
  const [filters, setFilters] = useState({
    voltageRanges: [],
    capacityRanges: [],
    statuses: [],
    regions: []
  });
  const [tempFilters, setTempFilters] = useState({
    state: '',
    county: '',
    voltage: '',
    scenario: '',
    headroom: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    state: '',
    county: '',
    voltage: '',
    scenario: '',
    headroom: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    counties: [],
    voltages: [],
    scenarios: []
  });
  const [dashboardData, setDashboardData] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  
  const [visibleLayers, setVisibleLayers] = useState({
    grids: true,
    substations: true,
    transmissionLines: true,
    distributionLines: true,
    powerPlants: false,
    transformers: true,
    switchingStations: false,
    streetLabels: true,
    overpassPowerLines: false,
    overpassSubstations: false,
    overpassTransformers: false,
    overpassTowers: false,
    overpassGenerators: false,
    overpassCables: false,
    futureSubstationUpgrades: false,
    futureTransmissionUpgrades: false
  });
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(persistedState?.leftSidebarOpen !== undefined ? persistedState.leftSidebarOpen : true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(persistedState?.detailPanelOpen !== undefined ? persistedState.detailPanelOpen : true);
  const [rightPanelOpen, setRightPanelOpen] = useState(persistedState?.rightPanelOpen !== undefined ? persistedState.rightPanelOpen : true);
  const [expandedSections, setExpandedSections] = useState({
    gridInfrastructure: true,
    substations: true,
    tndLines: false,
    generators: false,
    loads: false,
    transformers: false,
    overpass: false,
    heatmaps: false,
    futureOutlook: false
  });
  
  // Remove database management state - moved to Navbar
  const [loadingOverpass, setLoadingOverpass] = useState({});
  const [activeLayers, setActiveLayers] = useState([]);
  const [overpassCache, setOverpassCache] = useState({});
  const moveEndTimerRef = useRef(null);
  const loadedBoundsRef = useRef({});
  const loadingLayersRef = useRef({});
  const visibleLayersRef = useRef(visibleLayers);
  
  // Future Outlook data states
  const [futureSubstationUpgrades, setFutureSubstationUpgrades] = useState([]);
  const [futureTransmissionUpgrades, setFutureTransmissionUpgrades] = useState([]);
  const [futureOutlookLoading, setFutureOutlookLoading] = useState(false);
  
  // Constraint View states
  const [activeRightTab, setActiveRightTab] = useState(persistedState?.activeRightTab || 'constraints'); // 'constraints' or 'dashboard'
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState(persistedState?.selectedScenarios || []);
  const [constraintType, setConstraintType] = useState(persistedState?.constraintType || 'both');
  const [busSearch, setBusSearch] = useState(persistedState?.busSearch || '');
  const [selectedBusesForConstraints, setSelectedBusesForConstraints] = useState(persistedState?.selectedBusesForConstraints || []); // Task 1: Store multiple selected buses
  const [constraints, setConstraints] = useState([]);
  const [constraintsLoading, setConstraintsLoading] = useState(false);
  const [showConstraintModal, setShowConstraintModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  
  // Substation types state (Task 5)
  const [substationTypes, setSubstationTypes] = useState([]);
  const [substationTypesLoading, setSubstationTypesLoading] = useState(false);
  
  // Fetch substation types from database
  useEffect(() => {
    const fetchSubstationTypes = async () => {
      setSubstationTypesLoading(true);
      try {
        const res = await fetch('http://localhost:8000/grid-data/substation-types');
        const data = await res.json();
        if (data.success) {
          setSubstationTypes(data.data);
          console.log('✅ Loaded substation types:', data.data);
        }
      } catch (error) {
        console.error('Error fetching substation types:', error);
      } finally {
        setSubstationTypesLoading(false);
      }
    };
    fetchSubstationTypes();
  }, []);
  
  // Fetch filter options from backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch('http://localhost:8000/grid-data/filter-options');
        const data = await res.json();
        if (data.success) {
          setFilterOptions(data.data);
          console.log('✅ Loaded filter options:', data.data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();
  }, []);
  
  // Compute filtered counties based on selected state
  const availableCounties = useMemo(() => {
    if (!tempFilters.state) {
      // No state selected, show all counties
      return filterOptions.counties;
    }
    
    // Filter buses by selected state and get unique counties
    const countiesInState = [...new Set(
      buses
        .filter(bus => bus.state === tempFilters.state && bus.county)
        .map(bus => bus.county)
    )].sort();
    
    return countiesInState;
  }, [tempFilters.state, filterOptions.counties, buses]);
  
  // Fetch dashboard data for selected buses
  useEffect(() => {
    console.log('📊 Dashboard useEffect triggered. Selected buses:', selectedSubstations.length);
    
    if (selectedSubstations.length === 0) {
      setDashboardData([]);
      console.log('⚠️ No buses selected, clearing dashboard data');
      return;
    }
    
    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      try {
        const params = new URLSearchParams();
        selectedSubstations.forEach(sub => {
          params.append('buses[]', sub.name);
        });
        
        const url = `http://localhost:8000/grid-data/bus-dashboard?${params}`;
        console.log('🔄 Fetching dashboard data from:', url);
        
        const res = await fetch(url);
        const data = await res.json();
        
        console.log('📥 Dashboard response:', data);
        
        if (data.success) {
          setDashboardData(data.data);
          console.log('✅ Dashboard data loaded:', data.data.length, 'buses');
        } else {
          console.error('❌ Dashboard fetch failed:', data);
        }
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [selectedSubstations]);
  
  // Fetch economic data for selected substations
  useEffect(() => {
    console.log('💰 Economic data useEffect triggered. Selected buses:', selectedSubstations.length);
    
    if (selectedSubstations.length === 0) {
      setSubstationEconomics({});
      return;
    }
    
    const fetchEconomicData = async () => {
      try {
        const economicDataPromises = selectedSubstations.map(async (sub) => {
          try {
            console.log(`🔍 Fetching economic data for bus_id: "${sub.bus_id}" (type: ${typeof sub.bus_id})`);
            const response = await gridDataAPI.getEconomicData(sub.bus_id);
            console.log(`📊 Raw response for bus ${sub.bus_id}:`, JSON.stringify(response.data, null, 2));
            
            // Check if we got data
            if (response.data.success) {
              if (response.data.data && response.data.data.length > 0) {
                console.log(`✅ Found economic data for bus ${sub.bus_id}:`, response.data.data[0]);
                return {
                  busId: sub.bus_id,
                  data: response.data.data[0]
                };
              } else {
                console.warn(`⚠️ No economic data found for bus ${sub.bus_id}. Response count: ${response.data.count}`);
                return { busId: sub.bus_id, data: null };
              }
            } else {
              console.error(`❌ API returned success=false for bus ${sub.bus_id}`);
              return { busId: sub.bus_id, data: null };
            }
          } catch (error) {
            console.error(`❌ Error fetching economic data for bus ${sub.bus_id}:`, error);
            console.error('Error details:', error.response?.data || error.message);
            return { busId: sub.bus_id, data: null };
          }
        });
        
        const results = await Promise.all(economicDataPromises);
        const economicsMap = {};
        results.forEach(result => {
          // Store even if data is null, so we know we tried to fetch it
          economicsMap[result.busId] = result.data;
        });
        
        console.log('✅ All economic data loaded. Map keys:', Object.keys(economicsMap));
        console.log('📊 Economics map:', economicsMap);
        setSubstationEconomics(economicsMap);
      } catch (error) {
        console.error('❌ Error fetching economic data:', error);
      }
    };
    
    fetchEconomicData();
  }, [selectedSubstations]);
  
  // Fetch Future Outlook data when map loads
  useEffect(() => {
    const fetchFutureOutlookData = async () => {
      setFutureOutlookLoading(true);
      try {
        // Fetch substation upgrades
        const substationRes = await fetch('http://localhost:8000/grid-data/future-outlook/substation-upgrades');
        const substationData = await substationRes.json();
        if (substationData.success) {
          setFutureSubstationUpgrades(substationData.data);
        }
        
        // Fetch transmission upgrades
        const transmissionRes = await fetch('http://localhost:8000/grid-data/future-outlook/transmission-upgrades');
        const transmissionData = await transmissionRes.json();
        if (transmissionData.success) {
          setFutureTransmissionUpgrades(transmissionData.data);
        }
        
        console.log('✅ Future Outlook data loaded:', {
          substations: substationData.data?.length || 0,
          transmissions: transmissionData.data?.length || 0
        });
      } catch (error) {
        console.error('❌ Error loading Future Outlook data:', error);
      } finally {
        setFutureOutlookLoading(false);
      }
    };
    
    fetchFutureOutlookData();
  }, []);
  
  // Fetch available scenarios
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await fetch('http://localhost:8000/grid-data/scenarios');
        const data = await res.json();
        if (data.success) {
          setScenarios(data.data);
        }
      } catch (error) {
        console.error('Error fetching scenarios:', error);
      }
    };
    fetchScenarios();
  }, []);
  
  // Fetch constraints when selections change
  // Fetch constraints based on selected buses (Task 1)
  useEffect(() => {
    if (selectedScenarios.length === 0) {
      setConstraints([]);
      return;
    }
    
    const fetchConstraints = async () => {
      setConstraintsLoading(true);
      try {
        const params = new URLSearchParams();
        selectedScenarios.forEach(s => params.append('scenarios[]', s));
        params.append('type', constraintType);
        
        // If buses are selected, fetch constraints for those buses
        if (selectedBusesForConstraints.length > 0) {
          selectedBusesForConstraints.forEach(bus => params.append('buses[]', bus));
        } else if (busSearch) {
          params.append('search', busSearch);
        }
        
        const res = await fetch(`http://localhost:8000/grid-data/constraints?${params}`);
        const data = await res.json();
        if (data.success) {
          setConstraints(data.data);
        }
      } catch (error) {
        console.error('Error fetching constraints:', error);
      }
      setConstraintsLoading(false);
    };
    
    fetchConstraints();
  }, [selectedScenarios, constraintType, busSearch, selectedBusesForConstraints]);
  
  // Keep ref in sync with state
  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
  }, [visibleLayers]);
  
  // Save state to localStorage when it changes (Task 6)
  useEffect(() => {
    const stateToSave = {
      selectedSubstations,
      selectedHeatmap,
      leftSidebarOpen,
      detailPanelOpen,
      rightPanelOpen,
      currentLayer,
      busSearch,
      selectedBusesForConstraints,
      selectedScenarios,
      constraintType,
      activeRightTab
    };
    
    try {
      localStorage.setItem('mapsState', JSON.stringify(stateToSave));
      console.log('💾 Saved Maps state to localStorage');
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [selectedSubstations, selectedHeatmap, leftSidebarOpen, detailPanelOpen, rightPanelOpen, currentLayer, busSearch, selectedBusesForConstraints, selectedScenarios, constraintType, activeRightTab]);

  // Function to create base style with political boundaries overlay
  const createMapStyle = (baseLayer) => {
    const baseStyles = {
      satellite: {
        source: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri'
        },
        layer: {
          id: 'satellite-tiles',
          type: 'raster',
          source: 'satellite-source'
        }
      },
      streets: {
        source: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        },
        layer: {
          id: 'streets-tiles',
          type: 'raster',
          source: 'streets-source'
        }
      },
      terrain: {
        source: {
          type: 'raster',
          tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenTopoMap contributors'
        },
        layer: {
          id: 'terrain-tiles',
          type: 'raster',
          source: 'terrain-source'
        }
      },
      dark: {
        source: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© CARTO'
        },
        layer: {
          id: 'dark-tiles',
          type: 'raster',
          source: 'dark-source'
        }
      }
    };

    const selectedStyle = baseStyles[baseLayer];
    
    // Create complete style with political boundaries overlay and globe projection
    return {
      version: 8,
      projection: {
        type: 'globe'
      },
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        [selectedStyle.layer.source]: selectedStyle.source,
        'countries': {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
        },
        'openstreetmap': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        },
        'overpass-power': {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        }
      },
      layers: [
        selectedStyle.layer,
        // Country borders
        {
          id: 'country-boundaries',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': '#ff6b6b',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              5, 2,
              10, 3
            ],
            'line-opacity': 0.8
          }
        },
        // Country names
        {
          id: 'country-labels',
          type: 'symbol',
          source: 'countries',
          layout: {
            'text-field': ['get', 'ADMIN'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 8,
              5, 12,
              10, 16
            ],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular']
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-halo-blur': 1
          }
        },
        // OSM street labels overlay (shows at higher zoom)
        {
          id: 'osm-labels',
          type: 'raster',
          source: 'openstreetmap',
          minzoom: 10,
          maxzoom: 18,
          paint: {
            'raster-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0.4,
              12, 0.7,
              15, 0.9
            ]
          },
          layout: {
            'visibility': 'visible'
          }
        }
      ]
    };
  };

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // CRITICAL: Use window.onerror to intercept and suppress errors BEFORE they break execution
    // This is the ONLY way to prevent MapLibre's internal queryRenderedFeatures crashes from breaking clicks
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (message && (message.includes('unknown feature value') || message.includes('Uncaught Error: unknown feature value'))) {
        console.warn('⚠️ Suppressed OSM tile error (prevents click breaking):', message);
        return true; // TRUE = suppress error completely, prevent default handling
      }
      // Pass other errors to original handler
      if (originalOnError) {
        return originalOnError.apply(this, arguments);
      }
      return false; // FALSE = allow error to propagate normally
    };
    console.log('✅ Installed window.onerror handler to intercept OSM tile crashes');

    // Define initialization function that checks container and dimensions
    const initializeMap = () => {
      if (!mapContainer.current) {
        console.log('Map container not ready, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }
      
      const width = mapContainer.current.offsetWidth;
      const height = mapContainer.current.offsetHeight;
      
      if (width === 0 || height === 0) {
        console.warn('Map container has no dimensions, waiting...');
        // Retry after a short delay
        setTimeout(initializeMap, 100);
        return;
      }

      try {
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: createMapStyle('satellite'), // OSM satellite with boundaries
          center: [-95, 37], // Centered on USA
          zoom: 4,
          renderWorldCopies: false, // Disable world wrapping for globe
          attributionControl: false,
          antialias: true,
          maxPitch: 85
        });

      // CRITICAL FIX: Patch queryRenderedFeatures to catch OSM tile errors INSIDE the method
      // This prevents errors from breaking the click event chain
      const originalQueryRenderedFeatures = map.current.queryRenderedFeatures.bind(map.current);
      map.current.queryRenderedFeatures = function(...args) {
        try {
          return originalQueryRenderedFeatures(...args);
        } catch (error) {
          if (error.message && error.message.includes('unknown feature value')) {
            console.warn('⚠️ Caught OSM tile error inside queryRenderedFeatures (returning empty array)');
            return []; // Return empty array instead of crashing
          }
          throw error; // Re-throw other errors
        }
      };
      console.log('✅ Patched map.queryRenderedFeatures to handle OSM tile errors');

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
      
      // Add atmosphere effect for globe
      map.current.on('style.load', () => {
        if (!map.current) return;
        try {
          // MapLibre GL JS v4+ globe is set via style projection, not setProjection
          // The projection is already set in the style object
          console.log('3D Globe with OSM overlays enabled');
        } catch (e) {
          console.warn('Globe effects not supported:', e);
        }
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
        updateLocation(map.current.getCenter());
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

      // Update location when map moves or zooms
      map.current.on('moveend', () => {
        const center = map.current.getCenter();
        setMapCenter({ lat: center.lat, lng: center.lng });
        updateLocation(center);
        
        // Debounce to prevent API spam
        if (moveEndTimerRef.current) {
          clearTimeout(moveEndTimerRef.current);
        }
        
        moveEndTimerRef.current = setTimeout(() => {
          refreshVisibleOverpassLayers();
        }, 1000); // 1 second debounce to prevent API spam
      });
      
      // Also reload on zoom end
      map.current.on('zoomend', () => {
        if (moveEndTimerRef.current) {
          clearTimeout(moveEndTimerRef.current);
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }
    };
    
    // Start initialization after a small delay to ensure DOM is ready
    const initTimer = setTimeout(initializeMap, 50);

    return () => {
      clearTimeout(initTimer);
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Extract dynamic filter options from actual data
  useEffect(() => {
    if (buses.length > 0 || branches.length > 0 || generators.length > 0) {
      // Get unique voltage levels from buses
      const voltages = [...new Set(buses.map(b => b.nominal_voltage).filter(v => v))].sort((a, b) => b - a);
      const voltageRanges = voltages.length > 0 ? voltages.map(v => ({
        label: `${v} kV`,
        value: v,
        count: buses.filter(b => b.nominal_voltage === v).length
      })) : [
        // Default voltage levels if no data available
        { label: '345 kV', value: 345, count: 0 },
        { label: '230 kV', value: 230, count: 0 },
        { label: '115 kV', value: 115, count: 0 },
        { label: '69 kV', value: 69, count: 0 }
      ];
      
      // Get capacity ranges from generators
      const capacities = generators.map(g => g.max_capacity).filter(c => c);
      const maxCapacity = Math.max(...capacities, 0);
      const capacityRanges = maxCapacity > 0 ? [
        { label: '0-100 MW', min: 0, max: 100, count: generators.filter(g => g.max_capacity >= 0 && g.max_capacity <= 100).length },
        { label: '100-500 MW', min: 100, max: 500, count: generators.filter(g => g.max_capacity > 100 && g.max_capacity <= 500).length },
        { label: '500+ MW', min: 500, max: Infinity, count: generators.filter(g => g.max_capacity > 500).length }
      ].filter(r => r.count > 0) : [];
      
      // Get unique statuses from branches
      const statuses = [...new Set(branches.map(b => b.status).filter(s => s))];
      const statusOptions = statuses.map(s => ({
        label: s,
        value: s,
        count: branches.filter(b => b.status === s).length
      }));
      
      // Get unique regions from buses
      const regions = [...new Set(buses.map(b => b.state).filter(s => s))].sort();
      const regionOptions = regions.map(r => ({
        label: r,
        value: r,
        count: buses.filter(b => b.state === r).length
      }));
      
      setFilters({
        voltageRanges,
        capacityRanges,
        statuses: statusOptions,
        regions: regionOptions
      });
    } else {
      // Set default filters when no data is available
      setFilters({
        voltageRanges: [
          { label: '345 kV', value: 345, count: 0 },
          { label: '230 kV', value: 230, count: 0 },
          { label: '115 kV', value: 115, count: 0 },
          { label: '69 kV', value: 69, count: 0 }
        ],
        capacityRanges: [],
        statuses: [],
        regions: []
      });
    }
  }, [buses, branches, generators]);

  // Add real grid infrastructure data layers when data loads and map is ready
  useEffect(() => {
    if (!map.current || !mapLoaded || dataLoading || busesGeoJSON.features.length === 0) return;

    console.log(`🔵 Loading ${busesGeoJSON.features.length} buses, ${branchesGeoJSON.features.length} branches`);
    console.log('🔍 First bus sample:', busesGeoJSON.features[0]);

    // Add buses source and layers
    if (!map.current.getSource('real-buses-source')) {
      map.current.addSource('real-buses-source', {
        type: 'geojson',
        data: busesGeoJSON,
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50,
        generateId: true // Enable feature state for interactivity
      });

      // Clustered circles layer
      map.current.addLayer({
        id: 'real-buses-clusters',
        type: 'circle',
        source: 'real-buses-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            10,
            '#f1f075',
            30,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            10,
            20,
            30,
            25
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8
        }
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'real-buses-cluster-count',
        type: 'symbol',
        source: 'real-buses-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Individual bus points - color coded by voltage
      // Place as the last layer to ensure it's always on top and clickable
      map.current.addLayer({
        id: 'real-buses-points',
        type: 'circle',
        source: 'real-buses-source',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'visibility': 'visible'
        },
        paint: {
          'circle-color': [
            'match',
            ['get', 'voltage'],
            345, '#9333ea', // Purple for 345kV
            230, '#3b82f6', // Blue for 230kV
            115, '#10b981', // Green for 115kV
            69, '#f59e0b',  // Amber for 69kV
            '#6b7280'       // Gray for others
          ],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 8,
            8, 12,
            12, 16,
            16, 20
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1.0,
          'circle-stroke-opacity': 1.0,
          'circle-pitch-alignment': 'map' // Ensure circles stay aligned with map
        }
      }); // Add as last layer (no beforeId) to ensure it's on top

      // Bus labels at higher zoom
      map.current.addLayer({
        id: 'real-buses-labels',
        type: 'symbol',
        source: 'real-buses-source',
        filter: ['!', ['has', 'point_count']],
        minzoom: 11,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      });

      // CRITICAL: Move bus layers to absolute top to ensure they're clickable above all raster layers
      // This is necessary because OSM raster layers can block pointer events
      try {
        if (map.current.getLayer('real-buses-clusters')) {
          map.current.moveLayer('real-buses-clusters');
        }
        if (map.current.getLayer('real-buses-cluster-count')) {
          map.current.moveLayer('real-buses-cluster-count');
        }
        if (map.current.getLayer('real-buses-points')) {
          map.current.moveLayer('real-buses-points');
        }
        if (map.current.getLayer('real-buses-labels')) {
          map.current.moveLayer('real-buses-labels');
        }
        console.log('✅ Bus layers moved to top for clickability');
      } catch (err) {
        console.warn('Could not move layers:', err);
      }

      console.log('🔧 Attaching DIRECT click handler to real-buses-points layer...');

      // Set cursor to pointer globally over the map (avoid hover queries that crash)
      map.current.getCanvas().style.cursor = 'pointer';

      // NUCLEAR OPTION: Bypass MapLibre's broken internal feature detection
      // Attach to canvas click event BEFORE MapLibre processes it
      map.current.on('click', (e) => {
        console.log('🎯 RAW map click detected at', e.lngLat);
        
        // Manually check if click is near any substation
        if (busesGeoJSON?.features && busesGeoJSON.features.length > 0) {
          // Convert click position to screen coordinates
          const clickPixel = map.current.project(e.lngLat);
          
          // Click tolerance in pixels (larger = easier to click)
          const pixelTolerance = 30;
          
          console.log(`🔍 Checking ${busesGeoJSON.features.length} substations (tolerance: ${pixelTolerance}px)`);
          
          // Find closest substation within pixel tolerance
          let closestFeature = null;
          let closestPixelDistance = Infinity;
          
          busesGeoJSON.features.forEach((feature) => {
            const [lng, lat] = feature.geometry.coordinates;
            
            // Convert substation coordinates to screen pixels
            const featurePixel = map.current.project([lng, lat]);
            
            // Calculate pixel distance
            const pixelDistance = Math.sqrt(
              Math.pow(featurePixel.x - clickPixel.x, 2) + 
              Math.pow(featurePixel.y - clickPixel.y, 2)
            );
            
            if (pixelDistance < pixelTolerance && pixelDistance < closestPixelDistance) {
              closestPixelDistance = pixelDistance;
              closestFeature = feature;
            }
          });
          
          if (closestFeature) {
            const props = closestFeature.properties;
            console.log(`✅ Substation clicked (manual detection)! Distance: ${closestPixelDistance.toFixed(1)}px`, props);
            
            const substationData = {
              id: props.id,
              bus_id: props.id,  // Add bus_id for economic data lookup
              name: props.name,
              voltage: props.voltage,
              county: props.county,
              state: props.state,
              shortCircuit: props.shortCircuit,
              lmp2022: props.lmp2022,
              lmp2023: props.lmp2023,
              lmp2024: props.lmp2024,
              lmp2025: props.lmp2025,
              coordinates: e.lngLat
            };
            
            handleSubstationClick(substationData);
          } else {
            console.log(`❌ No substation found within ${pixelTolerance}px of click`);
          }
        }
      });
      console.log('✅ MANUAL click detection enabled - BYPASSING MapLibre feature detection!');
    }

    // Add branches (transmission lines) source and layer
    if (!map.current.getSource('real-branches-source')) {
      map.current.addSource('real-branches-source', {
        type: 'geojson',
        data: branchesGeoJSON
      });

      map.current.addLayer({
        id: 'real-branches-lines',
        type: 'line',
        source: 'real-branches-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'status'],
            'Closed', '#10b981',  // Green for closed/active
            'Open', '#ef4444',    // Red for open/inactive
            '#6b7280'             // Gray for unknown
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 1.5,
            12, 2.5,
            16, 3.5
          ],
          'line-opacity': 0.7,
          'line-dasharray': [
            'match',
            ['get', 'status'],
            'Open', ['literal', [4, 2]], // Dashed for open lines
            ['literal', [1, 0]]            // Solid for closed
          ]
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });

      // Add hover effect for branches
      map.current.on('mouseenter', 'real-branches-lines', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'real-branches-lines', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Add popup on branch click
      map.current.on('click', 'real-branches-lines', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="color: #000; font-family: Inter, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Transmission Line</h3>
                <p style="margin: 4px 0;"><strong>From Bus:</strong> ${props.from_bus}</p>
                <p style="margin: 4px 0;"><strong>To Bus:</strong> ${props.to_bus}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${props.status === 'Closed' ? '#10b981' : '#ef4444'}">${props.status}</span></p>
                <p style="margin: 4px 0;"><strong>Length:</strong> ${props.length ? props.length.toFixed(2) + ' mi' : 'N/A'}</p>
              </div>
            `)
            .addTo(map.current);
        }
      });
    }

    // Add generators source and layer if data available
    if (generatorsGeoJSON.features.length > 0 && !map.current.getSource('real-generators-source')) {
      map.current.addSource('real-generators-source', {
        type: 'geojson',
        data: generatorsGeoJSON
      });

      map.current.addLayer({
        id: 'real-generators-points',
        type: 'circle',
        source: 'real-generators-source',
        paint: {
          'circle-color': '#fbbf24',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 5,
            12, 9,
            16, 13
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85
        },
        layout: {
          'visibility': visibleLayers.powerPlants ? 'visible' : 'none'
        }
      });

      // Generator hover and click
      map.current.on('mouseenter', 'real-generators-points', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'real-generators-points', () => {
        map.current.getCanvas().style.cursor = '';
      });

      map.current.on('click', 'real-generators-points', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="color: #000; font-family: Inter, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Generator</h3>
                <p style="margin: 4px 0;"><strong>Name:</strong> ${props.name}</p>
                <p style="margin: 4px 0;"><strong>Capacity:</strong> ${props.capacity} MW</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> ${props.status}</p>
              </div>
            `)
            .addTo(map.current);
        }
      });
    }

    console.log('✅ Real grid infrastructure layers loaded successfully');
  }, [mapLoaded, dataLoading, busesGeoJSON, branchesGeoJSON, generatorsGeoJSON, visibleLayers.powerPlants]);

  // Apply filters to buses layer by updating source data (affects clusters too)
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource('real-buses-source')) return;

    // Check if any filter is active
    const hasActiveFilters = activeFilters.state || activeFilters.county || activeFilters.voltage || activeFilters.headroom;
    
    let filteredGeoJSON;
    
    if (hasActiveFilters) {
      // Filter the features based on active filters
      const filteredFeatures = busesGeoJSON.features.filter(feature => {
        const props = feature.properties;
        
        // State filter
        if (activeFilters.state && props.state !== activeFilters.state) {
          return false;
        }
        
        // County filter
        if (activeFilters.county && props.county !== activeFilters.county) {
          return false;
        }
        
        // Voltage filter
        if (activeFilters.voltage && props.voltage !== parseFloat(activeFilters.voltage)) {
          return false;
        }
        
        // Headroom filter (minimum MW)
        if (activeFilters.headroom) {
          const minHeadroom = parseFloat(activeFilters.headroom);
          const dischargingOk = props.headroom_discharging >= minHeadroom;
          const chargingOk = props.headroom_charging >= minHeadroom;
          if (!dischargingOk && !chargingOk) {
            return false;
          }
        }
        
        return true;
      });
      
      filteredGeoJSON = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
      
      console.log(`🔍 Filtered buses: ${filteredFeatures.length} / ${busesGeoJSON.features.length}`);
    } else {
      // No filters active, use all data
      filteredGeoJSON = busesGeoJSON;
    }
    
    // Update the source data (this will automatically update clusters)
    map.current.getSource('real-buses-source').setData(filteredGeoJSON);
    
    // No need to set layer filters anymore - data filtering handles everything
  }, [mapLoaded, activeFilters, busesGeoJSON]);

  const changeMapStyle = (styleType) => {
    if (!map.current) return;
    
    setCurrentLayer(styleType);
    
    // Get current map state
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();
    
    // Apply new style with political boundaries
    map.current.setStyle(createMapStyle(styleType));
    
    // Restore map state after style loads
    map.current.once('styledata', () => {
      map.current.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        bearing: currentBearing,
        pitch: currentPitch
      });
    });
  };

  const updateLocation = async (center) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=10`
      );
      const data = await response.json();
      
      if (data.address) {
        const { city, town, village, county, state, country } = data.address;
        const locationName = city || town || village || county || state || country || 'Unknown Location';
        const region = state && country ? `${state}, ${country}` : country || '';
        setCurrentLocation(region ? `${locationName}, ${region}` : locationName);
      } else {
        setCurrentLocation(`${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      setCurrentLocation(`${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
    }
  };

  // Search handler using Nominatim geocoding
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching location:', error);
      setSearchResults([]);
    }
  };

  const selectSearchResult = (result) => {
    if (map.current) {
      map.current.flyTo({
        center: [parseFloat(result.lon), parseFloat(result.lat)],
        zoom: 12,
        essential: true
      });
      setShowSearchPanel(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Handle substation click
  const handleSubstationClick = (substationData) => {
    console.log('🎯 handleSubstationClick called with:', {
      id: substationData.id,
      name: substationData.name,
      coordinates: substationData.coordinates
    });
    
    // Update bus search and selected buses in constraint view (Task 1)
    const busName = substationData.name || '';
    setSelectedBusesForConstraints(prev => {
      const exists = prev.includes(busName);
      if (exists) {
        // Remove if already selected
        const newBuses = prev.filter(b => b !== busName);
        setBusSearch(newBuses.join(', '));
        return newBuses;
      } else {
        // Add to selection
        const newBuses = [...prev, busName];
        setBusSearch(newBuses.join(', '));
        return newBuses;
      }
    });
    
    setSelectedSubstations(prev => {
      const exists = prev.find(s => s.id === substationData.id);
      if (exists) {
        // Remove if already selected
        console.log('🔴 Deselecting substation:', substationData.name);
        return prev.filter(s => s.id !== substationData.id);
      } else {
        // Add to selection
        console.log('🔴 Selecting substation:', substationData.name);
        return [...prev, substationData];
      }
    });
    
    // Always open detail panel when clicking a substation
    setDetailPanelOpen(true);
  };

  // Update selection indicator layer when selectedSubstations changes
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      console.log('⚠️ Map not ready for selection indicators');
      return;
    }

    console.log('🔄 Selection changed. Total selected:', selectedSubstations.length);
    selectedSubstations.forEach(sub => {
      console.log('  📍', sub.name, '- coords:', sub.coordinates);
    });

    // Create GeoJSON for selected substations
    const features = selectedSubstations.map(sub => {
      let lng, lat;
      
      // Extract coordinates from various formats
      if (sub.coordinates) {
        // From MapLibre click event (LngLat object)
        lng = sub.coordinates.lng;
        lat = sub.coordinates.lat;
      } else if (sub.longitude !== undefined && sub.latitude !== undefined) {
        // From bus data directly
        lng = parseFloat(sub.longitude);
        lat = parseFloat(sub.latitude);
      } else {
        console.warn('⚠️ No coordinates found for:', sub.name);
        return null;
      }

      console.log('  ✓ Creating feature for', sub.name, 'at', [lng, lat]);
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: sub.id,
          name: sub.name
        }
      };
    }).filter(f => f !== null);

    const selectionGeoJSON = {
      type: 'FeatureCollection',
      features: features
    };

    console.log('🔴 Updating selection indicators:', features.length, 'valid features');
    console.log('   GeoJSON:', JSON.stringify(selectionGeoJSON, null, 2));

    // Add or update source
    if (!map.current.getSource('selection-indicator-source')) {
      console.log('🆕 Creating selection-indicator-source');
      map.current.addSource('selection-indicator-source', {
        type: 'geojson',
        data: selectionGeoJSON
      });
    } else {
      console.log('🔄 Updating selection-indicator-source data');
      map.current.getSource('selection-indicator-source').setData(selectionGeoJSON);
    }

    // Add selection indicator layer if it doesn't exist
    if (!map.current.getLayer('selection-indicator-layer')) {
      console.log('🆕 Creating selection-indicator-layer');
      map.current.addLayer({
        id: 'selection-indicator-layer',
        type: 'circle',
        source: 'selection-indicator-source',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 16,   // At zoom 4, radius 16px (larger than bus point)
            8, 22,   // At zoom 8, radius 22px
            12, 28,  // At zoom 12, radius 28px
            16, 34   // At zoom 16, radius 34px
          ],
          'circle-color': 'rgba(0, 0, 0, 0)', // Fully transparent fill
          'circle-stroke-color': '#ff0000',
          'circle-stroke-width': 4,
          'circle-stroke-opacity': 1.0
        }
      });
      console.log('✅ Created selection indicator layer');
      
      // Move to top to ensure visibility
      try {
        map.current.moveLayer('selection-indicator-layer');
        console.log('✅ Moved selection layer to top');
      } catch (err) {
        console.warn('Could not move selection layer:', err);
      }
    } else {
      console.log('✓ Selection layer already exists, data updated');
    }
  }, [selectedSubstations, mapLoaded]);

  const handleHeatmapChange = (scenario) => {
    setSelectedHeatmap(scenario);
    
    if (!map.current) return;
    
    if (!scenario) {
      // Clear heat map layer
      if (map.current.getLayer('heatmap-layer')) {
        map.current.removeLayer('heatmap-layer');
      }
      if (map.current.getSource('heatmap-source')) {
        map.current.removeSource('heatmap-source');
      }
      console.log('Heat map cleared');
      return;
    }
    
    // Apply heat map based on selected scenario
    console.log('Applying heat map:', scenario, 'for ISO:', selectedISO);
    
    // Parse scenario (e.g., "spring-charging" -> season: spring, scenario: charging)
    const [season, scenarioType] = scenario.split('-');
    
    // Create heat map from bus data with LMP values
    // Use appropriate LMP data based on season and scenario
    const heatmapData = {
      type: 'FeatureCollection',
      features: buses.map(bus => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [bus.longitude, bus.latitude]
        },
        properties: {
          // Use LMP data as heat intensity - adjust based on scenario
          // For charging: higher LMP means more heat
          // For discharging: inverse relationship
          intensity: scenarioType === 'charging' 
            ? (bus.lmp2024 || bus.lmp2023 || 50) 
            : 100 - (bus.lmp2024 || bus.lmp2023 || 50)
        }
      }))
    };
    
    // Remove existing heat map if any
    if (map.current.getLayer('heatmap-layer')) {
      map.current.removeLayer('heatmap-layer');
    }
    if (map.current.getSource('heatmap-source')) {
      map.current.removeSource('heatmap-source');
    }
    
    // Add new heat map source
    map.current.addSource('heatmap-source', {
      type: 'geojson',
      data: heatmapData
    });
    
    // Add heat map layer
    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-source',
      paint: {
        // Increase weight as intensity increases
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 0,
          100, 1
        ],
        // Increase intensity as zoom level increases
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
        // Color ramp for heatmap (blue -> cyan -> green -> yellow -> red)
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        // Adjust heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          9, 20
        ],
        // Transition from heatmap to circle layer at higher zoom levels
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.8,
          14, 0.6
        ]
      }
    }, 'real-buses-points'); // Insert below bus points
    
    console.log('Heat map applied:', season, scenarioType);
  };

  // ============================================================================
  // FUTURE OUTLOOK LAYERS - Render approved substation and transmission upgrades
  // ============================================================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // SUBSTATION UPGRADES - Show as purple diamond points
    if (futureSubstationUpgrades.length > 0) {
      const substationGeoJSON = {
        type: 'FeatureCollection',
        features: futureSubstationUpgrades.map((upgrade, idx) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [upgrade.longitude, upgrade.latitude]
          },
          properties: {
            id: idx,
            name: upgrade.name,
            year: upgrade.year,
            category: upgrade.category
          }
        }))
      };
      
      // Remove existing layer if present
      if (map.current.getLayer('future-substation-upgrades')) {
        map.current.removeLayer('future-substation-upgrades');
      }
      if (map.current.getSource('future-substations-source')) {
        map.current.removeSource('future-substations-source');
      }
      
      // Add source
      map.current.addSource('future-substations-source', {
        type: 'geojson',
        data: substationGeoJSON
      });
      
      // Add layer
      map.current.addLayer({
        id: 'future-substation-upgrades',
        type: 'circle',
        source: 'future-substations-source',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 4,
            10, 8,
            15, 12
          ],
          'circle-color': '#a855f7', // Purple color for future projects
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#7c3aed'
        },
        layout: {
          'visibility': visibleLayers.futureSubstationUpgrades ? 'visible' : 'none'
        }
      });
      
      console.log(`✅ Added ${futureSubstationUpgrades.length} future substation upgrades`);
    }
    
    // TRANSMISSION UPGRADES - Show as orange lines from -> to
    if (futureTransmissionUpgrades.length > 0) {
      const transmissionGeoJSON = {
        type: 'FeatureCollection',
        features: futureTransmissionUpgrades.map((upgrade, idx) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [upgrade.from_longitude, upgrade.from_latitude],
              [upgrade.to_longitude, upgrade.to_latitude]
            ]
          },
          properties: {
            id: idx,
            name: upgrade.name,
            year: upgrade.year,
            category: upgrade.category
          }
        }))
      };
      
      // Remove existing layer if present
      if (map.current.getLayer('future-transmission-upgrades')) {
        map.current.removeLayer('future-transmission-upgrades');
      }
      if (map.current.getSource('future-transmissions-source')) {
        map.current.removeSource('future-transmissions-source');
      }
      
      // Add source
      map.current.addSource('future-transmissions-source', {
        type: 'geojson',
        data: transmissionGeoJSON
      });
      
      // Add layer
      map.current.addLayer({
        id: 'future-transmission-upgrades',
        type: 'line',
        source: 'future-transmissions-source',
        paint: {
          'line-color': '#f97316', // Orange color for future transmission lines
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 2,
            10, 3,
            15, 5
          ],
          'line-opacity': 0.7,
          'line-dasharray': [2, 2] // Dashed line to show it's future/planned
        },
        layout: {
          'visibility': visibleLayers.futureTransmissionUpgrades ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
      
      console.log(`✅ Added ${futureTransmissionUpgrades.length} future transmission upgrades`);
    }
    
  }, [futureSubstationUpgrades, futureTransmissionUpgrades, visibleLayers.futureSubstationUpgrades, visibleLayers.futureTransmissionUpgrades, mapLoaded]);
  // ============================================================================
  // END FUTURE OUTLOOK LAYERS
  // ============================================================================

  // Sidebar resize handlers
  const startResizeLeft = () => setIsResizingLeft(true);
  const startResizeDetail = () => setIsResizingDetail(true);
  const startResizeRight = () => setIsResizingRight(true);
  
  const stopResize = () => {
    setIsResizingLeft(false);
    setIsResizingDetail(false);
    setIsResizingRight(false);
  };
  
  const handleMouseMove = (e) => {
    if (isResizingLeft) {
      const newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= 500) {
        setLeftSidebarWidth(newWidth);
      }
    }
    if (isResizingDetail) {
      // Calculate from the left edge of the detail panel
      // Account for left sidebar width
      const leftSidebarActualWidth = leftSidebarOpen ? leftSidebarWidth : 0;
      const newWidth = e.clientX - leftSidebarActualWidth;
      if (newWidth >= 200 && newWidth <= 600) {
        setDetailPanelWidth(newWidth);
      }
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 700) {
        setRightPanelWidth(newWidth);
      }
    }
  };
  
  useEffect(() => {
    if (isResizingLeft || isResizingDetail || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
      };
    }
  }, [isResizingLeft, isResizingDetail, isResizingRight]);

  // Trigger map resize when sidebar dimensions change
  useEffect(() => {
    if (map.current && mapLoaded) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        map.current.resize();
      });
    }
  }, [leftSidebarWidth, detailPanelWidth, rightPanelWidth, leftSidebarOpen, detailPanelOpen, rightPanelOpen, mapLoaded]);

  const toggleLayer = (layerName) => {
    const newVisibility = !visibleLayers[layerName];
    
    setVisibleLayers(prev => ({
      ...prev,
      [layerName]: newVisibility
    }));
    
    // Handle layer visibility on map
    if (!map.current) return;
    
    // Handle street labels toggle
    if (layerName === 'streetLabels') {
      if (map.current.getLayer('osm-labels')) {
        map.current.setLayoutProperty('osm-labels', 'visibility', newVisibility ? 'visible' : 'none');
      }
      return;
    }

    // Handle Grid Infrastructure layers
    if (layerName === 'substations') {
      const layers = ['real-buses-clusters', 'real-buses-cluster-count', 'real-buses-points', 'real-buses-labels'];
      layers.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
        }
      });
      return;
    }

    if (layerName === 'transmissionLines') {
      if (map.current.getLayer('real-branches-lines')) {
        map.current.setLayoutProperty('real-branches-lines', 'visibility', newVisibility ? 'visible' : 'none');
      }
      if (map.current.getLayer('real-branches-labels')) {
        map.current.setLayoutProperty('real-branches-labels', 'visibility', newVisibility ? 'visible' : 'none');
      }
      return;
    }

    if (layerName === 'powerPlants') {
      const layers = ['real-generators-points', 'real-generators-labels'];
      layers.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
        }
      });
      return;
    }
    
    // Handle Overpass API layer toggling
    const overpassLayers = ['overpassPowerLines', 'overpassSubstations', 'overpassTransformers', 'overpassTowers', 'overpassGenerators', 'overpassCables'];
    
    if (overpassLayers.includes(layerName)) {
      if (newVisibility) {
        // Aggressively fetch data from Overpass API when layer is enabled
        console.log(`🔵 Layer enabled: ${layerName}, starting immediate load...`);
        fetchOverpassData(layerName, true); // Force reload when first enabled
      } else {
        // Hide layer when disabled
        const layerIdMap = {
          'overpassPowerLines': 'overpass-power-lines',
          'overpassSubstations': 'overpass-substations',
          'overpassTransformers': 'overpass-transformers',
          'overpassTowers': 'overpass-towers',
          'overpassGenerators': 'overpass-generators',
          'overpassCables': 'overpass-cables'
        };
        
        const layerId = layerIdMap[layerName];
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
        if (map.current.getLayer(layerId + '-lines')) {
          map.current.setLayoutProperty(layerId + '-lines', 'visibility', 'none');
        }
        if (map.current.getLayer(layerId + '-labels')) {
          map.current.setLayoutProperty(layerId + '-labels', 'visibility', 'none');
        }
        // Update legend
        updateActiveLayers(layerName, false);
      }
    }
  };

  const fetchOverpassData = async (layerType, forceReload = false) => {
    if (!map.current) return;
    
    // Check if already loading this layer using ref to avoid race conditions
    if (loadingLayersRef.current[layerType]) {
      console.log(`⏳ ${layerType} is already loading, skipping...`);
      return;
    }
    
    const bounds = map.current.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bbox = `${south},${west},${north},${east}`;
    const bboxKey = `${layerType}_${Math.round(south*5)}_${Math.round(west*5)}_${Math.round(north*5)}_${Math.round(east*5)}`;
    
    // Check cache if not force reload and cache exists
    if (!forceReload && overpassCache[bboxKey]) {
      console.log(`✓ Using cached data for ${layerType} (${overpassCache[bboxKey].geojson.features.length} features)`);
      const cachedData = overpassCache[bboxKey];
      
      // Update the map with cached data
      const sourceId = cachedData.sourceId;
      const layerId = cachedData.layerId;
      
      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData(cachedData.geojson);
        
        // Ensure layer visibility
        if (map.current.getLayer(layerId)) {
          map.current.setLayoutProperty(layerId, 'visibility', 'visible');
        }
        if (map.current.getLayer(layerId + '-lines')) {
          map.current.setLayoutProperty(layerId + '-lines', 'visibility', 'visible');
        }
        if (map.current.getLayer(layerId + '-labels')) {
          map.current.setLayoutProperty(layerId + '-labels', 'visibility', 'visible');
        }
      }
      
      // Update legend
      updateActiveLayers(layerType, true);
      return;
    }
    
    // Mark as loading
    loadingLayersRef.current[layerType] = true;
    setLoadingOverpass(prev => ({ ...prev, [layerType]: true }));
    
    let query = '';
    let sourceId = '';
    let layerId = '';
    let layerStyle = {};
    
    // Build Overpass QL query based on layer type - optimized for speed
    if (layerType === 'overpassPowerLines') {
      sourceId = 'overpass-power-lines-source';
      layerId = 'overpass-power-lines';
      query = `[out:json][timeout:15];(way["power"="line"](${bbox});way["power"="minor_line"](${bbox}););out geom;`;
      layerStyle = {
        type: 'line',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 3,
          'line-opacity': 0.8
        }
      };
    } else if (layerType === 'overpassSubstations') {
      sourceId = 'overpass-substations-source';
      layerId = 'overpass-substations';
      query = `[out:json][timeout:15];(node["power"="substation"](${bbox});way["power"="substation"](${bbox}););out geom;`;
      layerStyle = {
        type: 'circle',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3b82f6',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      };
    } else if (layerType === 'overpassTransformers') {
      sourceId = 'overpass-transformers-source';
      layerId = 'overpass-transformers';
      query = `[out:json][timeout:15];(node["power"="transformer"](${bbox}););out geom;`;
      layerStyle = {
        type: 'circle',
        paint: {
          'circle-radius': 5,
          'circle-color': '#10b981',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.9
        }
      };
    } else if (layerType === 'overpassTowers') {
      sourceId = 'overpass-towers-source';
      layerId = 'overpass-towers';
      query = `[out:json][timeout:15];(node["power"="tower"](${bbox});node["power"="pole"](${bbox}););out geom;`;
      layerStyle = {
        type: 'circle',
        paint: {
          'circle-radius': 4,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8
        }
      };
    } else if (layerType === 'overpassGenerators') {
      sourceId = 'overpass-generators-source';
      layerId = 'overpass-generators';
      query = `[out:json][timeout:15];(node["power"="generator"](${bbox});node["power"="plant"](${bbox});way["power"="generator"](${bbox});way["power"="plant"](${bbox}););out geom;`;
      layerStyle = {
        type: 'circle',
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      };
    } else if (layerType === 'overpassCables') {
      sourceId = 'overpass-cables-source';
      layerId = 'overpass-cables';
      query = `[out:json][timeout:15];(way["power"="cable"](${bbox}););out geom;`;
      layerStyle = {
        type: 'line',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 8,
          'line-opacity': 0.95
        }
      };
    }
    
    try {
      console.log(`⚡ Fetching ${layerType} from Overpass API (optimized)...`);
      
      // Use AbortController for faster cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s total timeout
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.elements?.length || 0} elements for ${layerType}`);
      
      // Convert Overpass data to GeoJSON
      const features = [];
      
      data.elements.forEach(element => {
        if (element.type === 'node') {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [element.lon, element.lat]
            },
            properties: element.tags || {}
          });
        } else if (element.type === 'way') {
          // For ways, check if we have geometry (nodes with coordinates)
          if (element.geometry && element.geometry.length > 0) {
            const coordinates = element.geometry.map(node => [node.lon, node.lat]);
            
            // Create LineString for power lines and cables
            if (coordinates.length >= 2) {
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                },
                properties: element.tags || {}
              });
            }
          }
          
          // Also add center point for areas (substations, generators as areas)
          if (element.center) {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [element.center.lon, element.center.lat]
              },
              properties: { ...element.tags, area: true } || { area: true }
            });
          }
        }
      });
      
      const geojson = {
        type: 'FeatureCollection',
        features: features
      };
      
      // Add or update source
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
        console.log(`✓ Created source: ${sourceId} with ${features.length} features`);
      } else {
        map.current.getSource(sourceId).setData(geojson);
        console.log(`✓ Updated source: ${sourceId} with ${features.length} features`);
      }
      
      // Separate features by geometry type
      const pointFeatures = features.filter(f => f.geometry.type === 'Point');
      const lineFeatures = features.filter(f => f.geometry.type === 'LineString');
      
      console.log(`Feature breakdown: ${pointFeatures.length} points, ${lineFeatures.length} lines`);
      
      // Add layers based on geometry types present - handle all cases
      if (layerStyle.type === 'line') {
        // For line layers (power lines, cables)
        if (!map.current.getLayer(layerId)) {
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: layerStyle.paint,
            layout: {
              'visibility': 'visible'
            }
          });
          console.log(`✓ Created line layer: ${layerId}`);
        } else {
          map.current.setLayoutProperty(layerId, 'visibility', 'visible');
          console.log(`✓ Updated line layer visibility: ${layerId}`);
        }
      } else if (layerStyle.type === 'circle') {
        // For point layers (substations, transformers, towers, generators)
        if (!map.current.getLayer(layerId)) {
          map.current.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: layerStyle.paint,
            layout: {
              'visibility': 'visible'
            }
          });
          console.log(`✓ Created circle layer: ${layerId}`);
        } else {
          map.current.setLayoutProperty(layerId, 'visibility', 'visible');
          console.log(`✓ Updated circle layer visibility: ${layerId}`);
        }
      }
      
      // For mixed geometry types (substations, generators can be both nodes and ways)
      if (pointFeatures.length > 0 && lineFeatures.length > 0) {
        // Ensure both point and line layers exist
        if (!map.current.getLayer(layerId + '-lines')) {
          map.current.addLayer({
            id: layerId + '-lines',
            type: 'line',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
              'line-color': layerStyle.paint['circle-color'] || '#ffffff',
              'line-width': 2,
              'line-opacity': 0.8
            },
            layout: {
              'visibility': 'visible'
            }
          });
        }
      }
      
      // Add text labels for features with names (at zoom > 10 for readability)
      if (pointFeatures.length > 0 && map.current.getZoom() > 10) {
        if (!map.current.getLayer(layerId + '-labels')) {
          map.current.addLayer({
            id: layerId + '-labels',
            type: 'symbol',
            source: sourceId,
            filter: ['==', ['geometry-type'], 'Point'],
            layout: {
              'text-field': ['coalesce', ['get', 'name'], ['get', 'ref'], ['get', 'operator'], ''],
              'text-size': 11,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-optional': true,
              'visibility': 'visible'
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 2,
              'text-halo-blur': 1
            }
          });
          console.log(`✓ Created label layer: ${layerId}-labels`);
        } else {
          map.current.setLayoutProperty(layerId + '-labels', 'visibility', 'visible');
        }
      }
      
      console.log(`✓ Successfully loaded ${features.length} features for ${layerType} at zoom ${map.current.getZoom().toFixed(1)}`);
      console.log(`   Layers created/updated for ${layerType}`);
      
      // Cache the data with matching key precision
      const bboxKey = `${layerType}_${Math.round(south*5)}_${Math.round(west*5)}_${Math.round(north*5)}_${Math.round(east*5)}`;
      setOverpassCache(prev => ({
        ...prev,
        [bboxKey]: { geojson, sourceId, layerId, timestamp: Date.now() }
      }));
      
      // Update active layers legend
      updateActiveLayers(layerType, true);
      
    } catch (error) {
      console.error(`❌ Error fetching Overpass data for ${layerType}:`, error);
      console.error(`   Error details: ${error.message}`);
      
      // Handle rate limiting (429) with backoff
      if (error.message.includes('429')) {
        console.log(`⏰ Rate limited! Waiting 5 seconds before allowing retry...`);
        // Add delay before allowing next request
        setTimeout(() => {
          loadedBoundsRef.current[layerType] = null; // Clear cache to allow retry
        }, 5000); // 5 second delay for rate limited requests
      } else {
        console.log(`🔁 Will retry on next map movement...`);
      }
    } finally {
      loadingLayersRef.current[layerType] = false;
      setLoadingOverpass(prev => ({ ...prev, [layerType]: false }));
    }
  };

  const updateActiveLayers = (layerType, isActive) => {
    const layerInfo = {
      'overpassPowerLines': { name: 'Transmission Lines', color: '#fbbf24' },
      'overpassSubstations': { name: 'Substations', color: '#3b82f6' },
      'overpassTransformers': { name: 'Transformers', color: '#10b981' },
      'overpassTowers': { name: 'Towers & Poles', color: '#ef4444' },
      'overpassGenerators': { name: 'Generators', color: '#f59e0b' },
      'overpassCables': { name: 'Underground Cables', color: '#06b6d4' }
    };

    setActiveLayers(prev => {
      if (isActive) {
        if (!prev.find(l => l.id === layerType)) {
          return [...prev, { id: layerType, ...layerInfo[layerType] }];
        }
        return prev;
      } else {
        return prev.filter(l => l.id !== layerType);
      }
    });
  };

  const refreshVisibleOverpassLayers = async () => {
    if (!map.current) return;
    
    // Get current zoom level
    const zoom = map.current.getZoom();
    const bounds = map.current.getBounds();
    
    // Get all visible Overpass layers using ref to avoid closure issues
    const currentVisibleLayers = visibleLayersRef.current;
    const overpassLayerKeys = Object.keys(currentVisibleLayers).filter(
      key => key.startsWith('overpass') && currentVisibleLayers[key]
    );
    
    if (overpassLayerKeys.length === 0) {
      return;
    }
    
    const currentBbox = `${Math.round(bounds.getSouth()*5)}_${Math.round(bounds.getWest()*5)}_${Math.round(bounds.getNorth()*5)}_${Math.round(bounds.getEast()*5)}`;
    console.log(`🔄 Checking ${overpassLayerKeys.length} layers at zoom ${zoom.toFixed(1)} for bbox: ${currentBbox}`);
    
    // Load layers SEQUENTIALLY with delay to prevent API spam
    for (const layerKey of overpassLayerKeys) {
      const lastBbox = loadedBoundsRef.current[layerKey];
      
      // Only reload if bbox changed or first load
      if (!lastBbox || lastBbox !== currentBbox) {
        console.log(`⚡ ${layerKey}: New region detected (was: ${lastBbox || 'none'}, now: ${currentBbox})`);
        loadedBoundsRef.current[layerKey] = currentBbox;
        fetchOverpassData(layerKey, true); // Force reload on region change
        
        // Wait 600ms between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));
      } else {
        console.log(`✓ ${layerKey}: Same region, using existing data`);
      }
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };
  
  // Toggle scenario selection
  const toggleScenario = (scenarioId) => {
    setSelectedScenarios(prev => {
      if (prev.includes(scenarioId)) {
        return prev.filter(s => s !== scenarioId);
      } else {
        return [...prev, scenarioId];
      }
    });
  };
  
  // Remove scenario tag
  const removeScenario = (scenarioId) => {
    setSelectedScenarios(prev => prev.filter(s => s !== scenarioId));
  };

  // Show loading state while data is being fetched
  if (dataLoading) {
    return (
      <div className="maps-page-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Loading Grid Infrastructure Data...</h2>
          <p>Fetching buses, branches, and generators from database</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`maps-page ${leftSidebarOpen ? '' : 'sidebar-collapsed'} ${detailPanelOpen ? '' : 'detail-collapsed'} ${rightPanelOpen ? '' : 'rightpanel-collapsed'}`}>
      
      {/* Backend Not Connected Banner */}
      {!dataLoading && buses.length === 0 && (
        <div className="backend-warning-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Backend API not connected. Map will display without real data. See INTEGRATION_GUIDE.md for setup instructions.</span>
        </div>
      )}

      {/* Left Sidebar - Layers */}
      <div className={`left-sidebar ${leftSidebarOpen ? 'open' : 'closed'} ${isResizingLeft ? 'resizing' : ''}`} style={{ width: leftSidebarOpen ? `${leftSidebarWidth}px` : '0' }}>
        {leftSidebarOpen && (
          <>
            <div 
              className="resize-handle resize-handle-right" 
              onMouseDown={startResizeLeft}
            />
            <button className="sidebar-notch-right" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <span className="sidebar-title">Layers</span>
        </div>

        <div className="sidebar-content">
          {/* Grid Infrastructure Section - MOVED UP */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('gridInfrastructure')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.gridInfrastructure ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Grid Infrastructure</span>
            </div>
            {expandedSections.gridInfrastructure && (
              <div className="section-items">
                {/* Substations */}
                <div className="subsection">
                  <div className="subsection-header" onClick={() => toggleSection('substations')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedSections.substations ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                    <span>Substations</span>
                    <label className="layer-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.substations}
                        onChange={() => toggleLayer('substations')}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </div>
                  {expandedSections.substations && (
                    <div className="subsection-items">
                      {substationTypesLoading ? (
                        <div className="layer-item">
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>Loading substations...</span>
                        </div>
                      ) : substationTypes.length > 0 ? (
                        substationTypes.map((substation) => (
                          <div key={substation.id} className="layer-item">
                            <input 
                              type="checkbox" 
                              id={`sub-${substation.id}`} 
                              defaultChecked 
                            />
                            <label htmlFor={`sub-${substation.id}`}>{substation.label}</label>
                          </div>
                        ))
                      ) : (
                        <div className="layer-item">
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>No substations found</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* T&D Lines */}
                <div className="subsection">
                  <div className="subsection-header" onClick={() => toggleSection('tndLines')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedSections.tndLines ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                      <path d="M3 12h18"/>
                    </svg>
                    <span>T&D Lines</span>
                    <label className="layer-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.transmissionLines}
                        onChange={() => toggleLayer('transmissionLines')}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </div>
                </div>

                {/* Generators */}
                <div className="subsection">
                  <div className="subsection-header" onClick={() => toggleSection('generators')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedSections.generators ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span>Generators</span>
                    <label className="layer-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.powerPlants}
                        onChange={() => toggleLayer('powerPlants')}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </div>
                </div>

                {/* Loads */}
                <div className="subsection">
                  <div className="subsection-header" onClick={() => toggleSection('loads')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedSections.loads ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <span>Loads</span>
                    <label className="layer-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.distributionLines}
                        onChange={() => toggleLayer('distributionLines')}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </div>
                </div>

                {/* Transformers */}
                <div className="subsection">
                  <div className="subsection-header" onClick={() => toggleSection('transformers')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={expandedSections.transformers ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6"/>
                    </svg>
                    <span>Transformers</span>
                    <label className="layer-checkbox-inline" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.transformers}
                        onChange={() => toggleLayer('transformers')}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Heat Maps Section - Moved Up */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('heatmaps')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.heatmaps ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h20M2 12a10 10 0 0 1 10-10M2 12a10 10 0 0 0 10 10M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10"/>
              </svg>
              <span>Heat Maps</span>
            </div>
            {expandedSections.heatmaps && (
              <div className="section-items">
                <div className="layer-item">
                  <label style={{ width: '100%', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                    Select Scenario:
                  </label>
                  <select 
                    className="heatmap-select"
                    value={selectedHeatmap}
                    onChange={(e) => handleHeatmapChange(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '13px' }}
                  >
                    <option value="">None</option>
                    <option value="spring-charging">Spring - Charging</option>
                    <option value="spring-discharging">Spring - Discharging</option>
                    <option value="summer-charging">Summer - Charging</option>
                    <option value="summer-discharging">Summer - Discharging</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Future Outlook Section */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('futureOutlook')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.futureOutlook ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Future Outlook</span>
            </div>
            {expandedSections.futureOutlook && (
              <div className="section-items">
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="future-substation-upgrades"
                    checked={visibleLayers.futureSubstationUpgrades}
                    onChange={() => toggleLayer('futureSubstationUpgrades')}
                  />
                  <label htmlFor="future-substation-upgrades">
                    ISO-NE Approved Substation Upgrades
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="future-transmission-upgrades"
                    checked={visibleLayers.futureTransmissionUpgrades}
                    onChange={() => toggleLayer('futureTransmissionUpgrades')}
                  />
                  <label htmlFor="future-transmission-upgrades">
                    ISO-NE Approved Transmission Upgrades
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* OpenStreetMap Overpass Section */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('overpass')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.overpass ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>OSM Power Data</span>
            </div>
            {expandedSections.overpass && (
              <div className="section-items">
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="street-labels"
                    checked={visibleLayers.streetLabels}
                    onChange={() => toggleLayer('streetLabels')}
                  />
                  <label htmlFor="street-labels">
                    Street & Place Labels
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-powerlines"
                    checked={visibleLayers.overpassPowerLines}
                    onChange={() => toggleLayer('overpassPowerLines')}
                    disabled={loadingOverpass.overpassPowerLines}
                  />
                  <label htmlFor="overpass-powerlines">
                    Transmission Lines {loadingOverpass.overpassPowerLines && '(Loading...)'}
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-substations"
                    checked={visibleLayers.overpassSubstations}
                    onChange={() => toggleLayer('overpassSubstations')}
                    disabled={loadingOverpass.overpassSubstations}
                  />
                  <label htmlFor="overpass-substations">
                    Substations {loadingOverpass.overpassSubstations && '(Loading...)'}
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-transformers"
                    checked={visibleLayers.overpassTransformers}
                    onChange={() => toggleLayer('overpassTransformers')}
                    disabled={loadingOverpass.overpassTransformers}
                  />
                  <label htmlFor="overpass-transformers">
                    Transformers {loadingOverpass.overpassTransformers && '(Loading...)'}
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-towers"
                    checked={visibleLayers.overpassTowers}
                    onChange={() => toggleLayer('overpassTowers')}
                    disabled={loadingOverpass.overpassTowers}
                  />
                  <label htmlFor="overpass-towers">
                    Towers & Poles {loadingOverpass.overpassTowers && '(Loading...)'}
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-generators"
                    checked={visibleLayers.overpassGenerators}
                    onChange={() => toggleLayer('overpassGenerators')}
                    disabled={loadingOverpass.overpassGenerators}
                  />
                  <label htmlFor="overpass-generators">
                    Generators {loadingOverpass.overpassGenerators && '(Loading...)'}
                  </label>
                </div>
                <div className="layer-item">
                  <input 
                    type="checkbox" 
                    id="overpass-cables"
                    checked={visibleLayers.overpassCables}
                    onChange={() => toggleLayer('overpassCables')}
                    disabled={loadingOverpass.overpassCables}
                  />
                  <label htmlFor="overpass-cables">
                    Underground Cables {loadingOverpass.overpassCables && '(Loading...)'}
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}
        {!leftSidebarOpen && (
          <button className="sidebar-notch-right" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Horizontal Filter Bar */}
      <div 
        className={`horizontal-filter-bar ${showFilterBar ? 'visible' : ''}`}
        onMouseEnter={() => setShowFilterBar(true)}
        onMouseLeave={() => setShowFilterBar(false)}
      >
        <div className="filter-bar-trigger">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Filters</span>
        </div>
        
        {showFilterBar && (
          <div className="filter-bar-content">
            {/* State Filter */}
            {filters.regions.length > 0 && (
              <div className="filter-group-horizontal">
                <label className="filter-label">State:</label>
                <select 
                  className="filter-select"
                  onChange={(e) => {
                    const newState = e.target.value;
                    setTempFilters(prev => ({ 
                      ...prev, 
                      state: newState,
                      county: '' // Reset county when state changes
                    }));
                  }}
                  value={tempFilters.state}
                >
                  <option value="">All States</option>
                  {filters.regions.map(region => (
                    <option key={region.value} value={region.value}>
                      {region.label} ({region.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* County Filter */}
            {availableCounties.length > 0 && (
              <div className="filter-group-horizontal">
                <label className="filter-label">County:</label>
                <select 
                  className="filter-select"
                  onChange={(e) => setTempFilters(prev => ({ ...prev, county: e.target.value }))}
                  value={tempFilters.county}
                >
                  <option value="">All Counties{tempFilters.state ? ' (in selected state)' : ''}</option>
                  {availableCounties.map(county => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Voltage Filter */}
            {filterOptions.voltages.length > 0 && (
              <div className="filter-group-horizontal">
                <label className="filter-label">Voltage:</label>
                <select 
                  className="filter-select"
                  onChange={(e) => setTempFilters(prev => ({ ...prev, voltage: e.target.value }))}
                  value={tempFilters.voltage}
                >
                  <option value="">All Voltages</option>
                  {filterOptions.voltages.map(voltage => (
                    <option key={voltage} value={voltage}>
                      {voltage} kV
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scenario Filter */}
            {filterOptions.scenarios.length > 0 && (
              <div className="filter-group-horizontal">
                <label className="filter-label">Scenario:</label>
                <select 
                  className="filter-select"
                  onChange={(e) => setTempFilters(prev => ({ ...prev, scenario: e.target.value }))}
                  value={tempFilters.scenario}
                >
                  <option value="">All Scenarios</option>
                  {filterOptions.scenarios.map(scenario => (
                    <option key={scenario} value={scenario}>
                      {scenario}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Headroom Filter */}
            <div className="filter-group-horizontal">
              <label className="filter-label">Min Headroom (MW):</label>
              <input 
                type="number" 
                className="filter-select"
                placeholder="Enter MW"
                onChange={(e) => setTempFilters(prev => ({ ...prev, headroom: e.target.value }))}
                value={tempFilters.headroom}
                style={{ width: '120px' }}
              />
            </div>

            {/* Apply Filter Button */}
            <button 
              className="apply-filter-btn"
              onClick={() => {
                setActiveFilters({ ...tempFilters });
                console.log('Applying filters:', tempFilters);
              }}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                marginLeft: '12px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Apply Filter
            </button>

            {/* Clear Filters Button */}
            {(activeFilters.state || activeFilters.county || activeFilters.voltage || activeFilters.scenario || activeFilters.headroom) && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  const emptyFilters = { state: '', county: '', voltage: '', scenario: '', headroom: '' };
                  setTempFilters(emptyFilters);
                  setActiveFilters(emptyFilters);
                  console.log('🔄 All filters cleared - buses should reappear');
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                  marginLeft: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center Detail Panel */}
      <div className={`center-detail-panel ${detailPanelOpen ? 'open' : 'closed'} ${isResizingDetail ? 'resizing' : ''}`} style={{ width: detailPanelOpen ? `${detailPanelWidth}px` : '0' }}>
        {detailPanelOpen && (
          <>
            <div 
              className="resize-handle resize-handle-left" 
              onMouseDown={startResizeDetail}
            />
            <button className="sidebar-notch-right" onClick={() => setDetailPanelOpen(!detailPanelOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </>
        )}
        {!detailPanelOpen && (
          <button className="sidebar-notch-right" onClick={() => setDetailPanelOpen(!detailPanelOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        <div className="detail-panel-header">
          <button className="detail-toggle-btn" onClick={() => setDetailPanelOpen(!detailPanelOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={detailPanelOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
            </svg>
          </button>
          <span className="detail-count">
            {selectedSubstations.length > 0 ? `Selected Substations [${selectedSubstations.length}]` : `Substations [${buses.length}]`}
          </span>
          {selectedSubstations.length > 0 && (
            <button 
              className="clear-all-substations-btn" 
              onClick={() => setSelectedSubstations([])}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear All
            </button>
          )}
        </div>
        <div className="detail-panel-content">
          {selectedSubstations.length > 0 ? (
            <div className="substations-list">
              {selectedSubstations.map((substation, index) => (
                <div key={substation.id} className="substation-dropdown">
                  <div className="dropdown-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span className="station-name">{substation.name}</span>
                    <button className="icon-btn" onClick={() => {
                      setSelectedSubstations(prev => prev.filter(s => s.id !== substation.id));
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {/* Summary Dropdown */}
                  <details className="info-section" open={index === 0}>
                    <summary className="section-title">Summary</summary>
                    <div className="section-content">
                      <div className="info-row" style={{ 
                        padding: '12px', 
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        borderRadius: '8px',
                        border: '1px solid #3b82f6',
                        marginBottom: '12px'
                      }}>
                        <span className="info-label" style={{ color: '#1e40af', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          AI Summary Coming Soon
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* Basic Info Dropdown */}
                  <details className="info-section">
                    <summary className="section-title">Basic Info</summary>
                    <div className="section-content">
                      <div className="info-row">
                        <span className="info-label">Bus ID:</span>
                        <span className="info-value">{substation.id}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Nominal Voltage:</span>
                        <span className="info-value">{substation.voltage || 'N/A'} kV</span>
                      </div>
                      {substation.county && (
                        <div className="info-row">
                          <span className="info-label">County:</span>
                          <span className="info-value">{substation.county}</span>
                        </div>
                      )}
                      {substation.state && (
                        <div className="info-row">
                          <span className="info-label">State:</span>
                          <span className="info-value">{substation.state}</span>
                        </div>
                      )}
                      {substation.shortCircuit && (
                        <div className="info-row">
                          <span className="info-label">3-Phase Short Circuit:</span>
                          <span className="info-value">{parseFloat(substation.shortCircuit).toFixed(2)} MVA</span>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Power Flow Dropdown */}
                  <details className="info-section">
                    <summary className="section-title">Power Flow</summary>
                    <div className="section-content">
                      {substation.voltage && (
                        <div className="info-row">
                          <span className="info-label">Nominal Voltage:</span>
                          <span className="info-value">{substation.voltage} kV</span>
                        </div>
                      )}
                      {substation.zone && (
                        <div className="info-row">
                          <span className="info-label">Zone:</span>
                          <span className="info-value">{substation.zone}</span>
                        </div>
                      )}
                      {substation.shortCircuit && (
                        <div className="info-row">
                          <span className="info-label">3-Phase Short Circuit:</span>
                          <span className="info-value">{parseFloat(substation.shortCircuit).toFixed(2)} MVA</span>
                        </div>
                      )}
                      {substation.county && substation.state && (
                        <div className="info-row">
                          <span className="info-label">Location:</span>
                          <span className="info-value">{substation.county}, {substation.state}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">Bus ID:</span>
                        <span className="info-value">{substation.id}</span>
                      </div>
                    </div>
                  </details>

                  {/* SCED (formerly Financial) Dropdown */}
                  <details className="info-section">
                    <summary className="section-title">SCED - Economic Data</summary>
                    <div className="section-content">
                      {(() => {
                        const hasKey = substation.bus_id in substationEconomics;
                        const data = substationEconomics[substation.bus_id];
                        console.log('=== SCED Debug ===');
                        console.log('substation object:', substation);
                        console.log('substation.bus_id:', substation.bus_id);
                        console.log('substationEconomics:', substationEconomics);
                        console.log('hasKey:', hasKey);
                        console.log('data:', data);
                        console.log('==================');
                        return null;
                      })()}
                      {substation.bus_id !== undefined && substation.bus_id in substationEconomics ? (
                        substationEconomics[substation.bus_id] ? (
                        <>
                          {/* Bus Info */}
                          {substationEconomics[substation.bus_id].zone && (
                            <div className="info-row">
                              <span className="info-label">Economic Zone:</span>
                              <span className="info-value">{substationEconomics[substation.bus_id].zone}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].bus_name && (
                            <div className="info-row">
                              <span className="info-label">Bus Name:</span>
                              <span className="info-value">{substationEconomics[substation.bus_id].bus_name}</span>
                            </div>
                          )}
                          
                          {/* Historical Average LMP */}
                          <div className="info-row header-row" style={{marginTop: '15px'}}>
                            <span className="info-label">Historical Average LMP ($/MWh)</span>
                          </div>
                          {substationEconomics[substation.bus_id].lmp_2022 && (
                            <div className="info-row">
                              <span className="info-label">2022:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].lmp_2022).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].lmp_2023 && (
                            <div className="info-row">
                              <span className="info-label">2023:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].lmp_2023).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].lmp_2024 && (
                            <div className="info-row">
                              <span className="info-label">2024:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].lmp_2024).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].lmp_2025 && (
                            <div className="info-row">
                              <span className="info-label">2025:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].lmp_2025).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* Congestion Components */}
                          <div className="info-row header-row" style={{marginTop: '15px'}}>
                            <span className="info-label">Congestion Component ($/MWh)</span>
                          </div>
                          {substationEconomics[substation.bus_id].congestion_2022 && (
                            <div className="info-row">
                              <span className="info-label">2022:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].congestion_2022).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].congestion_2023 && (
                            <div className="info-row">
                              <span className="info-label">2023:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].congestion_2023).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].congestion_2024 && (
                            <div className="info-row">
                              <span className="info-label">2024:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].congestion_2024).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].congestion_2025 && (
                            <div className="info-row">
                              <span className="info-label">2025:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].congestion_2025).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* Loss Components */}
                          <div className="info-row header-row" style={{marginTop: '15px'}}>
                            <span className="info-label">Loss Component ($/MWh)</span>
                          </div>
                          {substationEconomics[substation.bus_id].loss_2022 && (
                            <div className="info-row">
                              <span className="info-label">2022:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].loss_2022).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].loss_2023 && (
                            <div className="info-row">
                              <span className="info-label">2023:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].loss_2023).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].loss_2024 && (
                            <div className="info-row">
                              <span className="info-label">2024:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].loss_2024).toFixed(2)}</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].loss_2025 && (
                            <div className="info-row">
                              <span className="info-label">2025:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].loss_2025).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* 5-Year Forecast */}
                          <div className="info-row header-row" style={{marginTop: '15px'}}>
                            <span className="info-label">5-Year Forecast</span>
                          </div>
                          {substationEconomics[substation.bus_id].forecast_avg_lmp && (
                            <div className="info-row">
                              <span className="info-label">Avg LMP:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_avg_lmp).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_max_lmp && (
                            <div className="info-row">
                              <span className="info-label">Max LMP:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_max_lmp).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_min_lmp && (
                            <div className="info-row">
                              <span className="info-label">Min LMP:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_min_lmp).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_energy_price && (
                            <div className="info-row">
                              <span className="info-label">Energy Price:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_energy_price).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_congestion && (
                            <div className="info-row">
                              <span className="info-label">Congestion:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_congestion).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_loss && (
                            <div className="info-row">
                              <span className="info-label">Loss:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_loss).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          {substationEconomics[substation.bus_id].forecast_basis && (
                            <div className="info-row">
                              <span className="info-label">Basis:</span>
                              <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].forecast_basis).toFixed(2)}/MWh</span>
                            </div>
                          )}
                          
                          {/* Additional Economic Metrics */}
                          {(substationEconomics[substation.bus_id].zonal_hub_lmp || substationEconomics[substation.bus_id].basis) && (
                            <>
                              <div className="info-row header-row" style={{marginTop: '15px'}}>
                                <span className="info-label">Other Metrics</span>
                              </div>
                              {substationEconomics[substation.bus_id].zonal_hub_lmp && (
                                <div className="info-row">
                                  <span className="info-label">Zonal Hub LMP:</span>
                                  <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].zonal_hub_lmp).toFixed(2)}/MWh</span>
                                </div>
                              )}
                              {substationEconomics[substation.bus_id].basis && (
                                <div className="info-row">
                                  <span className="info-label">Basis:</span>
                                  <span className="info-value">${parseFloat(substationEconomics[substation.bus_id].basis).toFixed(2)}/MWh</span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="info-row" style={{textAlign: 'center', padding: '20px'}}>
                          <span className="info-label" style={{fontSize: '14px', color: '#f59e0b'}}>
                            ⚠️ No economic data available for this bus
                          </span>
                        </div>
                      )
                      ) : (
                        <div className="info-row" style={{textAlign: 'center', padding: '20px'}}>
                          <span className="info-label" style={{fontSize: '14px', color: '#6b7280'}}>
                            ⏳ Loading economic data from database...
                          </span>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-selection-message">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p>Click on bus nodes to view detailed information</p>
              <p className="sub-text">{buses.length} buses available in the system</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container-wrapper">
        <div className="map-main-content">
          {/* Search Control - Fixed Position */}
          <div 
            className="map-search-control"
            onMouseEnter={() => setShowSearchPanel(true)}
            onMouseLeave={() => setShowSearchPanel(false)}
          >
            <button 
              className="search-toggle-btn"
              title="Search location"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            
            {showSearchPanel && (
              <div className="search-panel">
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button className="search-btn" onClick={handleSearch}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className="search-result-item"
                        onClick={() => selectSearchResult(result)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{result.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div ref={mapContainer} className="map-container">
            {/* OSM Layers Legend */}
            {activeLayers.length > 0 && (
              <div className="osm-legend">
                <div className="legend-header">Active OSM Layers</div>
                {activeLayers.map(layer => (
                  <div key={layer.id} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: layer.color }}
                    ></div>
                    <span className="legend-label">{layer.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Unified Layers Dropdown */}
          <div className="unified-layer-dropdown">
            <button 
              className="layer-dropdown-trigger"
              onClick={() => setIsLayerDropdownOpen(!isLayerDropdownOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l9 4.5v6l-9 4.5-9-4.5v-6l9-4.5z"/>
                <path d="M12 22l9-4.5M12 22l-9-4.5M12 22v-8.5"/>
              </svg>
              <span>Layers & Overlays</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ transform: isLayerDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            
            {isLayerDropdownOpen && (
              <div className="unified-dropdown-menu">
                {/* Base Maps Section */}
                <div className="dropdown-section">
                  <div className="dropdown-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Base Maps
                  </div>
                  <div className="base-map-options">
                    <button 
                      className={`base-map-btn ${currentLayer === 'satellite' ? 'active' : ''}`}
                      onClick={() => changeMapStyle('satellite')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      </svg>
                      <span>Satellite</span>
                    </button>
                    <button 
                      className={`base-map-btn ${currentLayer === 'streets' ? 'active' : ''}`}
                      onClick={() => changeMapStyle('streets')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      <span>Streets</span>
                    </button>
                    <button 
                      className={`base-map-btn ${currentLayer === 'terrain' ? 'active' : ''}`}
                      onClick={() => changeMapStyle('terrain')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <span>Terrain</span>
                    </button>
                    <button 
                      className={`base-map-btn ${currentLayer === 'dark' ? 'active' : ''}`}
                      onClick={() => changeMapStyle('dark')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                {/* Power Grid Layers Section */}
                <div className="dropdown-section">
                  <div className="dropdown-section-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Power Grid Overlays
                  </div>
                  
                  <div className="overlay-layers">
                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.grids}
                        onChange={() => toggleLayer('grids')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(76, 175, 80, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="9" y1="3" x2="9" y2="21"/>
                            <line x1="15" y1="3" x2="15" y2="21"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Power Grids</span>
                          <span className="layer-desc">Main grid networks</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.substations}
                        onChange={() => toggleLayer('substations')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(0, 212, 255, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="16" rx="2"/>
                            <path d="M9 9h6M9 15h6M12 9v6"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Substations</span>
                          <span className="layer-desc">Distribution hubs</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.transmissionLines}
                        onChange={() => toggleLayer('transmissionLines')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(255, 193, 7, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2">
                            <path d="M3 12h18M3 6h18M3 18h18"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Transmission Lines</span>
                          <span className="layer-desc">High voltage lines</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.distributionLines}
                        onChange={() => toggleLayer('distributionLines')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(156, 39, 176, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Distribution Lines</span>
                          <span className="layer-desc">Medium voltage</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.powerPlants}
                        onChange={() => toggleLayer('powerPlants')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(244, 67, 54, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Power Plants</span>
                          <span className="layer-desc">Generation facilities</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.transformers}
                        onChange={() => toggleLayer('transformers')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(33, 150, 243, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6M23 12h-6m-6 0H5"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Transformers</span>
                          <span className="layer-desc">Voltage conversion</span>
                        </div>
                      </div>
                    </label>

                    <label className="layer-toggle">
                      <input 
                        type="checkbox" 
                        checked={visibleLayers.switchingStations}
                        onChange={() => toggleLayer('switchingStations')}
                      />
                      <span className="layer-checkbox-custom"></span>
                      <div className="layer-content">
                        <div className="layer-icon-small" style={{ background: 'rgba(255, 152, 0, 0.2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
                            <rect x="6" y="4" width="4" height="16" rx="2"/>
                            <rect x="14" y="4" width="4" height="16" rx="2"/>
                          </svg>
                        </div>
                        <div className="layer-text">
                          <span className="layer-name">Switching Stations</span>
                          <span className="layer-desc">Control points</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map Controls - REMOVED (using MapLibre native controls instead) */}
          {/* <div className="map-controls-right">
            <button className="map-control-btn" title="Compass">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
            </button>
            <button className="map-control-btn" title="Zoom In">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button className="map-control-btn" title="Zoom Out">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button className="map-control-btn" title="Search Location">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="map-control-btn" title="Full Screen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
          </div> */}
        </div>
      </div>

      {/* Right Data Table Panel */}
      <div className={`right-data-panel ${rightPanelOpen ? 'open' : 'closed'} ${isResizingRight ? 'resizing' : ''}`} style={{ width: rightPanelOpen ? `${rightPanelWidth}px` : '0' }}>
        {rightPanelOpen && (
          <>
            <div 
              className="resize-handle resize-handle-left" 
              onMouseDown={startResizeRight}
            />
            <button className="sidebar-notch-left" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <div className="data-panel-header">
              <button className="panel-toggle-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <span className="panel-title">Constraint View & Bus Dashboard</span>
            </div>
            
            {/* Tabs */}
            <div className="data-panel-tabs">
              <button 
                className={`data-tab ${activeRightTab === 'constraints' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('constraints')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                </svg>
                Constraints
              </button>
              <button 
                className={`data-tab ${activeRightTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('dashboard')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 13l4-4 4 4 10-10"/>
                  <path d="M21 3v6h-6"/>
                </svg>
                Bus Dashboard
              </button>
            </div>
            
            {/* Constraints Tab Content */}
            {activeRightTab === 'constraints' && (
              <div className="data-panel-content">
                <div className="constraints-filters">
                  {/* Scenario Selection */}
                  <div className="filter-group">
                    <label className="filter-label">Scenario(s)</label>
                    <div className="selected-scenarios">
                      {selectedScenarios.map(scenarioId => {
                        const scenario = scenarios.find(s => s.id === scenarioId);
                        return (
                          <span key={scenarioId} className="scenario-tag">
                            {scenario?.name || scenarioId}
                            <button onClick={() => removeScenario(scenarioId)} className="tag-remove">×</button>
                          </span>
                        );
                      })}
                    </div>
                    <details className="scenario-dropdown">
                      <summary className="dropdown-trigger">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="16"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Select Scenarios
                      </summary>
                      <div className="dropdown-content">
                        {scenarios.map(scenario => (
                          <label key={scenario.id} className="dropdown-item">
                            <input
                              type="checkbox"
                              checked={selectedScenarios.includes(scenario.id)}
                              onChange={() => toggleScenario(scenario.id)}
                            />
                            <span>{scenario.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                  
                  {/* Constraint Type */}
                  <div className="filter-group">
                    <label className="filter-label">Constraint type</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input 
                          type="radio" 
                          name="constraintType" 
                          value="both" 
                          checked={constraintType === 'both'}
                          onChange={(e) => setConstraintType(e.target.value)}
                        />
                        <span>Both</span>
                      </label>
                      <label className="radio-label">
                        <input 
                          type="radio" 
                          name="constraintType" 
                          value="substation" 
                          checked={constraintType === 'substation'}
                          onChange={(e) => setConstraintType(e.target.value)}
                        />
                        <span>Substation</span>
                      </label>
                      <label className="radio-label">
                        <input 
                          type="radio" 
                          name="constraintType" 
                          value="branch" 
                          checked={constraintType === 'branch'}
                          onChange={(e) => setConstraintType(e.target.value)}
                        />
                        <span>Branch</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Bus Search with Multiple Selection */}
                  <div className="filter-group">
                    <label className="filter-label">Search & Select Buses (comma-separated or type to search)</label>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="e.g., Mystic, Post St. Joe, Indian Pass"
                      value={busSearch}
                      onChange={(e) => {
                        setBusSearch(e.target.value);
                        // Parse comma-separated values and update selected buses
                        const busNames = e.target.value.split(',').map(b => b.trim()).filter(b => b.length > 0);
                        setSelectedBusesForConstraints(busNames);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const busNames = busSearch.split(',').map(b => b.trim()).filter(b => b.length > 0);
                          setSelectedBusesForConstraints(busNames);
                        }
                      }}
                    />
                    {selectedBusesForConstraints.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedBusesForConstraints.map((bus, idx) => (
                          <span key={idx} style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {bus}
                            <button
                              onClick={() => {
                                const newBuses = selectedBusesForConstraints.filter((_, i) => i !== idx);
                                setSelectedBusesForConstraints(newBuses);
                                setBusSearch(newBuses.join(', '));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#1e40af',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Row Count & Expand Button */}
                  <div className="constraints-toolbar">
                    <span className="row-count">
                      {constraints.length} constraint rows across selected buses/lines.
                    </span>
                    <button 
                      className="expand-btn"
                      onClick={() => setShowConstraintModal(true)}
                      disabled={constraints.length === 0}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                      </svg>
                      Expand
                    </button>
                  </div>
                </div>
                
                {/* Constraints Table */}
                <div className="constraints-table-container">
                  {constraintsLoading ? (
                    <div className="loading-indicator">Loading constraints...</div>
                  ) : constraints.length === 0 ? (
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                      </svg>
                      <p>Select scenarios above to view constraints</p>
                    </div>
                  ) : (
                    <table className="constraints-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Sink</th>
                          <th>Scenario</th>
                          <th>Max Power (MW)</th>
                          <th>Monitored Facility</th>
                          <th>Power (MW)</th>
                          <th>Contingency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {constraints.slice(0, 100).map((constraint, idx) => (
                          <tr key={idx}>
                            <td>{constraint.Source || '-'}</td>
                            <td>{constraint.Sink || '-'}</td>
                            <td><span className="scenario-badge">{constraint.scenario}</span></td>
                            <td>{constraint['Maximum Power Withdrawal (MW)'] || '-'}</td>
                            <td>{constraint['Monitored Facility'] || '-'}</td>
                            <td>{constraint['Power Withdrawal (MW)'] || '-'}</td>
                            <td>{constraint['Binding Contingency'] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            
            {/* Bus Dashboard Tab Content */}
            {activeRightTab === 'dashboard' && (
              <div className="data-panel-content">
                <div className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Bus Performance Dashboard</h3>
                    <button 
                      className="expand-btn"
                      onClick={() => setShowDashboardModal(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                      </svg>
                      Expand
                    </button>
                  </div>
                  
                  {/* Search Bar for Bus Selection */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search and select buses..."
                      value={busSearch}
                      onChange={(e) => setBusSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingLeft: '36px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#9ca3af" 
                      strokeWidth="2"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none'
                      }}
                    >
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    
                    {/* Search Results Dropdown */}
                    {busSearch && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 100
                      }}>
                        {buses
                          .filter(bus => 
                            bus.bus_name?.toLowerCase().includes(busSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map(bus => (
                            <div
                              key={bus.bus_id}
                              onClick={() => {
                                console.log('🖱️ Clicked bus:', bus.bus_name);
                                const isSelected = selectedSubstations.some(s => s.id === bus.bus_id);
                                if (isSelected) {
                                  console.log('❌ Removing bus from selection');
                                  setSelectedSubstations(prev => prev.filter(s => s.id !== bus.bus_id));
                                } else {
                                  console.log('✅ Adding bus to selection');
                                  setSelectedSubstations(prev => {
                                    const newSelection = [...prev, {
                                      id: bus.bus_id,
                                      bus_id: bus.bus_id,  // Add bus_id for economic data lookup
                                      name: bus.bus_name,
                                      latitude: bus.latitude,
                                      longitude: bus.longitude
                                    }];
                                    console.log('📋 New selectedSubstations:', newSelection);
                                    return newSelection;
                                  });
                                }
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '13px',
                                background: selectedSubstations.some(s => s.id === bus.bus_id) ? '#eff6ff' : 'white'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                              onMouseLeave={(e) => {
                                e.target.style.background = selectedSubstations.some(s => s.id === bus.bus_id) ? '#eff6ff' : 'white';
                              }}
                            >
                              <span>{bus.bus_name}</span>
                              {selectedSubstations.some(s => s.id === bus.bus_id) && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Buses Count and Clear Button */}
                  {selectedSubstations.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0f9ff', borderRadius: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '500' }}>
                        {selectedSubstations.length} bus{selectedSubstations.length !== 1 ? 'es' : ''} selected
                      </span>
                      <button
                        onClick={() => setSelectedSubstations([])}
                        style={{
                          padding: '4px 8px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="dashboard-content">
                  {dashboardLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>Loading dashboard data...</div>
                      <div style={{ fontSize: '12px', marginTop: '8px' }}>Fetching data for {selectedSubstations.length} bus(es)...</div>
                    </div>
                  ) : !dashboardData || dashboardData.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      <p style={{ fontSize: '14px', marginBottom: '8px' }}>Select buses from the search bar to view dashboard</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                        {selectedSubstations.length > 0 
                          ? `${selectedSubstations.length} bus(es) selected but no data available` 
                          : 'Search for buses using the search bar above'}
                      </p>
                      {/* Debug Info */}
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px', textAlign: 'left' }}>
                        <div><strong>Debug Info:</strong></div>
                        <div>Selected: {selectedSubstations.length} buses</div>
                        <div>Dashboard Data: {dashboardData ? dashboardData.length : 'null'} items</div>
                        <div>Loading: {dashboardLoading ? 'Yes' : 'No'}</div>
                        {selectedSubstations.length > 0 && (
                          <>
                            <div style={{ marginTop: '8px' }}>
                              <div>Selected Buses:</div>
                              {selectedSubstations.map((sub, idx) => (
                                <div key={idx} style={{ marginLeft: '8px' }}>- {sub.name}</div>
                              ))}
                            </div>
                            <button
                              onClick={async () => {
                                console.log('🧪 Manual test fetch initiated');
                                const params = new URLSearchParams();
                                selectedSubstations.forEach(sub => params.append('buses[]', sub.name));
                                const url = `http://localhost:8000/grid-data/bus-dashboard?${params}`;
                                console.log('URL:', url);
                                try {
                                  const res = await fetch(url);
                                  const data = await res.json();
                                  console.log('Test response:', data);
                                  alert(`Fetched ${data.data?.length || 0} buses. Check console for details.`);
                                } catch (err) {
                                  console.error('Test error:', err);
                                  alert('Error: ' + err.message);
                                }
                              }}
                              style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              Test Fetch Manually
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#059669' }}>
                        Showing data for {dashboardData.length} bus(es)
                      </div>
                      {/* Graph 1: Headroom by Scenario */}
                      <div className="dashboard-card">
                        <h4>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                            <path d="M18 20V10M12 20V4M6 20v-6"/>
                          </svg>
                          Headroom by Scenario
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '320px', padding: '20px' }}>
                          {dashboardData.map((bus, idx) => {
                            const dischargingValue = parseFloat(bus.headroom_discharging) || 0;
                            const chargingValue = parseFloat(bus.headroom_charging) || 0;
                            const maxValue = Math.max(dischargingValue, chargingValue, 100);
                            
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '220px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{dischargingValue.toFixed(1)} MW</span>
                                    <div style={{
                                      width: '40px',
                                      height: `${(dischargingValue / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #10b981, #059669)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>Discharging</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{chargingValue.toFixed(1)} MW</span>
                                    <div style={{
                                      width: '40px',
                                      height: `${(chargingValue / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>Charging</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '80px', wordWrap: 'break-word' }}>
                                  {bus.bus_name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Graph 2: 5-Year Forecast (Base vs +500MW) */}
                      <div className="dashboard-card">
                        <h4>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          5-Year Forecast: Base vs +500MW ($/MWh)
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '300px', padding: '20px' }}>
                          {dashboardData.map((bus, idx) => {
                            const baseValue = parseFloat(bus.forecast_base) || 0;
                            const injectionValue = parseFloat(bus.forecast_500mw) || 0;
                            const maxValue = Math.max(baseValue, injectionValue, 100);
                            
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '200px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>${baseValue.toFixed(1)}</span>
                                    <div style={{
                                      width: '40px',
                                      height: `${(baseValue / maxValue) * 180}px`,
                                      background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>Base</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>${injectionValue.toFixed(1)}</span>
                                    <div style={{
                                      width: '40px',
                                      height: `${(injectionValue / maxValue) * 180}px`,
                                      background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>+500MW</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '8px', textAlign: 'center', maxWidth: '80px', wordWrap: 'break-word' }}>
                                  {bus.bus_name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Graph 3: Node vs Base vs Basis */}
                      <div className="dashboard-card">
                        <h4>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Node LMP vs Base vs Basis ($/MWh)
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '320px', padding: '20px' }}>
                          {dashboardData.map((bus, idx) => {
                            const nodeLMP = parseFloat(bus.historical_average_lmp) || 0;
                            const basis = parseFloat(bus.basis) || 0;
                            const baseLMP = nodeLMP - basis;
                            const maxValue = Math.max(nodeLMP, baseLMP, Math.abs(basis), 100);
                            
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '220px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>${nodeLMP.toFixed(2)}</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(nodeLMP / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #6366f1, #4f46e5)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>Node</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>${baseLMP.toFixed(2)}</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(baseLMP / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>Base</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>${basis.toFixed(2)}</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(Math.abs(basis) / maxValue) * 200}px`,
                                      background: basis >= 0 ? 'linear-gradient(180deg, #10b981, #059669)' : 'linear-gradient(180deg, #ef4444, #dc2626)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>Basis</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '100px', wordWrap: 'break-word' }}>
                                  {bus.bus_name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Graph 4: Curtailment by Injection Level */}
                      <div className="dashboard-card">
                        <h4>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          Curtailment by Injection Level
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '320px', padding: '20px' }}>
                          {dashboardData.map((bus, idx) => {
                            const curtailment500 = parseFloat(bus.curtailment_with_500_mw) || 0;
                            const curtailment250 = parseFloat(bus.curtailment_with_250_mw) || 0;
                            const curtailment100 = parseFloat(bus.curtailment_with_100_mw) || 0;
                            const maxValue = Math.max(curtailment500, curtailment250, curtailment100, 10);
                            
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '220px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{curtailment500.toFixed(1)}%</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(curtailment500 / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>+500MW</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{curtailment250.toFixed(1)}%</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(curtailment250 / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>+250MW</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{curtailment100.toFixed(1)}%</span>
                                    <div style={{
                                      width: '32px',
                                      height: `${(curtailment100 / maxValue) * 200}px`,
                                      background: 'linear-gradient(180deg, #10b981, #059669)',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '20px'
                                    }}></div>
                                    <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>+100MW</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '100px', wordWrap: 'break-word' }}>
                                  {bus.bus_name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {!rightPanelOpen && (
          <button className="sidebar-notch-left" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>
      
      {/* Constraint Modal - Modern Design */}
      {showConstraintModal && (
        <div className="constraint-modal-overlay" onClick={() => setShowConstraintModal(false)}>
          <div className="constraint-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="constraint-modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">Constraint Analysis</h2>
                  <p className="modal-subtitle">Comprehensive system constraint view across all scenarios</p>
                </div>
              </div>
              <button className="constraint-modal-close" onClick={() => setShowConstraintModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="constraint-modal-body">
              {/* Filters Section */}
              <div className="constraint-modal-filters">
                <div className="filter-group">
                  <label className="filter-label">Scenario(s)</label>
                  <div className="selected-scenarios">
                    {selectedScenarios.map(scenarioId => {
                      const scenario = scenarios.find(s => s.id === scenarioId);
                      return (
                        <span key={scenarioId} className="scenario-tag">
                          {scenario?.name || scenarioId}
                          <button onClick={() => removeScenario(scenarioId)} className="tag-remove">×</button>
                        </span>
                      );
                    })}
                  </div>
                  <details className="scenario-dropdown">
                    <summary className="dropdown-trigger">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      Select Scenarios
                    </summary>
                    <div className="dropdown-content">
                      {scenarios.map(scenario => (
                        <label key={scenario.id} className="dropdown-item">
                          <input
                            type="checkbox"
                            checked={selectedScenarios.includes(scenario.id)}
                            onChange={() => toggleScenario(scenario.id)}
                          />
                          <span>{scenario.name}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Constraint Type</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name="modalConstraintType" value="both" checked={constraintType === 'both'} onChange={(e) => setConstraintType(e.target.value)} />
                      <span>Both</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="modalConstraintType" value="substation" checked={constraintType === 'substation'} onChange={(e) => setConstraintType(e.target.value)} />
                      <span>Substation</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="modalConstraintType" value="branch" checked={constraintType === 'branch'} onChange={(e) => setConstraintType(e.target.value)} />
                      <span>Branch</span>
                    </label>
                  </div>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Search Filter</label>
                  <input type="text" className="search-input" placeholder="Bus, line, contingency, facility..." value={busSearch} onChange={(e) => setBusSearch(e.target.value)} />
                </div>
              </div>
              
              {/* Table Container */}
              <div className="constraint-table-wrapper">
                <div className="constraint-table-toolbar">
                  <div className="constraint-row-count">
                    Showing <strong>{constraints.length}</strong> constraint rows across selected scenarios
                  </div>
                </div>
                
                <div className="constraint-table-scroll">
                  {constraintsLoading ? (
                    <div className="modal-loading">
                      <div className="modal-loading-spinner"></div>
                      <div className="modal-loading-text">Loading constraint data...</div>
                    </div>
                  ) : constraints.length === 0 ? (
                    <div className="constraint-empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                      </svg>
                      <p>No constraints available</p>
                      <p style={{fontSize: '13px', marginTop: '8px'}}>Select scenarios above to view constraint data</p>
                    </div>
                  ) : (
                    <table className="constraint-table-modern">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Sink</th>
                          <th>Scenario</th>
                          <th>Max Power (MW)</th>
                          <th>Monitored Facility</th>
                          <th>From Bus #</th>
                          <th>From Bus Name</th>
                          <th>To Bus #</th>
                          <th>To Bus Name</th>
                          <th>Circuit</th>
                          <th>Voltage (KV)</th>
                          <th>Area</th>
                          <th>Zone</th>
                          <th>Power (MW)</th>
                          <th>Dist. Factor</th>
                          <th>Binding Contingency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {constraints.map((constraint, idx) => (
                          <tr key={idx}>
                            <td>{constraint.Source || '-'}</td>
                            <td>{constraint.Sink || '-'}</td>
                            <td><span className="scenario-badge-modern">{constraint.scenario}</span></td>
                            <td>{constraint['Maximum Power Withdrawal (MW)'] || '-'}</td>
                            <td>{constraint['Monitored Facility'] || '-'}</td>
                            <td>{constraint['From Bus Number Monitored Facility'] || '-'}</td>
                            <td>{constraint['From Bus Model Identifier Monitored Facility'] || '-'}</td>
                            <td>{constraint['To Bus Number Monitored Facility'] || '-'}</td>
                            <td>{constraint['To Bus Model Identifier Monitored Facility'] || '-'}</td>
                            <td>{constraint.Circuit || '-'}</td>
                            <td>{constraint['Voltage (KV) Monitored Facility'] || '-'}</td>
                            <td>{constraint['Area Monitored Facility'] || '-'}</td>
                            <td>{constraint['Zone Monitored Facility'] || '-'}</td>
                            <td>{constraint['Power Withdrawal (MW)'] || '-'}</td>
                            <td>{constraint['Distribution Factor (Dfax)'] || '-'}</td>
                            <td>{constraint['Binding Contingency'] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bus Dashboard Modal - Modern Design */}
      {showDashboardModal && (
        <div className="dashboard-modal-overlay" onClick={() => setShowDashboardModal(false)}>
          <div className="dashboard-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-wrapper dashboard-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M3 13l4-4 4 4 10-10"/>
                    <path d="M21 3v6h-6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">System Performance Dashboard</h2>
                  <p className="modal-subtitle">Real-time metrics, analytics, and system health monitoring</p>
                </div>
              </div>
              <button className="dashboard-modal-close" onClick={() => setShowDashboardModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="dashboard-modal-body">
              {dashboardLoading ? (
                <div style={{ padding: '80px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '18px', fontWeight: '500' }}>Loading dashboard data...</div>
                </div>
              ) : !dashboardData || dashboardData.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', color: '#6b7280' }}>
                  <p style={{ fontSize: '16px' }}>Select buses from the search bar to view detailed dashboard</p>
                </div>
              ) : (
                <div className="dashboard-grid-modern" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '24px',
                  padding: '0'
                }}>
                  {/* Graph 1: Headroom by Scenario */}
                  <div className="dashboard-card-large">
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}>
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                      </svg>
                      Headroom by Scenario
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '400px', padding: '20px', overflowX: 'auto' }}>
                      {dashboardData.map((bus, idx) => {
                        const dischargingValue = parseFloat(bus.headroom_discharging) || 0;
                        const chargingValue = parseFloat(bus.headroom_charging) || 0;
                        const maxValue = Math.max(dischargingValue, chargingValue, 100);
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px', margin: '0 10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '280px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{dischargingValue.toFixed(1)} MW</span>
                                <div style={{
                                  width: '50px',
                                  height: `${(dischargingValue / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #10b981, #059669)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Discharging</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{chargingValue.toFixed(1)} MW</span>
                                <div style={{
                                  width: '50px',
                                  height: `${(chargingValue / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Charging</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '100px', wordWrap: 'break-word' }}>
                              {bus.bus_name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Graph 2: 5-Year Forecast (Base vs +500MW) */}
                  <div className="dashboard-card-large">
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}>
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      5-Year Forecast: Base vs +500MW ($/MWh)
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '400px', padding: '20px', overflowX: 'auto' }}>
                      {dashboardData.map((bus, idx) => {
                        const baseValue = parseFloat(bus.forecast_base) || 0;
                        const injectionValue = parseFloat(bus.forecast_500mw) || 0;
                        const maxValue = Math.max(baseValue, injectionValue, 100);
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px', margin: '0 10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '280px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>${baseValue.toFixed(1)}</span>
                                <div style={{
                                  width: '50px',
                                  height: `${(baseValue / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Base</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>${injectionValue.toFixed(1)}</span>
                                <div style={{
                                  width: '50px',
                                  height: `${(injectionValue / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>+500MW</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '100px', wordWrap: 'break-word' }}>
                              {bus.bus_name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Graph 3: Node vs Base vs Basis */}
                  <div className="dashboard-card-large">
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      Node LMP vs Base vs Basis ($/MWh)
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '400px', padding: '20px', overflowX: 'auto' }}>
                      {dashboardData.map((bus, idx) => {
                        const nodeLMP = parseFloat(bus.historical_average_lmp) || 0;
                        const basis = parseFloat(bus.basis) || 0;
                        const baseLMP = nodeLMP - basis;
                        const maxValue = Math.max(nodeLMP, baseLMP, Math.abs(basis), 100);
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px', margin: '0 10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '280px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>${nodeLMP.toFixed(2)}</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(nodeLMP / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #6366f1, #4f46e5)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Node</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>${baseLMP.toFixed(2)}</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(baseLMP / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Base</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>${basis.toFixed(2)}</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(Math.abs(basis) / maxValue) * 250}px`,
                                  background: basis >= 0 ? 'linear-gradient(180deg, #10b981, #059669)' : 'linear-gradient(180deg, #ef4444, #dc2626)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Basis</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '120px', wordWrap: 'break-word' }}>
                              {bus.bus_name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Graph 4: Curtailment by Injection Level */}
                  <div className="dashboard-card-large">
                    <h3>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Curtailment by Injection Level
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '400px', padding: '20px', overflowX: 'auto' }}>
                      {dashboardData.map((bus, idx) => {
                        const curtailment500 = parseFloat(bus.curtailment_with_500_mw) || 0;
                        const curtailment250 = parseFloat(bus.curtailment_with_250_mw) || 0;
                        const curtailment100 = parseFloat(bus.curtailment_with_100_mw) || 0;
                        const maxValue = Math.max(curtailment500, curtailment250, curtailment100, 10);
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px', margin: '0 10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '280px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{curtailment500.toFixed(1)}%</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(curtailment500 / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>+500MW</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{curtailment250.toFixed(1)}%</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(curtailment250 / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>+250MW</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{curtailment100.toFixed(1)}%</span>
                                <div style={{
                                  width: '40px',
                                  height: `${(curtailment100 / maxValue) * 250}px`,
                                  background: 'linear-gradient(180deg, #10b981, #059669)',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: '30px'
                                }}></div>
                                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>+100MW</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '12px', textAlign: 'center', maxWidth: '120px', wordWrap: 'break-word' }}>
                              {bus.bus_name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maps;

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Maps.css';
import useGridInfrastructure from '../hooks/useGridInfrastructure';

const Maps = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
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

  const [currentLayer, setCurrentLayer] = useState('satellite');
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
  const [activeFilters, setActiveFilters] = useState({
    voltages: [],
    capacities: [],
    statuses: [],
    regions: []
  });
  
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
    overpassCables: false
  });
  const [selectedSubstation, setSelectedSubstation] = useState(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    gridInfrastructure: true,
    substations: true,
    tndLines: false,
    generators: false,
    loads: false,
    transformers: false,
    database: false,
    filters: false,
    overpass: false
  });
  
  // Database management state
  const [databases, setDatabases] = useState([
    { id: 1, name: 'gridsense_iso_ne_sample.db', active: true, path: './gridsense_iso_ne_sample.db' }
  ]);
  const [showAddDatabase, setShowAddDatabase] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbPath, setNewDbPath] = useState('');
  const [loadingOverpass, setLoadingOverpass] = useState({});
  const [activeLayers, setActiveLayers] = useState([]);
  const [overpassCache, setOverpassCache] = useState({});
  const moveEndTimerRef = useRef(null);
  const loadedBoundsRef = useRef({});
  const loadingLayersRef = useRef({});
  const visibleLayersRef = useRef(visibleLayers);
  
  // Keep ref in sync with state
  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
  }, [visibleLayers]);

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
          center: [0, 20], // Centered for good globe view
          zoom: 1.5,
          renderWorldCopies: false, // Disable world wrapping for globe
          attributionControl: false,
          antialias: true,
          maxPitch: 85
        });

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
      const voltageRanges = voltages.map(v => ({
        label: `${v} kV`,
        value: v,
        count: buses.filter(b => b.nominal_voltage === v).length
      }));
      
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
    }
  }, [buses, branches, generators]);

  // Add real grid infrastructure data layers when data loads and map is ready
  useEffect(() => {
    if (!map.current || !mapLoaded || dataLoading || busesGeoJSON.features.length === 0) return;

    console.log(`Loading ${busesGeoJSON.features.length} buses, ${branchesGeoJSON.features.length} branches`);

    // Add buses source and layers
    if (!map.current.getSource('real-buses-source')) {
      map.current.addSource('real-buses-source', {
        type: 'geojson',
        data: busesGeoJSON,
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50
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
      map.current.addLayer({
        id: 'real-buses-points',
        type: 'circle',
        source: 'real-buses-source',
        filter: ['!', ['has', 'point_count']],
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
            8, 4,
            12, 8,
            16, 12
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

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

      // Add click handler for bus selection
      map.current.on('click', 'real-buses-points', (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties;
          
          setSelectedSubstation({
            id: props.id,
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
          });
          
          // Open detail panel
          setDetailPanelOpen(true);
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'real-buses-points', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'real-buses-points', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Handle cluster clicks
      map.current.on('click', 'real-buses-clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['real-buses-clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('real-buses-source').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });
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

  const toggleLayer = (layerName) => {
    const newVisibility = !visibleLayers[layerName];
    
    setVisibleLayers(prev => ({
      ...prev,
      [layerName]: newVisibility
    }));
    
    // Handle Overpass API layer toggling
    if (!map.current) return;
    
    // Handle street labels toggle
    if (layerName === 'streetLabels') {
      if (map.current.getLayer('osm-labels')) {
        map.current.setLayoutProperty('osm-labels', 'visibility', newVisibility ? 'visible' : 'none');
      }
      return;
    }
    
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
      <div className={`left-sidebar ${leftSidebarOpen ? 'open' : 'closed'}`}>
        <button className="sidebar-notch-right" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={leftSidebarOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
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
          {/* Database Section */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('database')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.database ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <span>Database</span>
            </div>
            {expandedSections.database && (
              <div className="section-items">
                {databases.map(db => (
                  <div key={db.id} className="layer-item database-item">
                    <input 
                      type="radio" 
                      id={`db-${db.id}`} 
                      name="database"
                      checked={db.active}
                      onChange={() => {
                        setDatabases(databases.map(d => ({
                          ...d,
                          active: d.id === db.id
                        })));
                      }}
                    />
                    <label htmlFor={`db-${db.id}`} title={db.path}>{db.name}</label>
                    {databases.length > 1 && (
                      <button 
                        className="delete-db-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDatabases(databases.filter(d => d.id !== db.id));
                        }}
                        title="Remove database"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                
                {!showAddDatabase ? (
                  <button 
                    className="add-database-btn"
                    onClick={() => setShowAddDatabase(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Database
                  </button>
                ) : (
                  <div className="add-database-form">
                    <input
                      type="text"
                      placeholder="Database name"
                      value={newDbName}
                      onChange={(e) => setNewDbName(e.target.value)}
                      className="db-input"
                    />
                    <input
                      type="text"
                      placeholder="Database path or URL"
                      value={newDbPath}
                      onChange={(e) => setNewDbPath(e.target.value)}
                      className="db-input"
                    />
                    <div className="db-form-actions">
                      <button 
                        className="db-save-btn"
                        onClick={() => {
                          if (newDbName && newDbPath) {
                            setDatabases([...databases, {
                              id: Date.now(),
                              name: newDbName,
                              active: false,
                              path: newDbPath
                            }]);
                            setNewDbName('');
                            setNewDbPath('');
                            setShowAddDatabase(false);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button 
                        className="db-cancel-btn"
                        onClick={() => {
                          setNewDbName('');
                          setNewDbPath('');
                          setShowAddDatabase(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filters Section */}
          <div className="layer-section">
            <div className="section-header" onClick={() => toggleSection('filters')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSections.filters ? "6 9 12 15 18 9" : "9 18 15 12 9 6"}/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <span>Filters</span>
            </div>
            {expandedSections.filters && (
              <div className="section-items">
                {/* Voltage Filters */}
                {filters.voltageRanges.length > 0 && (
                  <div className="filter-group">
                    <div className="filter-group-header">Voltage Levels</div>
                    {filters.voltageRanges.map(voltage => (
                      <div key={voltage.value} className="layer-item">
                        <input 
                          type="checkbox" 
                          id={`filter-voltage-${voltage.value}`}
                          checked={activeFilters.voltages.includes(voltage.value)}
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              voltages: e.target.checked 
                                ? [...prev.voltages, voltage.value]
                                : prev.voltages.filter(v => v !== voltage.value)
                            }));
                          }}
                        />
                        <label htmlFor={`filter-voltage-${voltage.value}`}>
                          {voltage.label} ({voltage.count})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Capacity Filters */}
                {filters.capacityRanges.length > 0 && (
                  <div className="filter-group">
                    <div className="filter-group-header">Generator Capacity</div>
                    {filters.capacityRanges.map((range, idx) => (
                      <div key={idx} className="layer-item">
                        <input 
                          type="checkbox" 
                          id={`filter-capacity-${idx}`}
                          checked={activeFilters.capacities.includes(idx)}
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              capacities: e.target.checked 
                                ? [...prev.capacities, idx]
                                : prev.capacities.filter(c => c !== idx)
                            }));
                          }}
                        />
                        <label htmlFor={`filter-capacity-${idx}`}>
                          {range.label} ({range.count})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Status Filters */}
                {filters.statuses.length > 0 && (
                  <div className="filter-group">
                    <div className="filter-group-header">Operational Status</div>
                    {filters.statuses.map(status => (
                      <div key={status.value} className="layer-item">
                        <input 
                          type="checkbox" 
                          id={`filter-status-${status.value}`}
                          defaultChecked
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              statuses: e.target.checked 
                                ? [...prev.statuses, status.value]
                                : prev.statuses.filter(s => s !== status.value)
                            }));
                          }}
                        />
                        <label htmlFor={`filter-status-${status.value}`}>
                          {status.label} ({status.count})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Region Filters */}
                {filters.regions.length > 0 && (
                  <div className="filter-group">
                    <div className="filter-group-header">Regions</div>
                    {filters.regions.map(region => (
                      <div key={region.value} className="layer-item">
                        <input 
                          type="checkbox" 
                          id={`filter-region-${region.value}`}
                          checked={activeFilters.regions.includes(region.value)}
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              regions: e.target.checked 
                                ? [...prev.regions, region.value]
                                : prev.regions.filter(r => r !== region.value)
                            }));
                          }}
                        />
                        <label htmlFor={`filter-region-${region.value}`}>
                          {region.label} ({region.count})
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Show message if no data */}
                {filters.voltageRanges.length === 0 && filters.capacityRanges.length === 0 && 
                 filters.statuses.length === 0 && filters.regions.length === 0 && (
                  <div className="layer-item" style={{color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontStyle: 'italic'}}>
                    No filter options available. Load data first.
                  </div>
                )}
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

          {/* Grid Infrastructure Section */}
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
                      <div className="layer-item">
                        <input type="checkbox" id="sub-69kv" defaultChecked />
                        <label htmlFor="sub-69kv">Indian Pass - 69kV</label>
                      </div>
                      <div className="layer-item">
                        <input type="checkbox" id="sub-230kv" />
                        <label htmlFor="sub-230kv">Port St. Joe - 230kV</label>
                      </div>
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
        </div>
      </div>

      {/* Center Detail Panel */}
      <div className={`center-detail-panel ${detailPanelOpen ? 'open' : 'closed'}`}>
        <button className="sidebar-notch-right" onClick={() => setDetailPanelOpen(!detailPanelOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={detailPanelOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
          </svg>
        </button>
        <div className="detail-panel-header">
          <button className="detail-toggle-btn" onClick={() => setDetailPanelOpen(!detailPanelOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={detailPanelOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
            </svg>
          </button>
          <span className="detail-count">
            {selectedSubstation ? 'Substation Details' : `Substations [${buses.length}]`}
          </span>
          {selectedSubstation && (
            <button className="close-detail-btn" onClick={() => setSelectedSubstation(null)}>×</button>
          )}
        </div>
        <div className="detail-panel-content">
          {selectedSubstation ? (
            <div className="substation-card selected">
              <div className="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span className="station-name">{selectedSubstation.name}</span>
                <div className="card-actions">
                  <button className="icon-btn" onClick={() => {
                    if (map.current && selectedSubstation.coordinates) {
                      map.current.flyTo({
                        center: [selectedSubstation.coordinates.lng, selectedSubstation.coordinates.lat],
                        zoom: 14
                      });
                    }
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </button>
                  <button className="icon-btn" onClick={() => setSelectedSubstation(null)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="detail-table">
                  <tbody>
                    <tr>
                      <td>Bus ID</td>
                      <td className="value-col">{selectedSubstation.id}</td>
                    </tr>
                    <tr className="highlight-row">
                      <td>Nominal Voltage (kV)</td>
                      <td className="value-col">{selectedSubstation.voltage || 'N/A'}</td>
                    </tr>
                    {selectedSubstation.county && (
                      <tr>
                        <td>County</td>
                        <td className="value-col">{selectedSubstation.county}</td>
                      </tr>
                    )}
                    {selectedSubstation.state && (
                      <tr>
                        <td>State</td>
                        <td className="value-col">{selectedSubstation.state}</td>
                      </tr>
                    )}
                    {selectedSubstation.shortCircuit && (
                      <tr>
                        <td>3-Phase Short Circuit (MVA)</td>
                        <td className="value-col">{parseFloat(selectedSubstation.shortCircuit).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="2" className="section-header-row">
                        <strong>Historical Average LMP ($/MWh)</strong>
                      </td>
                    </tr>
                    {selectedSubstation.lmp2022 && (
                      <tr className="data-row">
                        <td>2022</td>
                        <td className="value-col">${parseFloat(selectedSubstation.lmp2022).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedSubstation.lmp2023 && (
                      <tr className="data-row">
                        <td>2023</td>
                        <td className="value-col">${parseFloat(selectedSubstation.lmp2023).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedSubstation.lmp2024 && (
                      <tr className="data-row">
                        <td>2024</td>
                        <td className="value-col">${parseFloat(selectedSubstation.lmp2024).toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedSubstation.lmp2025 && (
                      <tr className="data-row">
                        <td>2025</td>
                        <td className="value-col">${parseFloat(selectedSubstation.lmp2025).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p>Click on a bus node to view detailed information</p>
              <p className="sub-text">{buses.length} buses available in the system</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container-wrapper">
        <div className="map-main-content">
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

          {/* Map Controls */}
          <div className="map-controls-right">
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
          </div>
        </div>
      </div>

      {/* Right Data Table Panel */}
      <div className={`right-data-panel ${rightPanelOpen ? 'open' : 'closed'}`}>
        <button className="sidebar-notch-left" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={rightPanelOpen ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}/>
          </svg>
        </button>
        <div className="data-panel-header">
          <button className="panel-toggle-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={rightPanelOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}/>
            </svg>
          </button>
          <span className="panel-title">Data Analysis</span>
        </div>
        <div className="data-panel-tabs">
          <button className="data-tab active">Binding Constraint Type (Substations)</button>
          <button className="data-tab">Injection / Withdrawal Level</button>
          <button className="data-tab">Binding Constraint Type (Branches)</button>
        </div>
        <div className="data-panel-content">
          <div className="data-panel-filters">
            <select className="data-filter-select">
              <option>Summer Peak Substation Discharging</option>
            </select>
            <div className="data-filter-range">
              <label>Range:</label>
              <input type="number" defaultValue="1" className="range-input" />
              <span>to</span>
              <input type="number" defaultValue="500" className="range-input" />
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Common Name</th>
                  <th>State</th>
                  <th>Maximum Power Injection (MW)</th>
                  <th>Monitored Facility</th>
                  <th>Power Injection (MW)</th>
                  <th>From Bus Name & #</th>
                  <th>Source</th>
                  <th>Common Name</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Florida Pass</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>200</td>
                  <td>200</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>76.5</td>
                  <td>3071</td>
                  <td></td>
                  <td>8506-8502-1</td>
                  <td>117h Ave East to 117h Ave St</td>
                </tr>
                <tr>
                  <td>Indian Pass</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>200</td>
                  <td>200</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>77.9</td>
                  <td>3037681</td>
                  <td></td>
                  <td>8506-8502-1</td>
                  <td>117h Ave East to 117h St</td>
                </tr>
                <tr>
                  <td>Indian Pass</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>200</td>
                  <td>200</td>
                  <td>Florida_Discharging_Sink</td>
                  <td>63.5</td>
                  <td>3619</td>
                  <td></td>
                  <td>Florida</td>
                  <td>Florida_Discharging_Sink</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maps;

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Maps.css';

const Maps = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [gridStats, setGridStats] = useState({
    totalNodes: 1247,
    activeAlerts: 3,
    powerFlow: '1.2 GW',
    efficiency: 94.5
  });

  const [currentLayer, setCurrentLayer] = useState('satellite');
  const [currentLocation, setCurrentLocation] = useState('Loading location...');
  const [mapCenter, setMapCenter] = useState({ lat: 37.75, lng: -122.4 });

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
      sources: {
        [selectedStyle.layer.source]: selectedStyle.source,
        'countries': {
          type: 'geojson',
          data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
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
        }
      ]
    };
  };

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle('satellite'), // Start with satellite + boundaries
      center: [0, 0],
      zoom: 1.5,
      bearing: 0
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
    
    // Add atmosphere effect for globe
    map.current.on('style.load', () => {
      map.current.setFog({
        color: 'rgb(186, 210, 235)', // Lower atmosphere
        'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
        'horizon-blend': 0.02, // Atmosphere thickness
        'space-color': 'rgb(11, 11, 25)', // Background space color
        'star-intensity': 0.6 // Stars intensity
      });
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      updateLocation(map.current.getCenter());
    });

    // Update location when map moves
    map.current.on('moveend', () => {
      const center = map.current.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
      updateLocation(center);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

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

  return (
    <div className="maps-page">
      <div className="page-header">
        <h1>Grid Network Map</h1>
        <p>Real-time monitoring of power distribution network</p>
        <div className="location-display">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{currentLocation}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{gridStats.totalNodes}</div>
            <div className="stat-label">Grid Nodes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{gridStats.activeAlerts}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{gridStats.powerFlow}</div>
            <div className="stat-label">Power Flow</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(156, 39, 176, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{gridStats.efficiency}%</div>
            <div className="stat-label">Efficiency</div>
          </div>
        </div>
      </div>

      <div className="map-container-wrapper">
        <div ref={mapContainer} className="map-container"></div>
        
        {/* Layer Switcher */}
        <div className="layer-switcher">
          <button 
            className={`layer-btn ${currentLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => changeMapStyle('satellite')}
            title="Satellite View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            </svg>
            <span>Satellite</span>
          </button>
          <button 
            className={`layer-btn ${currentLayer === 'streets' ? 'active' : ''}`}
            onClick={() => changeMapStyle('streets')}
            title="Streets View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>Streets</span>
          </button>
          <button 
            className={`layer-btn ${currentLayer === 'terrain' ? 'active' : ''}`}
            onClick={() => changeMapStyle('terrain')}
            title="Terrain View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span>Terrain</span>
          </button>
          <button 
            className={`layer-btn ${currentLayer === 'dark' ? 'active' : ''}`}
            onClick={() => changeMapStyle('dark')}
            title="Dark View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <span>Dark</span>
          </button>
        </div>
        
        <div className="grid-nodes-panel">
          <h3>Location Info</h3>
          <div className="location-info">
            <div className="info-row">
              <span className="info-label">Latitude:</span>
              <span className="info-value">{mapCenter.lat.toFixed(6)}°</span>
            </div>
            <div className="info-row">
              <span className="info-label">Longitude:</span>
              <span className="info-value">{mapCenter.lng.toFixed(6)}°</span>
            </div>
            <div className="info-row">
              <span className="info-label">Zoom Level:</span>
              <span className="info-value">{map.current ? map.current.getZoom().toFixed(2) : '2.00'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maps;

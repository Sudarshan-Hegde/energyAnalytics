// ADD THIS CODE TO Maps.jsx AFTER THE EXISTING useEffects (around line 800-900)

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

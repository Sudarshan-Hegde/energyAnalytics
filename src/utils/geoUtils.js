/**
 * GeoJSON Utilities
 * 
 * Helper functions for converting database records to GeoJSON format
 * and processing geospatial data for MapLibre GL visualization
 */

/**
 * Convert buses array to GeoJSON FeatureCollection
 * @param {Array} buses - Array of bus objects from database
 * @returns {Object} - GeoJSON FeatureCollection
 */
export const busesToGeoJSON = (buses) => {
  return {
    type: 'FeatureCollection',
    features: buses
      .filter(bus => bus.latitude && bus.longitude)
      .map(bus => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(bus.longitude), parseFloat(bus.latitude)]
        },
        properties: {
          id: bus.id || bus.bus_id,
          name: bus.name || bus.bus_name || `Bus ${bus.id || bus.bus_id}`,
          voltage: parseFloat(bus.voltage) || 0,
          county: bus.county || 'Unknown',
          state: bus.state || 'Unknown',
          zone: bus.zone || 'Unknown',
          shortCircuit: parseFloat(bus.short_circuit_mva) || 0,
          lmp2022: parseFloat(bus.lmp_2022) || 0,
          lmp2023: parseFloat(bus.lmp_2023) || 0,
          lmp2024: parseFloat(bus.lmp_2024) || 0,
          lmp2025: parseFloat(bus.lmp_2025) || 0
        }
      }))
  };
};

/**
 * Convert branches array to GeoJSON FeatureCollection with LineString geometries
 * @param {Array} branches - Array of branch objects from database
 * @param {Array} buses - Array of bus objects for coordinate lookup
 * @returns {Object} - GeoJSON FeatureCollection
 */
export const branchesToGeoJSON = (branches, buses) => {
  // Create bus lookup map for fast coordinate access
  const busMap = new Map();
  buses.forEach(bus => {
    busMap.set(bus.id || bus.bus_id, {
      lat: parseFloat(bus.latitude),
      lng: parseFloat(bus.longitude)
    });
  });

  return {
    type: 'FeatureCollection',
    features: branches
      .map(branch => {
        const fromBus = busMap.get(branch.from_bus || branch.from_bus_id);
        const toBus = busMap.get(branch.to_bus || branch.to_bus_id);

        // Skip branches where we can't find both bus coordinates
        if (!fromBus || !toBus || !fromBus.lat || !toBus.lat) {
          return null;
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [fromBus.lng, fromBus.lat],
              [toBus.lng, toBus.lat]
            ]
          },
          properties: {
            id: branch.id || branch.branch_id,
            from_bus: branch.from_bus || branch.from_bus_id,
            to_bus: branch.to_bus || branch.to_bus_id,
            status: branch.status === 1 ? 'Closed' : 'Open',
            voltage: parseFloat(branch.voltage) || 0,
            rating: parseFloat(branch.rating_a) || parseFloat(branch.thermal_rating) || 0,
            length: calculateDistance(fromBus.lat, fromBus.lng, toBus.lat, toBus.lng)
          }
        };
      })
      .filter(feature => feature !== null)
  };
};

/**
 * Convert generators array to GeoJSON FeatureCollection
 * @param {Array} generators - Array of generator objects from database
 * @returns {Object} - GeoJSON FeatureCollection
 */
export const generatorsToGeoJSON = (generators) => {
  return {
    type: 'FeatureCollection',
    features: generators
      .filter(gen => gen.latitude && gen.longitude)
      .map(gen => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(gen.longitude), parseFloat(gen.latitude)]
        },
        properties: {
          id: gen.id || gen.gen_id,
          name: gen.name || gen.gen_name || `Generator ${gen.id || gen.gen_id}`,
          busId: gen.bus_id || gen.connected_bus,
          capacity: parseFloat(gen.max_capacity_mw) || 0,
          minCapacity: parseFloat(gen.min_capacity_mw) || 0,
          fuelType: gen.fuel_type || 'Unknown',
          status: gen.status === 1 ? 'Online' : 'Offline'
        }
      }))
  };
};

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} - Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate bounding box for a set of coordinates
 * @param {Array} coordinates - Array of [lng, lat] arrays
 * @returns {Object} - { minLng, minLat, maxLng, maxLat }
 */
export const calculateBounds = (coordinates) => {
  if (coordinates.length === 0) {
    return { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 };
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return { minLng, minLat, maxLng, maxLat };
};

/**
 * Add buffer to bounding box
 * @param {Object} bounds - { minLng, minLat, maxLng, maxLat }
 * @param {number} bufferPercent - Buffer percentage (e.g., 10 for 10%)
 * @returns {Object} - Buffered bounds
 */
export const addBoundsBuffer = (bounds, bufferPercent = 10) => {
  const lngRange = bounds.maxLng - bounds.minLng;
  const latRange = bounds.maxLat - bounds.minLat;
  
  const lngBuffer = (lngRange * bufferPercent) / 100;
  const latBuffer = (latRange * bufferPercent) / 100;

  return {
    minLng: bounds.minLng - lngBuffer,
    minLat: bounds.minLat - latBuffer,
    maxLng: bounds.maxLng + lngBuffer,
    maxLat: bounds.maxLat + latBuffer
  };
};

/**
 * Filter GeoJSON features within bounding box
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {Object} bounds - { minLng, minLat, maxLng, maxLat }
 * @returns {Object} - Filtered GeoJSON
 */
export const filterFeaturesByBounds = (geojson, bounds) => {
  return {
    ...geojson,
    features: geojson.features.filter(feature => {
      const coords = feature.geometry.coordinates;
      const [lng, lat] = feature.geometry.type === 'Point' 
        ? coords 
        : coords[0]; // For LineString, check first point

      return lng >= bounds.minLng && lng <= bounds.maxLng &&
             lat >= bounds.minLat && lat <= bounds.maxLat;
    })
  };
};

/**
 * Group features by property value
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {string} property - Property name to group by
 * @returns {Object} - Object with grouped features
 */
export const groupFeaturesByProperty = (geojson, property) => {
  const groups = {};

  geojson.features.forEach(feature => {
    const value = feature.properties[property] || 'Unknown';
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(feature);
  });

  return groups;
};

/**
 * Calculate centroid of a GeoJSON FeatureCollection
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Array} - [lng, lat] of centroid
 */
export const calculateCentroid = (geojson) => {
  if (geojson.features.length === 0) {
    return [0, 0];
  }

  let totalLng = 0;
  let totalLat = 0;
  let count = 0;

  geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Point') {
      totalLng += feature.geometry.coordinates[0];
      totalLat += feature.geometry.coordinates[1];
      count++;
    } else if (feature.geometry.type === 'LineString') {
      feature.geometry.coordinates.forEach(([lng, lat]) => {
        totalLng += lng;
        totalLat += lat;
        count++;
      });
    }
  });

  return count > 0 ? [totalLng / count, totalLat / count] : [0, 0];
};

/**
 * Simplify LineString coordinates (Douglas-Peucker algorithm)
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @param {number} tolerance - Simplification tolerance
 * @returns {Array} - Simplified coordinates
 */
export const simplifyLineString = (coordinates, tolerance = 0.001) => {
  if (coordinates.length <= 2) return coordinates;

  // Find point with maximum distance
  let maxDistance = 0;
  let maxIndex = 0;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = perpendicularDistance(coordinates[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftSegment = simplifyLineString(coordinates.slice(0, maxIndex + 1), tolerance);
    const rightSegment = simplifyLineString(coordinates.slice(maxIndex), tolerance);
    return leftSegment.slice(0, -1).concat(rightSegment);
  }

  return [first, last];
};

/**
 * Calculate perpendicular distance from point to line
 * @param {Array} point - [lng, lat]
 * @param {Array} lineStart - [lng, lat]
 * @param {Array} lineEnd - [lng, lat]
 * @returns {number} - Distance
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Validate GeoJSON coordinates
 * @param {Array} coordinates - [lng, lat]
 * @returns {boolean} - True if valid
 */
export const isValidCoordinate = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  
  const [lng, lat] = coordinates;
  return typeof lng === 'number' && 
         typeof lat === 'number' &&
         lng >= -180 && lng <= 180 &&
         lat >= -90 && lat <= 90 &&
         !isNaN(lng) && !isNaN(lat);
};

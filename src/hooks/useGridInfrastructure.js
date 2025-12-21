import { useState, useEffect } from 'react';
import { gridDataAPI } from '../services/api';

/**
 * Custom hook to fetch and manage grid infrastructure data from SQLite database
 * Provides buses, branches, generators with loading states and coordinate validation
 */
const useGridInfrastructure = () => {
  const [buses, setBuses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [generators, setGenerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate coordinate data
  const isValidCoordinate = (lat, lng) => {
    return (
      lat !== null &&
      lng !== null &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  // Validate and filter bus data
  const validateBuses = (busData) => {
    return busData.filter(bus => {
      if (!isValidCoordinate(bus.latitude, bus.longitude)) {
        console.warn(`Invalid coordinates for bus ${bus.bus_id}: (${bus.latitude}, ${bus.longitude})`);
        return false;
      }
      return true;
    });
  };

  // Validate and filter branch data
  const validateBranches = (branchData) => {
    return branchData.filter(branch => {
      const fromValid = isValidCoordinate(branch.from_latitude, branch.from_longitude);
      const toValid = isValidCoordinate(branch.to_latitude, branch.to_longitude);
      
      if (!fromValid || !toValid) {
        console.warn(
          `Invalid coordinates for branch ${branch.branch_id}: ` +
          `from(${branch.from_latitude}, ${branch.from_longitude}) to(${branch.to_latitude}, ${branch.to_longitude})`
        );
        return false;
      }
      return true;
    });
  };

  // Validate generator data
  const validateGenerators = (genData) => {
    return genData.filter(gen => {
      if (!isValidCoordinate(gen.latitude, gen.longitude)) {
        console.warn(`Invalid coordinates for generator ${gen.gen_id}: (${gen.latitude}, ${gen.longitude})`);
        return false;
      }
      return true;
    });
  };

  useEffect(() => {
    const fetchGridData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all infrastructure data in parallel
        const [busesResponse, branchesResponse, generatorsResponse] = await Promise.all([
          gridDataAPI.getBuses(),
          gridDataAPI.getBranches(),
          gridDataAPI.getGenerators()
        ]);

        // Extract data arrays from response
        // Axios returns response.data, backend wraps in {success, count, data}
        const busData = busesResponse?.data?.data || busesResponse?.data || [];
        const branchData = branchesResponse?.data?.data || branchesResponse?.data || [];
        const genData = generatorsResponse?.data?.data || generatorsResponse?.data || [];

        // Validate and set data
        const validatedBuses = validateBuses(Array.isArray(busData) ? busData : []);
        const validatedBranches = validateBranches(Array.isArray(branchData) ? branchData : []);
        const validatedGenerators = validateGenerators(Array.isArray(genData) ? genData : []);

        setBuses(validatedBuses);
        setBranches(validatedBranches);
        setGenerators(validatedGenerators);

        console.log(`Loaded ${validatedBuses.length} buses, ${validatedBranches.length} branches, ${validatedGenerators.length} generators`);
      } catch (err) {
        console.error('Error fetching grid infrastructure data:', err);
        console.warn('Backend not available. Using empty dataset. Please implement backend API endpoints.');
        
        // Set empty data instead of error to allow app to load
        setBuses([]);
        setBranches([]);
        setGenerators([]);
        setError(null); // Don't show error, just use empty data
      } finally {
        setLoading(false);
      }
    };

    fetchGridData();
  }, []);

  // Convert buses to GeoJSON format for MapLibre
  const busesGeoJSON = {
    type: 'FeatureCollection',
    features: buses.map(bus => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(bus.longitude), parseFloat(bus.latitude)]
      },
      properties: {
        id: bus.bus_id,
        name: bus.bus_name || `Bus ${bus.bus_id}`,
        voltage: bus.nominal_voltage,
        county: bus.county,
        state: bus.state,
        shortCircuit: bus['3_phase_short_circuit'],
        lmp2022: bus.historical_average_lmp_2022,
        lmp2023: bus.historical_average_lmp_2023,
        lmp2024: bus.historical_average_lmp_2024,
        lmp2025: bus.historical_average_lmp_2025
      }
    }))
  };

  // Convert branches to GeoJSON LineString format for MapLibre
  const branchesGeoJSON = {
    type: 'FeatureCollection',
    features: branches.map(branch => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [parseFloat(branch.from_longitude), parseFloat(branch.from_latitude)],
          [parseFloat(branch.to_longitude), parseFloat(branch.to_latitude)]
        ]
      },
      properties: {
        id: branch.branch_id,
        from_bus: branch.from_bus,
        to_bus: branch.to_bus,
        status: branch.status,
        rating: branch.rating,
        length: branch.length_mi
      }
    }))
  };

  // Convert generators to GeoJSON format
  const generatorsGeoJSON = {
    type: 'FeatureCollection',
    features: generators.map(gen => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(gen.longitude), parseFloat(gen.latitude)]
      },
      properties: {
        id: gen.gen_id,
        name: gen.gen_name,
        capacity: gen.max_capacity_mw,
        status: gen.status,
        busId: gen.bus_id
      }
    }))
  };

  return {
    buses,
    branches,
    generators,
    busesGeoJSON,
    branchesGeoJSON,
    generatorsGeoJSON,
    loading,
    error
  };
};

export default useGridInfrastructure;

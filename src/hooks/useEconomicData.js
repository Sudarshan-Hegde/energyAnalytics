import { useState, useEffect } from 'react';
import { gridDataAPI } from '../services/api';

/**
 * Custom hook to fetch economic/LMP data from SQLite database
 * Provides historical LMP, forecasts, and loss components for analytics
 */
const useEconomicData = () => {
  const [economicData, setEconomicData] = useState([]);
  const [lmpForecast, setLmpForecast] = useState([]);
  const [lossComponents, setLossComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEconomicData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all economic data in parallel
        const [econResponse, forecastResponse, lossResponse] = await Promise.all([
          gridDataAPI.getEconomicData(),
          gridDataAPI.getLMPForecast(),
          gridDataAPI.getLossComponents()
        ]);

        // Extract data arrays (Axios wraps in response.data, backend wraps in {success, count, data})
        const econData = econResponse?.data?.data || econResponse?.data || [];
        const forecastData = forecastResponse?.data?.data || forecastResponse?.data || [];
        const lossData = lossResponse?.data?.data || lossResponse?.data || [];

        setEconomicData(econData);
        setLmpForecast(forecastData);
        setLossComponents(lossData);

        console.log(`Loaded ${econData.length} economic records, ${forecastData.length} forecast records`);
      } catch (err) {
        console.error('Error fetching economic data:', err);
        console.warn('Backend not available. Using empty dataset. Please implement backend API endpoints.');
        
        // Set empty data instead of error to allow app to load
        setEconomicData([]);
        setLmpForecast([]);
        setLossComponents([]);
        setError(null); // Don't show error, just use empty data
      } finally {
        setLoading(false);
      }
    };

    fetchEconomicData();
  }, []);

  // Calculate average LMP by year for historical chart
  const getHistoricalLMPByYear = () => {
    if (economicData.length === 0) return [];

    const years = ['2022', '2023', '2024', '2025'];
    return years.map(year => {
      const key = `historical_average_lmp_${year}`;
      const values = economicData
        .map(item => parseFloat(item[key]))
        .filter(val => !isNaN(val) && val > 0);
      
      const avg = values.length > 0 
        ? values.reduce((sum, val) => sum + val, 0) / values.length 
        : 0;
      
      return {
        year,
        value: parseFloat(avg.toFixed(2))
      };
    });
  };

  // Calculate zone efficiency from loss components
  const getZoneEfficiency = () => {
    if (lossComponents.length === 0) return [];

    // Group by zone and calculate average efficiency
    const zoneMap = new Map();
    
    lossComponents.forEach(item => {
      const zone = item.zone || item.area || 'Unknown';
      const lossComp = parseFloat(item.average_loss_component_in_lmp) || 0;
      
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, []);
      }
      zoneMap.get(zone).push(lossComp);
    });

    return Array.from(zoneMap.entries()).map(([zone, losses]) => {
      const avgLoss = losses.reduce((sum, val) => sum + val, 0) / losses.length;
      // Efficiency = 100 - loss percentage
      const efficiency = Math.max(0, 100 - avgLoss);
      
      return {
        zone,
        efficiency: parseFloat(efficiency.toFixed(1)),
        avgLoss: parseFloat(avgLoss.toFixed(2))
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  };

  // Get forecast data for AI prediction chart
  const getForecastData = () => {
    if (lmpForecast.length === 0) return [];

    return lmpForecast.map(item => ({
      busId: item.bus_id,
      busName: item.bus_name,
      baseCase: parseFloat(item['5_year_forecast_avg_lmp_base_case']) || 0,
      highCase: parseFloat(item['5_year_forecast_avg_lmp_high_case']) || 0,
      lowCase: parseFloat(item['5_year_forecast_avg_lmp_low_case']) || 0
    }));
  };

  // Calculate system-wide average forecast
  const getAverageForecast = () => {
    const forecasts = getForecastData();
    if (forecasts.length === 0) return { base: 0, high: 0, low: 0 };

    const base = forecasts.reduce((sum, f) => sum + f.baseCase, 0) / forecasts.length;
    const high = forecasts.reduce((sum, f) => sum + f.highCase, 0) / forecasts.length;
    const low = forecasts.reduce((sum, f) => sum + f.lowCase, 0) / forecasts.length;

    return {
      base: parseFloat(base.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2))
    };
  };

  // Get statistics for metric cards
  const getStatistics = () => {
    const historicalData = getHistoricalLMPByYear();
    const zoneEff = getZoneEfficiency();
    const avgForecast = getAverageForecast();

    const currentYearLMP = historicalData.find(d => d.year === '2025')?.value || 0;
    const previousYearLMP = historicalData.find(d => d.year === '2024')?.value || 0;
    const lmpChange = previousYearLMP > 0 
      ? (((currentYearLMP - previousYearLMP) / previousYearLMP) * 100).toFixed(1)
      : 0;

    const avgEfficiency = zoneEff.length > 0
      ? (zoneEff.reduce((sum, z) => sum + z.efficiency, 0) / zoneEff.length).toFixed(1)
      : 0;

    return {
      avgLMP: currentYearLMP.toFixed(2),
      lmpChange: parseFloat(lmpChange),
      avgEfficiency: parseFloat(avgEfficiency),
      forecastBase: avgForecast.base,
      totalZones: zoneEff.length,
      dataPoints: economicData.length
    };
  };

  return {
    economicData,
    lmpForecast,
    lossComponents,
    loading,
    error,
    // Processed data
    historicalLMP: getHistoricalLMPByYear(),
    zoneEfficiency: getZoneEfficiency(),
    forecastData: getForecastData(),
    avgForecast: getAverageForecast(),
    statistics: getStatistics()
  };
};

export default useEconomicData;

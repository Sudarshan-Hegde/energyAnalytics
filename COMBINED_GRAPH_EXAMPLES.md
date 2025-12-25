# Combined Graph Configuration Examples

This document provides example configurations for combined/multi-series graphs in the Analytics page configurator.

## Overview

Combined graphs allow you to visualize multiple measurements with different chart types on the same visualization, making it easier to identify correlations and trends across different metrics.

---

## Example 1: LMP Trends with Line + Area Chart

**Use Case**: Visualize historical LMP trends across years with both line and area representations

### Configuration:
```json
{
  "chartType": "line-area",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "zone",
    "name": "Zone",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "historical_average_lmp_2022",
      "name": "LMP 2022",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    },
    {
      "id": "historical_average_lmp_2023",
      "name": "LMP 2023",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2024",
      "name": "LMP 2024",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "historical_average_lmp_2022": "avg",
    "historical_average_lmp_2023": "avg",
    "historical_average_lmp_2024": "avg"
  }
}
```

**What it shows**: This creates a combined visualization where LMP 2022 and 2023 are shown as lines (primary axis), while LMP 2024 is shown as an area chart (secondary axis), allowing you to compare trends across zones.

---

## Example 2: Voltage Levels with Bar + Line Chart

**Use Case**: Compare nominal voltage distribution (bars) with average LMP (line)

### Configuration:
```json
{
  "chartType": "line-bar",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "state",
    "name": "State",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "nominal_voltage",
      "name": "Nominal Voltage (kV)",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2025",
      "name": "LMP 2025",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "nominal_voltage": "avg",
    "historical_average_lmp_2025": "avg"
  }
}
```

**What it shows**: Bars represent average nominal voltage by state (primary axis), while a line shows average LMP 2025 (secondary axis), helping identify correlations between voltage infrastructure and pricing.

---

## Example 3: Capacity Analysis with Stacked Bar + Line

**Use Case**: Analyze headroom capacity with trend lines

### Configuration:
```json
{
  "chartType": "stacked-bar-line",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "zone",
    "name": "Zone",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "headroom_capacity_substation_discharging",
      "name": "Headroom Capacity (Discharging)",
      "table": "buses",
      "type": "numeric",
      "aggregation": "sum"
    },
    {
      "id": "headroom_capacity_substation_charging",
      "name": "Headroom Capacity (Charging)",
      "table": "buses",
      "type": "numeric",
      "aggregation": "sum"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2025",
      "name": "Average LMP 2025",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "headroom_capacity_substation_discharging": "sum",
    "headroom_capacity_substation_charging": "sum",
    "historical_average_lmp_2025": "avg"
  }
}
```

**What it shows**: Stacked bars show total charging and discharging capacity by zone (primary axis), with an overlaid line showing average LMP trend (secondary axis).

---

## Example 4: LMP Components Analysis with Area + Line

**Use Case**: Break down LMP into components (congestion, loss) with trend overlay

### Configuration:
```json
{
  "chartType": "area-line",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "zone",
    "name": "Zone",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "average_congestion_component_in_lmp_2024",
      "name": "Congestion Component 2024",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    },
    {
      "id": "average_loss_component_in_lmp_2024",
      "name": "Loss Component 2024",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2024",
      "name": "Total LMP 2024",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "average_congestion_component_in_lmp_2024": "avg",
    "average_loss_component_in_lmp_2024": "avg",
    "historical_average_lmp_2024": "avg"
  }
}
```

**What it shows**: Area charts show the breakdown of LMP components (primary axis), while a line shows the total LMP (secondary axis), helping understand what drives pricing in each zone.

---

## Example 5: Multi-Year Comparison with Bar + Scatter

**Use Case**: Compare yearly LMP values with outlier detection

### Configuration:
```json
{
  "chartType": "bar-scatter",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "county",
    "name": "County",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "historical_average_lmp_2022",
      "name": "LMP 2022",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    },
    {
      "id": "historical_average_lmp_2023",
      "name": "LMP 2023",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2024",
      "name": "LMP 2024 (Scatter)",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "historical_average_lmp_2022": "avg",
    "historical_average_lmp_2023": "avg",
    "historical_average_lmp_2024": "avg"
  }
}
```

**What it shows**: Bars show 2022-2023 averages by county (primary axis), while scatter points highlight 2024 values (secondary axis), making it easy to spot anomalies or changes.

---

## Example 6: Infrastructure Capacity with Stacked Area

**Use Case**: Visualize cumulative capacity trends

### Configuration:
```json
{
  "chartType": "stacked-area",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "zone",
    "name": "Zone",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "headroom_capacity_substation_discharging",
      "name": "Discharging Capacity",
      "table": "buses",
      "type": "numeric",
      "aggregation": "sum"
    },
    {
      "id": "headroom_capacity_substation_charging",
      "name": "Charging Capacity",
      "table": "buses",
      "type": "numeric",
      "aggregation": "sum"
    },
    {
      "id": "3_phase_short_circuit",
      "name": "Short Circuit Capacity",
      "table": "buses",
      "type": "numeric",
      "aggregation": "sum"
    }
  ],
  "secondaryYAxis": [],
  "aggregations": {
    "headroom_capacity_substation_discharging": "sum",
    "headroom_capacity_substation_charging": "sum",
    "3_phase_short_circuit": "sum"
  }
}
```

**What it shows**: Stacked areas show cumulative infrastructure capacity across different metrics by zone, revealing total capacity distribution.

---

## Example 7: Geographic Distribution with Combo Chart

**Use Case**: Analyze distribution by state with multiple metrics

### Configuration:
```json
{
  "chartType": "combo",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "state",
    "name": "State",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "bus_id",
      "name": "Number of Buses",
      "table": "buses",
      "type": "numeric",
      "aggregation": "count"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "historical_average_lmp_2025",
      "name": "Average LMP 2025",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    },
    {
      "id": "nominal_voltage",
      "name": "Average Voltage",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "bus_id": "count",
    "historical_average_lmp_2025": "avg",
    "nominal_voltage": "avg"
  }
}
```

**What it shows**: A combination chart showing bus count per state (bars on primary axis) with LMP and voltage trends (lines on secondary axis).

---

## Example 8: Time-Series Forecast Visualization

**Use Case**: Compare historical data with forecasts

### Configuration:
```json
{
  "chartType": "line-area",
  "dataSource": "gridsense_iso_ne.db",
  "xAxis": {
    "id": "zone",
    "name": "Zone",
    "table": "buses",
    "type": "categorical"
  },
  "primaryYAxis": [
    {
      "id": "historical_average_lmp_2023",
      "name": "Historical LMP 2023",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    },
    {
      "id": "historical_average_lmp_2024",
      "name": "Historical LMP 2024",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "secondaryYAxis": [
    {
      "id": "5_year_forecast_avg_lmp_base_case",
      "name": "5-Year Forecast (Base Case)",
      "table": "buses",
      "type": "numeric",
      "aggregation": "avg"
    }
  ],
  "aggregations": {
    "historical_average_lmp_2023": "avg",
    "historical_average_lmp_2024": "avg",
    "5_year_forecast_avg_lmp_base_case": "avg"
  }
}
```

**What it shows**: Historical LMP data shown as lines (primary axis) with forecast data as an area chart (secondary axis), making it easy to compare actual vs projected values.

---

## How to Apply These Examples

1. **Open the Analytics Page** in your SmartGrid application
2. **Click "Configure"** on any panel
3. **Select a Chart Type** from the examples above
4. **Drag and Drop Fields** from the left sidebar:
   - Set X-Axis (Dimension) 
   - Add Primary Y-Axis measurements
   - Add Secondary Y-Axis measurements (if applicable)
5. **Select Aggregation Type** for each measure (avg, sum, min, max, count)
6. **Click "Apply Configuration"** to render the chart

---

## Tips for Creating Effective Combined Charts

### When to Use Each Chart Type:

- **Line + Bar**: Compare categorical data (bars) with trend data (lines)
- **Area + Line**: Show composition (areas) with totals or averages (lines)
- **Bar + Scatter**: Highlight specific values (scatter) against averages (bars)
- **Stacked Bar + Line**: Show part-to-whole relationships with trend overlay
- **Combo**: Maximum flexibility for mixing different visualizations

### Best Practices:

1. **Primary vs Secondary Axis**: 
   - Use primary axis for main metrics (usually bars or areas)
   - Use secondary axis for trend lines or comparative metrics

2. **Aggregation Selection**:
   - Use `sum` for capacity, counts, totals
   - Use `avg` for prices, rates, percentages
   - Use `min/max` for ranges and extremes

3. **X-Axis Selection**:
   - Choose categorical dimensions like Zone, State, County
   - Avoid high-cardinality fields (too many unique values)

4. **Color Consistency**:
   - The configurator automatically assigns colors
   - First metric gets the first color, second gets the second color, etc.

5. **Data Density**:
   - Limit to 2-3 metrics on primary axis
   - Limit to 1-2 metrics on secondary axis
   - Too many metrics can make charts hard to read

---

## Troubleshooting

**No data appears**: 
- Verify the database is loaded (check browser console)
- Ensure fields are from the correct table
- Check that aggregation is appropriate for the data type

**Charts look cluttered**:
- Reduce the number of metrics
- Use filtering options (when available)
- Try a different chart type

**Can't drag fields**:
- Make sure the field list is loaded
- Check that you've selected a database
- Refresh the page if needed

---

## Advanced Techniques

### Multi-Dimensional Analysis
Combine geographic and temporal dimensions:
- X-Axis: Zone
- Primary Y-Axis: LMP 2022, LMP 2023
- Secondary Y-Axis: LMP 2024, LMP 2025

### Capacity Planning
Analyze infrastructure headroom:
- X-Axis: State
- Primary Y-Axis: Discharging Capacity, Charging Capacity (stacked)
- Secondary Y-Axis: Short Circuit Current (line)

### Price Component Analysis
Understand what drives LMP:
- X-Axis: Zone
- Primary Y-Axis: Congestion Component, Loss Component (stacked area)
- Secondary Y-Axis: Total LMP (line)

---

## Additional Resources

- See [GRAPH_CONFIG_VISUAL_GUIDE.md](./GRAPH_CONFIG_VISUAL_GUIDE.md) for visual configuration guide
- See [ANALYTICS_GRAPH_CONFIG_EXAMPLES.md](./ANALYTICS_GRAPH_CONFIG_EXAMPLES.md) for more examples
- Check [PROJECT_REPORT.md](./PROJECT_REPORT.md) for database schema details

---

**Last Updated**: December 25, 2025  
**Version**: 1.0

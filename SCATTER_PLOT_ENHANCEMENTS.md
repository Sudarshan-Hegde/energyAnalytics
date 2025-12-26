# Scatter Plot & Box Plot Enhancements

## Overview
Enhanced the Analytics dashboard with advanced visualization capabilities for scatter plots and box plots, matching professional data science visualization standards.

---

## ✅ Scatter Plot Enhancements

### 1. **Intelligent Color Coding**
The scatter plot automatically detects whether to use categorical or gradient colors:

#### **A. Categorical Mode (Zone Colors)**
- **Trigger**: When `legend` or `color` field contains non-numeric values (e.g., 'zone')
- **Behavior**: Each category gets a distinct color
- **Zone Colors**:
  - CT: Blue (#3b82f6)
  - ISO-NE: Cyan (#06b6d4)
  - MA: Red (#ef4444)
  - ME: Green (#10b981)
  - NH: Teal (#14b8a6)
  - RI: Amber (#f59e0b)
  - VT: Orange (#f97316)
- **Legend**: Shows discrete colored circles with category labels

#### **B. Gradient Mode (Score Intensity)**
- **Trigger**: When `legend` or `color` field contains numeric values (e.g., '5_year_forecast_solarscore')
- **Behavior**: Color intensity represents metric value
- **Color Scale**: Light blue (low) → Dark blue (high)
- **Formula**: `rgb(135-255, 155-275, 255-155)` based on normalized value
- **Legend**: Shows 6 gradient levels (0.0, 0.2, 0.4, 0.6, 0.8, 1.0) with numeric values

### 2. **Size Variations**
- **Feature**: Bubble size represents a numeric metric (e.g., `headroom_capacity_substation_discharging`)
- **Configuration**: Use `size: '<field_name>'` in graph config
- **Size Range**: 3px (minimum) to 12px (maximum)
- **Normalization**: Automatically scales based on min/max values in dataset

### 3. **Adaptive Color Legend**
- **Location**: Right side of chart
- **Categorical Mode**: Shows up to 7 categories with distinct colors
- **Gradient Mode**: Shows 6 intensity levels with numeric values
- **Display**: Field name as header (auto-formatted from snake_case)
- **Style**: Circular markers matching chart colors

### 4. **Size Legend**
- **Location**: Below color legend on right side
- **Content**: Shows 6 size variations (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)
- **Values**: Displays actual metric values at each size level
- **Visibility**: Only appears when `size` field is configured

### 5. **Enhanced Grid Lines**
- **Y-axis**: 5 horizontal lines at 0%, 25%, 50%, 75%, 100%
- **X-axis**: 5 vertical lines (lighter) at same intervals
- **Value Labels**: Numeric labels on both axes
- **Styling**: Subtle gray with appropriate opacity

---

## ✅ Box Plot Enhancements

### 1. **Correct Statistical Calculation**
- **Data Grouping**: Groups all data points by X-axis category
- **Quartile Calculation**:
  - Q1 (25th percentile)
  - Q2/Median (50th percentile)
  - Q3 (75th percentile)
  - IQR = Q3 - Q1

### 2. **Whisker Implementation**
- **Lower Whisker**: `max(minValue, Q1 - 1.5 × IQR)`
- **Upper Whisker**: `min(maxValue, Q3 + 1.5 × IQR)`
- **Styling**: Dashed lines (strokeDasharray="4,2")
- **Caps**: Horizontal bars at whisker ends

### 3. **Outlier Detection**
- **Rule**: Values < Lower Whisker OR Values > Upper Whisker
- **Display**: Colored circles matching box color
- **Visibility**: All outliers shown individually

### 4. **Visual Enhancements**
- **Box**: Rounded corners (rx="2"), semi-transparent fill
- **Median Line**: Bold black line through box
- **Category Labels**: Rotated -45° to prevent overlap
- **Count Labels**: Shows n=X above each box
- **Grid Lines**: 5 horizontal lines with Y-axis value labels

---

## 📊 Example Configurations
 - Zone Colors
```javascript
{
  id: 'S1',
  name: 'Solar Feasibility Quadrant',
  chartType: 'scatter',
  xAxis: 'curtailment_with_500_mw',
  yAxis: ['5_year_forecast_solarscore'],
  legend: 'zone',                          // Categorical: Color by zone
  size: 'headroom_capacity_substation_discharging'  // Size by headroom
}
```

### Headroom vs Curtailment (S2) - Gradient Colors
```javascript
{
  id: 'S2',
  name: 'Headroom vs Curtailment',
  chartType: 'scatter',
  xAxis: 'headroom_capacity_substation_discharging',
  yAxis: ['curtailment_with_500_mw'],
  color: '5_year_forecast_solarscore'      // Gradient: Blue intensity by score
}
```

### Data Center Price Stability (DC1) - Gradient with Size
```javascript
{
  id: 'DC1',
  name: 'Price Stability vs Headroom',
  chartType: 'scatter',
  xAxis: '5_year_forecast_lmp_stddev',
  yAxis: ['headroom_capacity_substation_discharging_1'],
  color: '5_year_forecast_loadscore',      // Gradient: Color intensity by score
  size: 'existing_gen_mw'                  // Size by queue MW
  size: 'headroom_capacity_substation_discharging'  // Size by headroom
}
```

### SolarScore by Zone (S6)
```javascript
{
  id: 'S6',
  name: 'SolarScore by Zone',
  chartType: 'box-plot',
  xAxis: 'zone',                           // Group by zone
  yAxis: ['5_year_forecast_solarscore']    // Calculate statistics
}
```

---

## 🎨 Visual Improvements

### Scatter Plots
- **Chart Width**: Reduced to 380px to make room for legends
- **Right Padding**: Increased to 140px for legend space
- **Point Styling**: 
  - Semi-transparent fill (opacity 0.7)
  - White stroke outline
  - Stroke width 1px
- **Axis Labels**: Bold, dark gray, properly positioned

###Detect color mode
const colorField = config.legend || config.color || 'zone';
const colorFieldValues = data.map(d => d[colorField]).filter(v => v != null);
const isNumericColor = colorFieldValues.length > 0 && !isNaN(parseFloat(colorFieldValues[0]));

// Gradient color generator
const getGradientColor = (value) => {
  const normalizedValue = (value - minColorValue) / colorRange;
  const intensity = Math.round(135 + normalizedValue * 120);
  const blueShade = Math.round(255 - normalizedValue * 100);
  return `rgb(${intensity}, ${intensity + 20}, ${blueShade})`;
};

// Size by metric
const sizeField = config.size;
d._normalizedSize = minSize + ((sizeVal - minSizeValue) / sizeRange) * (maxSize - minSize);

// Render points
let color;
if (isNumericColor) {
  color = getGradientColor(parseFloat(d[colorField]));
} else {
  color = zoneColors[d[colorField]] || colorPalette[index];
}
Implementation

### Scatter Plot Logic
```javascript
// Color by category
const colorField = config.legend || config.color || 'zone';
const colorCategories = [...new Set(data.map(d => d[colorField]))];

// Size by metric
const sizeField = config.size;
d._normalizedSize = minSize + ((sizeVal - minSizeValue) / sizeRange) * (maxSize - minSize);

// Render points
<circle
  cx={x}
  cy={y}
  r={pointSize}
  fill={color}
  opacity="0.7"
  stroke="white"
  strokeWidth="1"
/>
```

### Box Plot Logic
```javascript
// Group by category
const categories = [...new Set(data.map(d => d[config.xAxis.id]))];
categories.forEach(category => {
  const categoryData = data.filter(d => d[config.xAxis.id] === category);
  
  // Collect all values
  const values = categoryData.flatMap(d => 
    config.primaryYAxis.map(f => getValue(d, f.id))
  ).filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1 = values[Math.floor(values.length * 0.25)];
  const q2 = values[Math.floor(values.length * 0.50)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  (categorical zones OR gradient intensity)
- **Example 1 (Zones)**: "Show curtailment (X) vs solar score (Y), sized by headroom, colored by zone"
- **Example 2 (Gradient)**: "Show LMP volatility (X) vs headroom (Y), colored by DataCenterScore intensity"

### Pattern Recognition
- **Categorical Colors**: Geographic patterns across 7 ISO-NE zones
- **Gradient Colors**: Performance intensity (score-based coloring)
- **Size Variations**: Additional metric dimension (e.g., queue MW, headroom)pperWhisker);
});
```

---

## 📈 Use Cases

### Multi-Dimensional Analysis
- **3 Variables**: X-axis position, Y-axis position, bubble size
- **4 Variables**: Add color for categorical grouping
- **Example**: "Show curtailment (X) vs solar score (Y), sized by headroom, colored by zone"

### Statistical Distribution
- **Compare Groups**: See median, spread, and outliers across categories
- **Identify Patterns**: Spot which zones have better scores
- **Example**: "Compare solar scores across all 7 ISO-NE zones"

---

## ✨ Benefits

1. **Enhanced Interpretability**: Multiple dimensions visible in single chart
2. **Pattern Recognition**: Color grouping reveals geographic patterns
3. **Statistical Rigor**: Box plots use proper quartile calculations
4. **Professional Quality**: Matches industry-standard visualization tools
5. **User-Friendly**: Legends make charts self-documenting

---

## 🚀 Next Steps

- ✅ Scatter plots with color & size legends
- ✅ Box plots with proper quartile calculations
- ✅ Grid lines on all chart types
- ✅ Enhanced axis labels with rotation
- ⏳ Test with live data
- ⏳ Add tooltip interactions (future enhancement)
- ⏳ Export chart images (future enhancement)

---

*Last Updated: [Current Date]*
*File: src/pages/Analytics.jsx*

# Analytics Graph Configuration Examples

This document provides step-by-step examples for configuring graphs in the Analytics page using real database data.

## Available Data Sources

The Analytics page fetches data from these databases:
- **gridsense_iso_ne.db** - Primary database (currently active)
- **gridsense_iso_ca.db**
- **gridsense_iso_ny.db**
- **gridsense_iso_tx.db**
- **gridsense_iso_mw.db**
- **gridsense_iso_pjm.db**
- **gridsense_iso_sw.db**
- **gridsense_iso_se.db**

## Available Columns (from Buses Table)

The following columns are available from the `gridsense_iso_ne.db` database:

| Column Name | Type | Description | Available in Dimensions | Available in Measures |
|-------------|------|-------------|------------------------|----------------------|
| `bus_id` | Numeric | Unique bus identifier | ✅ | ✅ |
| `bus_name` | Text | Name of the bus/substation | ✅ | ❌ |
| `base_kv` | Numeric | Base voltage in kV | ✅ | ✅ |
| `zone` | Text | Economic zone (e.g., "CT", "ME", "NH") | ✅ | ❌ |
| `state` | Text | State location | ✅ | ❌ |
| `county` | Text | County location | ✅ | ❌ |
| `latitude` | Numeric | Geographic latitude | ✅ | ✅ |
| `longitude` | Numeric | Geographic longitude | ✅ | ✅ |
| `lmp_2022` | Numeric | Locational Marginal Price 2022 ($/MWh) | ✅ | ✅ |
| `lmp_2023` | Numeric | Locational Marginal Price 2023 ($/MWh) | ✅ | ✅ |
| `lmp_2024` | Numeric | Locational Marginal Price 2024 ($/MWh) | ✅ | ✅ |
| `lmp_2025` | Numeric | Locational Marginal Price 2025 ($/MWh) | ✅ | ✅ |

---

## Example 1: Bar Chart - Average LMP by Zone (2024)

**What it shows**: Compares average electricity prices across different economic zones

### Step-by-Step Configuration:

1. **Click "Add Panel"** button
2. **Select Chart Type**: Click on "Bar Chart" icon
3. **Set Data Source**: Select "gridsense_iso_ne.db" from dropdown
4. **Configure Axes**:
   - **X-Axis**: 
     - Drag "zone" from Dimensions/Measures section
     - Or click on "zone" to add to X-Axis
   - **Primary Y-Axis**: 
     - Drag "lmp_2024" from Measures section
     - Aggregation: "Average" (default)
5. **Click "Apply Configuration"**

**Expected Result**: A bar chart showing average LMP 2024 values for each zone (CT, ME, NH, RI, SEMASS, WCMASS, NEMASS, VT)

---

## Example 2: Line Chart - LMP Trend Over Years

**What it shows**: How electricity prices changed from 2022 to 2025

### Step-by-Step Configuration:

1. **Add Panel** → Select **Line Chart**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "zone" (to see trends per zone)
   - **Primary Y-Axis**: Add ALL four LMP fields:
     - lmp_2022 (Aggregation: Average)
     - lmp_2023 (Aggregation: Average)
     - lmp_2024 (Aggregation: Average)
     - lmp_2025 (Aggregation: Average)
4. **Apply**

**Expected Result**: Multiple lines showing LMP trends across zones over 4 years

---

## Example 3: Pie Chart - Bus Distribution by Voltage Level

**What it shows**: What percentage of buses operate at different voltage levels

### Step-by-Step Configuration:

1. **Add Panel** → Select **Pie Chart**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "base_kv" (voltage levels)
   - **Primary Y-Axis**: "bus_id" (Aggregation: **Count**)
4. **Enable "Show Data Labels"** in options
5. **Apply**

**Expected Result**: Pie chart showing distribution of buses across voltage levels (115kV, 345kV, etc.)

---

## Example 4: Scatter Plot - Geographic Distribution with LMP

**What it shows**: Where high and low price areas are located geographically

### Step-by-Step Configuration:

1. **Add Panel** → Select **Scatter Plot**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "longitude"
   - **Primary Y-Axis**: "latitude"
   - **Optional**: Size points by "lmp_2024"
4. **Apply**

**Expected Result**: A geographic scatter plot showing bus locations

---

## Example 5: Combination Chart - Line + Bar (Advanced)

**What it shows**: Compare count of buses (bars) with average LMP (line) by state

### Step-by-Step Configuration:

1. **Add Panel** → Select **Line + Bar Combination**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "state"
   - **Primary Y-Axis** (Bars): 
     - "bus_id" (Aggregation: **Count**)
   - **Secondary Y-Axis** (Line): 
     - "lmp_2024" (Aggregation: **Average**)
4. **Apply**

**Expected Result**: Bars showing number of buses per state, with a line overlay showing average LMP

---

## Example 6: Stacked Bar - LMP Components by Zone

**What it shows**: All 4 years of LMP data stacked for each zone

### Step-by-Step Configuration:

1. **Add Panel** → Select **Stacked Bar**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "zone"
   - **Primary Y-Axis**: Add all:
     - lmp_2022 (Sum)
     - lmp_2023 (Sum)
     - lmp_2024 (Sum)
     - lmp_2025 (Sum)
4. **Apply**

**Expected Result**: Stacked bars showing cumulative LMP values over years per zone

---

## Example 7: Heatmap - LMP by State and Year

**What it shows**: Color-coded price levels across states

### Step-by-Step Configuration:

1. **Add Panel** → Select **Heatmap**
2. **Data Source**: "gridsense_iso_ne.db"
3. **Configure**:
   - **X-Axis**: "state"
   - **Primary Y-Axis**: "lmp_2024" (Average)
   - **Enable "Show Data Labels"**
4. **Apply**

**Expected Result**: Heatmap showing intensity of LMP values by state

---

## Common Aggregation Options

When adding numeric fields to Y-Axis, you can choose:

- **Sum**: Total of all values
- **Average**: Mean value (most common for LMP data)
- **Min**: Lowest value
- **Max**: Highest value
- **Count**: Number of records

---

## Troubleshooting

### ❌ No Data Showing in Graph

**Check**:
1. Is the backend running? (Terminal shows `python app.py`)
2. Open browser console (F12) and check for:
   - `Fetched buses data: 2494 records` ✅
   - Any red error messages ❌

### ❌ Columns Not Appearing in Dimensions/Measures

**Solution**:
1. Make sure you selected a **Data Source** first
2. The dimensions/measures populate AFTER selecting database
3. Refresh the page if needed

### ❌ Graph Shows "No Data Available"

**Possible Causes**:
1. X-Axis field has all null values
2. Y-Axis aggregation resulted in empty data
3. Try a different combination (e.g., zone + lmp_2024)

---

## Quick Test Configuration

**Fastest way to verify everything is working**:

1. Add Panel
2. Select: **Bar Chart**
3. Data Source: **gridsense_iso_ne.db**
4. X-Axis: **zone**
5. Primary Y-Axis: **lmp_2024** (Average)
6. Click Apply

**You should see**: 8 bars representing the 8 zones with their average LMP values for 2024 (ranging from ~$30-80/MWh)

---

## Field Mapping (Technical Note)

The database columns use underscores (e.g., `lmp_2022`), but some older code references might use different formats. The Analytics page includes automatic field mapping:

```javascript
const fieldMapping = {
  'historical_average_lmp_2022': 'lmp_2022',
  'historical_average_lmp_2023': 'lmp_2023',
  'historical_average_lmp_2024': 'lmp_2024',
  'historical_average_lmp_2025': 'lmp_2025',
  'nominal_voltage': 'base_kv'
};
```

This ensures compatibility regardless of naming conventions.

---

## Database Verification

To verify the database is being queried correctly:

1. Open Browser Console (F12)
2. Go to Analytics page
3. Look for console logs:
   ```
   API Response: {data: Array(2494)}
   Fetched buses data: 2494 records
   📊 Processing data for graph...
   ```

If you see these logs ✅ the database is connected and data is flowing correctly!

---

## Next Steps

- Try creating multiple panels with different chart types
- Experiment with different aggregations (Sum vs Average)
- Use combination charts for advanced visualizations
- Save configurations - they persist even after page refresh!

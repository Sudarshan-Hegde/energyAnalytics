# Quick Start - Test Graph Configuration NOW

## ✅ System Status

Your system is ready:
- ✅ Backend running: `http://localhost:8000`
- ✅ Frontend running: `http://localhost:5173` (or similar)
- ✅ Database: `gridsense_iso_ne.db` with 2494 buses

## 🎯 Quick Test (30 seconds)

### Test #1: Simple Bar Chart - LMP by Zone

1. Open browser → Go to **Analytics** page
2. Click **"+ Add Panel"** button (top right)
3. Select **Bar Chart** icon (rectangular bars)
4. In the configuration panel on right:
   - **Data Source**: Select `gridsense_iso_ne.db`
   - **X-Axis**: Click on `zone` 
   - **Primary Y-Axis**: Click on `LMP 2024 (Avg)`
5. Click **"Apply Configuration"**

**✅ Expected Result**: 
- You should see a bar chart with 8 bars
- Bars represent zones: CT, ME, NH, RI, SEMASS, WCMASS, NEMASS, VT
- Height shows average LMP values ($30-80 range)

---

## 📊 Verify Database Columns Are Being Fetched

### Open Browser Console (F12)

1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Navigate to **Analytics** page

**You should see these console logs**:

```
API Response: {data: Array(2494)}
Fetched buses data: 2494 records
💾 Saved Analytics state to localStorage
```

### Check Available Columns

In the console, type:

```javascript
// This will show you all the data
JSON.stringify(Object.keys(window.databaseData?.buses?.[0] || {}))
```

**Expected Output**:
```
["base_kv", "bus_id", "bus_name", "county", "latitude", "lmp_2022", "lmp_2023", "lmp_2024", "lmp_2025", "longitude", "state", "zone"]
```

---

## 🎨 Available Database Columns (Confirmed Working)

These columns are **actively being fetched** from the database:

### Categorical/Dimensions (Use for X-Axis or Grouping):
- ✅ `bus_name` - Bus/substation name
- ✅ `zone` - Economic zone (CT, ME, NH, RI, SEMASS, WCMASS, NEMASS, VT)
- ✅ `state` - State (Massachusetts, Connecticut, Maine, etc.)
- ✅ `county` - County name

### Numeric/Measures (Use for Y-Axis or Values):
- ✅ `bus_id` - Bus identifier (good for counting)
- ✅ `base_kv` - Voltage level (115, 345, etc.)
- ✅ `lmp_2022` - Price data for 2022 ($/MWh)
- ✅ `lmp_2023` - Price data for 2023 ($/MWh)
- ✅ `lmp_2024` - Price data for 2024 ($/MWh)
- ✅ `lmp_2025` - Price data for 2025 ($/MWh)
- ✅ `latitude` - Geographic coordinate
- ✅ `longitude` - Geographic coordinate

---

## 🧪 Test Configurations (Copy-Paste Ready)

### Config 1: Count of Buses by State
```
Chart: Bar
X-Axis: state
Y-Axis: bus_id (Aggregation: Count)
```
**Shows**: How many substations in each state

---

### Config 2: Average Voltage by Zone
```
Chart: Bar
X-Axis: zone
Y-Axis: base_kv (Aggregation: Average)
```
**Shows**: Average voltage level per economic zone

---

### Config 3: LMP Comparison (2022 vs 2024)
```
Chart: Line or Bar
X-Axis: zone
Y-Axis: 
  - LMP 2022 (Avg)
  - LMP 2024 (Avg)
```
**Shows**: Price changes over 2 years

---

### Config 4: Geographic Distribution
```
Chart: Scatter
X-Axis: longitude
Y-Axis: latitude
```
**Shows**: Physical location of all substations

---

### Config 5: Pie Chart - Distribution by Zone
```
Chart: Pie
X-Axis: zone
Y-Axis: bus_id (Count)
```
**Shows**: Percentage of buses in each zone

---

## 🔍 Troubleshooting

### Problem: "No data available"

**Solution 1**: Check backend
```bash
curl http://localhost:8000/grid-data/buses
```
Should return: `{"count": 2494, "data": [...]}`

**Solution 2**: Check browser console for errors
- Press F12 → Console tab
- Look for red errors
- Should see: "Fetched buses data: 2494 records"

---

### Problem: Columns not showing in Dimensions/Measures

**Fix**:
1. Make sure you **selected a Data Source first**
2. The list populates AFTER selecting `gridsense_iso_ne.db`
3. Try refreshing the page (state persists!)

---

### Problem: Graph renders but shows all zeros

**Likely Cause**: Wrong aggregation or field mapping

**Fix**: 
- Use `Count` aggregation for `bus_id`
- Use `Average` aggregation for `lmp_*` fields
- Make sure X-axis has valid non-null values

---

## 📈 What You'll See (Screenshots Description)

### When Configuration Panel Opens:
```
┌─────────────────────────────┐
│ Graph Configurator          │
├─────────────────────────────┤
│ 📊 Chart Type: [Bar Chart]  │
│ 💾 Data Source: [gridsense_*]│
│                             │
│ X-Axis: [Select dimension]  │
│ ├─ zone                     │
│ ├─ state                    │
│ ├─ county                   │
│ └─ bus_name                 │
│                             │
│ Y-Axis: [Select measure]    │
│ ├─ LMP 2022 (Avg)          │
│ ├─ LMP 2023 (Avg)          │
│ ├─ LMP 2024 (Avg)          │
│ ├─ LMP 2025 (Avg)          │
│ ├─ Nominal Voltage (kV)    │
│ └─ Count                    │
│                             │
│ [Apply Configuration]       │
└─────────────────────────────┘
```

### After Applying Configuration:
```
    LMP 2024 (Avg)
  80├─────────────────────
    │     ██
  60│     ██  ██  ██
    │ ██  ██  ██  ██  ██
  40│ ██  ██  ██  ██  ██
    │ ██  ██  ██  ██  ██
  20│ ██  ██  ██  ██  ██
    │ ██  ██  ██  ██  ██
   0└─────────────────────
     CT  ME  NH  RI  SEMASS...
```

---

## ✨ Pro Tips

1. **Multiple Y-Axis**: You can add multiple fields to Y-Axis to compare trends
2. **Aggregations**: Hover over fields to see aggregation options (Sum, Avg, Count, Min, Max)
3. **State Persists**: Your graphs save automatically - refresh page and they're still there!
4. **Color Scheme**: Each metric gets a different color automatically
5. **Data Labels**: Enable "Show Data Labels" to see exact values on chart

---

## 🎯 Recommended First Tests (In Order)

1. ✅ **Bar Chart**: zone (X) + lmp_2024 (Y-Avg) 
   - Simplest test, should work immediately

2. ✅ **Pie Chart**: zone (X) + bus_id (Y-Count)
   - Tests categorical distribution

3. ✅ **Line Chart**: zone (X) + lmp_2022, lmp_2023, lmp_2024, lmp_2025 (Y-Avg)
   - Tests multi-series data

4. ✅ **Combination**: state (X) + bus_id (Y1-Count) + lmp_2024 (Y2-Avg)
   - Tests advanced features

---

## 🚀 Next Steps After Testing

Once you confirm it's working:

1. **Try different databases**: Switch from `gridsense_iso_ne.db` to others
2. **Experiment with filters**: Add data filters (coming soon)
3. **Export data**: Download chart data as CSV (coming soon)
4. **Share configurations**: Save preset configurations (coming soon)

---

## 📞 Still Having Issues?

If you don't see the expected results:

1. **Check this file exists and has data**:
   ```bash
   ls -lh /home/sudarshanhegde/Sudarshan_Hegde/"smartGrid "/gridsense_iso_ne.db
   ```
   Should show: ~47M (not 0 bytes)

2. **Test backend directly**:
   ```bash
   curl http://localhost:8000/grid-data/buses | jq '.data | length'
   ```
   Should return: `2494`

3. **Check browser console**: F12 → Should NOT see red errors

4. **Clear localStorage**: 
   ```javascript
   localStorage.clear()
   location.reload()
   ```

---

**You're all set! Open the Analytics page and start configuring! 🎉**

# Graph Configuration Visual Guide

## 🎨 What You'll See in the UI

### Step 1: Add Panel Button
```
┌──────────────────────────────────────────────────┐
│  Analytics Dashboard                  [+ Add Panel] │ ← Click here
└──────────────────────────────────────────────────┘
```

---

### Step 2: Select Chart Type

You'll see 29 chart icons arranged in a grid:

```
┌─────────────────────────────────────────────┐
│  Select Chart Type                          │
├─────────────────────────────────────────────┤
│  📊 Bar Chart    📈 Line Chart   🥧 Pie Chart   │
│  📉 Area Chart   📍 Scatter      🔥 Heatmap      │
│  📊 Stacked Bar  📈 Waterfall    📊 Histogram    │
│  📦 Box Plot     🎯 Gauge        🎯 Bullet        │
│  ... (and 17 more)                          │
│                                             │
│  Combination Charts:                        │
│  📊📈 Line+Bar   📈📉 Area+Line  📊📍 Bar+Scatter │
│  📈📉 Line+Area  📊📈 Stacked Bar+Line        │
└─────────────────────────────────────────────┘
```

**👉 Example: Click "Bar Chart" (first icon)**

---

### Step 3: Configuration Panel Opens

```
┌─────────────────────────────────────────────────┐
│  Graph Configurator                        [✕]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 Chart Type: Bar Chart                       │
│  ┌─────────────────────────────────────────┐   │
│  │ Bar Chart                              ▼│   │ ← Shows selected
│  └─────────────────────────────────────────┘   │
│                                                 │
│  💾 Data Source                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Select database...                    ▼│   │ ← Click to open dropdown
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Apply Configuration]                          │
└─────────────────────────────────────────────────┘
```

---

### Step 4: Select Data Source

When you click the Data Source dropdown:

```
┌─────────────────────────────────────────────────┐
│  💾 Data Source                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ gridsense_iso_ne.db                    │   │ ← Select this one
│  │ gridsense_iso_ca.db                    │   │
│  │ gridsense_iso_ny.db                    │   │
│  │ gridsense_iso_tx.db                    │   │
│  │ gridsense_iso_mw.db                    │   │
│  │ gridsense_iso_pjm.db                   │   │
│  │ gridsense_iso_sw.db                    │   │
│  │ gridsense_iso_se.db                    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**👉 Click "gridsense_iso_ne.db"**

---

### Step 5: Configuration Options Appear

After selecting the database, the full panel loads:

```
┌─────────────────────────────────────────────────┐
│  Graph Configurator                        [✕]  │
├─────────────────────────────────────────────────┤
│  📊 Chart Type: Bar Chart                       │
│  💾 Data Source: gridsense_iso_ne.db            │
│                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                 │
│  📐 X-Axis (Dimension)                          │
│  ┌─────────────────────────────────────────┐   │
│  │ Select dimension...                   ▼│   │ ← Click here
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📊 Primary Y-Axis (Measures)                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Click to add measures...              + │   │ ← Click here
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📋 Dimensions & Measures                       │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔍 Search...                            │   │
│  │                                         │   │
│  │ 📁 Dimensions (Categorical)             │   │
│  │   • bus_name                            │   │
│  │   • zone                                │   │ ← Click any of these
│  │   • state                               │   │
│  │   • county                              │   │
│  │                                         │   │
│  │ 📊 Measures (Numeric)                   │   │
│  │   • LMP 2022 (Avg)                      │   │
│  │   • LMP 2023 (Avg)                      │   │
│  │   • LMP 2024 (Avg)                      │   │ ← Click any of these
│  │   • LMP 2025 (Avg)                      │   │
│  │   • Nominal Voltage (kV)                │   │
│  │   • Latitude                            │   │
│  │   • Longitude                           │   │
│  │   • Count                               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ⚙️ Options                                     │
│  ☐ Show Data Labels                            │
│  ☐ Show Grid Lines                             │
│                                                 │
│  [Apply Configuration]  [Cancel]                │
└─────────────────────────────────────────────────┘
```

---

### Step 6: Select X-Axis (zone)

Click on "zone" in the Dimensions section:

```
│  📐 X-Axis (Dimension)                          │
│  ┌─────────────────────────────────────────┐   │
│  │ zone                                  ✓ │   │ ← Now shows selected
│  └─────────────────────────────────────────┘   │
```

---

### Step 7: Select Y-Axis (LMP 2024)

Click on "LMP 2024 (Avg)" in the Measures section:

```
│  📊 Primary Y-Axis (Measures)                   │
│  ┌─────────────────────────────────────────┐   │
│  │ • LMP 2024 (Avg) [Average]        [✕]  │   │ ← Shows with aggregation
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Want to add more? Click below:                │
│  [+ Add Another Measure]                        │
```

---

### Step 8: Click Apply Configuration

```
│  [Apply Configuration]  [Cancel]                │ ← Click "Apply"
└─────────────────────────────────────────────────┘
```

---

### Step 9: Graph Renders!

```
┌─────────────────────────────────────────────────────────┐
│  Panel 1: Bar Chart                         [Edit] [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        Average LMP 2024 by Zone                        │
│                                                         │
│   80 ┼                                                  │
│      │                                                  │
│   60 ┼     ██                                          │
│      │     ██    ██    ██                              │
│   40 ┼ ██  ██    ██    ██    ██                        │
│      │ ██  ██    ██    ██    ██    ██    ██    ██      │
│   20 ┼ ██  ██    ██    ██    ██    ██    ██    ██      │
│      │ ██  ██    ██    ██    ██    ██    ██    ██      │
│    0 ┼─────────────────────────────────────────────     │
│        CT   ME    NH    RI  SEMASS WCMASS NEMASS VT     │
│                                                         │
│  Data Source: gridsense_iso_ne.db                      │
│  Last Updated: Just now                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Common UI Patterns

### Adding Multiple Y-Axis Fields

To compare multiple metrics (e.g., LMP 2022, 2023, 2024):

1. Click first metric: "LMP 2022 (Avg)" → It appears in Y-Axis list
2. Click second metric: "LMP 2023 (Avg)" → Adds to list
3. Click third metric: "LMP 2024 (Avg)" → Adds to list

**Result**:
```
│  📊 Primary Y-Axis (Measures)                   │
│  ┌─────────────────────────────────────────┐   │
│  │ • LMP 2022 (Avg) [Average]        [✕]  │   │
│  │ • LMP 2023 (Avg) [Average]        [✕]  │   │
│  │ • LMP 2024 (Avg) [Average]        [✕]  │   │
│  └─────────────────────────────────────────┘   │
```

**Graph will show**: 3 bars per zone (one for each year) in different colors

---

### Changing Aggregation

Click on the aggregation label (e.g., "Average"):

```
│  • LMP 2024 (Avg) [Average ▼]         [✕]      │
│                     └─────────────────┐         │
│                     │ Average         │         │
│                     │ Sum             │         │
│                     │ Minimum         │         │
│                     │ Maximum         │         │
│                     │ Count           │         │
│                     └─────────────────┘         │
```

---

### Removing a Field

Click the [✕] next to any field to remove it:

```
│  • LMP 2024 (Avg) [Average]        [✕] ← Click X to remove
```

---

## 🎨 Real Data Examples

### Example Result 1: Bus Count by Zone

**Configuration**:
- X-Axis: zone
- Y-Axis: bus_id (Count)

**Actual Data You'll See**:
```
CT:      ~450 buses
ME:      ~200 buses
NH:      ~180 buses
RI:      ~120 buses
SEMASS:  ~380 buses
WCMASS:  ~350 buses
NEMASS:  ~520 buses
VT:      ~290 buses
```

---

### Example Result 2: Average LMP by Zone (2024)

**Configuration**:
- X-Axis: zone
- Y-Axis: lmp_2024 (Average)

**Actual Data You'll See**:
```
CT:      ~$45.2/MWh
ME:      ~$38.7/MWh
NH:      ~$42.1/MWh
RI:      ~$48.3/MWh
SEMASS:  ~$51.8/MWh
WCMASS:  ~$46.9/MWh
NEMASS:  ~$54.2/MWh
VT:      ~$39.5/MWh
```

---

### Example Result 3: Average Voltage by State

**Configuration**:
- X-Axis: state
- Y-Axis: base_kv (Average)

**Actual Data You'll See**:
```
Connecticut:     ~160 kV
Maine:           ~145 kV
Massachusetts:   ~155 kV
New Hampshire:   ~140 kV
Rhode Island:    ~135 kV
Vermont:         ~130 kV
```

---

## 📱 Mobile/Responsive View

On smaller screens, the configuration panel becomes a modal:

```
┌─────────────────────────────┐
│  [☰] Analytics              │
├─────────────────────────────┤
│                             │
│  [+ Add Panel]              │
│                             │
│  ┌───────────────────────┐ │
│  │ Panel 1: Bar Chart    │ │
│  │ [Graph renders here]  │ │
│  │ [Edit] [✕]            │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │ Panel 2: Line Chart   │ │
│  │ [Graph renders here]  │ │
│  │ [Edit] [✕]            │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

---

## ⚡ Keyboard Shortcuts

- **Esc**: Close configuration panel
- **Ctrl+Enter**: Apply configuration
- **Tab**: Navigate between fields
- **Arrow Keys**: Navigate dropdown options

---

## 🎯 Quick Reference

| Element | Location | Purpose |
|---------|----------|---------|
| "+ Add Panel" | Top right | Create new graph panel |
| Chart Icons | Modal popup | Select visualization type |
| Data Source | Config panel top | Choose database |
| X-Axis Selector | Config panel | Select grouping field |
| Y-Axis Selector | Config panel | Select numeric metrics |
| Dimensions List | Config panel bottom | Available categorical fields |
| Measures List | Config panel bottom | Available numeric fields |
| Apply Button | Config panel bottom | Render the graph |
| Edit Button | Panel header | Modify existing graph |
| ✕ Button | Panel header | Delete panel |

---

## 🚀 Power User Tips

1. **Quick Duplicate**: Click Edit → Change one field → Apply = Easy variations
2. **Multi-Select**: Click multiple Y-axis fields before applying
3. **Search**: Use the search box in Dimensions/Measures to find fields fast
4. **Persist**: Panels auto-save - refresh page and they're still there
5. **Console**: Keep F12 open to see data loading in real-time

---

**Ready to start? Go to Analytics page and follow Steps 1-9 above! 🎉**

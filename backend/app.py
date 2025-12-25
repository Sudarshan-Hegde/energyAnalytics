from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gridsense_iso_ne.db')

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return dict(zip(row.keys(), row))

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'GridSense API is running'})

@app.route('/grid-data/buses', methods=['GET'])
def get_buses():
    """Get all bus data with coordinates and ALL columns for analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query ALL columns from buses table to support all analytics queries
        # This ensures headroom fields, forecast fields, etc. are available
        query = """
            SELECT *
            FROM buses
            WHERE latitude IS NOT NULL 
            AND longitude IS NOT NULL
            AND latitude BETWEEN -90 AND 90
            AND longitude BETWEEN -180 AND 180
            ORDER BY bus_id
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        buses = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(buses),
            'data': buses
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/branches', methods=['GET'])
def get_branches():
    """Get all branch/transmission line data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                branch_uid as branch_id,
                from_bus_id as from_bus,
                to_bus_id as to_bus,
                circuit_id,
                CASE WHEN status = 'Closed' THEN 1 ELSE 0 END as status,
                voltage,
                line_name,
                from_bus_name,
                to_bus_name,
                from_longitude,
                from_latitude,
                to_longitude,
                to_latitude
            FROM branches
            ORDER BY branch_uid
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        branches = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(branches),
            'data': branches
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/generators', methods=['GET'])
def get_generators():
    """Get all generator data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                gen_uid as gen_id,
                bus_id,
                gen_name,
                gen_mw as pg,
                max_capacity_mw as pmax,
                CASE WHEN status = 'Online' THEN 1 ELSE 0 END as status,
                county,
                state,
                longitude,
                latitude
            FROM generators
            ORDER BY gen_uid
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        generators = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(generators),
            'data': generators
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/economic', methods=['GET'])
def get_economic_data():
    """Get economic data (LMP history) from econ table"""
    try:
        bus_id = request.args.get('bus_id')
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if bus_id:
            # Get detailed economic data for specific bus
            query = """
                SELECT 
                    bus_id,
                    bus_name,
                    zone,
                    historical_average_lmp_2022 as lmp_2022,
                    historical_average_lmp_2023 as lmp_2023,
                    historical_average_lmp_2024 as lmp_2024,
                    historical_average_lmp_2025 as lmp_2025,
                    average_congestion_component_in_lmp_2022 as congestion_2022,
                    average_congestion_component_in_lmp_2023 as congestion_2023,
                    average_congestion_component_in_lmp_2024 as congestion_2024,
                    average_congestion_component_in_lmp_2025 as congestion_2025,
                    average_loss_component_in_lmp_2022 as loss_2022,
                    average_loss_component_in_lmp_2023 as loss_2023,
                    average_loss_component_in_lmp_2024 as loss_2024,
                    average_loss_component_in_lmp_2025 as loss_2025,
                    zonal_hub_lmp,
                    basis,
                    "5_year_forecast_avg_lmp_base_case" as forecast_avg_lmp,
                    "5_year_forecast_max_lmp" as forecast_max_lmp,
                    "5_year_forecast_min_lmp" as forecast_min_lmp,
                    "5_year_forecast_avg_energy_price" as forecast_energy_price,
                    "5_year_forecast_avg_congestion" as forecast_congestion,
                    "5_year_forecast_avg_loss" as forecast_loss,
                    "5_year_forecast_avg_basis_to_system" as forecast_basis
                FROM econ
                WHERE bus_id = ?
            """
            cursor.execute(query, (bus_id,))
        else:
            # Get all economic data
            query = """
                SELECT 
                    bus_id,
                    zone,
                    historical_average_lmp_2022 as lmp_2022,
                    historical_average_lmp_2023 as lmp_2023,
                    historical_average_lmp_2024 as lmp_2024,
                    historical_average_lmp_2025 as lmp_2025,
                    average_congestion_component_in_lmp as avg_congestion,
                    average_loss_component_in_lmp as avg_loss
                FROM econ
                ORDER BY zone, bus_id
            """
            cursor.execute(query)
        
        rows = cursor.fetchall()
        economic_data = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(economic_data),
            'data': economic_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/lmp-forecast', methods=['GET'])
def get_lmp_forecast():
    """Get LMP forecast data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                bus_id,
                zone,
                "5_year_forecast_avg_lmp_base_case" as base_case,
                "5_year_forecast_max_lmp" as high_case,
                "5_year_forecast_min_lmp" as low_case
            FROM econ
            ORDER BY zone, bus_id
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        forecast_data = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(forecast_data),
            'data': forecast_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/loss-components', methods=['GET'])
def get_loss_components():
    """Get transmission loss components by zone"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                zone,
                AVG(average_congestion_component_in_lmp) as congestion_loss_pct,
                AVG(average_loss_component_in_lmp) as total_loss_pct
            FROM econ
            GROUP BY zone
            ORDER BY zone
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        loss_data = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(loss_data),
            'data': loss_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/lmp-history/<bus_id>', methods=['GET'])
def get_lmp_history(bus_id):
    """Get LMP history data for a specific bus or all buses"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if bus_id == 'all':
            # Return aggregated LMP data for all buses
            query = """
                SELECT 
                    bus_id,
                    bus_name,
                    zone,
                    state,
                    historical_average_lmp_2022 as lmp_2022,
                    historical_average_lmp_2023 as lmp_2023,
                    historical_average_lmp_2024 as lmp_2024,
                    historical_average_lmp_2025 as lmp_2025
                FROM buses
                WHERE historical_average_lmp_2022 IS NOT NULL
                ORDER BY bus_id
            """
            cursor.execute(query)
        else:
            # Return LMP data for specific bus
            query = """
                SELECT 
                    bus_id,
                    bus_name,
                    zone,
                    state,
                    historical_average_lmp_2022 as lmp_2022,
                    historical_average_lmp_2023 as lmp_2023,
                    historical_average_lmp_2024 as lmp_2024,
                    historical_average_lmp_2025 as lmp_2025
                FROM buses
                WHERE bus_id = ?
            """
            cursor.execute(query, (bus_id,))
        
        rows = cursor.fetchall()
        lmp_data = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(lmp_data),
            'data': lmp_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/bus/<int:bus_id>', methods=['GET'])
def get_bus_by_id(bus_id):
    """Get specific bus by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                bus_id,
                bus_name,
                nominal_voltage as base_kv,
                zone,
                latitude,
                longitude,
                county,
                state,
                historical_average_lmp_2022 as lmp_2022,
                historical_average_lmp_2023 as lmp_2023,
                historical_average_lmp_2024 as lmp_2024,
                historical_average_lmp_2025 as lmp_2025
            FROM buses
            WHERE bus_id = ?
        """
        
        cursor.execute(query, (bus_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return jsonify({
                'success': True,
                'data': dict_from_row(row)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Bus not found'
            }), 404
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/statistics', methods=['GET'])
def get_statistics():
    """Get grid statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Count buses
        cursor.execute("SELECT COUNT(*) as count FROM buses WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
        bus_count = cursor.fetchone()['count']
        
        # Count branches
        cursor.execute("SELECT COUNT(*) as count FROM branches")
        branch_count = cursor.fetchone()['count']
        
        # Count generators
        cursor.execute("SELECT COUNT(*) as count FROM generators")
        generator_count = cursor.fetchone()['count']
        
        # Count open branches (alerts)
        cursor.execute("SELECT COUNT(*) as count FROM branches WHERE status = 0")
        alert_count = cursor.fetchone()['count']
        
        # Calculate total generation capacity
        cursor.execute("SELECT SUM(pmax) as total FROM generators WHERE status = 1")
        total_capacity = cursor.fetchone()['total'] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'total_buses': bus_count,
                'total_branches': branch_count,
                'total_generators': generator_count,
                'active_alerts': alert_count,
                'total_capacity_mw': round(total_capacity, 2),
                'total_capacity_gw': round(total_capacity / 1000, 2)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/future-outlook/substation-upgrades', methods=['GET'])
def get_substation_upgrades():
    """Get ISO-NE approved substation upgrades for future outlook"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                "Substation Upgrade" as name,
                "Expected In-service Year" as year,
                Category as category,
                Longitude as longitude,
                Latitude as latitude
            FROM "ISO-NE approved Substation Upgrades"
            WHERE Latitude IS NOT NULL 
            AND Longitude IS NOT NULL
            ORDER BY "Expected In-service Year"
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        upgrades = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(upgrades),
            'data': upgrades
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/future-outlook/transmission-upgrades', methods=['GET'])
def get_transmission_upgrades():
    """Get ISO-NE approved transmission upgrades for future outlook"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                "Transmission Upgrade" as name,
                "Expected In-service Year" as year,
                Category as category,
                "From Longitude" as from_longitude,
                "From Latitude" as from_latitude,
                "To Longitude" as to_longitude,
                "To Latitude" as to_latitude
            FROM "ISO-NE approved Transmission Upgrades"
            WHERE "From Latitude" IS NOT NULL 
            AND "From Longitude" IS NOT NULL
            AND "To Latitude" IS NOT NULL
            AND "To Longitude" IS NOT NULL
            ORDER BY "Expected In-service Year"
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        upgrades = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(upgrades),
            'data': upgrades
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/scenarios', methods=['GET'])
def get_scenarios():
    """Get list of all available constraint scenarios"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all constraint tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Constraints ISO-NE%'")
        tables = cursor.fetchall()
        
        scenarios = []
        for table in tables:
            table_name = table[0]
            # Parse scenario name from table name
            # Format: "Constraints ISO-NE {Season} {Load} {Type} {Direction}"
            parts = table_name.replace('Constraints ISO-NE ', '').split()
            scenarios.append({
                'id': table_name,
                'name': table_name.replace('Constraints ISO-NE ', ''),
                'table': table_name
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(scenarios),
            'data': scenarios
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/constraints', methods=['GET'])
def get_constraints():
    """Get constraint data for selected scenarios"""
    try:
        scenarios = request.args.getlist('scenarios[]')
        constraint_type = request.args.get('type', 'both')  # both, substation, branch
        search_bus = request.args.get('search', '')
        
        if not scenarios:
            return jsonify({
                'success': False,
                'error': 'No scenarios selected'
            }), 400
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        all_constraints = []
        
        for scenario in scenarios:
            # Validate table name to prevent SQL injection
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (scenario,))
            if not cursor.fetchone():
                continue
            
            query = f'SELECT * FROM "{scenario}"'
            params = []
            
            # Add search filter if provided
            if search_bus:
                query += ' WHERE Source LIKE ? OR Sink LIKE ? OR "Monitored Facility" LIKE ?'
                search_param = f'%{search_bus}%'
                params = [search_param, search_param, search_param]
            
            query += ' LIMIT 500'  # Limit results for performance
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            for row in rows:
                constraint = dict_from_row(row)
                constraint['scenario'] = scenario.replace('Constraints ISO-NE ', '')
                all_constraints.append(constraint)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(all_constraints),
            'data': all_constraints
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/substation-types', methods=['GET'])
def get_substation_types():
    """Get distinct substation types from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query for distinct bus names with their voltage levels
        query = """
            SELECT DISTINCT 
                bus_name,
                nominal_voltage
            FROM buses
            WHERE bus_name IS NOT NULL 
            AND nominal_voltage IS NOT NULL
            ORDER BY nominal_voltage DESC, bus_name
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Format as "Bus Name - Voltage"
        substations = [
            {
                'id': f"{row['bus_name']}_{row['nominal_voltage']}",
                'label': f"{row['bus_name']} - {row['nominal_voltage']}kV",
                'name': row['bus_name'],
                'voltage': row['nominal_voltage']
            }
            for row in rows
        ]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(substations),
            'data': substations
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/bus-dashboard', methods=['GET'])
def get_bus_dashboard():
    """Get dashboard data for selected buses"""
    try:
        # Get bus names from query parameter
        bus_names = request.args.getlist('buses[]')
        
        if not bus_names:
            return jsonify({
                'success': True,
                'data': []
            })
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create placeholders for IN clause
        placeholders = ','.join('?' * len(bus_names))
        
        query = f"""
            SELECT 
                bus_name,
                nominal_voltage,
                zone,
                county,
                state,
                CAST(headroom_capacity_substation_discharging AS REAL) as headroom_discharging,
                CAST(headroom_capacity_substation_charging AS REAL) as headroom_charging,
                "5_year_forecast_avg_lmp_base_case" as forecast_base,
                "5_year_forecast_avg_lmp_after_500mw_injection" as forecast_500mw,
                historical_average_lmp,
                basis,
                zonal_hub_lmp,
                curtailment_with_500_mw,
                curtailment_with_250_mw,
                curtailment_with_100_mw
            FROM buses
            WHERE bus_name IN ({placeholders})
        """
        
        cursor.execute(query, bus_names)
        rows = cursor.fetchall()
        
        dashboard_data = [dict_from_row(row) for row in rows]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(dashboard_data),
            'data': dashboard_data
        })
        
    except Exception as e:
        print(f"Error in bus dashboard: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/filter-options', methods=['GET'])
def get_filter_options():
    """Get available filter options from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get distinct counties
        cursor.execute("""
            SELECT DISTINCT county 
            FROM buses 
            WHERE county IS NOT NULL AND county != ''
            ORDER BY county
        """)
        counties = [row[0] for row in cursor.fetchall()]
        
        # Get distinct voltages
        cursor.execute("""
            SELECT DISTINCT nominal_voltage 
            FROM buses 
            WHERE nominal_voltage IS NOT NULL
            ORDER BY nominal_voltage
        """)
        voltages = [row[0] for row in cursor.fetchall()]
        
        # Get distinct scenarios (assuming they're in a scenarios column or we use predefined ones)
        scenarios = ['Base', '500MW', '250MW', '100MW']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'counties': counties,
                'voltages': voltages,
                'scenarios': scenarios
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/coverage-metrics', methods=['GET'])
def get_coverage_metrics():
    """Get coverage metrics for Analysis page - ISO count, states, substations, total headroom"""
    try:
        threshold = request.args.get('threshold', 200, type=float)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get ISO count
        cursor.execute("""SELECT COUNT(DISTINCT iso) as iso_count FROM buses WHERE iso IS NOT NULL""")
        iso_count = cursor.fetchone()[0] or 0
        
        # Get states count
        cursor.execute("""SELECT COUNT(DISTINCT state) as state_count FROM buses WHERE state IS NOT NULL""")
        state_count = cursor.fetchone()[0] or 0
        
        # Get total substations
        cursor.execute("""SELECT COUNT(*) as substation_count FROM buses""")
        substation_count = cursor.fetchone()[0] or 0
        
        # Calculate total headroom (industry standard: sum of discharging capacity for viable buses)
        # Filter out buses with 0 or NULL headroom
        cursor.execute("""
            SELECT SUM(CAST(headroom_capacity_substation_discharging AS REAL)) as total_headroom
            FROM buses
            WHERE headroom_capacity_substation_discharging IS NOT NULL
            AND CAST(headroom_capacity_substation_discharging AS REAL) > ?
        """, (threshold,))
        total_headroom = cursor.fetchone()[0] or 0
        
        # Count buses above threshold
        cursor.execute("""
            SELECT COUNT(*) as buses_above_threshold
            FROM buses
            WHERE headroom_capacity_substation_discharging IS NOT NULL
            AND CAST(headroom_capacity_substation_discharging AS REAL) > ?
        """, (threshold,))
        buses_above_threshold = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'iso_count': iso_count,
                'state_count': state_count,
                'substation_count': substation_count,
                'total_headroom': round(total_headroom, 2),
                'buses_above_threshold': buses_above_threshold,
                'threshold': threshold
            }
        })
        
    except Exception as e:
        print(f"Error in coverage metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/grid-data/schema', methods=['GET'])
def get_database_schema():
    """Get database schema - ALL columns from ALL tables for dimensions and measurements"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        dimensions = []
        measures = []
        all_columns_debug = []
        
        # Define numeric types that should be treated as measures
        numeric_types = ['INT', 'REAL', 'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE', 'NUMBER']
        
        # Keywords that indicate a field should be a dimension even if numeric
        # Only true identifiers, not measurements
        dimension_keywords = ['_id', '_uid', '_code', 'fips_code']
        
        for table_row in tables:
            table_name = table_row[0]
            
            # Skip internal SQLite tables
            if table_name.startswith('sqlite_'):
                continue
            
            # Get column information for this table - properly escape table name
            try:
                cursor.execute(f"PRAGMA table_info([{table_name}])")
                columns = cursor.fetchall()
            except Exception as table_error:
                print(f"⚠️  Skipping table {table_name}: {str(table_error)}")
                continue
            
            print(f"\n📋 Table: {table_name} - {len(columns)} columns")
            
            for col in columns:
                col_name = col[1]
                col_type = (col[2].upper() if col[2] else 'TEXT').strip()
                
                # Debug logging
                all_columns_debug.append(f"{table_name}.{col_name} ({col_type})")
                
                # Check if column type is numeric (more lenient matching)
                is_numeric = any(num_type in col_type for num_type in numeric_types) or col_type == ''
                
                # Check if column name suggests it's an identifier (stricter matching)
                is_identifier = any(keyword in col_name.lower() for keyword in dimension_keywords)
                
                # For columns ending in _id or _uid, they're identifiers
                if col_name.lower().endswith('_id') or col_name.lower().endswith('_uid'):
                    is_identifier = True
                
                # Create field info
                field_info = {
                    'id': col_name,
                    'name': col_name.replace('_', ' ').title(),
                    'table': table_name
                }
                
                # Categorize: numeric fields (except identifiers) go to measures, everything else to dimensions
                if is_numeric and not is_identifier:
                    # It's a measure (numeric field that's not an identifier)
                    measures.append({
                        **field_info,
                        'type': 'numeric',
                        'aggregation': ['avg', 'sum', 'min', 'max', 'count']
                    })
                    print(f"  ✓ MEASURE: {col_name} ({col_type})")
                else:
                    # It's a dimension (text, identifier, or categorical)
                    dimensions.append({
                        **field_info,
                        'type': 'categorical'
                    })
                    print(f"  ✓ DIMENSION: {col_name} ({col_type})")
        
        conn.close()
        
        print(f"\n📊 Schema Summary:")
        print(f"   Tables scanned: {len([t[0] for t in tables if not t[0].startswith('sqlite_')])}")
        print(f"   Total columns: {len(all_columns_debug)}")
        print(f"   Dimensions: {len(dimensions)}")
        print(f"   Measures: {len(measures)}")
        print(f"\n🔍 Sample dimensions: {[d['id'] for d in dimensions[:5]]}")
        print(f"🔍 Sample measures: {[m['id'] for m in measures[:5]]}")
        
        return jsonify({
            'success': True,
            'data': {
                'dimensions': dimensions,
                'measures': measures
            }
        })
        
    except Exception as e:
        print(f"❌ Error loading schema: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Please ensure gridsense_iso_ne.db exists in the project root")
        exit(1)
    
    print(f"Starting GridSense Backend API...")
    print(f"Database: {DB_PATH}")
    print(f"Server: http://localhost:8000")
    print(f"Health Check: http://localhost:8000/health")
    
    app.run(host='0.0.0.0', port=8000, debug=True)

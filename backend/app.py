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
    """Get all bus data with coordinates"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query buses with valid coordinates
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
    """Get economic data (LMP history)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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

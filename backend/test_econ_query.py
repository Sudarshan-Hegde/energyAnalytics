#!/usr/bin/env python3
"""Test script to check econ table data"""

import sqlite3
import json

DB_PATH = 'gridsense_iso_ne.db'

def test_econ_query():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check total records
    cursor.execute("SELECT COUNT(*) as count FROM econ")
    total = cursor.fetchone()['count']
    print(f"📊 Total records in econ table: {total}")
    
    # Get sample bus_ids
    cursor.execute("SELECT bus_id FROM econ LIMIT 10")
    sample_ids = [row['bus_id'] for row in cursor.fetchall()]
    print(f"\n📝 Sample bus_ids from econ table:")
    for bus_id in sample_ids:
        print(f"  - '{bus_id}' (type: {type(bus_id).__name__})")
    
    # Get sample bus_ids from buses table
    cursor.execute("SELECT bus_id FROM buses LIMIT 10")
    bus_ids = [row['bus_id'] for row in cursor.fetchall()]
    print(f"\n📝 Sample bus_ids from buses table:")
    for bus_id in bus_ids:
        print(f"  - '{bus_id}' (type: {type(bus_id).__name__})")
    
    # Test query with first bus_id from buses
    if bus_ids:
        test_bus_id = bus_ids[0]
        print(f"\n🔍 Testing query for bus_id: '{test_bus_id}'")
        
        query = """
            SELECT 
                bus_id,
                bus_name,
                zone,
                historical_average_lmp_2022 as lmp_2022,
                historical_average_lmp_2023 as lmp_2023
            FROM econ
            WHERE bus_id = ?
        """
        cursor.execute(query, (test_bus_id,))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ Found data:")
            print(json.dumps(dict(result), indent=2))
        else:
            print(f"❌ No data found for bus_id: '{test_bus_id}'")
            
            # Try to find similar bus_ids
            cursor.execute("SELECT bus_id FROM econ WHERE bus_id LIKE ?", (f"%{test_bus_id}%",))
            similar = cursor.fetchall()
            if similar:
                print(f"\n🔍 Similar bus_ids found in econ table:")
                for row in similar[:5]:
                    print(f"  - '{row['bus_id']}'")
    
    conn.close()

if __name__ == '__main__':
    test_econ_query()

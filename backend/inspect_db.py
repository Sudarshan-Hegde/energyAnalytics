import sqlite3
import os

# Connect to database
db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gridsense_iso_ne.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("=== DATABASE SCHEMA ===\n")
print(f"Database: {db_path}\n")
print(f"Tables found: {len(tables)}\n")

for table in tables:
    table_name = table[0]
    print(f"\n--- Table: {table_name} ---")
    
    # Get column information
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    print("Columns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    row_count = cursor.fetchone()[0]
    print(f"Row count: {row_count}")
    
    # Show sample data
    if row_count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
        sample = cursor.fetchone()
        print("Sample row:")
        for i, col in enumerate(columns):
            print(f"  {col[1]}: {sample[i]}")

conn.close()

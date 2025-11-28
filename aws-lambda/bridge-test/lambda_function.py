"""
AWS Lambda: Supabase to SQL Server Bridge Test
Receives data via API Gateway and inserts into SQL Server on EC2
Uses pyodbc with Microsoft ODBC Driver 18
"""
import json
import pyodbc
import os
from datetime import datetime

# Set up ODBC driver path for Lambda layer
os.environ['ODBCINI'] = '/opt/python/odbc.ini'
os.environ['ODBCSYSINI'] = '/opt/python'

# SQL Server connection config from environment variables
DB_SERVER = os.environ.get('DB_SERVER', '172.31.66.246')
DB_PORT = os.environ.get('DB_PORT', '1433')
DB_USER = os.environ.get('DB_USER', 'dbox')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'Monday123$')
DB_NAME = os.environ.get('DB_NAME', 'LCMD_DB')

def get_connection():
    """Create ODBC connection to SQL Server"""
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={DB_SERVER},{DB_PORT};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        f"TrustServerCertificate=yes;"
        f"Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)

def lambda_handler(event, context):
    """
    Main Lambda handler
    Expects JSON body with test data to insert
    """
    print(f"Event received: {json.dumps(event)}")

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    }

    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    conn = None

    try:
        # Parse request body
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)

        print(f"Parsed body: {body}")

        # Extract test data from payload
        test_name = body.get('test_name', 'default_test')
        test_value = body.get('test_value', 'no_value_provided')
        source = body.get('source', 'api_gateway')

        # Connect to SQL Server
        print(f"Connecting to SQL Server: {DB_SERVER}...")
        conn = get_connection()
        cursor = conn.cursor()
        print("Connected to SQL Server successfully")

        # Create test table if it doesn't exist
        create_table_sql = """
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='supabase_bridge_test' AND xtype='U')
        CREATE TABLE supabase_bridge_test (
            id INT IDENTITY(1,1) PRIMARY KEY,
            test_name NVARCHAR(255) NOT NULL,
            test_value NVARCHAR(MAX),
            source NVARCHAR(100),
            created_at DATETIME DEFAULT GETDATE(),
            payload_json NVARCHAR(MAX)
        )
        """
        cursor.execute(create_table_sql)
        conn.commit()
        print("Table check/creation complete")

        # Insert test data
        insert_sql = """
        INSERT INTO supabase_bridge_test (test_name, test_value, source, payload_json)
        VALUES (?, ?, ?, ?)
        """
        payload_json = json.dumps(body)
        cursor.execute(insert_sql, (test_name, test_value, source, payload_json))
        conn.commit()

        # Get the inserted ID
        cursor.execute("SELECT @@IDENTITY")
        inserted_id = cursor.fetchone()[0]

        print(f"Inserted row with ID: {inserted_id}")

        # Get row count
        cursor.execute("SELECT COUNT(*) FROM supabase_bridge_test")
        total_rows = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Data inserted into SQL Server successfully',
                'inserted_id': int(inserted_id) if inserted_id else None,
                'total_rows_in_table': total_rows,
                'data': {
                    'test_name': test_name,
                    'test_value': test_value,
                    'source': source
                },
                'timestamp': datetime.utcnow().isoformat()
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

        if conn:
            try:
                conn.close()
            except:
                pass

        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
        }

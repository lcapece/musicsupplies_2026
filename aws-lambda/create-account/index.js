/**
 * AWS Lambda Function: Create Account in SQL Server
 *
 * This function receives account data from Netlify via API Gateway,
 * inserts it into the SQL Server master database on EC2, and returns success/failure.
 *
 * Flow: Netlify → API Gateway → This Lambda → SQL Server on EC2
 */

const sql = require('mssql');

// Database configuration from environment variables
const DB_CONFIG = {
  server: process.env.SQL_SERVER_HOST,     // EC2 private IP or hostname
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  options: {
    encrypt: true,                          // Use encryption
    trustServerCertificate: true,           // Trust self-signed certs
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // CORS headers for Netlify
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  let pool;

  try {
    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Validate required fields (some fields are critical for SQL Server)
    const requiredFields = ['acct_name', 'address', 'city', 'state', 'zip', 'phone'];
    const missingFields = requiredFields.filter(field => {
      // Check if field is missing or empty string
      return !body[field] || body[field].toString().trim() === '';
    });

    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Missing or empty required fields: ${missingFields.join(', ')}`,
          details: 'All required fields must have values for SQL Server'
        })
      };
    }

    // Connect to SQL Server
    console.log('Connecting to SQL Server...');
    pool = await sql.connect(DB_CONFIG);
    console.log('Connected to SQL Server successfully');

    // Get the next account number - CRITICAL: No auto-increment!
    // SQL Server accounts table does NOT have SEQUENCE/IDENTITY
    // We MUST manually determine and insert the next account number
    console.log('Fetching maximum account number from SQL Server...');
    const maxResult = await pool.request()
      .query('SELECT MAX(CAST(account_number AS BIGINT)) as max_account FROM accounts_lcmd');

    const currentMax = maxResult.recordset[0]?.max_account;
    const nextAccountNumber = currentMax ? (parseInt(currentMax) + 1) : 10001;

    console.log('Current MAX account_number in database:', currentMax || 'NULL (table empty)');
    console.log('Next account number to insert:', nextAccountNumber);

    // Prepare account data
    const accountData = {
      account_number: nextAccountNumber,
      acct_name: body.acct_name || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zip: body.zip || '',
      phone: body.phone || '',
      mobile_phone: body.mobile_phone || '',
      email_address: body.email_address || '',
      contact: body.contact || '',
      website: body.website || '',
      salesman: body.salesman || '',
      terms: body.terms || 'NET30',
      status: 'ACTIVE',
      dstamp: new Date(),
      inserted_at: new Date(),
      updated_at: new Date()
    };

    // Insert into SQL Server
    const insertQuery = `
      INSERT INTO accounts_lcmd (
        account_number, acct_name, address, city, state, zip,
        phone, mobile_phone, email_address, contact, website,
        salesman, terms, status, dstamp, inserted_at, updated_at
      ) VALUES (
        @account_number, @acct_name, @address, @city, @state, @zip,
        @phone, @mobile_phone, @email_address, @contact, @website,
        @salesman, @terms, @status, @dstamp, @inserted_at, @updated_at
      )
    `;

    console.log('Executing insert...');
    const request = pool.request();

    // Add parameters
    request.input('account_number', sql.BigInt, accountData.account_number);
    request.input('acct_name', sql.NVarChar, accountData.acct_name);
    request.input('address', sql.NVarChar, accountData.address);
    request.input('city', sql.NVarChar, accountData.city);
    request.input('state', sql.NVarChar, accountData.state);
    request.input('zip', sql.NVarChar, accountData.zip);
    request.input('phone', sql.NVarChar, accountData.phone);
    request.input('mobile_phone', sql.NVarChar, accountData.mobile_phone);
    request.input('email_address', sql.NVarChar, accountData.email_address);
    request.input('contact', sql.NVarChar, accountData.contact);
    request.input('website', sql.NVarChar, accountData.website);
    request.input('salesman', sql.NVarChar, accountData.salesman);
    request.input('terms', sql.NVarChar, accountData.terms);
    request.input('status', sql.NVarChar, accountData.status);
    request.input('dstamp', sql.DateTime, accountData.dstamp);
    request.input('inserted_at', sql.DateTime, accountData.inserted_at);
    request.input('updated_at', sql.DateTime, accountData.updated_at);

    const result = await request.query(insertQuery);
    console.log('Insert result:', result);

    // Optional: Log to audit table
    if (body.prospect_id) {
      const auditRequest = pool.request();
      auditRequest.input('prospect_id', sql.BigInt, body.prospect_id);
      auditRequest.input('account_number', sql.BigInt, nextAccountNumber);
      auditRequest.input('converted_by', sql.NVarChar, body.converted_by || 'system');

      await auditRequest.query(`
        INSERT INTO prospect_conversions (prospect_id, account_number, converted_at, converted_by)
        VALUES (@prospect_id, @account_number, GETDATE(), @converted_by)
      `).catch(err => console.log('Audit log failed (non-critical):', err.message));
    }

    await pool.close();

    // Return success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        account_number: nextAccountNumber,
        message: 'Account created successfully',
        data: {
          account_number: nextAccountNumber,
          acct_name: accountData.acct_name
        }
      })
    };

  } catch (error) {
    console.error('Error:', error);

    // Close connection if open
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

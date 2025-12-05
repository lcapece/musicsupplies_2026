/**
 * Netlify Function: Create Account in SQL Server
 *
 * Creates a new account directly in SQL Server LCMD_DB
 * Called when converting a prospect to a customer account
 */

const sql = require('mssql');

// SQL Server configuration - same as validate-promo-code
const config = {
  server: '54.211.243.128',
  port: 1433,
  user: 'dbox',
  password: 'Monday123$',
  database: 'LCMD_DB',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  let pool;

  try {
    const body = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ['acct_name', 'address', 'city', 'state', 'zip', 'phone'];
    const missingFields = requiredFields.filter(field => {
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
    pool = await sql.connect(config);
    console.log('Connected to SQL Server successfully');

    // Get the next account number
    console.log('Fetching maximum account number from SQL Server...');
    const maxResult = await pool.request()
      .query('SELECT MAX(CAST(account_number AS BIGINT)) as max_account FROM accounts_lcmd');

    const currentMax = maxResult.recordset[0]?.max_account;
    const nextAccountNumber = currentMax ? (parseInt(currentMax) + 1) : 10001;

    console.log('Current MAX account_number:', currentMax || 'NULL (table empty)');
    console.log('Next account number to insert:', nextAccountNumber);

    // Prepare account data - only columns that exist in accounts_lcmd table
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
      salesman: body.salesman || '',
      terms: body.terms || 'NET30',
      sms_consent: false
    };

    // Insert into SQL Server - using only columns that exist in accounts_lcmd
    const insertQuery = `
      INSERT INTO accounts_lcmd (
        account_number, acct_name, address, city, state, zip,
        phone, mobile_phone, email_address, contact,
        salesman, terms, sms_consent
      ) VALUES (
        @account_number, @acct_name, @address, @city, @state, @zip,
        @phone, @mobile_phone, @email_address, @contact,
        @salesman, @terms, @sms_consent
      )
    `;

    console.log('Executing insert...');
    const request = pool.request();

    // Add parameters - matching actual table columns
    request.input('account_number', sql.Int, accountData.account_number);
    request.input('acct_name', sql.NVarChar, accountData.acct_name);
    request.input('address', sql.NVarChar, accountData.address);
    request.input('city', sql.NVarChar, accountData.city);
    request.input('state', sql.NVarChar, accountData.state);
    request.input('zip', sql.NVarChar, accountData.zip);
    request.input('phone', sql.NVarChar, accountData.phone);
    request.input('mobile_phone', sql.NVarChar, accountData.mobile_phone);
    request.input('email_address', sql.NVarChar, accountData.email_address);
    request.input('contact', sql.NVarChar, accountData.contact);
    request.input('salesman', sql.NVarChar, accountData.salesman);
    request.input('terms', sql.NVarChar, accountData.terms);
    request.input('sms_consent', sql.Bit, accountData.sms_consent);

    const result = await request.query(insertQuery);
    console.log('Insert result:', result);

    // Optional: Log prospect conversion
    if (body.prospect_id) {
      try {
        const auditRequest = pool.request();
        auditRequest.input('prospect_id', sql.BigInt, body.prospect_id);
        auditRequest.input('account_number', sql.BigInt, nextAccountNumber);
        auditRequest.input('converted_by', sql.NVarChar, body.converted_by || 'system');

        await auditRequest.query(`
          INSERT INTO prospect_conversions (prospect_id, account_number, converted_at, converted_by)
          VALUES (@prospect_id, @account_number, GETDATE(), @converted_by)
        `);
      } catch (auditErr) {
        console.log('Audit log failed (non-critical):', auditErr.message);
      }
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
        details: 'Failed to create account in SQL Server'
      })
    };
  }
};

/**
 * Netlify Function: Validate Account-Specific Promo Code
 * Ensures promo codes can ONLY be used by the assigned account
 */

const sql = require('mssql');

// SQL Server configuration
const config = {
  server: '54.211.243.128',
  port: 1433,
  user: 'dbox',
  password: 'Monday123$',
  database: 'LCMD_DB',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let pool;

  try {
    const body = JSON.parse(event.body);
    const { promo_code, account_number, order_total } = body;

    // Validate inputs
    if (!promo_code || !account_number || !order_total) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          valid: false,
          error: 'Missing required fields: promo_code, account_number, order_total'
        })
      };
    }

    // Normalize promo code to uppercase
    const normalizedCode = promo_code.toUpperCase();

    // Connect to SQL Server
    pool = await sql.connect(config);

    // Find the promo code
    const promoResult = await pool.request()
      .input('code', sql.NVarChar(3), normalizedCode)
      .query(`
        SELECT
          promo_code,
          account_number,
          account_name,
          expires_at,
          discount_percentage,
          max_discount_amount,
          max_order_amount,
          used,
          used_at,
          status
        FROM account_promo_codes
        WHERE promo_code = @code
      `);

    if (!promoResult.recordset || promoResult.recordset.length === 0) {
      await pool.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          message: `Invalid promo code "${normalizedCode}". Please check the code and try again.`
        })
      };
    }

    const promo = promoResult.recordset[0];

    // CRITICAL SECURITY CHECK: Verify account number matches
    if (promo.account_number !== parseInt(account_number)) {
      // Log security violation
      await pool.request()
        .input('event', sql.NVarChar, 'PROMO_CODE_MISMATCH')
        .input('details', sql.NVarChar, `Account ${account_number} tried to use code ${normalizedCode} belonging to account ${promo.account_number}`)
        .input('account', sql.BigInt, account_number)
        .query(`
          INSERT INTO security_logs (event_type, details, account_number, timestamp)
          VALUES (@event, @details, @account, GETDATE())
        `);

      await pool.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          message: 'This promo code is not valid for your account. Each code is tied to a specific account.'
        })
      };
    }

    // Check if already used
    if (promo.used) {
      await pool.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          message: `This promo code was already used on ${new Date(promo.used_at).toLocaleString()}`
        })
      };
    }

    // Check if expired
    if (new Date(promo.expires_at) < new Date()) {
      // Update status
      await pool.request()
        .input('code', sql.NVarChar(3), normalizedCode)
        .query(`UPDATE account_promo_codes SET status = 'EXPIRED' WHERE promo_code = @code`);

      await pool.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          message: `This promo code expired on ${new Date(promo.expires_at).toLocaleString()}`
        })
      };
    }

    // Check order amount limit
    if (order_total > promo.max_order_amount) {
      await pool.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          message: `Order total ($${order_total}) exceeds maximum of $${promo.max_order_amount} for this promo code`
        })
      };
    }

    // Calculate discount
    const discountAmount = Math.min(
      order_total * (promo.discount_percentage / 100),
      promo.max_discount_amount
    );

    const finalTotal = order_total - discountAmount;

    // Calculate hours remaining
    const hoursRemaining = Math.floor((new Date(promo.expires_at) - new Date()) / (1000 * 60 * 60));

    await pool.close();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        promo_code: normalizedCode,
        discount_percentage: promo.discount_percentage,
        discount_amount: discountAmount.toFixed(2),
        final_total: finalTotal.toFixed(2),
        hours_remaining: hoursRemaining,
        expires_at: promo.expires_at,
        message: `✓ Valid! Code "${normalizedCode}" applied: $${discountAmount.toFixed(2)} off (${promo.discount_percentage}% discount, max $${promo.max_discount_amount}). Expires in ${hoursRemaining} hours.`
      })
    };

  } catch (error) {
    console.error('Error:', error);

    if (pool) {
      try {
        await pool.close();
      } catch (e) {
        console.error('Error closing pool:', e);
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        valid: false,
        error: 'Failed to validate promo code',
        details: error.message
      })
    };
  }
};
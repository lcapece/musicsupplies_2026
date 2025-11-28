/**
 * Account Creation API Client
 *
 * Calls AWS API Gateway → Lambda → SQL Server to create new accounts
 */

export interface CreateAccountRequest {
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mobile_phone?: string;
  email_address?: string;
  contact?: string;
  website?: string;
  salesman?: string;
  terms?: string;
  prospect_id?: number;
  converted_by?: string;
}

export interface CreateAccountResponse {
  success: boolean;
  account_number?: number;
  message?: string;
  error?: string;
  data?: {
    account_number: number;
    acct_name: string;
  };
}

/**
 * Create a new account in SQL Server master database
 */
export async function createAccountInSQLServer(
  data: CreateAccountRequest
): Promise<CreateAccountResponse> {
  // Use Netlify Function endpoint (no env var needed!)
  const apiEndpoint = '/api/create-sql-account';

  // Fallback to AWS Lambda if configured
  const customEndpoint = import.meta.env.VITE_CREATE_ACCOUNT_API;
  const endpoint = customEndpoint || apiEndpoint;


  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const result: CreateAccountResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred');
    }

    return result;

  } catch (error) {
    console.error('Error creating account in SQL Server:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to create account. Please try again.',
    };
  }
}

/**
 * Convert a prospect to an account
 * This is a convenience wrapper that adds prospect-specific metadata
 */
export async function convertProspectToAccount(
  prospectData: {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    mobile_phone?: string;
    email?: string;
    contact_name?: string;
    website?: string;
    assigned_to?: string;
  },
  convertedBy: string
): Promise<CreateAccountResponse> {
  const accountData: CreateAccountRequest = {
    acct_name: prospectData.name,
    address: prospectData.address || '',
    city: prospectData.city || '',
    state: prospectData.state || '',
    zip: prospectData.zip || '',
    phone: prospectData.phone || '',
    mobile_phone: prospectData.mobile_phone,
    email_address: prospectData.email,
    contact: prospectData.contact_name,
    website: prospectData.website,
    salesman: prospectData.assigned_to,
    terms: 'NET30',
    prospect_id: prospectData.id,
    converted_by: convertedBy,
  };

  return createAccountInSQLServer(accountData);
}

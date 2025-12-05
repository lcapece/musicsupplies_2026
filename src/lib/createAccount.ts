/**
 * Account Creation - Direct Supabase Insert
 *
 * Creates accounts directly in the Supabase accounts_lcmd table
 */

import { supabase } from './supabase';

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
 * Create a new account directly in Supabase accounts_lcmd table
 */
export async function createAccountInSQLServer(
  data: CreateAccountRequest
): Promise<CreateAccountResponse> {
  try {
    // Step 1: Get the next account number
    const { data: maxData, error: maxError } = await supabase
      .from('accounts_lcmd')
      .select('account_number')
      .order('account_number', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('Error fetching max account number:', maxError);
      throw new Error('Failed to get next account number: ' + maxError.message);
    }

    const currentMax = maxData && maxData.length > 0
      ? parseInt(maxData[0].account_number)
      : 10000;
    const nextAccountNumber = currentMax + 1;

    console.log('Current MAX account_number:', currentMax);
    console.log('Next account number to insert:', nextAccountNumber);

    // Step 2: Insert the new account into Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('accounts_lcmd')
      .insert({
        account_number: nextAccountNumber,
        acct_name: data.acct_name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        phone: data.phone || '',
        mobile_phone: data.mobile_phone || '',
        email_address: data.email_address || '',
        contact: data.contact || '',
        salesman: data.salesman || '',
        terms: data.terms || 'NET30',
        sms_consent: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting account:', insertError);
      throw new Error('Failed to create account: ' + insertError.message);
    }

    console.log('Account created successfully:', insertedData);

    return {
      success: true,
      account_number: nextAccountNumber,
      message: 'Account created successfully',
      data: {
        account_number: nextAccountNumber,
        acct_name: data.acct_name
      }
    };

  } catch (error) {
    console.error('Error creating account:', error);

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

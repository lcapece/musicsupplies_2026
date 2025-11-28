import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  InvoiceHeader,
  InvoiceDetail,
  InvoicePayment,
  AccountLookup,
  StaffMember,
  InvoiceHeaderWithDetails
} from '../types';

// Static dropdown values (FALLBACK ONLY - should use database ref_ship_methods and ref_payment_terms)
// These match the database seed data from migration 20251127_create_invoice_reference_tables.sql
export const SHIP_VIA_OPTIONS = [
  'UPS Ground',
  'UPS 2nd Day Air',
  'UPS Next Day Air',
  'FedEx Ground',
  'FedEx Express',
  'FedEx 2 Day',
  'USPS Priority Mail',
  'USPS Express Mail',
  'LTL Freight',
  'Truck Freight',
  'Customer Pickup',
  'Will Call',
  'Local Delivery'
];

export const TERMS_OPTIONS = [
  'Net 10 Days',
  'Net 30 Days',
  'Net 60 Days',
  'Net 90 Days',
  'Cash On Delivery',
  'Prepaid',
  'Cash In Advance',
  '2% 10 Net 30',
  'Credit Card',
  'ACH/Wire Transfer'
];

export const DOC_TYPE_OPTIONS = ['Invoice', 'Quote'] as const;

interface UseInvoiceReturn {
  // State
  invoice: InvoiceHeader | null;
  details: InvoiceDetail[];
  payments: InvoicePayment[];
  account: AccountLookup | null;
  loading: boolean;
  error: string | null;

  // Invoice operations
  fetchInvoice: (ivd: number) => Promise<void>;
  createInvoice: (data: Partial<InvoiceHeader>) => Promise<number | null>;
  updateInvoice: (ivd: number, data: Partial<InvoiceHeader>) => Promise<boolean>;

  // Navigation
  fetchFirstInvoice: () => Promise<void>;
  fetchLastInvoice: () => Promise<void>;
  fetchNextInvoice: (currentIvd: number) => Promise<void>;
  fetchPrevInvoice: (currentIvd: number) => Promise<void>;

  // Account operations
  fetchAccount: (accountNumber: number) => Promise<AccountLookup | null>;
  searchAccounts: (query: string) => Promise<AccountLookup[]>;

  // Amount owed calculation
  fetchAmountOwed: (accountNumber: number) => Promise<number>;

  // Payments
  fetchPayments: (ivd: number) => Promise<InvoicePayment[]>;

  // Details (line items)
  fetchDetails: (ivd: number) => Promise<InvoiceDetail[]>;
  saveDetails: (ivd: number, details: InvoiceDetail[]) => Promise<boolean>;
  addDetail: (ivd: number, detail: Partial<InvoiceDetail>) => Promise<InvoiceDetail | null>;
  updateDetail: (linekey: number, data: Partial<InvoiceDetail>) => Promise<boolean>;
  deleteDetail: (linekey: number) => Promise<boolean>;

  // Staff/Salespeople
  fetchSalespeople: () => Promise<StaffMember[]>;

  // Calculate totals
  calculateSubtotal: (details: InvoiceDetail[]) => number;
  calculateGrandTotal: (subtotal: number, shipping: number, interest: number, ccFees: number) => number;
  calculateAmountDue: (grandTotal: number, totalPayments: number) => number;
}

export const useInvoice = (): UseInvoiceReturn => {
  const [invoice, setInvoice] = useState<InvoiceHeader | null>(null);
  const [details, setDetails] = useState<InvoiceDetail[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [account, setAccount] = useState<AccountLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch a single invoice by ID
  const fetchInvoice = useCallback(async (ivd: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('*')
        .eq('ivd', ivd)
        .single();

      if (fetchError) throw fetchError;

      setInvoice(data as InvoiceHeader);

      // Also fetch related data
      if (data?.account_number) {
        await fetchAccount(data.account_number);
      }
      await fetchDetails(ivd);
      await fetchPayments(ivd);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new invoice
  const createInvoice = useCallback(async (data: Partial<InvoiceHeader>): Promise<number | null> => {
    setLoading(true);
    setError(null);
    try {
      // Get the next IVD (invoice number) - not auto-increment in this schema
      const { data: maxData } = await supabase
        .from('tbl_inv_headers')
        .select('ivd')
        .order('ivd', { ascending: false })
        .limit(1)
        .single();

      const nextIvd = (maxData?.ivd || 486760) + 1;

      const { data: newInvoice, error: createError } = await supabase
        .from('tbl_inv_headers')
        .insert([{
          ivd: nextIvd,
          ...data,
          invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
          doc_type: data.doc_type || 'Invoice',
          shipping_charge: data.shipping_charge || 0,
          interest_charge: data.interest_charge || 0
        }])
        .select('ivd')
        .single();

      if (createError) throw createError;

      return newInvoice?.ivd || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing invoice
  const updateInvoice = useCallback(async (ivd: number, data: Partial<InvoiceHeader>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('tbl_inv_headers')
        .update(data)
        .eq('ivd', ivd);

      if (updateError) throw updateError;

      // Refresh the invoice data
      await fetchInvoice(ivd);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  // Navigation - First invoice
  const fetchFirstInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('ivd')
        .order('ivd', { ascending: true })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;
      if (data?.ivd) {
        await fetchInvoice(data.ivd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch first invoice');
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  // Navigation - Last invoice
  const fetchLastInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('ivd')
        .order('ivd', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;
      if (data?.ivd) {
        await fetchInvoice(data.ivd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch last invoice');
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  // Navigation - Next invoice
  const fetchNextInvoice = useCallback(async (currentIvd: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('ivd')
        .gt('ivd', currentIvd)
        .order('ivd', { ascending: true })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (data?.ivd) {
        await fetchInvoice(data.ivd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No more invoices');
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  // Navigation - Previous invoice
  const fetchPrevInvoice = useCallback(async (currentIvd: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('ivd')
        .lt('ivd', currentIvd)
        .order('ivd', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (data?.ivd) {
        await fetchInvoice(data.ivd);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No previous invoices');
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  // Fetch account details
  const fetchAccount = useCallback(async (accountNumber: number): Promise<AccountLookup | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, address, city, state, zip, phone, mobile_phone, email_address, contact, terms, salesman')
        .eq('account_number', accountNumber)
        .single();

      if (fetchError) throw fetchError;

      const accountData = data as AccountLookup;
      setAccount(accountData);
      return accountData;
    } catch (err) {
      console.error('Failed to fetch account:', err);
      return null;
    }
  }, []);

  // Search accounts for dropdown
  const searchAccounts = useCallback(async (query: string): Promise<AccountLookup[]> => {
    try {
      let queryBuilder = supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, address, city, state, zip, phone, mobile_phone, email_address, contact, terms, salesman')
        .order('acct_name', { ascending: true })
        .limit(50);

      // If query is a number, search by account number
      if (/^\d+$/.test(query)) {
        queryBuilder = queryBuilder.eq('account_number', parseInt(query));
      } else if (query.trim()) {
        // Search by name, city, or state
        queryBuilder = queryBuilder.or(`acct_name.ilike.%${query}%,city.ilike.%${query}%`);
      }

      const { data, error: searchError } = await queryBuilder;

      if (searchError) throw searchError;
      return (data || []) as AccountLookup[];
    } catch (err) {
      console.error('Failed to search accounts:', err);
      return [];
    }
  }, []);

  // Calculate amount owed for an account (sum of unpaid invoices)
  const fetchAmountOwed = useCallback(async (accountNumber: number): Promise<number> => {
    try {
      // Get all invoices for this account and sum up amounts
      // Note: This is a simplified calculation - adjust based on actual schema
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_headers')
        .select('ivd, shipping_charge, interest_charge')
        .eq('account_number', accountNumber);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) return 0;

      // For each invoice, get the details and payments to calculate owed
      let totalOwed = 0;

      for (const inv of data) {
        // Get line item totals
        const { data: detailsData } = await supabase
          .from('tbl_inv_details')
          .select('qtyshipped, unitnet')
          .eq('ivd', inv.ivd);

        const lineTotal = (detailsData || []).reduce((sum, d) =>
          sum + ((d.qtyshipped || 0) * (d.unitnet || 0)), 0);

        // Get payments
        const { data: paymentsData } = await supabase
          .from('tbl_inv_payments')
          .select('paymentamount')
          .eq('invid', inv.ivd);

        const totalPaid = (paymentsData || []).reduce((sum, p) =>
          sum + (p.paymentamount || 0), 0);

        const invoiceTotal = lineTotal + (inv.shipping_charge || 0) + (inv.interest_charge || 0);
        totalOwed += (invoiceTotal - totalPaid);
      }

      return totalOwed;
    } catch (err) {
      console.error('Failed to calculate amount owed:', err);
      return 0;
    }
  }, []);

  // Fetch payments for an invoice
  const fetchPayments = useCallback(async (ivd: number): Promise<InvoicePayment[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_payments')
        .select('*')
        .eq('invid', ivd)
        .order('paymentdate', { ascending: false });

      if (fetchError) throw fetchError;

      const paymentsData = (data || []) as InvoicePayment[];
      setPayments(paymentsData);
      return paymentsData;
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      return [];
    }
  }, []);

  // Fetch invoice line items
  const fetchDetails = useCallback(async (ivd: number): Promise<InvoiceDetail[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_inv_details')
        .select('*')
        .eq('ivd', ivd)
        .order('linekey', { ascending: true });

      if (fetchError) throw fetchError;

      const detailsData = (data || []) as InvoiceDetail[];
      setDetails(detailsData);
      return detailsData;
    } catch (err) {
      console.error('Failed to fetch details:', err);
      return [];
    }
  }, []);

  // Save all details for an invoice (handles add/update/delete)
  const saveDetails = useCallback(async (ivd: number, newDetails: InvoiceDetail[]): Promise<boolean> => {
    try {
      // Get existing details to determine what to add/update/delete
      const { data: existingData } = await supabase
        .from('tbl_inv_details')
        .select('linekey')
        .eq('ivd', ivd);

      const existingKeys = new Set((existingData || []).map(d => d.linekey));

      // For new items (linekey < 10000 indicates temp local key), get the max linekey
      const { data: maxData } = await supabase
        .from('tbl_inv_details')
        .select('linekey')
        .order('linekey', { ascending: false })
        .limit(1)
        .single();

      let nextLineKey = (maxData?.linekey || 1650000) + 1;

      // Track which keys we're keeping (for delete logic)
      const keptKeys = new Set<number>();

      // Delete removed items
      const keysToDelete = [...existingKeys].filter(k =>
        !newDetails.some(d => d.linekey === k)
      );
      if (keysToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tbl_inv_details')
          .delete()
          .in('linekey', keysToDelete);
        if (deleteError) throw deleteError;
      }

      // Upsert all current items
      for (const detail of newDetails) {
        // Determine if this is a new item (temp local key) or existing
        const isNewItem = !existingKeys.has(detail.linekey);
        const actualLineKey = isNewItem ? nextLineKey++ : detail.linekey;

        // Note: qtyordered is TEXT in database, others are numeric
        const detailData = {
          linekey: actualLineKey,
          ivd: ivd,
          partnumber: detail.partnumber || null,
          description: detail.description || null,
          qtyordered: String(detail.qtyordered || 0), // TEXT field
          qtyshipped: detail.qtyshipped || 0,
          qtybackordered: detail.qtybackordered || 0,
          unitcost: detail.unitcost || 0,
          unitnet: detail.unitnet || 0
        };

        if (existingKeys.has(detail.linekey)) {
          // Update existing
          const { error: updateError } = await supabase
            .from('tbl_inv_details')
            .update(detailData)
            .eq('linekey', detail.linekey);
          if (updateError) throw updateError;
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('tbl_inv_details')
            .insert([detailData]);
          if (insertError) throw insertError;
        }

        keptKeys.add(actualLineKey);
      }

      // Refresh details
      await fetchDetails(ivd);
      return true;
    } catch (err) {
      console.error('Failed to save details:', err);
      setError(err instanceof Error ? err.message : 'Failed to save line items');
      return false;
    }
  }, [fetchDetails]);

  // Add a single detail line
  const addDetail = useCallback(async (ivd: number, detail: Partial<InvoiceDetail>): Promise<InvoiceDetail | null> => {
    try {
      // Get max linekey for generating new key
      const { data: maxData } = await supabase
        .from('tbl_inv_details')
        .select('linekey')
        .order('linekey', { ascending: false })
        .limit(1)
        .single();

      const newLineKey = (maxData?.linekey || 1650000) + 1;

      const { data, error: insertError } = await supabase
        .from('tbl_inv_details')
        .insert([{
          linekey: newLineKey,
          ivd,
          partnumber: detail.partnumber || null,
          description: detail.description || null,
          qtyordered: String(detail.qtyordered || 0), // TEXT field
          qtyshipped: detail.qtyshipped || 0,
          qtybackordered: detail.qtybackordered || 0,
          unitcost: detail.unitcost || 0,
          unitnet: detail.unitnet || 0
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchDetails(ivd);
      return data as InvoiceDetail;
    } catch (err) {
      console.error('Failed to add detail:', err);
      return null;
    }
  }, [fetchDetails]);

  // Update a single detail line
  const updateDetail = useCallback(async (linekey: number, data: Partial<InvoiceDetail>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('tbl_inv_details')
        .update(data)
        .eq('linekey', linekey);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Failed to update detail:', err);
      return false;
    }
  }, []);

  // Delete a single detail line
  const deleteDetail = useCallback(async (linekey: number): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('tbl_inv_details')
        .delete()
        .eq('linekey', linekey);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Failed to delete detail:', err);
      return false;
    }
  }, []);

  // Fetch salespeople from staff_management
  const fetchSalespeople = useCallback(async (): Promise<StaffMember[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('staff_management')
        .select('username, user_full_name, security_level, is_salesperson, bridge_code')
        .eq('is_salesperson', true)
        .order('user_full_name', { ascending: true });

      if (fetchError) throw fetchError;
      return (data || []) as StaffMember[];
    } catch (err) {
      console.error('Failed to fetch salespeople:', err);
      return [];
    }
  }, []);

  // Calculate subtotal from line items
  const calculateSubtotal = useCallback((details: InvoiceDetail[]): number => {
    return details.reduce((sum, d) => {
      const qty = d.qtyshipped || d.qtyordered || 0;
      const price = d.unitnet || 0;
      return sum + (qty * price);
    }, 0);
  }, []);

  // Calculate grand total
  const calculateGrandTotal = useCallback((
    subtotal: number,
    shipping: number,
    interest: number,
    ccFees: number
  ): number => {
    return subtotal + shipping + interest + ccFees;
  }, []);

  // Calculate amount due
  const calculateAmountDue = useCallback((grandTotal: number, totalPayments: number): number => {
    return grandTotal - totalPayments;
  }, []);

  return {
    invoice,
    details,
    payments,
    account,
    loading,
    error,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    fetchFirstInvoice,
    fetchLastInvoice,
    fetchNextInvoice,
    fetchPrevInvoice,
    fetchAccount,
    searchAccounts,
    fetchAmountOwed,
    fetchPayments,
    fetchDetails,
    saveDetails,
    addDetail,
    updateDetail,
    deleteDetail,
    fetchSalespeople,
    calculateSubtotal,
    calculateGrandTotal,
    calculateAmountDue
  };
};

export default useInvoice;

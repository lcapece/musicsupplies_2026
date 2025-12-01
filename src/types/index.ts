export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  children?: Category[];
}

export interface Product {
  partnumber: string;
  description: string;
  price: number | null;
  inventory: number | null;
  image?: string; // Add optional image property
  image_field?: string; // Image field from products_supabase table
  groupedimage?: string; // Grouped image field from products_supabase
  category?: number | null; // Product category (INTEGER foreign key)
  webmsrp?: number | null; // List price (corrected spelling)
  longdescription?: string; // Long description that may contain HTML
  brand?: string; // Manufacturer/brand name
  map?: number | null; // Manufacturer's Advertised Price
  upc?: string; // Universal Product Code
  master_carton_price?: number | null; // Master carton price
  master_carton_quantity?: number | null; // Master carton quantity
}

export interface CartItem extends Product {
  quantity: number;
  qtyBackordered?: number;
}

export interface Account {
  id: string;
  accountNumber: string;
  companyName: string;
  email: string;
  isActive: boolean;
}

export interface User {
  accountNumber: string;
  acctName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email?: string; // This will be the property used in the frontend User object
  email_address?: string; // Property from the database (corrected to lowercase)
  phone?: string; // Business phone
  mobile_phone?: string; // Added mobile_phone
  id?: number; // Added id from accounts table (should be number for database compatibility)
  password?: string; // Added password from accounts table
  requires_password_change?: boolean; // Flag to indicate if user needs to change password
  sms_consent?: boolean; // SMS consent flag
  sms_consent_given?: boolean; // Tracks if they opted in for transactional SMS messages
  sms_consent_date?: string; // Date when SMS consent was given
  marketing_sms_consent?: boolean; // Tracks express written consent for marketing SMS messages
  is_special_admin?: boolean; // Flag for special admin account (99)
  security_level?: string; // Security level for staff users (e.g., 'superuser', 'manager', 'staff')
  allow_product_edit?: boolean; // Staff permission to edit products
  default_panel?: 'accounts' | 'products' | 'invoicing' | 'prospects'; // Default panel for staff users
}

export interface ProductGroup {
  prdmaingrp?: string; // Main group (level 1)
  prdsubgrp?: string; // Sub group (level 2)
  level: number;
  id: string;
  name: string;
  parentId: string | null;
  children?: ProductGroup[];
  productCount?: number; // Count of products in this category
  icon?: string; // Icon name for the category (used for SVG icons)
}

export interface OrderConfirmationDetails {
  webOrderNumber: string;
  items: CartItem[];
  total: number;
}

export interface RtExtended {
  partnumber: string;
  ext_descr?: string;
  image_name?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: 'percent_off' | 'dollars_off' | 'free_product' | 'advanced';
  value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_remaining: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  max_uses_per_account?: number | null;
  uses_per_account_tracking?: boolean;
  legacy_code?: string;
  allow_concurrent?: boolean;
  template?: string;
  template_config?: Record<string, any>;
}

export interface PromoCodeUsage {
  id: string;
  promo_code_id: string;
  account_number: string;
  order_id?: number;
  used_at: string;
  order_value: number;
  discount_amount: number;
}

export interface PromoCodeValidity {
  is_valid: boolean;
  message: string;
  promo_id?: string;
  promo_type?: string;
  promo_value?: number;
  discount_amount?: number;
  code?: string; // Added for actual promo code (e.g., "SAVE10")
  product_description?: string; // Added for description from products table
}

export interface PromoCodeSummary {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
}

export interface AvailablePromoCode {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
  discount_amount: number;
  is_best: boolean;
  uses_remaining_for_account?: number | null;
  status?: 'available' | 'expired' | 'expired_global' | 'expired_date' | 'not_active' | 'disabled' | 'min_not_met';
}

export interface SecurityLevel {
  id: string;
  security_level: string;
  section: string;
  scope: 'read-only' | 'create' | 'update' | 'delete' | 'all' | 'none';
  created_at?: string;
  updated_at?: string;
}

export type PermissionScope = 'read-only' | 'create' | 'update' | 'delete' | 'all' | 'none';

export type SecurityLevelName = 'user' | 'manager' | 'admin' | 'super_admin';

export interface PermissionCheck {
  hasAccess: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  scope: PermissionScope;
}

// Purchase Order System Types
export type POStatus = 'Open' | 'Closed' | 'Cancelled' | 'Pending';

export interface ProductLCMD {
  part_number: string;
  vendor_part_number?: string;
  description: string;
  vendor_name?: string;
  unit_cost?: number;
  min_qty?: number;
  max_qty?: number;
  current_inventory?: number;
  last_ordered_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface POHeader {
  po_number?: number;
  vendor_id: string;
  vendor_order_number?: string;
  po_date: string;
  expected_date?: string;
  shipper?: string;
  ordered_by: string;
  po_status: POStatus;
  special_instructions?: string;
  po_subtotal: number;
  freight: number;
  taxes_duties: number;
  other_fees: number;
  grand_total: number;
  last_emailed_to?: string;
  last_emailed_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PODetail {
  po_detail_id?: number;
  po_number: number;
  line_number: number;
  lcmd_part_number?: string;
  vendor?: string;
  description: string;
  qty_ordered: number;
  qty_current: number;
  min_qty: number;
  max_inventory: number;
  unit_cost: number;
  extended_amount?: number;
  qty_received: number;
  created_at?: string;
  updated_at?: string;
}

export interface PODetailWithProduct extends PODetail {
  product?: ProductLCMD;
}

export interface POHeaderWithDetails extends POHeader {
  details: PODetail[];
}

// Invoice System Types
export type InvoiceDocType = 'Invoice' | 'Quote';
export type InvoiceStatus = 'Open' | 'Shipped' | 'Paid' | 'Cancelled' | 'Hold';

export interface InvoiceHeader {
  ivd: number;
  invoice_date: string;
  invoice_emailed?: string;
  date_shipped?: string;
  invoice_last_printed?: string;
  doc_type: InvoiceDocType;
  pack_status?: number;
  account_number: number;
  customer_po?: string;
  interest_charge: number;
  shipping_charge: number;
  terms?: string;
  ship_method?: string;
  packed_by?: string;
  salesman?: string;
  // Ship To fields
  st_name?: string;
  st_address?: string;
  st_city?: string;
  st_state?: string;
  st_zip?: string;
  st_contact?: string;
  st_phone?: string;
  st_mobile?: string;
  st_email?: string;
  // Notes
  notes?: string;
  gen_comments?: string;
}

export interface InvoiceDetail {
  linekey: number;
  ivd: number;
  qtyordered: number;
  qtyshipped?: number;
  qtybackordered?: number;
  partnumber?: string;
  description?: string;
  unitcost?: number;
  unitnet?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicePayment {
  paymentid: number;
  invid: number;
  paymenttype: string;
  paymentamount: number;
  paymentdate: string;
  paymentreference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountLookup {
  account_number: number;
  acct_name: string;
  city: string;
  state: string;
  address: string;
  zip: string;
  phone?: string;
  mobile_phone?: string;
  email_address?: string;
  contact?: string;
  terms?: string;
  salesman?: string;
}

export interface StaffMember {
  username: string;
  user_full_name: string;
  security_level: string;
  is_salesperson: boolean;
  bridge_code?: string;
  allow_product_edit?: boolean;
  default_panel?: 'accounts' | 'products' | 'invoicing' | 'prospects';
}
export type DefaultPanelType = 'accounts' | 'products' | 'invoicing' | 'prospects';

export interface InvoiceHeaderWithAccount extends InvoiceHeader {
  account?: AccountLookup;
}

export interface InvoiceHeaderWithDetails extends InvoiceHeader {
  details: InvoiceDetail[];
  payments: InvoicePayment[];
  account?: AccountLookup;
}

// Product lookup for invoice line items - values are COPIED into invoice detail
export interface ProductLookup {
  partnumber: string;
  description: string;
  price: number | null;
  prdmaincat?: string;
  prdsubcat?: string;
  image?: string;
  brand?: string;
  inventory?: number;
}

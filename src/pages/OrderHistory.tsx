import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { FaPrint, FaShoppingCart } from 'react-icons/fa';
import LogoImage from '../images/music_supplies_logo.png';

// --- Interfaces for the new Invoice Structure ---
interface AddressInfo {
  name: string;
  attn?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

interface OrderLineItem {
  lineKey: string;
  qtyOrdered: number;
  qtyShipped: number;
  partNumber: string;
  description: string;
  unitNet: number;
  extendedNet: number;
}

interface FullOrderDetails {
  invoiceNumber: string;
  accountNumber: string;
  invoiceDate: string;
  terms: string;
  salesRep: string;
  // customerPO?: string; // Removed
  billToAddress: AddressInfo | null;
  shipToAddress: AddressInfo | null;
  lineItems: OrderLineItem[];
  subtotal: number;
  shippingCharges: number;
  paymentsReceived: number;
  interestCharges: number;
  totalAmountDue: number;
}

const CompanyInfo = {
  name: "Lou Capece Music Distributors",
  address1: "2555 North Jerusalem Rd.",
  cityStateZip: "East Meadow, NY 11554",
  phone: "Toll Free 1(800) 321-5584",
  email: "marketing@loucapece.com"
};

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<FullOrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryWarnings, setInventoryWarnings] = useState<{[key: string]: boolean}>({});
  const { user } = useAuth();
  const { addToCart, items } = useCart();
  const { showNotification } = useNotification();

  const safeParseFloat = (value: any, defaultValue = 0): number => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return defaultValue;
    }
    const stringValue = String(value).replace(/\$|,/g, '');
    const num = parseFloat(stringValue);
    return isNaN(num) ? defaultValue : num;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() + offset);
      return localDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const fetchOrderHistoryDetails = useCallback(async (accountNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        setError("Invalid account number format.");
        setLoading(false);
        return;
      }

      let billToAddress: AddressInfo | null = null;
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('acctname, address, address2, city, state, zip, phone, contact')
        .eq('accountnumber', accountNumber)
        .single();

      if (accountError) {
        console.warn('[OrderHistory] Error fetching account details:', accountError.message);
      } else if (accountData) {
        billToAddress = {
          name: accountData.acctname || 'N/A',
          attn: accountData.contact || undefined,
          address1: accountData.address || 'N/A',
          address2: accountData.address2 || undefined,
          city: accountData.city || 'N/A',
          state: accountData.state || 'N/A',
          zip: accountData.zip || 'N/A',
          phone: accountData.phone || undefined,
        };
      }
      
      const { data: rawOrderData, error: queryError } = await supabase
        .from('lcmd_ordhist')
        .select(`
          invoicenumber, accountnumber, invoicedate, terms, salesman, 
          linekey, model, Description, Qty, unitnet, ups, payments
        `) // customerpo removed from select, fields aligned with lcmd_ordhist
        .eq('accountnumber', accountNumberInt)
        .order('invoicenumber', { ascending: false })
        .order('invoicedate', { ascending: false });

      if (queryError) {
        console.error('[OrderHistory] Query Error fetching lcmd_ordhist:', queryError);
        setError(queryError.message);
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!rawOrderData || rawOrderData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const groupedByInvoice: { [key: string]: any[] } = {};
      for (const item of rawOrderData) {
        const invoiceNumStr = String(item.invoicenumber);
        if (!groupedByInvoice[invoiceNumStr]) {
          groupedByInvoice[invoiceNumStr] = [];
        }
        groupedByInvoice[invoiceNumStr].push(item);
      }

      const processedOrders: FullOrderDetails[] = Object.values(groupedByInvoice).map(itemsInInvoice => {
        const firstItem = itemsInInvoice[0];

        const lineItems: OrderLineItem[] = itemsInInvoice.map((item, index) => {
          const qtyVal = safeParseFloat(item.Qty); // Using item.Qty for both ordered and shipped
          const unitNet = safeParseFloat(item.unitnet);
          const extendedNet = qtyVal * unitNet; // Calculate extendedNet directly
          return {
            lineKey: item.linekey || `${item.invoicenumber}-${index}`,
            qtyOrdered: qtyVal, // Derived from Qty
            qtyShipped: qtyVal, // Derived from Qty
            partNumber: item.model ?? 'N/A',
            description: item.Description ?? 'N/A',
            unitNet: unitNet,
            extendedNet: extendedNet,
          };
        });

        const subtotal = lineItems.reduce((sum, item) => sum + item.extendedNet, 0);
        const shippingChargesVal = safeParseFloat(firstItem.ups); // Mapped from ups
        const paymentsReceivedVal = safeParseFloat(firstItem.payments); // Mapped from payments
        const interestChargesVal = 0; // Defaulted to 0
        
        return {
          invoiceNumber: String(firstItem.invoicenumber),
          accountNumber: String(firstItem.accountnumber),
          invoiceDate: formatDate(firstItem.invoicedate),
          terms: firstItem.terms ?? 'N/A',
          salesRep: firstItem.salesman ?? 'N/A',
          // customerPO: firstItem.customerpo || undefined, // Removed
          billToAddress: billToAddress,
          shipToAddress: null, // Set to null as per original working fix
          lineItems: lineItems,
          subtotal: subtotal,
          shippingCharges: shippingChargesVal,
          paymentsReceived: paymentsReceivedVal,
          interestCharges: interestChargesVal, 
          totalAmountDue: subtotal + shippingChargesVal - paymentsReceivedVal + interestChargesVal, // Calculated
        };
      });
      
      // Sort orders by invoice date descending (most recent first)
      const sortedOrders = processedOrders.sort((a, b) => {
        const dateA = new Date(a.invoiceDate);
        const dateB = new Date(b.invoiceDate);
        return dateB.getTime() - dateA.getTime();
      });
      
      setOrders(sortedOrders);

    } catch (err: any) {
      console.error('[OrderHistory] Unexpected error in fetchOrderHistoryDetails:', err);
      setError(err.message || 'An unexpected error occurred.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.accountNumber) {
      fetchOrderHistoryDetails(user.accountNumber);
    } else {
      if (user === null) { 
         setLoading(false);
         setOrders([]);
      } else if (user === undefined) { 
      }
    }
  }, [user, fetchOrderHistoryDetails]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading order history...</div>;
  if (error) return <div className="p-6 text-red-600 text-center">Error: {error}</div>;
  if (!user) return <div className="p-6 text-center text-gray-500">Please log in to view order history.</div>;
  if (orders.length === 0) return <div className="p-6 text-center text-gray-500">No order history found for account {user.accountNumber}.</div>;

  const handleReorder = async (order: FullOrderDetails) => {
    const warnings: {[key: string]: boolean} = {};
    let hasWarnings = false;
    let addedItems = 0;
    
    try {
      // First ensure local storage is working
      const testStorage = () => {
        try {
          localStorage.setItem('cart_test', 'test');
          const test = localStorage.getItem('cart_test');
          localStorage.removeItem('cart_test');
          return test === 'test';
        } catch (e) {
          console.error('Local storage test failed:', e);
          return false;
        }
      };
      
      if (!testStorage()) {
        showNotification('error', 'Browser storage is not available. Please enable cookies and try again.');
        return false;
      }
      
      
      // Check inventory for each line item
      for (const item of order.lineItems) {
        try {
          
          // Try case-sensitive search first
          let { data, error } = await supabase
            .from('products')
            .select('inventory, price, description, partnumber')
            .eq('partnumber', item.partNumber)
            .single();
          
          // If not found, try case-insensitive search
          if (error || !data) {
            const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
              .from('products')
              .select('inventory, price, description, partnumber')
              .ilike('partnumber', item.partNumber)
              .single();
              
            if (!caseInsensitiveError && caseInsensitiveData) {
              data = caseInsensitiveData;
              error = null;
            }
          }
          
          let inventory = 0;
          let productToAdd;
          
          if (error || !data) {
            // Use fallback data from the order if database lookup fails
            productToAdd = {
              partnumber: item.partNumber,
              description: item.description,
              price: item.unitNet,
              inventory: 0 // Assume no inventory as a fallback
            };
            hasWarnings = true;
            warnings[item.lineKey] = true;
          } else {
            // Use data from the database
            inventory = data.inventory || 0;
            
            // Only set warning if we don't have enough inventory (but we have some)
            if (inventory > 0 && inventory < item.qtyOrdered) {
              warnings[item.lineKey] = true;
              hasWarnings = true;
            } else if (inventory === 0) {
              warnings[item.lineKey] = true;
              hasWarnings = true;
            } else {
            }
            
            productToAdd = {
              partnumber: data.partnumber || item.partNumber,
              description: data.description || item.description,
              price: data.price || item.unitNet,
              inventory: inventory
            };
          }
          
          
          // Add item to cart regardless of inventory
          addToCart(productToAdd, item.qtyOrdered);
          addedItems++;
          
          // Force a small delay to ensure state updates properly
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error processing item ${item.partNumber}:`, err);
        }
      }
      
      // Update inventory warnings state
      setInventoryWarnings(warnings);
      
      // If successful (even with warnings), show appropriate notification
      if (addedItems === 0) {
        showNotification('error', 'No items could be added to your cart.');
        return false;
      } else if (hasWarnings) {
        showNotification('warning', `${addedItems} item(s) added to your cart. NOTE: Not enough inventory available for some items.`);
      } else {
        showNotification('success', `${addedItems} item(s) have been added to your cart.`);
      }
      
      // No need to manually save to localStorage - CartContext handles this
      
      // Use programmatic navigation or a controlled way to return to Dashboard
      // Wait for 3 seconds to give users time to read the notification before redirecting
      setTimeout(() => {
        window.location.href = '/?cart=open';
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Error in reorder process:', error);
      showNotification('error', 'An error occurred while processing your order. Please try again.');
      return false;
    }
  };

  const handlePrint = (order: FullOrderDetails) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('error', 'Please allow pop-ups to print invoices');
      return;
    }

    // Generate the HTML content for the invoice
    let content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice #${order.invoiceNumber}</title>
          <style>
            @media print {
              @page {
                size: 8.5in 11in;
                margin: 0.5in;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: 10pt;
                color: #000;
              }
              .invoice-box {
                width: 100%;
                max-width: 100%;
                margin: auto;
                padding: 0;
                background-color: #fff;
              }
              .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 2px solid #000;
              }
              .company-details h2 {
                margin: 0 0 5px 0;
                font-size: 16pt;
                font-weight: bold;
                color: #000080;
              }
              .company-details p {
                margin: 2px 0;
                font-size: 10pt;
              }
              .invoice-info {
                text-align: right;
              }
              .invoice-info h1 {
                margin: 0 0 10px 0;
                font-size: 18pt;
                font-weight: bold;
              }
              .invoice-info p {
                margin: 2px 0;
                font-size: 10pt;
              }
              .bill-to {
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 1px solid #000;
              }
              .bill-to p {
                margin: 2px 0;
                font-size: 10pt;
              }
              .bill-to strong {
                font-weight: bold;
                font-style: italic;
              }
              .line-items table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
              }
              .line-items th, .line-items td {
                border: 1px solid #000;
                padding: 4px 6px;
                text-align: left;
                font-size: 9pt;
              }
              .line-items th {
                background-color: #000;
                color: #fff;
                font-weight: bold;
                text-align: center;
              }
              .line-items .desc-header {
                width: 40%;
              }
              .line-items .text-right {
                text-align: right;
                padding-right: 8px;
              }
              .line-items th, .line-items td {
                overflow: visible;
                white-space: normal;
                word-wrap: break-word;
              }
              .summary-section {
                display: flex;
                justify-content: flex-end;
                align-items: flex-start;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #000;
              }
              .totals {
                width: 40%;
                margin-left: auto;
              }
              .totals table {
                width: 100%;
                border-collapse: collapse;
              }
              .totals td {
                padding: 3px 6px;
                font-size: 10pt;
                border: none;
              }
              .totals .label {
                text-align: right;
                font-style: italic;
                width: 70%;
              }
              .totals .amount {
                text-align: right;
                font-weight: bold;
              }
              .totals .total-due-label {
                font-weight: bold;
                font-size: 10pt;
                font-style: normal;
              }
              .totals .total-due-amount {
                font-weight: bold;
                font-size: 10pt;
                color: #FF0000;
              }
              .no-print {
                display: none;
              }
              .print-button {
                position: absolute;
                bottom: 20px;
                left: 20px;
                padding: 5px 10px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }
            }
          </style>
      </head>
      <body onload="window.print(); window.setTimeout(window.close, 0);">
          <div class="invoice-box">
              <header class="invoice-header">
                  <div class="company-details">
                      <h2>${CompanyInfo.name}</h2>
                      <p>${CompanyInfo.address1}</p>
                      <p>${CompanyInfo.cityStateZip}</p>
                      <p>${CompanyInfo.phone}</p>
                      <p>Reply to: <a href="mailto:${CompanyInfo.email}">${CompanyInfo.email}</a></p>
                  </div>
                  <div class="invoice-info">
                      <h1>Invoice Number: ${order.invoiceNumber}</h1>
                      <p>Acct No.: ${order.accountNumber}</p>
                      <p>Invoice Date: ${order.invoiceDate}</p>
                      <p>Terms: ${order.terms}</p>
                      <p>Sales Rep: ${order.salesRep}</p>
                  </div>
              </header>

              <section class="bill-to">
                  <p><strong>Bill To:</strong></p>
                  ${order.billToAddress ? `
                    <p>${order.billToAddress.name}</p>
                    ${order.billToAddress.attn ? `<p>Attn: ${order.billToAddress.attn}</p>` : ''}
                    <p>${order.billToAddress.address1}</p>
                    ${order.billToAddress.address2 ? `<p>${order.billToAddress.address2}</p>` : ''}
                    <p>${order.billToAddress.city}, ${order.billToAddress.state} ${order.billToAddress.zip}</p>
                    ${order.billToAddress.phone ? `<p>Phone: ${order.billToAddress.phone}</p>` : ''}
                  ` : '<p>N/A</p>'}
              </section>

              <section class="line-items">
                  <table>
                      <thead>
                          <tr>
                              <th>Qty Ord</th>
                              <th>Qty Shp</th>
                              <th>Part Number</th>
                              <th class="desc-header">Description</th>
                              <th class="text-right">Unit Net</th>
                              <th class="text-right">Extended Net</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${order.lineItems.map(item => `
                            <tr>
                                <td>${item.qtyOrdered}</td>
                                <td>${item.qtyShipped}</td>
                                <td>${item.partNumber}</td>
                                <td>${item.description}</td>
                                <td class="text-right">$${item.unitNet.toFixed(2)}</td>
                                <td class="text-right">$${item.extendedNet.toFixed(2)}</td>
                            </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </section>

              <section class="summary-section">
                  <div class="totals">
                      <table>
                          <tr>
                              <td class="label">Subtotal:</td>
                              <td class="amount">$${order.subtotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                              <td class="label">Shipping Charges:</td>
                              <td class="amount">$${order.shippingCharges.toFixed(2)}</td>
                          </tr>
                          ${order.paymentsReceived !== 0 ? `
                            <tr>
                                <td class="label">Payments Received:</td>
                                <td class="amount">($${Math.abs(order.paymentsReceived).toFixed(2)})</td>
                            </tr>
                          ` : ''}
                          ${order.interestCharges !== 0 ? `
                            <tr>
                                <td class="label">Interest Charges on Overdue Invoice:</td>
                                <td class="amount">$${order.interestCharges.toFixed(2)}</td>
                            </tr>
                          ` : ''}
                          <tr>
                              <td class="label total-due-label">TOTAL AMOUNT DUE:</td>
                              <td class="amount total-due-amount">$${order.totalAmountDue.toFixed(2)}</td>
                          </tr>
                      </table>
                  </div>
              </section>
              
              <button class="print-button" onclick="window.print()">Print Invoice</button>
          </div>
      </body>
      </html>
    `;

    // Write the content to the new window and print it
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
      <div className="flex items-center mb-8">
        <img src={LogoImage} alt="Music Supplies Logo" className="h-16 mr-4" />
        <h1 className="text-3xl font-bold text-gray-800 flex-1 text-center">Order History</h1>
      </div>
      <div className="space-y-8 max-w-5xl mx-auto">
        {orders.map((order) => (
          <div key={order.invoiceNumber} className="bg-white shadow-lg rounded-lg p-6 sm:p-8 relative">
            {/* Print button positioned in lower left corner */}
            <button 
              onClick={() => handlePrint(order)}
              className="absolute bottom-3 left-3 flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 text-sm"
            >
              <FaPrint className="mr-1" /> Print
            </button>
            
            {/* Header with company and invoice info */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-2xl font-bold text-blue-700">{CompanyInfo.name}</h2>
                <p className="text-sm text-gray-600">{CompanyInfo.address1}</p>
                <p className="text-sm text-gray-600">{CompanyInfo.cityStateZip}</p>
                <p className="text-sm text-gray-600">{CompanyInfo.phone}</p>
                <p className="text-sm text-gray-600">
                  Reply to: <a href={`mailto:${CompanyInfo.email}`} className="text-blue-600 hover:underline">{CompanyInfo.email}</a>
                </p>
              </div>
              <div className="text-sm text-gray-700 sm:text-right">
                <h3 className="text-xl font-bold mb-2">Invoice Number: {order.invoiceNumber}</h3>
                <p><strong>Acct No.:</strong> {order.accountNumber}</p>
                <p><strong>Invoice Date:</strong> {order.invoiceDate}</p>
                <p><strong>Terms:</strong> {order.terms}</p>
                <p><strong>Sales Rep:</strong> {order.salesRep}</p>
              </div>
            </div>

            {/* Bill To section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 pb-6 border-b">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Bill To:</h4>
                {order.billToAddress ? (
                  <>
                    <p>{order.billToAddress.name}</p>
                    {order.billToAddress.attn && <p>Attn: {order.billToAddress.attn}</p>}
                    <p>{order.billToAddress.address1}</p>
                    {order.billToAddress.address2 && <p>{order.billToAddress.address2}</p>}
                    <p>{order.billToAddress.city}, {order.billToAddress.state} {order.billToAddress.zip}</p>
                    {order.billToAddress.phone && <p>Phone: {order.billToAddress.phone}</p>}
                  </>
                ) : <p>N/A</p>}
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left font-semibold text-gray-600">Qty Ord</th>
                    <th className="p-2 text-left font-semibold text-gray-600">Qty Shp</th>
                    <th className="p-2 text-left font-semibold text-gray-600">Part Number</th>
                    <th className="p-2 text-left font-semibold text-gray-600 w-2/5">Description</th>
                    <th className="p-2 text-right font-semibold text-gray-600">Unit Net</th>
                    <th className="p-2 text-right font-semibold text-gray-600">Extended Net</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((item) => (
                    <tr 
                      key={item.lineKey} 
                      className={`border-b last:border-b-0 ${inventoryWarnings[item.lineKey] ? 'bg-red-100' : ''}`}
                    >
                      <td className="p-2">{item.qtyOrdered}</td>
                      <td className="p-2">{item.qtyShipped}</td>
                      <td className="p-2">{item.partNumber}</td>
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">${item.unitNet.toFixed(2)}</td>
                      <td className="p-2 text-right">${item.extendedNet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons and totals */}
            <div className="flex flex-col md:flex-row justify-between items-start">
              {/* Print and reorder buttons */}
              <div className="flex space-x-2 mb-4 md:mb-0">
                <button 
                  onClick={() => handlePrint(order)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150"
                >
                  <FaPrint className="mr-2" /> Print Invoice
                </button>
                <button 
                  onClick={() => handleReorder(order)}
                  className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-150"
                >
                  <FaShoppingCart className="mr-2" /> Reorder
                </button>
              </div>
              
              {/* Order totals */}
              <div className="w-full md:w-1/3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-semibold">${order.shippingCharges.toFixed(2)}</span>
                  </div>
                  {order.paymentsReceived !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payments Received:</span>
                      <span className="font-semibold text-green-600">(${Math.abs(order.paymentsReceived).toFixed(2)})</span>
                    </div>
                  )}
                  {order.interestCharges !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Charges:</span>
                      <span className="font-semibold">${order.interestCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-800 font-semibold">Total Due:</span>
                    <span className="font-bold text-red-600">${order.totalAmountDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;

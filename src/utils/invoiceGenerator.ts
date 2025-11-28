import { CartItem } from '../types';

export interface InvoiceData {
  orderNumber: string;
  accountNumber?: string;
  invoiceDate: string;
  terms: string;
  salesRep: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: {
    line1?: string;
    cityStateZip?: string;
  };
  shippingAddress?: {
    name?: string;
    line1?: string;
    cityStateZip?: string;
  };
  items: CartItem[];
  subtotal: number;
  shippingCharges?: number;
  paymentsReceived?: number;
  interestCharges?: number;
  promoCodeDiscount?: number;
  promoCodeDescription?: string;
  totalAmountDue: number;
  paymentMethod: 'credit' | 'net10';
}

export interface CompanyInfo {
  name: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  logoPlaceholder?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "Lou Capece Music Distributors",
  address: "2555 North Jerusalem Rd.",
  cityStateZip: "East Meadow, NY 11554",
  phone: "Toll Free 1(800) 321-5584",
  email: "marketing@loucapecemusic.com",
  logoPlaceholder: "[COMPANY LOGO]"
};

export function generateInvoiceHTML(invoiceData: InvoiceData, companyInfo: CompanyInfo = defaultCompanyInfo): string {
  const {
    orderNumber,
    accountNumber,
    invoiceDate,
    terms,
    salesRep,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    shippingAddress,
    items,
    subtotal,
    shippingCharges = 0,
    paymentsReceived = 0,
    interestCharges = 0,
    promoCodeDiscount = 0,
    promoCodeDescription,
    totalAmountDue,
    paymentMethod
  } = invoiceData;

  // Fix order number display - ensure single WB prefix for web orders
  const orderNum = parseInt(orderNumber.replace(/[^\d]/g, ''));
  const isWebOrder = orderNum >= 750000 && orderNum <= 770000;
  const displayLabel = isWebOrder ? "WEB ORDER" : "INVOICE";
  // Fix: Don't add WB if orderNumber already contains it
  const displayNumber = isWebOrder ? 
    (orderNumber.startsWith('WB') ? orderNumber : `WB${orderNumber}`) : 
    orderNumber;

  // Generate line items HTML with EMAIL-SAFE inline styling
  const lineItemsHTML = items.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
      <td style="padding: 6px; border: 1px solid #000; text-align: center; font-size: 10px;">${item.quantity}</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: center; font-size: 10px;">${item.quantity}</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: left; font-size: 10px;">${item.partnumber}</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: left; font-size: 10px;">${item.description || ''}</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: right; font-size: 10px;">$${(item.price || 0).toFixed(2)}</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: right; font-size: 10px;">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Add empty rows for consistent layout (minimum 12 rows total for professional appearance)
  const emptyRowsNeeded = Math.max(0, 12 - items.length);
  const emptyRowsHTML = Array(emptyRowsNeeded).fill(0).map((_, index) => `
    <tr style="background-color: ${(items.length + index) % 2 === 0 ? '#ffffff' : '#f9f9f9'}; height: 20px;">
      <td style="padding: 6px; border: 1px solid #000; text-align: center; font-size: 10px;">&nbsp;</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: center; font-size: 10px;">&nbsp;</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: left; font-size: 10px;">&nbsp;</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: left; font-size: 10px;">&nbsp;</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: right; font-size: 10px;">&nbsp;</td>
      <td style="padding: 6px; border: 1px solid #000; text-align: right; font-size: 10px;">&nbsp;</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Number: ${orderNumber}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; color: #000; line-height: 1.4; font-size: 12px;">

    <!-- MAIN CONTAINER TABLE - EMAIL SAFE -->
    <table style="width: 100%; max-width: 800px; margin: 0 auto; background: white; border-collapse: collapse;" cellpadding="0" cellspacing="0">
        
        <!-- HEADER SECTION -->
        <tr>
            <td style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <!-- COMPANY INFO -->
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                                MusicSupplies<span style="color: #dc3545;">Supplies</span>.com
                            </div>
                            <h1 style="font-size: 18px; font-weight: bold; color: #2c5aa0; margin: 15px 0;">
                                ${companyInfo.name}
                            </h1>
                            <div style="font-size: 11px; color: #333; line-height: 1.5;">
                                <div>${companyInfo.address}</div>
                                <div>${companyInfo.cityStateZip}</div>
                                <div>${companyInfo.phone}</div>
                                <div>Reply to: ${companyInfo.email}</div>
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                            <!-- INVOICE META -->
                            <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 15px; color: #4a90a4;">
                                ${displayLabel}
                            </h2>
                            <div style="font-size: 11px; margin: 3px 0; color: #333;">
                                <strong>Invoice Number:</strong> ${displayNumber}
                            </div>
                            ${accountNumber ? `<div style="font-size: 11px; margin: 3px 0; color: #333;"><strong>Acct No.:</strong> ${accountNumber}</div>` : ''}
                            <div style="font-size: 11px; margin: 3px 0; color: #333;">
                                <strong>Invoice Date:</strong> ${invoiceDate}
                            </div>
                            <div style="font-size: 11px; margin: 3px 0; color: #333;">
                                <strong>Terms:</strong> ${terms}
                            </div>
                            <div style="font-size: 11px; margin: 3px 0; color: #333;">
                                <strong>Sales Rep:</strong> ${salesRep}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- PROFORMA WARNING (if no shipping) -->
        ${(!shippingCharges || shippingCharges === 0) ? `
        <tr>
            <td style="padding: 0 20px;">
                <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 2px solid #dc3545;">
                    <h2 style="color: #dc3545; font-weight: bold; margin: 0; font-size: 18px;">
                        PROFORMA INVOICE - SHIPPING NOT YET CALCULATED
                    </h2>
                </div>
            </td>
        </tr>
        ` : ''}

        <!-- CUSTOMER SECTIONS -->
        <tr>
            <td style="padding: 0 20px;">
                <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width: 48%; vertical-align: top;">
                            <!-- BILL TO -->
                            <div style="padding: 12px; border: 2px solid #000; min-height: 120px;">
                                <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-decoration: underline;">
                                    Bill To:
                                </h3>
                                <div style="font-size: 11px; line-height: 1.4;">
                                    <div><strong>${customerName}</strong></div>
                                    ${customerAddress?.line1 ? `<div>${customerAddress.line1}</div>` : ''}
                                    ${customerAddress?.cityStateZip ? `<div>${customerAddress.cityStateZip}</div>` : ''}
                                    <div>Email: ${customerEmail}</div>
                                    <div>Phone: ${customerPhone}</div>
                                </div>
                            </div>
                        </td>
                        <td style="width: 4%;"></td> <!-- SPACER -->
                        <td style="width: 48%; vertical-align: top;">
                            <!-- SHIP TO -->
                            <div style="padding: 12px; border: 2px solid #000; min-height: 120px;">
                                <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 8px; text-decoration: underline;">
                                    Ship To:
                                </h3>
                                <div style="font-size: 11px; line-height: 1.4;">
                                    ${shippingAddress && shippingAddress.line1 ? `
                                        <div><strong>${shippingAddress.name || customerName}</strong></div>
                                        <div>${shippingAddress.line1}</div>
                                        <div>${shippingAddress.cityStateZip || ''}</div>
                                    ` : `
                                        <div>N/A</div>
                                    `}
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- ITEMS TABLE -->
        <tr>
            <td style="padding: 0 20px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;" cellpadding="0" cellspacing="0">
                    <!-- TABLE HEADER -->
                    <thead>
                        <tr style="background: #4a90a4; color: white;">
                            <th style="padding: 8px 6px; text-align: center; font-weight: bold; border: 1px solid #000; font-size: 10px;">Qty Ord</th>
                            <th style="padding: 8px 6px; text-align: center; font-weight: bold; border: 1px solid #000; font-size: 10px;">Qty Shp</th>
                            <th style="padding: 8px 6px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 10px;">Part Number</th>
                            <th style="padding: 8px 6px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 10px;">Description</th>
                            <th style="padding: 8px 6px; text-align: right; font-weight: bold; border: 1px solid #000; font-size: 10px;">Unit Net</th>
                            <th style="padding: 8px 6px; text-align: right; font-weight: bold; border: 1px solid #000; font-size: 10px;">Extended Net</th>
                        </tr>
                    </thead>
                    <!-- TABLE BODY -->
                    <tbody>
                        ${lineItemsHTML}
                        ${emptyRowsHTML}
                    </tbody>
                </table>
            </td>
        </tr>

        <!-- TOTALS SECTION -->
        <tr>
            <td style="padding: 0 20px;">
                <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="width: 30%; vertical-align: top;">
                            <!-- DISCOUNT BOX -->
                            <div style="border: 2px dashed #000; padding: 15px; text-align: center; height: 80px;">
                                ${promoCodeDiscount > 0 && promoCodeDescription ? `
                                    <div style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">${promoCodeDescription}</div>
                                    <div style="font-size: 10px; font-weight: bold;">Discount: $${promoCodeDiscount.toFixed(2)}</div>
                                ` : `
                                    <div style="font-size: 10px; font-weight: bold;">&nbsp;</div>
                                    <div style="font-size: 10px; font-weight: bold;">&nbsp;</div>
                                `}
                            </div>
                        </td>
                        <td style="width: 20%;"></td> <!-- SPACER -->
                        <td style="width: 50%; vertical-align: top;">
                            <!-- TOTALS TABLE -->
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold; width: 60%;">Subtotal:</td>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold; width: 40%;">$${subtotal.toFixed(2)}</td>
                                </tr>
                                ${shippingCharges > 0 ? `
                                <tr>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold;">Shipping:</td>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold;">$${shippingCharges.toFixed(2)}</td>
                                </tr>` : ''}
                                ${paymentsReceived > 0 ? `
                                <tr>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold;">Payments Received:</td>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold;">($${paymentsReceived.toFixed(2)})</td>
                                </tr>` : ''}
                                <tr style="background: white;">
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold; font-size: 14px;">Total Due:</td>
                                    <td style="padding: 6px 12px; border: 1px solid #000; text-align: right; font-weight: bold; font-size: 14px;">$${totalAmountDue.toFixed(2)}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- PAYMENT METHOD SECTION -->
        <tr>
            <td style="padding: 0 20px;">
                <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #000;">
                    <strong>Payment Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</strong>
                    ${paymentMethod === 'net10' ? '<br>Payment due within 10 days of invoice date.' : ''}
                </div>
            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="padding: 0 20px;">
                <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #333;">
                    <div>Thank you for your business!</div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}

export function generateInvoiceText(invoiceData: InvoiceData, companyInfo: CompanyInfo = defaultCompanyInfo): string {
  const {
    orderNumber,
    accountNumber,
    invoiceDate,
    terms,
    salesRep,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    shippingAddress,
    items,
    subtotal,
    shippingCharges = 0,
    promoCodeDiscount = 0,
    promoCodeDescription,
    totalAmountDue,
    paymentMethod
  } = invoiceData;

  // Determine if this is a web order (750000-770000 range)  
  const orderNum = parseInt(orderNumber.replace(/[^\d]/g, ''));
  const isWebOrder = orderNum >= 750000 && orderNum <= 770000;
  const displayNumber = isWebOrder ? `WB${orderNumber}` : orderNumber;

  // Helper function to format currency consistently
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  let invoice = '';

  // Header - Order Details
  invoice += '=========================================\n';
  invoice += `Order Details - ${orderNumber}\n`;
  invoice += '=========================================\n\n';

  // Order Information Section
  invoice += `Order Date                    Payment Method\n`;
  invoice += `${invoiceDate}${' '.repeat(20)}${paymentMethod === 'credit' ? 'Credit Card' : 'Net-10'}\n\n`;
  
  invoice += `Customer Email                Customer Phone\n`;
  invoice += `${customerEmail}${' '.repeat(20)}${customerPhone}\n\n`;
  
  if (accountNumber) {
    invoice += `Account Number                Promo Code Used\n`;
    invoice += `${accountNumber}${' '.repeat(20)}${promoCodeDescription || 'None'}\n\n`;
  } else if (promoCodeDescription) {
    invoice += `Promo Code Used\n`;
    invoice += `${promoCodeDescription}\n\n`;
  }

  // Order Items Section
  invoice += 'Order Items\n';
  invoice += '-'.repeat(75) + '\n';
  invoice += 'PART NUMBER       DESCRIPTION                           QTY    PRICE     TOTAL\n';
  invoice += '-'.repeat(75) + '\n';

  // Regular items
  items.forEach(item => {
    const partNum = item.partnumber.padEnd(16, ' ');
    const desc = (item.description || '').padEnd(36, ' ');
    const qty = String(item.quantity).padStart(3, ' ');
    const price = formatCurrency(item.price || 0).padStart(8, ' ');
    const total = formatCurrency((item.price || 0) * item.quantity).padStart(9, ' ');
    
    invoice += `${partNum} ${desc} ${qty} ${price} ${total}\n`;
  });

  // Add promo code discount line if applicable
  if (promoCodeDiscount > 0 && promoCodeDescription) {
    const partNum = promoCodeDescription.padEnd(16, ' ');
    const desc = `Discount: ${promoCodeDescription}`.padEnd(36, ' ');
    const qty = '1'.padStart(3, ' ');
    const price = formatCurrency(-promoCodeDiscount).padStart(8, ' ');
    const total = formatCurrency(-promoCodeDiscount).padStart(9, ' ');
    
    invoice += `${partNum} ${desc} ${qty} ${price} ${total}\n`;
  }

  invoice += '\n';

  // Totals Section
  invoice += `Subtotal:${formatCurrency(subtotal).padStart(65, ' ')}\n`;
  
  if (shippingCharges > 0) {
    invoice += `Shipping:${formatCurrency(shippingCharges).padStart(65, ' ')}\n`;
  }
  
  if (promoCodeDiscount > 0) {
    invoice += `Discount:${formatCurrency(-promoCodeDiscount).padStart(65, ' ')}\n`;
  }
  
  invoice += '-'.repeat(75) + '\n';
  invoice += `Total:${formatCurrency(totalAmountDue).padStart(68, ' ')}\n`;

  invoice += '\n';
  invoice += '=========================================\n';
  
  // Company Info Footer
  invoice += `${companyInfo.name}\n`;
  invoice += 'MusicSupplies.com\n';
  invoice += `${companyInfo.address}\n`;
  invoice += `${companyInfo.cityStateZip}\n`;
  invoice += `${companyInfo.phone}\n`;
  invoice += `Reply to: ${companyInfo.email}\n`;
  
  invoice += '\nThank you for your business!\n';
  invoice += '=========================================';

  return invoice;
}

export function createInvoiceDataFromOrder(
  orderNumber: string,
  items: CartItem[],
  email: string,
  phone: string,
  paymentMethod: 'credit' | 'net10',
  appliedPromoCode?: { discount_amount: number; message?: string; code?: string },
  customerInfo?: { 
    name?: string; 
    accountNumber?: string;
    address?: { line1?: string; cityStateZip?: string };
    shippingAddress?: { name?: string; line1?: string; cityStateZip?: string };
  }
): InvoiceData {
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const promoDiscount = appliedPromoCode?.discount_amount || 0;
  const totalAmountDue = subtotal - promoDiscount;

  return {
    orderNumber,
    accountNumber: customerInfo?.accountNumber,
    invoiceDate: new Date().toLocaleDateString(),
    terms: paymentMethod === 'net10' ? 'Net 10' : 'Credit Card',
    salesRep: 'Online Order',
    customerName: customerInfo?.name || email.split('@')[0], // Use email prefix if no name provided
    customerEmail: email,
    customerPhone: phone,
    customerAddress: customerInfo?.address,
    shippingAddress: customerInfo?.shippingAddress,
    items,
    subtotal,
    promoCodeDiscount: promoDiscount,
    promoCodeDescription: appliedPromoCode?.code,
    totalAmountDue,
    paymentMethod
  };
}

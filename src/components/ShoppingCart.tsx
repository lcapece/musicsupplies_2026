import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PromoCodeValidity, AvailablePromoCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard, Trash2, RefreshCw } from 'lucide-react';
import OrderConfirmationModal from './OrderConfirmationModal';
import { OrderConfirmationDetails } from '../types';
import { supabase } from '../lib/supabase';
import { createInvoiceDataFromOrder, generateInvoiceHTML, generateInvoiceText } from '../utils/invoiceGenerator';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    updateBackorderQuantity,
    totalItems, 
    totalPrice, 
    clearCart, 
    placeOrder, 
    applyPromoCode,
    removePromoCode,
    appliedPromoCode,
    availablePromoCodes,
    fetchAvailablePromoCodes,
    isLoadingPromoCodes,
    isPromoCodeAutoApplied,
    // NEW: Auto-applied promo functionality
    appliedPromoCodes,
    autoAppliedPromoItems,
    qualifyingSubtotal,
    // NEW: Cancel order function
    cancelOrderWithConfirmation
  } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderConfirmationDetails, setOrderConfirmationDetails] = useState<OrderConfirmationDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('net10');
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoadingContactInfo, setIsLoadingContactInfo] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    phone?: boolean;
    email?: boolean;
    emailFormat?: boolean;
  }>({});
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const [poReference, setPoReference] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Shipping address state
  const [shippingDifferent, setShippingDifferent] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingContactName, setShippingContactName] = useState('');

  // Format phone number as 999-999-9999
  const formatPhoneNumber = (value: string): string => {
    // Strip all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format the phone number as 999-999-9999
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };
  
  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };
  
  // Promo code states
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [applyingPromo, setApplyingPromo] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showPromoWarning, setShowPromoWarning] = useState<boolean>(false);
  
  // Modal drag functionality - positioned within shopping cart content area
  const [modalPosition, setModalPosition] = useState({ x: 50, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Handle modal dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Constrain within shopping cart content boundaries (relative positioning)
    const constrainedX = Math.max(10, Math.min(newX, 300)); // Keep within cart content width
    const constrainedY = Math.max(50, Math.min(newY, 400)); // Keep within cart content height
    
    setModalPosition({ x: constrainedX, y: constrainedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, modalPosition]);
  
  // Enhanced contact info loading from multiple sources
  useEffect(() => {
    const loadContactInfo = async () => {
      if (isOpen && user && user.accountNumber) {
        setIsLoadingContactInfo(true);
        
        try {
          // First, use data from user object
          let bestEmail = user.email || user.email_address || '';
          let bestPhone = user.mobile_phone || user.phone || '';
          
          // Then, try to get more current contact info from contactinfo table
          const { data: contactInfo, error: contactError } = await supabase
            .from('contactinfo')
            .select('email_address, business_phone, mobile_phone')
            .eq('account_number', parseInt(user.accountNumber, 10))
            .single();
          
          if (!contactError && contactInfo) {
            // Use contactinfo table data if available and not empty
            if (contactInfo.email_address && contactInfo.email_address.trim()) {
              bestEmail = contactInfo.email_address.trim();
            }
            
            // Prefer mobile_phone over business_phone for checkout
            if (contactInfo.mobile_phone && contactInfo.mobile_phone.trim()) {
              bestPhone = contactInfo.mobile_phone.trim();
            } else if (contactInfo.business_phone && contactInfo.business_phone.trim() && !bestPhone) {
              bestPhone = contactInfo.business_phone.trim();
            }
          }
          
          // Also check accounts_lcmd table for most current data
          const { data: accountData, error: accountError } = await supabase
            .from('accounts_lcmd')
            .select('email_address, phone, mobile_phone')
            .eq('account_number', parseInt(user.accountNumber, 10))
            .single();
          
          if (!accountError && accountData) {
            // Use the most recent data from accounts_lcmd if available
            if (accountData.email_address && accountData.email_address.trim()) {
              bestEmail = accountData.email_address.trim();
            }
            
            // Prefer mobile_phone for checkout
            if (accountData.mobile_phone && accountData.mobile_phone.trim()) {
              bestPhone = accountData.mobile_phone.trim();
            } else if (accountData.phone && accountData.phone.trim() && !bestPhone) {
              bestPhone = accountData.phone.trim();
            }
          }
          
          console.log('Contact info loaded:', { bestEmail, bestPhone });
          setEmail(bestEmail);
          setPhone(bestPhone ? formatPhoneNumber(bestPhone) : '');
          
        } catch (error) {
          console.error('Error loading contact info:', error);
          // Fallback to user object data
          setEmail(user.email || user.email_address || '');
          setPhone(user.mobile_phone || user.phone || '');
        } finally {
          setIsLoadingContactInfo(false);
        }
      } else if (isOpen && user) {
        // No account number, just use user object data
        setEmail(user.email || user.email_address || '');
        setPhone(user.mobile_phone || user.phone || '');
      }
    };
    
    if (isOpen) {
      loadContactInfo();
    } else {
      setIsCheckingOut(false);
      setOrderPlaced(false);
    }
  }, [isOpen, user]);

  // When available promo codes change, pre-select the best available one
  useEffect(() => {
    if (availablePromoCodes.length > 0) {
      // Filter to only available codes (not expired or unusable)
      const availableCodes = availablePromoCodes.filter(promo => 
        !promo.status || promo.status === 'available' || promo.status === 'min_not_met'
      );
      
      if (availableCodes.length > 0) {
        // Find the best available promo code (the one marked as is_best)
        const bestPromo = availableCodes.find(promo => promo.is_best);
        if (bestPromo) {
          setSelectedPromoCode(bestPromo.code);
        } else {
          // If no best code is marked, select the one with the highest discount
          const sortedPromos = [...availableCodes].sort((a, b) => b.discount_amount - a.discount_amount);
          if (sortedPromos.length > 0) {
            setSelectedPromoCode(sortedPromos[0].code);
          }
        }
      } else {
        setSelectedPromoCode('');
      }
    } else {
      setSelectedPromoCode('');
    }
  }, [availablePromoCodes]);

  const handleCheckout = () => {
    // Reset any previous validation errors
    setValidationErrors({});
    
    // First check if the phone number is provided
    if (!phone || phone.trim() === '') {
      setValidationErrors(prev => ({ ...prev, phone: true }));
      
      // Set isCheckingOut to true to show the checkout form with the phone field
      setIsCheckingOut(true);
      
      // After the component re-renders with the input field, focus on it
      setTimeout(() => {
        if (phoneInputRef.current) {
          phoneInputRef.current.focus();
        }
      }, 100);
      
      return;
    }
    
    // Check if there are available promo codes but none is applied
    const hasUnusedPromoCodes = availablePromoCodes.length > 0 && !appliedPromoCode;
    const hasEligiblePromoCodes = availablePromoCodes.some(promo => totalPrice >= promo.min_order_value);
    
    if (hasUnusedPromoCodes && hasEligiblePromoCodes) {
      setShowPromoWarning(true);
      return;
    }
    
    setIsCheckingOut(true);
  };
  
  const handleProceedWithoutPromo = () => {
    setShowPromoWarning(false);
    setIsCheckingOut(true);
  };
  
  const handleApplyBestPromoAndCheckout = async () => {
    setShowPromoWarning(false);
    
    // Find the best eligible promo code
    const bestEligiblePromo = availablePromoCodes.find(promo => 
      promo.is_best && totalPrice >= promo.min_order_value
    ) || availablePromoCodes.find(promo => 
      totalPrice >= promo.min_order_value
    );
    
    if (bestEligiblePromo) {
      try {
        const result = await applyPromoCode(bestEligiblePromo.code);
        if (result.is_valid) {
          console.log('Best promo code applied, proceeding to checkout');
        }
      } catch (error) {
        console.error('Error applying best promo code:', error);
      }
    }
    
    setIsCheckingOut(true);
  };
  
  const handlePlaceOrder = async () => {
    // Reset validation errors
    setValidationErrors({});
    
    // Validate fields
    let hasErrors = false;
    
    if (!phone) {
      setValidationErrors(prev => ({ ...prev, phone: true }));
      // Focus on the phone input field
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
      hasErrors = true;
    }
    
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: true }));
      hasErrors = true;
    } else if (!validateEmail(email)) {
      setValidationErrors(prev => ({ ...prev, emailFormat: true }));
      hasErrors = true;
    }
    
    if (hasErrors) {
      return;
    }
    
    try {
      const shippingAddressData = shippingDifferent ? {
        shippingDifferent,
        shippingAddress,
        shippingCity,
        shippingState, 
        shippingZip,
        shippingPhone,
        shippingContactName
      } : undefined;
      
      const newOrderNumber = await placeOrder(paymentMethod, email, phone, poReference, specialInstructions, shippingAddressData);
      
      setOrderConfirmationDetails({
        webOrderNumber: newOrderNumber,
        items: [...items], 
        total: appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount
          ? totalPrice - appliedPromoCode.discount_amount
          : totalPrice,
      });
      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);

      // Generate professional invoice using the new invoice generator
      try {
        console.log("Generating and sending invoice email to:", email);
        
        // Create invoice data from the order
        const invoiceData = createInvoiceDataFromOrder(
          newOrderNumber,
          items,
          email,
          phone,
          paymentMethod,
          appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount ? {
            discount_amount: appliedPromoCode.discount_amount,
            message: appliedPromoCode.message,
            code: appliedPromoCode.promo_id
          } : undefined,
          {
            name: user?.acctName || email.split('@')[0],
            accountNumber: user?.accountNumber,
            address: user?.address && user?.city && user?.state && user?.zip ? {
              line1: user.address,
              cityStateZip: `${user.city}, ${user.state} ${user.zip}`
            } : undefined,
            shippingAddress: shippingDifferent && shippingAddress ? {
              name: shippingContactName || user?.acctName || email.split('@')[0],
              line1: shippingAddress,
              cityStateZip: `${shippingCity}, ${shippingState} ${shippingZip}`
            } : undefined
          }
        );

        // Generate HTML and text versions of the invoice
        const invoiceHTML = generateInvoiceHTML(invoiceData);
        const invoiceText = generateInvoiceText(invoiceData);

        // Send the invoice email via Mailgun
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-mailgun-email', {
          body: {
            to: email,
            subject: `Invoice ${newOrderNumber} - Lou Capece Music Distributors`,
            html: invoiceHTML,
            text: invoiceText,
            testMode: false
          }
        });

        if (emailError) {
          console.error('Error sending invoice email:', emailError);
          // Don't fail the order if email fails, just log it
        } else {
          console.log('Invoice email sent successfully:', emailResult);
        }

      } catch (emailError) {
        console.error('Error generating or sending invoice email:', emailError);
        // Don't fail the order if email fails, just log it
      }

      // Send customer SMS notification
      if (phone) {
        try {
          console.log("Sending customer SMS notification to:", phone);
          
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-customer-sms', {
            body: {
              customerPhone: phone,
              orderNumber: newOrderNumber,
              customerName: user?.acctName || email.split('@')[0],
              orderAmount: displayGrandTotal.toFixed(2)
            }
          });

          if (smsError) {
            console.error('Error sending customer SMS:', smsError);
            // Log the SMS failure to database for admin notification
            try {
              const { error: logError } = await supabase
                .from('sms_notification_failures')
                .insert({
                  order_number: newOrderNumber,
                  customer_phone: phone,
                  customer_name: user?.acctName || email.split('@')[0],
                  customer_account_number: user?.accountNumber,
                  error_message: smsError.message || 'SMS sending failed'
                });
              
              if (logError) {
                console.error('Failed to log SMS error:', logError);
              }
            } catch (logError) {
              console.error('Error logging SMS failure:', logError);
            }
          } else {
            console.log('Customer SMS sent successfully:', smsResult);
          }

        } catch (smsError: any) {
          console.error('Error sending customer SMS notification:', smsError);
          // Log the SMS failure to database for admin notification
          try {
            const { error: logError } = await supabase
              .from('sms_notification_failures')
              .insert({
                order_number: newOrderNumber,
                customer_phone: phone,
                customer_name: user?.acctName || email.split('@')[0],
                customer_account_number: user?.accountNumber,
                error_message: smsError.message || 'SMS sending failed'
              });
            
            if (logError) {
              console.error('Failed to log SMS error:', logError);
            }
          } catch (logError) {
            console.error('Error logging SMS failure:', logError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };
  
  // Handle applying promo code
  const handleApplyPromoCode = async () => {
    if (!selectedPromoCode.trim()) {
      setPromoError('Please select a promo code first');
      return;
    }
    
    setApplyingPromo(true);
    setPromoError(null);
    
    try {
      console.log('Applying promo code:', selectedPromoCode.trim());
      const result = await applyPromoCode(selectedPromoCode.trim());
      
      if (!result.is_valid) {
        setPromoError(result.message || 'Invalid promo code');
        console.error('Promo code application failed:', result.message);
      } else {
        console.log('Promo code applied successfully:', result);
        setSelectedPromoCode(''); // Clear selection after successful application
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError('An error occurred while applying the promo code. Please try again.');
    } finally {
      setApplyingPromo(false);
    }
  };
  
  // Refresh available promo codes
  const handleRefreshPromoCodes = () => {
    fetchAvailablePromoCodes();
  };
  
  if (!isOpen) return null;

  // Calculate the total discount amount from all auto-applied promos
  const totalDiscountAmount = appliedPromoCodes.reduce((total, promo) => total + (promo.discount_amount || 0), 0);
    
  // Calculate the grand total after all discounts
  const displayGrandTotal = totalPrice - totalDiscountAmount;

  // Get the selected promo code details
  const selectedPromoDetails = availablePromoCodes.find(promo => promo.code === selectedPromoCode);
  
  const handleCloseConfirmationModal = () => {
    setOrderConfirmationDetails(null);
    setIsCheckingOut(false);
    clearCart(); 
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 overflow-hidden z-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-4xl">
            <div className="h-full flex flex-col bg-white shadow-xl relative">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6 relative">
                
                {/* Promo Code Warning Modal - Positioned within shopping cart content area */}
                {showPromoWarning && (
                  <div 
                    className="absolute bg-white rounded-lg shadow-2xl border-2 border-indigo-200 z-50 max-w-sm"
                    style={{
                      left: `${modalPosition.x}px`,
                      top: `${modalPosition.y}px`,
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
                  >
                    {/* Draggable header bar */}
                    <div 
                      className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center cursor-grab active:cursor-grabbing"
                      onMouseDown={handleMouseDown}
                    >
                      <h3 className="text-sm font-semibold select-none">
                        💰 Save Money with Promo Codes!
                      </h3>
                      <button
                        onClick={() => setShowPromoWarning(false)}
                        className="text-white hover:text-indigo-200 focus:outline-none"
                        title="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* Modal content */}
                    <div className="p-4">
                      <p className="text-gray-600 text-sm mb-3">
                        You have available promo codes that could save you money on this order. Apply the best discount before checking out?
                      </p>
                      
                      {availablePromoCodes.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-md">
                          <p className="text-xs text-blue-800">
                            <strong>Best Available:</strong> {availablePromoCodes.find(p => p.is_best)?.code || availablePromoCodes[0].code}
                            <br />
                            <span className="text-blue-600 font-semibold">
                              Save ${(availablePromoCodes.find(p => p.is_best)?.discount_amount || availablePromoCodes[0].discount_amount).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={handleApplyBestPromoAndCheckout}
                          className="flex-1 bg-green-600 text-white px-3 py-2 text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                          Apply & Checkout
                        </button>
                        <button
                          onClick={handleProceedWithoutPromo}
                          className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 text-sm rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                          Skip Discount
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <h2 className="text-4xl font-bold text-gray-900">Shopping Cart</h2>
                  <button
                    type="button"
                    className="ml-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close panel</span>
                    <X size={24} />
                  </button>
                </div>


                {orderPlaced ? (
                  <div className="mt-8 text-center">
                    <h3 className="text-4xl font-semibold text-green-600">Order Placed Successfully!</h3>
                    <p className="mt-2 text-2xl text-gray-700">Your order number is: <strong>{orderNumber}</strong></p>
                    <p className="mt-4 text-xl text-gray-600">
                      {user?.sms_consent_given 
                        ? "You will receive an email and text alert on the status of the order."
                        : "You will receive an email confirmation shortly."
                      }
                    </p>
                    <button
                      onClick={() => {
                        setOrderPlaced(false);
                        setIsCheckingOut(false);
                        clearCart();
                        onClose();
                      }}
                      className="mt-6 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      OK
                    </button>
                  </div>
                ) : orderConfirmationDetails ? (
                  <OrderConfirmationModal orderDetails={orderConfirmationDetails} onClose={handleCloseConfirmationModal} />
                ) : isCheckingOut ? (
                  <div className="mt-4">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Checkout</h3>
                    <div className="space-y-4">
                      {/* Email and Phone - Side by Side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="email" className={`block text-sm font-medium ${validationErrors.email ? 'text-red-700' : 'text-gray-700'}`}>
                            E-mail Address (required)
                            {isLoadingContactInfo && <span className="ml-1 text-xs text-blue-500">Loading...</span>}
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (e.target.value && (validationErrors.email || validationErrors.emailFormat)) {
                                setValidationErrors(prev => ({ ...prev, email: false, emailFormat: false }));
                              }
                            }}
                            className={`mt-1 block w-full px-3 py-2 border ${(validationErrors.email || validationErrors.emailFormat) ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            placeholder="xxx@ssss.sss"
                            disabled={isLoadingContactInfo}
                          />
                          {email && !validationErrors.email && !validationErrors.emailFormat && (
                            <p className="mt-1 text-xs text-green-600">✓ Email address loaded from your account</p>
                          )}
                          {validationErrors.email && (
                            <p className="mt-1 text-xs text-red-600">Email address is required</p>
                          )}
                          {validationErrors.emailFormat && (
                            <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="phone" className={`block text-sm font-medium ${validationErrors.phone ? 'text-red-700' : 'text-gray-700'}`}>
                            Phone Number (required) - <span className="mobile-preferred-flash">Mobile Preferred</span>
                            {isLoadingContactInfo && <span className="ml-1 text-xs text-blue-500">Loading...</span>}
                          </label>
                          <input
                            ref={phoneInputRef}
                            type="tel"
                            name="phone"
                            id="phone"
                            value={phone}
                            onChange={(e) => {
                              setPhone(formatPhoneNumber(e.target.value));
                              if (e.target.value && validationErrors.phone) {
                                setValidationErrors(prev => ({ ...prev, phone: false, emailFormat: false }));
                              }
                            }}
                            className={`mt-1 block w-full px-3 py-2 border ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            placeholder="516-433-6969"
                            maxLength={12}
                            disabled={isLoadingContactInfo}
                          />
                          {phone && !validationErrors.phone && (
                            <p className="mt-1 text-xs text-green-600">✓ Phone number loaded from your account</p>
                          )}
                          {validationErrors.phone && (
                            <p className="mt-1 text-xs text-red-600">Phone number is required</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Method - Compact */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setPaymentMethod('net10')}
                            className={`px-4 py-2 border rounded-md text-sm font-medium ${paymentMethod === 'net10' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Net-10 Open Account
                          </button>
                          <button
                            onClick={() => setPaymentMethod('credit')}
                            className={`px-4 py-2 border rounded-md text-sm font-medium ${paymentMethod === 'credit' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Existing Terms on File
                          </button>
                        </div>
                      </div>

                      {/* PO Reference - Compact */}
                      <div>
                        <label htmlFor="poReference" className="block text-sm font-medium text-gray-700">Your PO Reference (optional)</label>
                        <input
                          type="text"
                          name="poReference"
                          id="poReference"
                          value={poReference}
                          onChange={(e) => setPoReference(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter your PO reference number"
                        />
                      </div>

                      {/* Special Instructions - Compact */}
                      <div>
                        <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700">
                          Special Instructions or Comment (optional)
                          <span className="text-xs text-gray-500 ml-2">
                            {specialInstructions.length}/140 characters
                          </span>
                        </label>
                        <textarea
                          name="specialInstructions"
                          id="specialInstructions"
                          rows={2}
                          value={specialInstructions}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 140) {
                              setSpecialInstructions(value);
                            }
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter any special instructions or comments (max 140 characters)"
                          maxLength={140}
                        />
                      </div>

                      {/* Shipping Address Checkbox - Compact */}
                      <div className="pt-2">
                        <div className="flex items-center">
                          <input
                            id="shippingDifferent"
                            name="shippingDifferent"
                            type="checkbox"
                            checked={shippingDifferent}
                            onChange={(e) => setShippingDifferent(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor="shippingDifferent" className="ml-2 block text-sm font-medium text-gray-700">
                            Shipping Address is Different than Bill-To Address
                          </label>
                        </div>

                        {shippingDifferent && (
                          <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-md">
                            <h4 className="text-sm font-medium text-gray-900">Shipping Address</h4>
                            
                            <div>
                              <label htmlFor="shippingContactName" className="block text-xs font-medium text-gray-700">
                                Contact Name
                              </label>
                              <input
                                type="text"
                                name="shippingContactName"
                                id="shippingContactName"
                                value={shippingContactName}
                                onChange={(e) => setShippingContactName(e.target.value)}
                                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                placeholder="Contact name for shipping"
                              />
                            </div>

                            <div>
                              <label htmlFor="shippingAddress" className="block text-xs font-medium text-gray-700">
                                Street Address
                              </label>
                              <input
                                type="text"
                                name="shippingAddress"
                                id="shippingAddress"
                                value={shippingAddress}
                                onChange={(e) => setShippingAddress(e.target.value)}
                                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                placeholder="Street address"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor="shippingCity" className="block text-xs font-medium text-gray-700">
                                  City
                                </label>
                                <input
                                  type="text"
                                  name="shippingCity"
                                  id="shippingCity"
                                  value={shippingCity}
                                  onChange={(e) => setShippingCity(e.target.value)}
                                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                  placeholder="City"
                                />
                              </div>

                              <div>
                                <label htmlFor="shippingState" className="block text-xs font-medium text-gray-700">
                                  State
                                </label>
                                <input
                                  type="text"
                                  name="shippingState"
                                  id="shippingState"
                                  value={shippingState}
                                  onChange={(e) => setShippingState(e.target.value)}
                                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                  placeholder="State"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor="shippingZip" className="block text-xs font-medium text-gray-700">
                                  ZIP Code
                                </label>
                                <input
                                  type="text"
                                  name="shippingZip"
                                  id="shippingZip"
                                  value={shippingZip}
                                  onChange={(e) => setShippingZip(e.target.value)}
                                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                  placeholder="ZIP Code"
                                />
                              </div>

                              <div>
                                <label htmlFor="shippingPhone" className="block text-xs font-medium text-gray-700">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  name="shippingPhone"
                                  id="shippingPhone"
                                  value={shippingPhone}
                                  onChange={(e) => setShippingPhone(formatPhoneNumber(e.target.value))}
                                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                  placeholder="999-999-9999"
                                  maxLength={12}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    {items.length === 0 && autoAppliedPromoItems.length === 0 ? (
                      <p className="text-center text-xl text-gray-500">Your cart is empty.</p>
                    ) : (
                      <ul role="list" className="-my-6 divide-y-2 divide-gray-300">
                        {/* Display regular items */}
                        {items.map((item) => (
                          <li key={item.partnumber + (item.description || '')} className="flex py-6">
                            {item.image && (
                              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                <img
                                  src={item.image}
                                  alt={item.description || item.partnumber}
                                  className="h-full w-full object-cover object-center"
                                />
                              </div>
                            )}
                            <div className={`ml-4 flex flex-1 flex-col ${!item.image && 'ml-0'}`}>
                              <div>
                                <div className="flex justify-between text-2xl font-medium text-gray-900">
                                  <h3>
                                    <a href="#">{item.partnumber}</a>
                                  </h3>
                                </div>
                                <p className="mt-1 text-base text-gray-500">{item.description}</p>
                              </div>
                              <div className="flex flex-1 items-center justify-between text-sm mt-2">
                                {/* Quantity controls - Regular and Backorder stacked left-to-right */}
                                <div className="flex items-center space-x-6">
                                  {/* Regular Quantity Row */}
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-700 mr-2">Qty Ordered:</span>
                                    <button
                                      onClick={() => updateQuantity(item.partnumber, Math.max(0, item.quantity - 1))}
                                      className="p-1 text-gray-500 hover:text-indigo-600"
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateQuantity(item.partnumber, Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-14 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm mx-1"
                                      min="0"
                                    />
                                    <button
                                      onClick={() => updateQuantity(item.partnumber, item.quantity + 1)}
                                      className="p-1 text-gray-500 hover:text-indigo-600"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                  
                                  {/* Backorder Quantity Row - Only show if qty_backordered > 0 */}
                                  {(item.qtyBackordered || 0) > 0 && (
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-orange-700 mr-2">Qty Backorder:</span>
                                      <button
                                        onClick={() => updateBackorderQuantity(item.partnumber, Math.max(0, (item.qtyBackordered || 0) - 1))}
                                        className="p-1 text-orange-500 hover:text-orange-600"
                                        aria-label="Decrease backorder quantity"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        value={item.qtyBackordered || 0}
                                        onChange={(e) => updateBackorderQuantity(item.partnumber, Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-14 text-center border-orange-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm mx-1 bg-orange-50"
                                        min="0"
                                      />
                                      <button
                                        onClick={() => updateBackorderQuantity(item.partnumber, (item.qtyBackordered || 0) + 1)}
                                        className="p-1 text-orange-500 hover:text-orange-600"
                                        aria-label="Increase backorder quantity"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Spacer to push prices and remove button to the right */}
                                <div className="flex-grow"></div>

                                {/* Prices and Remove button container */}
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">${(item.price || 0).toFixed(2)} ea.</p>
                                    <p className="font-medium text-xl text-gray-900">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                                    {(item.qtyBackordered || 0) > 0 && (
                                      <p className="text-xs text-orange-600">
                                        +{item.qtyBackordered} backordered (${((item.price || 0) * (item.qtyBackordered || 0)).toFixed(2)})
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('Attempting to remove item:', item.partnumber);
                                      removeFromCart(item.partnumber);
                                    }}
                                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                        
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {!orderPlaced && (
                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div className="flex justify-between text-2xl font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>${totalPrice.toFixed(2)}</p>
                  </div>

                  {/* Enhanced Promo Code Discount Display */}
                  {(() => {
                    // CRITICAL FIX: Clear promo codes when cart is empty
                    if (totalPrice === 0 || items.length === 0) {
                      console.log('Cart is empty - clearing all promo codes');
                      // Clear promo codes when cart becomes empty
                      if (appliedPromoCode) {
                        console.log('Removing applied promo code due to empty cart');
                        removePromoCode();
                      }
                      return null; // Don't show any discount when cart is empty
                    }
                    
                    let totalDiscount = 0;
                    let promoMessage = '';
                    let promoCodesApplied = [];
                    
                    // Debug logging for troubleshooting
                    console.log('Discount Display Debug:', {
                      appliedPromoCode,
                      appliedPromoCodes,
                      totalPrice,
                      appliedPromoCodeValid: appliedPromoCode?.is_valid,
                      appliedPromoCodeAmount: appliedPromoCode?.discount_amount
                    });
                    
                    // Check for manually applied promo code (like SAVE1)
                    if (appliedPromoCode) {
                      console.log('Found appliedPromoCode:', appliedPromoCode);
                      
                      // Check if it's valid and has a discount amount
                      const discountAmount = parseFloat(appliedPromoCode.discount_amount?.toString() || '0');
                      
                      if (appliedPromoCode.is_valid && discountAmount > 0) {
                        totalDiscount += discountAmount;
                        const codeDisplay = appliedPromoCode.code || appliedPromoCode.promo_id || 'SAVE1';
                        promoCodesApplied.push(codeDisplay);
                        promoMessage = appliedPromoCode.message || `Promo code ${codeDisplay} has been automatically applied`;
                        console.log('Valid promo code found:', codeDisplay, 'Amount:', discountAmount);
                      } else {
                        console.log('Promo code not valid or no discount:', {
                          is_valid: appliedPromoCode.is_valid,
                          discount_amount: discountAmount,
                          raw_discount: appliedPromoCode.discount_amount
                        });
                      }
                    }
                    
                    // Check for auto-applied promo codes
                    if (appliedPromoCodes && Array.isArray(appliedPromoCodes) && appliedPromoCodes.length > 0) {
                      console.log('Found appliedPromoCodes:', appliedPromoCodes);
                      
                      appliedPromoCodes.forEach(promo => {
                        const discountAmount = parseFloat(promo.discount_amount?.toString() || '0');
                        if (promo.is_valid && discountAmount > 0) {
                          totalDiscount += discountAmount;
                          const codeDisplay = promo.code || promo.promo_id || 'PROMO';
                          promoCodesApplied.push(codeDisplay);
                        }
                      });
                      
                      if (appliedPromoCodes.length > 0 && !promoMessage) {
                        promoMessage = 'Promotional discount has been automatically applied';
                      }
                    }
                    
                    // Show compact discount line if there's any discount and cart has items
                    if (totalDiscount > 0 && totalPrice > 0) {
                      console.log('Displaying discount:', totalDiscount, 'Message:', promoMessage);
                      // Remove duplicate promo codes
                      const uniquePromoCodes = [...new Set(promoCodesApplied)];
                      
                      return (
                        <div className="flex justify-between text-sm text-green-600 mt-1 font-medium">
                          <div className="flex items-center">
                            <span className="mr-2 text-3xl">🎁</span>
                            <div className="flex flex-col">
                              {uniquePromoCodes.length > 0 ? (
                                <p className="text-lg text-green-600">
                                  Promo code <span className="text-red-600 font-bold">{uniquePromoCodes.join(', ')}</span> has been automatically applied
                                </p>
                              ) : (
                                <p className="text-lg text-green-600">{promoMessage}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">-${totalDiscount.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    } else {
                      console.log('No discount to display - totalDiscount:', totalDiscount, 'totalPrice:', totalPrice);
                    }
                    
                    return null;
                  })()}

                  <div className="flex justify-between text-3xl font-bold text-gray-900 mt-2 pt-2 border-t border-dashed">
                    <p>Grand Total</p>
                    <p>${(() => {
                      // CRITICAL FIX: Don't apply discounts when cart is empty
                      if (totalPrice === 0 || items.length === 0) {
                        console.log('Grand Total - Cart is empty, returning $0.00');
                        return '0.00';
                      }
                      
                      // Calculate total discount from all sources
                      let totalDiscount = 0;
                      
                      // Add discount from manually applied promo code (like SAVE1)
                      if (appliedPromoCode && appliedPromoCode.is_valid) {
                        const discountAmount = parseFloat(appliedPromoCode.discount_amount?.toString() || '0');
                        totalDiscount += discountAmount;
                        console.log('Grand Total - Applied promo discount:', discountAmount);
                      }
                      
                      // Add discount from auto-applied promo codes
                      if (appliedPromoCodes && appliedPromoCodes.length > 0) {
                        const autoDiscountAmount = appliedPromoCodes.reduce((total, promo) => {
                          const discountAmount = parseFloat(promo.discount_amount?.toString() || '0');
                          return total + (promo.is_valid ? discountAmount : 0);
                        }, 0);
                        totalDiscount += autoDiscountAmount;
                        console.log('Grand Total - Auto promo discounts:', autoDiscountAmount);
                      }
                      
                      // Ensure grand total is never negative
                      const grandTotal = Math.max(0, totalPrice - totalDiscount);
                      console.log('Grand Total calculation - Subtotal:', totalPrice, 'Total Discounts:', totalDiscount, 'Grand Total:', grandTotal);
                      return grandTotal.toFixed(2);
                    })()}</p>
                  </div>
                  <p className="mt-0.5 text-base text-gray-500">Does not inclued shipping charge. You will be emailed the Grand Total when shipped</p>
                  <div className="mt-6">
                    {isCheckingOut && (
                      <p className="text-red-600 text-sm font-medium text-center mb-4">
                        Total does not include shipping. You will be emailed the Grand Total when shipped
                      </p>
                    )}
                    {isCheckingOut ? (
                      <button
                        onClick={handlePlaceOrder}
                        disabled={items.length === 0 || !email || !phone}
                        className="w-full flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <CreditCard size={20} className="mr-2" /> Place Order
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={items.length === 0}
                        className="w-full flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300"
                      >
                        Proceed to Checkout
                      </button>
                    )}
                  </div>
                  <div className="mt-6 space-y-3">
                    {/* NEW: Cancel Order Button - Only show when cart has items */}
                    {items.length > 0 && !isCheckingOut && (
                      <button
                        onClick={async () => {
                          const cancelled = await cancelOrderWithConfirmation();
                          if (cancelled) {
                            onClose(); // Close cart after successful cancellation
                          }
                        }}
                        className="w-full flex items-center justify-center rounded-md border border-red-500 bg-red-50 px-6 py-2 text-base font-medium text-red-700 shadow-sm hover:bg-red-100 hover:text-red-800 transition-colors"
                        title="Remove all items from cart"
                      >
                        <Trash2 size={18} className="mr-2" />
                        Cancel Order
                      </button>
                    )}
                    
                    <div className="flex justify-center text-center text-sm text-gray-500">
                      <p>
                        or{' '}
                        <button
                          type="button"
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                          onClick={() => {
                            if (isCheckingOut) setIsCheckingOut(false);
                            else onClose();
                          }}
                        >
                          {isCheckingOut ? 'Back to Cart' : 'Continue Shopping'}
                          <span aria-hidden="true"> &rarr;</span>
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;

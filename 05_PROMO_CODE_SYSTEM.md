# Promo Code & Discount System

## Overview
The Music Supplies application provides a comprehensive promo code system for customer discounts, with single-use enforcement, usage tracking, and administrative management.

## Promo Code Structure

### Database Schema
**Table**: `promo_codes`
```sql
-- Promo code management
code (PRIMARY KEY) - Promo code string (e.g., "SAVE10")
discount_percent - Percentage discount (e.g., 10 for 10% off)
is_single_use - Boolean flag for one-time use codes
is_active - Enable/disable status
usage_count - Number of times code has been used
max_usage - Maximum allowed uses (NULL for unlimited)
valid_from - Start date for code validity
valid_until - Expiration date
created_at - Code creation timestamp
created_by - Admin who created the code
description - Internal description/notes
```

### Promo Code Types
1. **Single-Use Codes**: Can only be used once per code
2. **Multi-Use Codes**: Can be used multiple times up to limit
3. **Unlimited Codes**: No usage restrictions
4. **Time-Limited Codes**: Valid only within date range

## Promo Code Management

### Admin Interface
**Component**: `src/components/admin/PromoCodeManagementTab.tsx`

**Admin Capabilities**:
- **Create New Codes**: Generate new promo codes
- **Edit Existing Codes**: Modify code properties
- **Toggle Status**: Activate/deactivate codes
- **Usage Tracking**: View code usage statistics
- **Delete Codes**: Remove unused codes
- **Bulk Operations**: Mass code management

### Code Creation Process
1. **Code Generation**: Create unique code string
2. **Discount Setup**: Set percentage discount amount  
3. **Usage Limits**: Configure single-use or multi-use
4. **Date Limits**: Set validity period (optional)
5. **Activation**: Enable code for customer use
6. **Testing**: Verify code functionality

## Promo Code Application

### Customer Usage Flow
1. **Code Entry**: Customer enters code in shopping cart
2. **Validation**: System verifies code validity and status
3. **Usage Check**: Confirm code hasn't exceeded limits
4. **Discount Calculation**: Apply percentage discount to order total
5. **Usage Tracking**: Increment usage count
6. **Order Integration**: Include discount in order record

### Cart Integration
**Implementation**: Integrated with shopping cart system
- Real-time discount calculation
- Visual discount display
- Total price updates
- Code removal capability

### Validation Rules
```typescript
interface PromoCodeValidation {
  codeExists: boolean;
  isActive: boolean;
  withinDateRange: boolean;
  usageLimitNotExceeded: boolean;
  validForAccount: boolean;
}
```

## Critical Fixes Implemented

### SAVE10 Single-Use Enforcement
**Issue**: SAVE10 code could be used multiple times
**Solution**: Database constraints and application logic
**Implementation**: 
```sql
-- Migration: 20250724_strengthen_promo_code_single_use.sql
-- Migration: 20250728_fix_save10_single_use.sql
```

**Status**: ✅ FIXED - Single-use codes properly enforced

### Promo Code Line Item Display
**Issue**: Discounts not showing as separate line items in orders/invoices
**Solution**: Display promo codes as negative line items
**Implementation**: Order processing and invoice generation updated

**Features**:
- Discount shows as separate line item
- Clear indication of promo code used
- Accurate total calculations
- Invoice integration

### Promo Code Modal Fixes
**Issue**: UI/UX problems with promo code entry modal
**Solution**: Enhanced modal functionality and user experience
- Improved error messages
- Better validation feedback
- Enhanced UI responsiveness
- Fixed scrolling issues

## Promo Code Security

### Security Measures
1. **Code Uniqueness**: Prevent duplicate codes
2. **Usage Tracking**: Accurate usage counting
3. **Tampering Prevention**: Server-side validation
4. **Account Linking**: Code usage tied to accounts
5. **Audit Trail**: Complete usage history

### Anti-Abuse Features
- **Rate Limiting**: Prevent code testing attacks
- **Account Restrictions**: Limit codes per account
- **IP Tracking**: Monitor usage patterns
- **Fraud Detection**: Identify suspicious activity

## Discount Calculation

### Calculation Logic
```typescript
function calculateDiscount(orderTotal: number, discountPercent: number): number {
  const discountAmount = (orderTotal * discountPercent) / 100;
  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
}
```

### Application Points
- **Cart Total**: Applied to cart subtotal before tax
- **Order Processing**: Discount carried through to final order
- **Invoice Generation**: Shown as line item on invoice
- **Payment Processing**: Reduces payment amount required

### Tax Handling
- Discounts applied before tax calculation
- Tax calculated on discounted amount
- Clear breakdown in order summary
- Compliance with tax regulations

## Promo Code Analytics

### Usage Statistics
- **Total Redemptions**: How many times each code was used
- **Revenue Impact**: Amount of discount given
- **Customer Reach**: Number of unique customers who used code
- **Time Analysis**: Usage patterns over time
- **Popular Codes**: Most frequently used codes

### Reporting Features
- **Code Performance**: Individual code analysis
- **Date Range Reports**: Usage within specific periods
- **Customer Reports**: Per-customer promo usage
- **Revenue Impact**: Discount vs. revenue analysis

## Integration Points

### Shopping Cart Integration
- **Real-time Validation**: Immediate code verification
- **Visual Feedback**: Clear discount display
- **Error Handling**: User-friendly error messages
- **Removal Options**: Easy code removal functionality

### Order System Integration
- **Order Records**: Promo code stored with order
- **Price Calculations**: Accurate total with discount
- **Status Tracking**: Link usage to specific orders
- **Refund Handling**: Code status on order cancellation

### Invoice System Integration
- **Line Item Display**: Discount as separate item
- **Professional Format**: Clean invoice presentation
- **Tax Compliance**: Proper tax calculation display
- **Payment Terms**: Accurate payment amount

## Promo Code Workflow

### Creation Workflow
1. **Admin Access**: Login to admin dashboard
2. **Navigation**: Go to Promo Code Management tab
3. **Code Creation**: Click "Create New Code"
4. **Configuration**: Set code parameters
5. **Validation**: Test code functionality
6. **Activation**: Enable for customer use

### Usage Workflow
1. **Customer Entry**: Enter code in cart
2. **System Validation**: Verify code validity
3. **Discount Application**: Apply discount to total
4. **Order Completion**: Process order with discount
5. **Usage Recording**: Update usage statistics
6. **Confirmation**: Show discount in confirmation

### Management Workflow
1. **Performance Monitoring**: Track code usage
2. **Usage Analysis**: Review analytics
3. **Code Updates**: Modify as needed
4. **Deactivation**: Disable expired/problematic codes
5. **Cleanup**: Remove unused codes

## Error Handling

### Common Error Scenarios
1. **Code Not Found**: Entered code doesn't exist
2. **Code Expired**: Code past validity date
3. **Usage Limit Exceeded**: Single-use code already used
4. **Code Inactive**: Code disabled by admin
5. **Invalid Format**: Code format doesn't match requirements

### Error Messages
- **User-Friendly**: Clear, non-technical language
- **Actionable**: Suggest next steps where possible
- **Consistent**: Standardized error formatting
- **Helpful**: Provide guidance for resolution

## Performance Optimization

### Database Optimization
- **Indexed Searches**: Fast code lookups
- **Efficient Queries**: Optimized validation queries
- **Connection Pooling**: Efficient database connections
- **Cache Strategy**: Frequently used code caching

### Application Performance
- **Async Processing**: Non-blocking code validation
- **Client-Side Caching**: Reduce server requests
- **Debounced Input**: Prevent excessive validation calls
- **Lazy Loading**: Load code data when needed

## Testing Strategy

### Test Coverage
- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end promo code flow
- **Performance Tests**: High-volume usage testing
- **Security Tests**: Anti-abuse mechanism testing

### Test Scenarios
- **Valid Code Usage**: Successful discount application
- **Invalid Code Handling**: Proper error responses
- **Usage Limit Testing**: Single-use enforcement
- **Edge Cases**: Boundary condition testing

## Current Status
- **Single-Use Enforcement**: ✅ FIXED
- **Line Item Display**: ✅ OPERATIONAL  
- **Admin Management**: ✅ FUNCTIONAL
- **Usage Tracking**: ✅ ACCURATE
- **Security Measures**: ✅ IMPLEMENTED
- **Performance**: ✅ OPTIMIZED
- **Integration**: ✅ COMPLETE

## Related Files
- `src/components/admin/PromoCodeManagementTab.tsx`
- `supabase/migrations/20250724_strengthen_promo_code_single_use.sql`
- `supabase/migrations/20250728_fix_save10_single_use.sql`
- `test_promo_code_single_use.js`
- Database table: `promo_codes`
- Integration: Shopping cart and order systems

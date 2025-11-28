# User Management & Account System

## Overview
The Music Supplies application manages customer accounts with secure authentication, profile management, and account lifecycle operations.

## Account Types

### Customer Accounts
- **Regular Customers**: Standard business accounts
- **New Applicants**: Pending approval accounts
- **Deactivated Accounts**: Suspended or closed accounts

### Administrative Accounts
- **Account 999**: Main administrator account
- **Account 101**: Secondary admin account
- **Support Staff**: Limited admin access

## Account Management Features

### Account Creation
**New Account Application Process:**
1. **Application Submission**: `src/pages/NewAccountApplicationPage.tsx`
2. **Admin Review**: `src/components/admin/AccountApplicationsTab.tsx`
3. **Approval/Rejection**: Manual admin decision
4. **Account Activation**: Automatic upon approval

**Database Table**: `new_account_applications`
```sql
-- Application tracking
id (PRIMARY KEY)
business_name
contact_name
email_address
phone_number
address, city, state, zip
application_status ('pending', 'approved', 'rejected')
created_at
reviewed_at
reviewed_by_admin
```

### Account Information Management
**Primary Data**: `accounts_lcmd` table
- **Account Details**: Name, address, contact information
- **Contact Updates**: Email, phone, mobile phone
- **Address Changes**: Shipping and billing addresses
- **Business Information**: Company name, tax details

**Profile Update Components:**
- `src/components/AccountSettingsModal.tsx`
- `src/pages/CustomerAccountPage.tsx`

### Password Management
**Password Lifecycle:**
1. **Initial Setup**: ZIP code authentication for first login
2. **Password Creation**: Secure password establishment
3. **Password Changes**: User-initiated updates
4. **Password Resets**: Admin or user-initiated recovery

**Password Components:**
- `src/components/PasswordChangeModal.tsx`
- `src/pages/UpdatePasswordPage.tsx`
- `src/pages/ForgotPasswordPage.tsx`

**Database Functions:**
```sql
-- Password operations
hash_password(plain_password text) RETURNS text
update_user_password(account_number integer, new_password text)
reset_user_password(account_number integer)
```

## Account States

### Active Accounts
- **Full Access**: Complete system functionality
- **Order Placement**: Can create and manage orders
- **Profile Updates**: Self-service account management
- **Support Access**: Customer service interactions

### Pending Accounts
- **Limited Access**: View-only capabilities
- **Application Status**: Track approval progress
- **Contact Updates**: Update application information
- **Waiting Period**: Admin review required

### Deactivated Accounts
- **Restricted Access**: Login disabled
- **Data Retention**: Historical data preserved
- **Reactivation Process**: Admin-controlled restoration
- **Support Contact**: Limited customer service

**Deactivation Modal**: `src/components/DeactivatedAccountModal.tsx`

## Admin Account Management

### Account Administration Interface
**Admin Dashboard**: `src/pages/AdminDashboard.tsx`
**Account Management Tab**: `src/components/admin/AccountManagementTab.tsx`

### Admin Capabilities
1. **View All Accounts**: Complete customer database access
2. **Account Search**: Filter and find specific accounts
3. **Profile Editing**: Modify customer information
4. **Password Reset**: Force password changes
5. **Account Status**: Activate/deactivate accounts
6. **Order Management**: View and modify orders

### Account Listing
**Backend Function**: `hash_password()` RPC required for AccountsTab
**Display Components**: 
- Account number and business name
- Contact information and status
- Last login and activity dates
- Order history summary

## User Preferences

### Preference System
**Database Table**: `user_preferences` (Created 2025-07-29)
```sql
-- User customization settings
account_number (FOREIGN KEY)
font_size ('small', 'medium', 'large')
layout_density ('compact', 'comfortable', 'spacious')
notifications_enabled boolean
theme_preference ('light', 'dark', 'system')
created_at, updated_at
```

### Customization Options
- **Font Scaling**: Accessibility font size options
- **Layout Density**: Comfortable viewing preferences  
- **Notification Settings**: SMS and email preferences
- **Theme Selection**: Visual appearance options

## Account Security

### Security Measures
1. **Password Encryption**: bcrypt with salt
2. **Session Management**: Secure token handling
3. **Access Control**: Account-based permissions
4. **Audit Logging**: Account activity tracking

### Security Events
- **Login Attempts**: Success and failure tracking
- **Password Changes**: Change history and timing
- **Profile Updates**: Modification audit trail
- **Administrative Actions**: Admin intervention logging

### Account Login Tracking
**Database Table**: `account_login_tracking`
```sql
-- Login activity monitoring
account_number
login_timestamp
login_method ('password', 'zip', 'master_password')
ip_address
user_agent
success boolean
```

## Mobile Phone Integration

### Mobile Contact Management
**Database Update**: Added `mobile_phone` to `accounts_lcmd` (2025-08-02)

**Features:**
- **SMS Notifications**: Order updates and alerts
- **Two-Factor Authentication**: SMS verification support
- **Contact Preferences**: Primary vs. secondary contact
- **Emergency Contact**: Critical account communications

### SMS Consent System
**Component**: `src/components/SmsConsentModal.tsx`
- **Opt-in Process**: Explicit SMS permission
- **Consent Tracking**: Legal compliance requirements
- **Preference Updates**: Easy opt-out mechanism
- **Regional Compliance**: GDPR and local regulations

## Account Data Management

### Data Export
- **Account Information**: Complete profile data
- **Order History**: Transaction records
- **Communication Log**: Email and SMS history
- **Preference Settings**: Customization data

### Data Privacy
- **GDPR Compliance**: Right to be forgotten
- **Data Minimization**: Only necessary data collection
- **Consent Management**: Clear permission tracking
- **Data Retention**: Defined cleanup policies

### Data Backup
- **Account Profiles**: Daily backup schedule
- **Transaction History**: Long-term retention
- **Security Logs**: Extended audit trail
- **Preference Data**: Configuration backup

## Account Integration

### Order System Integration
- **Account Linking**: Orders tied to account numbers
- **Credit Management**: Account-based credit limits
- **Order History**: Customer purchase tracking
- **Payment Methods**: Saved payment preferences

### Communication Integration
- **Email Notifications**: Order confirmations and updates
- **SMS Alerts**: Critical account notifications
- **Support Tickets**: Account-linked customer service
- **Marketing Communications**: Opt-in promotional content

## Troubleshooting

### Common Issues
1. **Login Failures**: Password vs. ZIP code confusion
2. **Account Lockouts**: Multiple failed attempts
3. **Profile Update Errors**: Data validation failures
4. **Permission Issues**: Access control problems

### Resolution Process
1. **User Self-Service**: Password reset and profile updates
2. **Customer Support**: Phone and email assistance
3. **Admin Intervention**: Manual account management
4. **Technical Support**: System-level issue resolution

## Current Status
- **Account Creation**: ✅ FUNCTIONAL
- **Password Management**: ✅ SECURE
- **Profile Updates**: ✅ OPERATIONAL
- **Admin Management**: ✅ ACTIVE
- **Mobile Integration**: ✅ COMPLETE
- **Data Security**: ✅ COMPLIANT

## Related Files
- `src/pages/NewAccountApplicationPage.tsx`
- `src/components/admin/AccountManagementTab.tsx`
- `src/components/admin/AccountApplicationsTab.tsx`
- `src/components/AccountSettingsModal.tsx`
- `src/components/PasswordChangeModal.tsx`
- `src/components/DeactivatedAccountModal.tsx`
- `src/pages/CustomerAccountPage.tsx`
- Database tables: `accounts_lcmd`, `user_passwords`, `new_account_applications`, `user_preferences`

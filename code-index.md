# Music Supplies Launch Production - Code Index

**Generated:** 2025-10-14  
**Version:** RC1013.1015z  
**Project:** Music Supplies E-commerce Platform

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Application Files](#core-application-files)
5. [Components](#components)
6. [Pages](#pages)
7. [Context Providers](#context-providers)
8. [Services](#services)
9. [Utilities](#utilities)
10. [Database & Migrations](#database--migrations)
11. [Configuration Files](#configuration-files)
12. [Key Features](#key-features)

---

## Project Overview

A comprehensive B2B e-commerce platform for music supplies with advanced features including:
- Multi-user authentication with 2FA
- Role-based access control (Admin, Staff, Customers)
- Real-time inventory management
- Promotional code system
- CRM and prospect management
- AI-powered chat support
- Order management and history

---

## Technology Stack

### Frontend
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.4.2
- **Routing:** React Router DOM 7.6.0
- **UI Components:** Lucide React, React Icons
- **Data Tables:** AG Grid, TanStack React Table
- **Maps:** React Simple Maps
- **Drag & Drop:** @dnd-kit

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Edge Functions:** Supabase Functions
- **Real-time:** Socket.io

### Additional Services
- **AI:** OpenAI API
- **SMS:** ClickSend
- **Voice:** ElevenLabs
- **Search:** Brave Search API
- **Documentation:** Context7 MCP

---

## Project Structure

```
musicsupplies_launch-prod/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic services
│   ├── lib/                # Library configurations
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── data/               # Static data and configurations
│   ├── images/             # Image assets
│   └── invoices/           # Invoice templates
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── migrations/             # Additional migrations
├── public/                 # Static public assets
├── netlify/               # Netlify functions
├── server/                # Chat server
└── scripts/               # Build and utility scripts
```

---

## Core Application Files

### [`src/main.tsx`](src/main.tsx)
**Entry Point** - Application bootstrap with:
- Global error handling setup
- Network request logging (temporary debugging)
- Database update checks
- React StrictMode rendering

### [`src/App.tsx`](src/App.tsx)
**Main Application Component** - Core routing and layout:
- **Routes:**
  - `/login` - User authentication
  - `/` - Dashboard (redirects based on user role)
  - `/shopping` - Main product browsing
  - `/admin` - Admin dashboard (account 999)
  - `/5150` - Admin bypass route
  - `/prospects` - Prospect management
  - `/manager` - Staff management
  - `/chat` - AI chat interface
  - `/account` - Customer account settings
  - `/new-account-application` - New account signup
  
- **Protected Routes:**
  - `ProtectedRoute` - Requires authentication
  - `AdminProtectedRoute` - Requires account 999
  - `SpecialAdminProtectedRoute` - Requires account 99

- **Global Modals:**
  - Password change modal
  - Discount form modal
  - Cart restoration modal
  - Promotions login modal
  - Search entity modals (accounts/prospects)

### [`src/index.css`](src/index.css)
Global styles and Tailwind CSS imports

---

## Components

### Authentication & User Management

#### [`Login.tsx`](src/components/Login.tsx)
- Account number + password authentication
- PIN-based 2FA support
- Password initialization flow
- Deactivated account handling
- Brand logo carousel

#### [`Login2.tsx`](src/components/Login2.tsx)
- Alternative login interface
- Two-factor authentication
- Simplified UI

#### [`PasswordChangeModal.tsx`](src/components/PasswordChangeModal.tsx)
- Force password change on first login
- Email uniqueness validation
- SMS consent integration
- Password strength requirements

#### [`AccountSettingsModal.tsx`](src/components/AccountSettingsModal.tsx)
- Profile information updates
- Password changes
- User preferences (font size, notifications)
- SMS consent management

### Shopping & Cart

#### [`ProductTable.tsx`](src/components/ProductTable.tsx)
- Product listing with pagination
- Advanced filtering (brand, vendor, inventory)
- Sortable columns
- Quantity selector integration
- Demo mode support
- Font size customization
- Master carton information display

#### [`ShoppingCart.tsx`](src/components/ShoppingCart.tsx)
- Cart item management
- Promo code application
- Order placement
- Contact information validation
- Special instructions
- Auto-applied promotional items
- Order confirmation

#### [`QuantitySelector.tsx`](src/components/QuantitySelector.tsx)
- Quantity input with validation
- Master carton quantity support
- Backorder functionality
- Success/error feedback
- Keyboard navigation

#### [`CategoryTree.tsx`](src/components/CategoryTree.tsx)
- Hierarchical category navigation
- Expandable/collapsible nodes
- Category selection with breadcrumb path
- Font size support
- Expand all functionality

### Promotional System

#### [`PromoCodeManager.tsx`](src/components/PromoCodeManager.tsx)
- Promo code CRUD operations
- Template-based promo creation:
  - Spend & Get Free
  - Spend & Get Dollar Off
  - Spend & Get Model Free
  - Buy X Get Y Free
  - Buy Units Get Units Free
- Sortable columns with drag & drop
- User preferences persistence
- Active/inactive status management

#### [`PromoCodePopup.tsx`](src/components/PromoCodePopup.tsx)
- Display active promo codes
- Expired codes section
- Status indicators
- Auto-refresh

#### [`DiscountFormModal.tsx`](src/components/DiscountFormModal.tsx)
- Account-specific discount management
- Discount types (percentage, dollar amount)
- Date range configuration
- Scope selection (all products, specific categories)

### CRM & Prospects

#### [`ProspectorModal.tsx`](src/components/ProspectorModal.tsx)
- Prospect intelligence gathering
- Website scraping integration
- AI analysis of prospects
- Screenshot capture
- Icebreaker suggestions
- Multi-step intelligence workflow

#### [`ProspectsSearchModal.tsx`](src/components/ProspectsSearchModal.tsx)
- Search prospects by multiple criteria
- Sortable columns
- Filtering by status, grade, location
- Infinite scroll
- Quick prospect selection

#### [`SearchEntityModal.tsx`](src/components/SearchEntityModal.tsx)
- Unified search for accounts and prospects
- Real-time filtering
- Entity type toggle
- Staff workflow integration

#### [`ProspectCRMModal.tsx`](src/components/ProspectCRMModal.tsx)
- Full CRM interface for prospects
- Contact history tracking
- Activity logging
- Prospect information management
- Contact management

#### [`ProspectActivityLog.tsx`](src/components/ProspectActivityLog.tsx)
- Activity tracking (calls, emails, meetings)
- Quick action buttons
- Outcome recording
- Activity history display

### Admin & Management

#### [`AdminPasswordManager.tsx`](src/components/AdminPasswordManager.tsx)
- Universal admin password management
- Admin phone number configuration
- Password reveal functionality
- Secure storage

#### [`ProductsManagerGrid.tsx`](src/components/ProductsManagerGrid.tsx)
- AG Grid-based product management
- Inline editing
- Bulk operations
- Add/delete rows
- Real-time save

#### [`SalesmanXrefModal.tsx`](src/components/SalesmanXrefModal.tsx)
- State-to-salesman assignment
- Geographic visualization
- Prospect tallies by salesman
- Interactive US map

### Chat & Communication

#### [`EnhancedChatWidget.tsx`](src/components/EnhancedChatWidget.tsx)
- AI-powered chat interface
- Voice input/output support
- Knowledge base integration
- Minimizable widget
- Message history

#### [`ChatWidget.tsx`](src/components/ChatWidget.tsx)
- Real-time chat with Socket.io
- Room-based messaging
- Direct messages
- Typing indicators
- User presence

### Modals & Dialogs

#### [`OrderConfirmationModal.tsx`](src/components/OrderConfirmationModal.tsx)
- Order summary display
- SMS notification sending
- Order details table

#### [`CartRestorationModal.tsx`](src/components/CartRestorationModal.tsx)
- Restore abandoned cart
- Continue shopping option

#### [`NotificationModal.tsx`](src/components/NotificationModal.tsx)
- Success/error/warning notifications
- Auto-dismiss functionality
- Icon-based type indication

#### [`ContactInfoModal.tsx`](src/components/ContactInfoModal.tsx)
- Email and phone management
- Validation
- SMS consent integration

#### [`SmsConsentModal.tsx`](src/components/SmsConsentModal.tsx)
- SMS consent collection
- Transactional vs marketing consent
- Phone number formatting
- Legal compliance

### Utility Components

#### [`VersionCheck.tsx`](src/components/VersionCheck.tsx)
- Auto version checking
- Force refresh on updates
- Version display

#### [`ErrorBoundary.tsx`](src/components/ErrorBoundary.tsx)
- Global error catching
- Error reporting
- Fallback UI

#### [`Header.tsx`](src/components/Header.tsx)
- Navigation bar
- Demo mode toggle
- View switching
- User menu

#### [`SearchBar.tsx`](src/components/SearchBar.tsx)
- Product search interface
- Primary/additional/exclude queries
- Font size support
- Keyboard shortcuts

---

## Pages

### Dashboard Pages

#### [`Dashboard.tsx`](src/pages/Dashboard.tsx)
**Main Shopping Interface**
- Product browsing with category tree
- Advanced search and filtering
- Image loading with fallbacks
- Promotional popup integration
- Shopping cart integration
- Demo mode support
- Font size preferences

#### [`DashboardClean.tsx`](src/pages/DashboardClean.tsx)
**Simplified Dashboard**
- Cleaner UI variant
- Optimized image loading
- Reduced features for performance

### Admin Pages

#### [`AdminDashboard.tsx`](src/pages/AdminDashboard.tsx)
**Admin Control Panel** (Account 999)
- Tab-based interface:
  - Orders management
  - Promo codes
  - Chat management
  - Security settings
- SMS failure notifications
- System-wide controls

#### [`ManagerPage.tsx`](src/pages/ManagerPage.tsx)
**Staff & Product Management**
- Three main tabs:
  1. **Products Tab:**
     - Inline editing with keyboard navigation
     - Brand/vendor dropdowns
     - Auto-save functionality
     - Column customization
     - Filter by brand/vendor/description
  2. **Staff Management:**
     - Staff CRUD operations
     - Security level assignment
     - Password management
  3. **System Settings:**
     - Security levels configuration
     - Permission management
- Edit mode with heartbeat
- User preferences persistence
- Drag & drop column reordering

#### [`AdminKnowledgeBase.tsx`](src/pages/AdminKnowledgeBase.tsx)
**Chat Knowledge Base Management**
- Knowledge item CRUD
- Category management
- Voice settings configuration
- ElevenLabs voice selection
- Keyword tagging

### Prospect Management

#### [`ProspectsPage.tsx`](src/pages/ProspectsPage.tsx)
**Prospect Management Interface**
- Prospect list navigation
- CRUD operations
- CRM modal integration
- Prospector modal for intelligence
- Previous/next navigation

### Account Management

#### [`CustomerAccountPage.tsx`](src/pages/CustomerAccountPage.tsx)
**Customer Account Settings**
- Account information display
- Password change
- SMS consent management
- Test SMS functionality

#### [`NewAccountApplicationPage.tsx`](src/pages/NewAccountApplicationPage.tsx)
**New Account Application Form**
- Business information collection
- Trade references
- Tax exemption details
- SMS notification on submission

#### [`AdminAccountApplicationsPage.tsx`](src/pages/AdminAccountApplicationsPage.tsx)
**Admin Application Review**
- Application list with filtering
- Status management (pending/approved/rejected)
- Application details view

### Order Management

#### [`OrderHistory.tsx`](src/pages/OrderHistory.tsx)
**Order History Display**
- Order list with details
- Reorder functionality
- Print invoices
- Order line items
- Address information
- Promo code tracking

#### [`WebOrdersDisplay.tsx`](src/pages/WebOrdersDisplay.tsx)
**Web Orders Dashboard**
- Real-time order monitoring
- Sortable columns
- Backend integration status
- Promo code application tracking

### Communication Pages

#### [`ChatPage.tsx`](src/pages/ChatPage.tsx)
**Full-Screen Chat Interface**
- Dedicated chat page
- Enhanced chat widget integration

#### [`SmsCommunicationsPage.tsx`](src/pages/SmsCommunicationsPage.tsx)
**SMS Communications Policy**
- SMS terms and conditions
- Opt-out instructions

#### [`EmailCommunicationsPage.tsx`](src/pages/EmailCommunicationsPage.tsx)
**Email Communications Policy**
- Email preferences
- Unsubscribe information

### Legal Pages

#### [`PrivacyPolicyPage.tsx`](src/pages/PrivacyPolicyPage.tsx)
**Privacy Policy**
- Data collection practices
- User rights
- Legal compliance

#### [`TermsAndConditionsPage.tsx`](src/pages/TermsAndConditionsPage.tsx)
**Terms and Conditions**
- Service terms
- User obligations
- Liability disclaimers

### Authentication Pages

#### [`ForgotPasswordPage.tsx`](src/pages/ForgotPasswordPage.tsx)
**Password Reset Request**
- Account number validation
- Email verification
- Rate limiting
- Success/error modals

#### [`UpdatePasswordPage.tsx`](src/pages/UpdatePasswordPage.tsx)
**Password Reset Completion**
- Token validation
- Password strength requirements
- Confirmation matching

### Utility Pages

#### [`ImageGeneratorPage.tsx`](src/pages/ImageGeneratorPage.tsx)
**AI Image Generation**
- Gemini AI integration
- Image generation interface

#### [`SmsConsentPreviewPage.tsx`](src/pages/SmsConsentPreviewPage.tsx)
**SMS Consent Preview**
- Consent form preview
- Testing interface

---

## Context Providers

### [`AuthContext.tsx`](src/context/AuthContext.tsx)
**Authentication & User State Management**

**Key Features:**
- User authentication (login/logout)
- 2FA support
- Session management
- Password change enforcement
- Discount calculation
- Customer account selection (staff workflow)
- Modal state management

**State:**
- `user` - Current user object
- `isAuthenticated` - Auth status
- `isLoading` - Loading state
- `showPasswordChangeModal` - Password change UI
- `showSearchEntityModal` - Entity search UI
- `activeDiscount` - Current discount info

**Methods:**
- `login(identifier, password)` - Authenticate user
- `loginWith2FA(identifier, password, code)` - 2FA login
- `logout()` - End session
- `calculateBestDiscount(accountNumber)` - Get best discount
- `selectCustomerAccount(accountId, businessName)` - Staff customer selection
- `validateAndRefreshSession()` - Session validation

### [`CartContext.tsx`](src/context/CartContext.tsx)
**Shopping Cart State Management**

**Key Features:**
- Cart persistence (localStorage + database)
- Promo code application
- Auto-apply qualifying promos
- Backorder management
- Order placement
- Cart restoration

**State:**
- `items` - Cart items array
- `appliedPromoCodes` - Active promo codes
- `autoAppliedPromoItems` - Free items from promos
- `showCartRestorationModal` - Restore cart UI

**Methods:**
- `addToCart(product, quantity)` - Add item
- `removeFromCart(partnumber)` - Remove item
- `updateQuantity(partnumber, quantity)` - Update quantity
- `applyPromoCode(code)` - Apply promo
- `placeOrder(...)` - Submit order
- `restoreCartFromDatabase()` - Restore saved cart
- `emptyEntireCart()` - Clear cart

### [`NotificationContext.tsx`](src/context/NotificationContext.tsx)
**Global Notification System**

**Methods:**
- `showNotification(message, type, duration)` - Display notification
- `hideNotification()` - Dismiss notification

---

## Services

### [`activityTracker.ts`](src/services/activityTracker.ts)
**User Activity Tracking**
- Page view tracking
- Shopping activity logging
- Session management

### [`aiChatService.ts`](src/services/aiChatService.ts)
**AI Chat Integration**
- OpenAI API integration
- Knowledge base querying
- Context management
- Response generation

### [`secureVoiceService.ts`](src/services/secureVoiceService.ts)
**Voice Communication**
- ElevenLabs integration
- Text-to-speech
- Voice configuration
- Rate limiting

---

## Utilities

### [`adminSessionManager.ts`](src/utils/adminSessionManager.ts)
**Admin Session Management**
- Session timeout handling
- Activity tracking
- Auto-logout

### [`checkDbUpdate.ts`](src/utils/checkDbUpdate.ts)
**Database Schema Validation**
- Schema version checking
- Migration status

### [`errorReporting.ts`](src/lib/errorReporting.ts)
**Error Handling**
- Global error catching
- Error logging
- User feedback

---

## Database & Migrations

### Key Tables

#### Authentication & Users
- `accounts` - Customer accounts
- `staff_members` - Staff users
- `security_levels` - Permission levels

#### Products & Inventory
- `pre_products_supabase` - Product catalog
- `product_groups` - Category hierarchy

#### Orders
- `web_orders` - Order records
- `order_line_items` - Order details

#### Promotions
- `promo_codes` - Promotional codes
- `promo_code_usage` - Usage tracking
- `account_discounts` - Account-specific discounts

#### CRM
- `prospector` - Prospect records
- `prospect_activities` - Activity log
- `companies` - Company information

#### System
- `site_status` - Site online/offline status
- `system_log` - System events
- `sms_failures` - Failed SMS tracking

### Recent Migrations

#### [`20251013_add_prospector_enrichment_fields.sql`](migrations/20251013_add_prospector_enrichment_fields.sql)
- Added AI analysis fields to prospector table
- Icebreakers, pain points, buying signals

#### [`20251014_add_ai_grading_fields.sql`](migrations/20251014_add_ai_grading_fields.sql)
- Added AI grading system
- Qualification scores

#### [`20251014_add_phone_to_prospector.sql`](migrations/20251014_add_phone_to_prospector.sql)
- Added phone field to prospector

---

## Configuration Files

### [`vite.config.ts`](vite.config.ts)
**Vite Build Configuration**
- React plugin
- PWA configuration (disabled)
- Proxy setup for Supabase functions
- Cache busting with version
- Source maps

### [`package.json`](package.json)
**Dependencies & Scripts**
- Version: RC1013.1015z
- Build scripts
- Development server
- Version management

### [`.env.example`](.env.example)
**Environment Variables Template**
- Supabase configuration
- API keys
- Feature flags

### [`netlify.toml`](netlify.toml)
**Netlify Deployment**
- Build settings
- Redirects
- Headers

---

## Key Features

### 1. Multi-Tier Authentication
- Account number + password
- PIN-based 2FA
- Security questions
- Password strength enforcement
- Session management

### 2. Role-Based Access Control
- Admin (Account 999)
- Special Admin (Account 99)
- Staff members
- Customers
- Security levels with granular permissions

### 3. Advanced Promotional System
- Template-based promo codes
- Auto-application logic
- Spend thresholds
- Free item promotions
- Account-specific discounts
- Date-based promotions

### 4. CRM & Prospect Management
- AI-powered prospect intelligence
- Website scraping
- Activity tracking
- Contact history
- Icebreaker generation
- Qualification scoring

### 5. Real-Time Features
- Live chat with Socket.io
- Inventory updates
- Order notifications
- SMS alerts

### 6. AI Integration
- Chat support (OpenAI)
- Voice synthesis (ElevenLabs)
- Prospect analysis
- Image generation (Gemini)

### 7. E-Commerce Features
- Product catalog with categories
- Advanced search and filtering
- Shopping cart with persistence
- Backorder management
- Order history
- Reorder functionality

### 8. Admin Tools
- Product management grid
- Staff management
- Knowledge base editor
- Promo code manager
- Order monitoring
- System settings

### 9. Communication
- SMS notifications (ClickSend)
- Email communications
- SMS consent management
- TCPA compliance

### 10. Developer Features
- Version checking with auto-refresh
- Error boundary
- Network request logging
- Cache busting
- MCP server integration

---

## MCP Servers

### Connected Servers

1. **context7** - Library documentation
2. **filesystem** - File operations
3. **sequentialthinking** - Problem-solving
4. **brave-search** - Web search

---

## Development Notes

### Code Quality
- TypeScript for type safety
- React hooks for state management
- Context API for global state
- Error boundaries for resilience

### Performance
- Lazy loading
- Image optimization
- Pagination
- Debounced saves
- Memoization

### Security
- Environment variables
- Secure password hashing
- Session validation
- Rate limiting
- SQL injection prevention

### Accessibility
- Keyboard navigation
- Font size options
- Screen reader support
- ARIA labels

---

## Future Enhancements

Based on codebase analysis:
- PWA re-enablement (currently disabled)
- Enhanced mobile responsiveness
- Advanced analytics
- Bulk import improvements
- API documentation
- Test coverage

---

**End of Code Index**

*This index was automatically generated by analyzing the codebase structure and key files.*
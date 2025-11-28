# Backend & Database Management

## Overview
The Music Supplies application uses Supabase as the backend with PostgreSQL database, Edge Functions, and real-time capabilities.

## Database Architecture

### Core Tables

#### accounts_lcmd
**Primary customer account table**
- `account_number` (PRIMARY KEY): Unique customer identifier
- `acct_name`: Customer business/account name
- `address`, `city`, `state`, `zip`: Physical address information
- `email_address`: Primary contact email
- `phone`: Primary phone number
- `mobile_phone`: Mobile contact (added 2025-08-02)

#### user_passwords
**Secure password storage**
- `account_number` (FOREIGN KEY): Links to accounts_lcmd
- `password_hash`: bcrypt hashed password
- `created_at`, `updated_at`: Timestamp tracking

#### web_orders
**Order management and tracking**
- `order_id` (PRIMARY KEY): Unique order identifier
- `account_number`: Customer account
- `order_details`: JSON product data
- `total_amount`: Order total
- `order_status`: Current status
- `created_at`: Order timestamp

#### promo_codes
**Discount code management**
- `code`: Promo code string (PRIMARY KEY)
- `discount_percent`: Percentage discount
- `is_single_use`: One-time use flag
- `is_active`: Enable/disable status
- `usage_count`: Times used
- `created_at`: Creation timestamp

#### sms_notification_failures
**SMS delivery tracking**
- `id` (PRIMARY KEY): Unique failure record
- `account_number`: Target account
- `phone_number`: Destination number
- `message`: SMS content
- `error_message`: Failure reason
- `created_at`: Failure timestamp

### Database Functions

#### Core Authentication Functions
```sql
-- Primary authentication function
authenticate_account(p_account_number integer, p_password text)

-- Master password override
authenticate_with_master_password(p_account_number integer, p_master_password text)

-- Password hashing utility
hash_password(p_plain_password text) RETURNS text
```

#### Account Management Functions
```sql
-- Account creation and updates
create_user_account(...)
update_account_info(...)
reset_user_password(...)
```

#### Order Processing Functions
```sql
-- Order lifecycle management
create_web_order(...)
update_order_status(...)
calculate_order_total(...)
```

## Supabase Configuration

### Project Details
- **Project**: Music Supplies hosted instance
- **Region**: Multi-region deployment
- **Database**: PostgreSQL 15+
- **Real-time**: Enabled for order updates

### Environment Variables
```env
REACT_APP_SUPABASE_URL=https://[project-ref].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-key]
```

### Row Level Security (RLS)
- **Enabled** on all customer-facing tables
- **Policies**: Account-based access control
- **Admin Override**: Service role bypass for admin functions

## Edge Functions

### Authentication Function
**File**: `supabase/functions/authenticate-with-master-password/index.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export default async (request: Request): Promise<Response> => {
  // Master password authentication logic
}
```

### Email Service
**File**: `supabase/functions/send-mailgun-email/index.ts`
- **Purpose**: Order confirmations and notifications
- **Integration**: Mailgun API
- **Templates**: HTML email generation

### SMS Service  
**File**: `supabase/functions/send-admin-sms/index.ts`
- **Purpose**: Admin notifications
- **Provider**: ClickSend API
- **Regions**: Global SMS support

### PDF Generation
**File**: `supabase/functions/generate-pdf-invoice/index.ts`
- **Purpose**: Professional invoice generation
- **Library**: PDF generation utilities
- **Templates**: Standardized invoice format

### S3 Integration
**File**: `supabase/functions/list-s3-files/index.ts`
- **Purpose**: Product image management
- **Storage**: AWS S3 bucket access
- **Caching**: Optimized file delivery

## Database Migrations

### Migration Management
- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDD_description.sql`
- **Versioning**: Sequential timestamp-based

### Key Migrations
```sql
-- Recent critical migrations
20250802_add_mobile_phone_to_accounts.sql
20250729_create_user_preferences_table.sql
20250728_fix_sms_failure_notifications.sql
20250728_create_sms_notification_failures_table.sql
20250725_create_new_account_applications_table.sql
20250724_strengthen_promo_code_single_use.sql
```

### Migration Deployment
```bash
# Using Supabase MCP (PREFERRED)
supabase.apply_migration("migration_name", "SQL_CONTENT")

# Direct CLI (if needed)
supabase migration up
```

## Backend APIs

### REST API Endpoints
- **Base URL**: `https://[project-ref].supabase.co/rest/v1/`
- **Authentication**: Bearer token required
- **Format**: JSON request/response
- **Rate Limiting**: Configured per plan

### GraphQL Support
- **Endpoint**: `https://[project-ref].supabase.co/graphql/v1`
- **Schema**: Auto-generated from database
- **Real-time**: Subscription support

## Database Security

### Access Control
- **Public Access**: Limited to authentication functions
- **RLS Policies**: Strict account-based filtering
- **Service Role**: Admin-only operations
- **API Keys**: Environment-based rotation

### Backup Strategy
- **Automatic**: Daily full backups
- **Point-in-time**: Recovery available
- **Geographic**: Multi-region redundancy
- **Retention**: 30-day standard

### Monitoring
- **Performance**: Query optimization tracking
- **Connections**: Pool monitoring
- **Errors**: Real-time error logging
- **Capacity**: Storage and compute alerts

## Performance Optimization

### Indexing Strategy
```sql
-- Critical indexes for performance
CREATE INDEX idx_accounts_account_number ON accounts_lcmd(account_number);
CREATE INDEX idx_user_passwords_account ON user_passwords(account_number);
CREATE INDEX idx_web_orders_account ON web_orders(account_number);
CREATE INDEX idx_web_orders_status ON web_orders(order_status);
```

### Query Optimization
- **Connection Pooling**: pgBouncer enabled
- **Prepared Statements**: Parameterized queries
- **Result Caching**: Strategic cache implementation
- **Batch Operations**: Bulk insert/update patterns

### Connection Management
- **Pool Size**: Optimized for concurrent users
- **Timeout Settings**: Balanced for performance
- **Idle Connections**: Automatic cleanup
- **Failover**: Automatic failover support

## Development Workflow

### Local Development
```bash
# Start local Supabase instance
supabase start

# Apply migrations
supabase migration up

# Generate types
supabase gen types typescript > src/types/database.ts
```

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint validation
- **Performance Tests**: Load testing protocols
- **Security Tests**: Penetration testing

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code style enforcement
- **Prettier**: Consistent formatting
- **Pre-commit Hooks**: Quality gates

## Troubleshooting

### Common Issues
1. **Connection Timeouts**: Check pool configuration
2. **RLS Violations**: Verify policy permissions
3. **Migration Failures**: Review SQL syntax and dependencies
4. **Performance Degradation**: Analyze query execution plans

### Monitoring Tools
- **Supabase Dashboard**: Real-time metrics
- **PostgreSQL Logs**: Detailed query logging  
- **Performance Insights**: Query performance analysis
- **Error Tracking**: Structured error reporting

## Current Status
- **Database**: ✅ HEALTHY
- **Edge Functions**: ✅ OPERATIONAL
- **Migrations**: ✅ UP TO DATE
- **Performance**: ✅ OPTIMIZED
- **Security**: ✅ SECURED
- **Backups**: ✅ ACTIVE

## Related Files
- `supabase/migrations/` - Database schema changes
- `supabase/functions/` - Edge function implementations
- `src/types/database.ts` - TypeScript type definitions
- `.env` - Environment configuration
- `supabase/config.toml` - Supabase configuration

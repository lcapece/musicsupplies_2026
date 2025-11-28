# Sales Workflow System Documentation

## Overview

This document outlines the comprehensive sales workflow system for Music Supplies, covering prospect management, duplicate detection, account conversion, and order processing workflows.

## Database Architecture

### Core Tables

#### accounts_lcmd (4,526 records)
- **Purpose**: Active customer accounts
- **Max Account Number**: 50,505 (auto-incrementing)
- **Key Fields**:
  - `account_number` (integer, PK)
  - `acct_name` (business name)
  - `address`, `city`, `state`, `zip`
  - `phone`, `email_address`, `mobile_phone`
  - `contact` (contact person)
  - `salesman`, `terms`

#### prospects (10,460 records)
- **Purpose**: Potential customers/leads
- **Key Fields**:
  - `prospect_id` (integer, PK)
  - `business_name`
  - `address`, `city`, `state`, `zip`
  - `phone`, `email`
  - `contact` (contact person)
  - `notes`, `source`
  - `prospect_cat` (category)
  - `google_reviews`, `website`

#### v_entity_type_union (View)
- **Purpose**: Unified view combining accounts and prospects
- **Structure**:
  ```sql
  SELECT account_number AS id, acct_name AS business_name, 
         city, state, zip, phone, email_address AS web, 'account' AS type
  FROM accounts_lcmd
  UNION ALL
  SELECT prospect_id AS id, business_name, 
         city, state, zip, phone, website AS web, 'prospect' AS type  
  FROM prospects
  ```

## Sales Workflow System

### Current System: SearchEntityModal
- **Purpose**: Staff impersonation for customer support
- **Trigger**: When staff login credentials detected
- **Search**: Account number OR general filters
- **Function**: Allows staff to log in as customer accounts

### New System: Sales Workflow Enhancement

#### 1. Workflow Selection Modal
When staff accesses the search system, present choice:
- **"Original Search Entity"** - Current staff impersonation system
- **"New Sales Workflow"** - Enhanced sales process for prospect management

#### 2. New Business Workflow Form
**Input Fields:**
- Business Name (required)
- ZIP Code (required) 
- Additional filters (optional)

**Search Logic:**
- Search both accounts AND prospects simultaneously
- Prioritize exact matches over partial matches
- Display results in separate sections with clear labeling

#### 3. Duplicate Detection Algorithm
**Matching Criteria:**
- **ZIP**: First 5 digits match
- **Address**: First 8 characters match (case-insensitive)
- **Business Name**: First 3 characters match (case-insensitive)

**Detection Process:**
```javascript
function detectDuplicate(prospect, accounts) {
  const prospectZip = prospect.zip?.substring(0, 5) || '';
  const prospectAddr = prospect.address?.substring(0, 8).toLowerCase() || '';
  const prospectName = prospect.business_name?.substring(0, 3).toLowerCase() || '';
  
  return accounts.find(account => {
    const accountZip = account.zip?.substring(0, 5) || '';
    const accountAddr = account.address?.substring(0, 8).toLowerCase() || '';
    const accountName = account.acct_name?.substring(0, 3).toLowerCase() || '';
    
    return prospectZip === accountZip && 
           prospectAddr === accountAddr && 
           prospectName === accountName;
  });
}
```

## Sales Process Workflows

### Workflow A: Existing Account (Dormant)
1. **Customer calls** → Salesperson gets business name + ZIP
2. **Search reveals** → Existing account in accounts_lcmd
3. **System shows** → Account details with "Reactivate Account" option
4. **Salesperson** → Proceeds with order using existing account

### Workflow B: Prospect Found (No Duplicates)
1. **Customer calls** → Salesperson gets business name + ZIP
2. **Search reveals** → Prospect in prospects table, no account duplicates
3. **System shows** → Prospect details with "Select for Order" option
4. **Salesperson** → Loads prospect into holding space for order
5. **Order confirmed** → Auto-convert prospect to account (next available #)
6. **Order processing** → Proceeds with new account number

### Workflow C: Prospect Found (With Duplicates)
1. **Customer calls** → Salesperson gets business name + ZIP
2. **Search reveals** → Prospect + potential duplicate account
3. **System shows** → Warning with duplicate account details
4. **Salesperson decides**:
   - **Same entity** → Delete prospect, use existing account
   - **Different entity** → Proceed with prospect conversion
5. **Order processing** → Based on decision above

### Workflow D: No Results Found
1. **Customer calls** → Salesperson gets business name + ZIP
2. **Search reveals** → No matches in accounts or prospects
3. **System shows** → "Create New Account" modal
4. **Salesperson** → Collects all required information
5. **Account creation** → Direct insertion into accounts_lcmd
6. **Order processing** → Proceeds with new account

## Technical Implementation

### Frontend Components Required

#### 1. WorkflowSelectionModal.tsx
```typescript
interface WorkflowSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
  onSelectNewWorkflow: () => void;
}
```

#### 2. SalesWorkflowModal.tsx
```typescript
interface SalesWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectSelected: (prospect: Prospect) => void;
  onAccountSelected: (account: Account) => void;
  onCreateNewAccount: () => void;
}
```

#### 3. DuplicateWarningModal.tsx
```typescript
interface DuplicateWarningModalProps {
  isOpen: boolean;
  prospect: Prospect;
  duplicateAccount: Account;
  onDeleteProspect: () => void;
  onProceedWithProspect: () => void;
  onUseExistingAccount: () => void;
}
```

#### 4. NewAccountModal.tsx
```typescript
interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (accountNumber: number) => void;
  initialData?: Partial<AccountData>;
}
```

#### 5. ProspectHoldingArea.tsx
```typescript
interface ProspectHoldingAreaProps {
  selectedProspect: Prospect | null;
  onConvertToAccount: () => Promise<number>;
  onUpdateNotes: (notes: string) => void;
  onClearSelection: () => void;
}
```

### Backend Functions Required

#### 1. Search Function
```sql
CREATE OR REPLACE FUNCTION search_prospects_and_accounts(
  p_business_name TEXT,
  p_zip_code TEXT
) RETURNS TABLE(
  entity_type TEXT,
  entity_id INTEGER,
  business_name TEXT,
  full_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  contact TEXT,
  notes TEXT
);
```

#### 2. Duplicate Detection Function
```sql
CREATE OR REPLACE FUNCTION detect_account_duplicates(
  p_prospect_id INTEGER
) RETURNS TABLE(
  duplicate_account_number INTEGER,
  match_reason TEXT,
  confidence_score INTEGER
);
```

#### 3. Prospect Conversion Function
```sql
CREATE OR REPLACE FUNCTION convert_prospect_to_account(
  p_prospect_id INTEGER,
  p_salesperson TEXT DEFAULT NULL
) RETURNS INTEGER; -- Returns new account number
```

#### 4. Account Creation Function
```sql
CREATE OR REPLACE FUNCTION create_new_account(
  p_business_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_zip TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_contact TEXT DEFAULT NULL,
  p_salesperson TEXT DEFAULT NULL
) RETURNS INTEGER; -- Returns new account number
```

## User Interface Design

### Sales Dashboard Integration
- **Access Point**: New button in Header or Dashboard
- **Permissions**: Sales staff and managers only
- **Navigation**: Modal-based workflow (no new routes needed)

### Visual Hierarchy
1. **Primary Action**: Large, prominent "New Sales Call" button
2. **Search Results**: Clear separation of Accounts vs Prospects
3. **Warning Indicators**: Red alerts for potential duplicates
4. **Action Buttons**: Green for proceed, Yellow for review, Red for warnings

### Data Validation
- **Required Fields**: Business name, ZIP code minimum
- **Format Validation**: Phone numbers, email addresses
- **Business Rules**: No duplicate account numbers, ZIP code format
- **Error Handling**: Clear error messages with suggested actions

## Security Considerations

### Access Control
- **Sales Staff**: Can search, create accounts, convert prospects
- **Managers**: Full access + audit trail viewing
- **Admin**: System configuration and data cleanup
- **Regular Users**: No access to sales workflows

### Data Protection
- **Audit Logging**: All prospect conversions and account creations
- **Change Tracking**: Who created/modified what and when
- **Data Retention**: Preserve prospect notes in account history
- **Privacy**: Secure handling of customer contact information

## Integration Points

### Order Management System
- **Account Assignment**: Automatic account number assignment to orders
- **Price Lists**: Inherit pricing rules from account setup
- **Credit Terms**: Apply default terms or custom terms during conversion

### CRM Integration
- **Contact History**: Preserve all notes from prospect record
- **Sales Attribution**: Track which salesperson handled conversion
- **Follow-up Tracking**: Maintain relationship history

### Reporting & Analytics
- **Conversion Metrics**: Prospect→Account conversion rates
- **Sales Performance**: Track successful account creations by staff
- **Duplicate Prevention**: Monitor false positive rates in duplicate detection

## Standard Operating Procedures (SOP)

### For Sales Staff

#### Incoming Sales Call Process
1. **Greet Customer**: "Thank you for calling Music Supplies..."
2. **Gather Information**: "What's your business name and ZIP code?"
3. **Search System**: Enter business name + ZIP in sales workflow
4. **Evaluate Results**: Check for existing accounts or prospects
5. **Follow Workflow**: Based on search results (A, B, C, or D above)
6. **Process Order**: Using determined account number

#### Duplicate Detection Response
1. **Review Match**: Examine duplicate warning details
2. **Ask Customer**: "Are you located at [address]?"
3. **Verify Identity**: Confirm business details
4. **Make Decision**: 
   - Same business → Use existing account
   - Different business → Proceed with new account
5. **Document Decision**: Add notes explaining reasoning

### For Managers

#### System Monitoring
- **Daily Review**: Check conversion reports
- **Quality Control**: Audit duplicate detection decisions
- **Staff Training**: Address common issues or confusion
- **Data Cleanup**: Remove invalid prospects or accounts

#### Exception Handling
- **Disputed Duplicates**: Final authority on duplicate decisions
- **System Errors**: Escalation procedures for technical issues
- **Data Corrections**: Process for fixing incorrect conversions

## Error Handling & Recovery

### Common Scenarios
1. **Network Timeouts**: Retry mechanisms and user feedback
2. **Database Conflicts**: Handle concurrent account creation
3. **Invalid Data**: Validation errors and correction guidance
4. **System Downtime**: Fallback procedures for sales continuity

### Recovery Procedures
- **Failed Conversions**: How to manually complete prospect→account
- **Duplicate Accounts**: Process for merging or deactivating
- **Lost Data**: Backup and recovery procedures

## Performance Considerations

### Database Optimization
- **Indexing**: ZIP code, business name, address fields
- **Query Efficiency**: Limit result sets, use appropriate joins
- **Caching**: Frequently accessed account data

### User Experience
- **Response Times**: Target < 2 seconds for searches
- **Progressive Loading**: Show results as they become available
- **Offline Handling**: Graceful degradation when connectivity issues

## Version History
- **v1.0**: Initial sales workflow system design
- **v1.1**: Enhanced duplicate detection algorithm
- **v1.2**: Integration with existing SearchEntityModal

This documentation will serve as both technical specification and training manual for your sales team. Ready to implement?
</response>
<task_progress>
- [x] Image resolution enhancement (completed)
- [x] Analyze current database structure (accounts_lcmd vs prospects)
- [x] Check existing view structure (v_entity_type_union)
- [x] Get current max account number (50,505)
- [x] Define duplicate detection algorithm (5-digit ZIP + 8-char address + 3-char name)
- [x] Plan comprehensive documentation structure
- [ ] Create SALES_WORKFLOW_SYSTEM.md documentation
- [ ] Create workflow selection popup modal
- [ ] Create new business workflow form
- [ ] Implement duplicate detection system
- [ ] Build prospect-to-account conversion
- [ ] Create new account onboarding modal
- [ ] Write complete SOP documentation
- [ ] Test complete sales workflow system
</task_progress>
</write_to_file>

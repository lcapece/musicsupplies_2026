# Sales Workflow Standard Operating Procedures (SOP)

## Overview

This document provides step-by-step procedures for sales staff using the new Sales Workflow System at Music Supplies. This system helps manage prospects, prevent duplicate accounts, and streamline the customer onboarding process.

## Quick Reference

### When a Customer Calls
1. **Get Info**: Business name + ZIP code
2. **Search**: Use Sales Workflow Modal
3. **Evaluate**: Check results for accounts/prospects
4. **Follow**: Appropriate workflow (A, B, C, or D)
5. **Process**: Take order with correct account number

### Workflow Types
- **A**: Existing Account (reactivate)
- **B**: Prospect Found (no duplicates) 
- **C**: Prospect Found (with duplicates)
- **D**: No Results (create new account)

## Detailed Procedures

### Accessing the Sales Workflow

#### Step 1: Login and Access
1. **Login** with your staff credentials
2. **System detects** you as staff member
3. **Modal appears**: "Select Workflow" 
4. **Choose**: "New Sales Workflow" (for sales calls)

> **Note**: Choose "Original Search Entity" only for customer support tasks

#### Step 2: Sales Call Intake
**Standard Greeting**: 
> "Thank you for calling Music Supplies. May I get your business name and ZIP code to better assist you?"

**Required Information**:
- Business name (full legal name preferred)
- ZIP code (5-digit minimum)
- Optional: Phone number, city for additional filtering

### Workflow A: Existing Account Found

#### When This Happens
- Search returns results in "Existing Accounts" section
- Customer's business already has an account

#### Procedure
1. **Click** on the account result
2. **Verify** with customer: "I see you have account #[NUMBER]. Is your business located at [ADDRESS]?"
3. **If confirmed**: Proceed with order using existing account
4. **If different**: Continue searching or use Workflow D

#### Script Example
> "I found your account in our system - you're account #[NUMBER] at [ADDRESS]. Let me help you with your order today."

### Workflow B: Prospect Found (No Duplicates)

#### When This Happens
- Search returns results in "Prospects" section
- No red "DUPLICATE RISK" warnings shown
- Customer is in our prospect database but not yet a customer

#### Procedure
1. **Click** on the green prospect result
2. **Prospect loads** into Holding Area
3. **Verify information** with customer
4. **Take order** details
5. **When ready**: Click "CONFIRM ORDER & CONVERT TO ACCOUNT"
6. **System assigns** new account number automatically
7. **Process order** with new account number

#### Script Example
> "I found your business in our prospect database. Let me update your information and we'll get you set up as a customer account today."

### Workflow C: Prospect Found (With Duplicates)

#### When This Happens
- Search returns prospect with red "DUPLICATE RISK" warning
- System detected potential match with existing account

#### Procedure
1. **DO NOT** click the red prospect immediately
2. **Check** the duplicate details at bottom of screen
3. **Ask customer**: "Are you located at [ACCOUNT ADDRESS]?"

#### If Customer Says YES (Same Business)
1. **Click** the existing account instead of prospect
2. **Proceed** with Workflow A
3. **Optional**: Delete the duplicate prospect later

#### If Customer Says NO (Different Business)
1. **Click** the red prospect result
2. **System shows** duplicate warning modal
3. **Click**: "DIFFERENT BUSINESS - Proceed with Prospect"
4. **Continue** with Workflow B

#### Script Examples
**Verification**: 
> "I want to make sure I have the right account. Are you located at [ADDRESS] in [CITY]?"

**If Same Business**: 
> "Perfect, I have your account here. You're account #[NUMBER]. Let me help you with your order."

**If Different Business**: 
> "I understand you're a different location. Let me set you up with a new account."

### Workflow D: No Results Found

#### When This Happens
- No results in either Accounts or Prospects sections
- "No Results Found" message appears with "CREATE NEW ACCOUNT" button

#### Procedure
1. **Click**: "CREATE NEW ACCOUNT" button
2. **Fill out** new account form:
   - **Business Name** (required)
   - **Full Address** (required) 
   - **City, State, ZIP** (required)
   - **Phone Number** (required)
   - **Email Address** (recommended)
   - **Contact Person** (recommended)
   - **Assigned Salesperson** (select appropriate)
   - **Payment Terms** (default: NET 30)
3. **Verify** information with customer
4. **Click**: "CREATE NEW ACCOUNT"
5. **System assigns** new account number
6. **Process order** with new account

#### Script Example
> "I don't see your business in our system yet. Let me get you set up as a new customer. This will just take a moment..."

## Duplicate Detection Guide

### Understanding the Algorithm
The system compares:
- **ZIP Code**: First 5 digits
- **Address**: First 8 characters  
- **Business Name**: First 3 characters

### Common Duplicate Scenarios

#### Scenario 1: Legitimate Duplicates
- **Example**: Same business, slightly different address format
- **Action**: Use existing account, delete prospect
- **Signs**: Same phone number, same contact person

#### Scenario 2: False Positives
- **Example**: Different businesses in same ZIP code
- **Action**: Proceed with prospect conversion
- **Signs**: Different phone numbers, different contact names

#### Scenario 3: Chain Stores/Franchises
- **Example**: Multiple locations of same brand
- **Action**: Each location needs separate account
- **Signs**: Same business name but different addresses

### Decision Tree for Duplicates

```
Duplicate Warning Appears
│
├─ Ask: "Are you located at [ADDRESS]?"
│
├─ YES → Same Business
│  ├─ Use existing account
│  ├─ Note: "Found duplicate prospect"
│  └─ Optional: Delete prospect later
│
└─ NO → Different Business
   ├─ Verify phone numbers are different
   ├─ Verify contact names are different
   ├─ Proceed with prospect conversion
   └─ Note: "Confirmed different business"
```

## Error Handling

### Common Issues and Solutions

#### "Search Failed" Error
- **Cause**: Database connection issue
- **Solution**: Wait 30 seconds and try again
- **Escalation**: Contact IT if persists

#### "Prospect Not Found" Error  
- **Cause**: Prospect was deleted by another user
- **Solution**: Search again or create new account
- **Prevention**: Don't leave prospects selected for long periods

#### "Account Number Assignment Failed"
- **Cause**: Database concurrency issue
- **Solution**: Try account creation again
- **Escalation**: Contact manager if repeated failures

### Emergency Procedures

#### System Down During Order
1. **Take order** manually on paper
2. **Get customer contact** information
3. **Process order** when system returns
4. **Create account** retroactively if needed

#### Uncertain Duplicate Decision
1. **Get manager approval** before proceeding
2. **Document reasoning** in prospect notes
3. **Err on side** of using existing account
4. **Follow up** with customer to confirm

## Best Practices

### For Sales Efficiency

#### Prepare Customer Information
- **Ask upfront**: "What's your business name and ZIP code?"
- **Spell check**: Confirm spelling of business name
- **Verify ZIP**: Ensure 5-digit ZIP code is correct

#### Use Search Effectively
- **Start broad**: Use partial business name if full name doesn't work
- **Be flexible**: Try abbreviations (e.g., "Music" instead of "Musical")
- **Add filters**: Use phone/city if too many results

#### Handle Duplicates Professionally
- **Stay calm**: Duplicate detection helps prevent problems
- **Verify politely**: "Let me confirm your address..."
- **Explain briefly**: "We want to make sure you get the right pricing"

### For Data Quality

#### Account Creation Standards
- **Full legal name**: Use complete business name
- **Complete address**: Include suite/unit numbers
- **Consistent format**: Follow existing data patterns
- **Accurate phone**: Include area codes

#### Notes and Documentation
- **Be specific**: "Converted from prospect #[ID]"
- **Include context**: "Customer confirmed different from account #[ID]"
- **Date entries**: System adds timestamps automatically

### For Customer Service

#### Communication Tips
- **Be professional**: Explain system helps serve them better
- **Be patient**: Some customers may be confused by questions
- **Be thorough**: Confirm all details before creating account

#### Follow-up Actions
- **Welcome new accounts**: "Welcome to Music Supplies!"
- **Confirm details**: "I'll email you a confirmation with your account details"
- **Set expectations**: "Your account number is [NUMBER] for future reference"

## Troubleshooting Guide

### Search Results Issues

#### No Results But Customer Insists They're in System
1. **Try variations**: Different business name formats
2. **Check old ZIP**: Ask if they've moved recently
3. **Use phone number**: In additional filters field
4. **Check with manager**: For manual lookup assistance

#### Too Many Results
1. **Add ZIP code**: If only used business name
2. **Use additional filters**: Phone number or city
3. **Ask customer**: For more specific information
4. **Narrow down**: Use partial phone number

### Duplicate Detection Issues

#### System Shows Duplicate But They're Clearly Different
1. **Document decision**: In prospect notes
2. **Proceed with conversion**: Click "Different Business"
3. **Add note**: "Confirmed different business despite system match"
4. **Inform manager**: For system improvement

#### Customer Uncertain About Address
1. **Ask for current address**: They may have moved
2. **Check both locations**: Old account might be outdated
3. **Use phone number**: To help distinguish
4. **When in doubt**: Create new account

### Account Creation Issues

#### Customer Doesn't Have All Required Information
1. **Get what you can**: Business name and ZIP minimum
2. **Schedule callback**: To complete missing information
3. **Create basic account**: With "INCOMPLETE" note
4. **Follow up**: Within 24 hours

#### Business Name Format Confusion
1. **Use legal name**: As it appears on business license
2. **Include "LLC", "Inc"**: If customer specifies
3. **Be consistent**: With existing account formats
4. **When unsure**: Ask customer preference

## Reporting and Analytics

### Daily Procedures

#### Start of Shift
- [ ] Verify system access
- [ ] Check for overnight prospect updates
- [ ] Review any flagged duplicates from previous day

#### End of Shift  
- [ ] Update any incomplete prospect notes
- [ ] Report any system issues to manager
- [ ] Document any unusual duplicate cases

### Weekly Procedures

#### Sales Staff
- [ ] Review conversion success rate
- [ ] Identify common duplicate patterns
- [ ] Update manager on system effectiveness

#### Managers
- [ ] Audit duplicate decisions
- [ ] Review new account quality
- [ ] Provide feedback to sales staff
- [ ] Report issues to IT/Admin

## Training Checklist

### New Sales Staff Must Demonstrate

#### Basic Operations
- [ ] Access workflow selection modal
- [ ] Search for prospects and accounts
- [ ] Identify duplicate warnings
- [ ] Create new account
- [ ] Update prospect notes

#### Decision Making
- [ ] Distinguish between duplicate types
- [ ] Handle uncertain duplicate scenarios
- [ ] Escalate complex cases appropriately
- [ ] Document decisions properly

#### Customer Service
- [ ] Explain system to confused customers
- [ ] Handle customer objections to questions
- [ ] Confirm account details professionally
- [ ] Welcome new customers appropriately

### Certification Requirements
- [ ] Pass system navigation test
- [ ] Complete 5 supervised sales calls
- [ ] Handle 2 duplicate scenarios correctly
- [ ] Create 1 new account successfully
- [ ] Manager approval for independent operation

## Contact Information

### System Issues
- **IT Support**: [Contact Information]
- **Database Issues**: [Contact Information]
- **Access Problems**: [Contact Information]

### Business Process Questions
- **Sales Manager**: [Contact Information]
- **Customer Service Manager**: [Contact Information]
- **System Administrator**: [Contact Information]

## Version History

- **v1.0** (2025-09-17): Initial SOP creation
- **v1.1** (TBD): Post-implementation updates
- **v1.2** (TBD): Staff feedback integration

---

**Document Owner**: Sales Management  
**Last Updated**: September 17, 2025  
**Review Schedule**: Monthly  
**Next Review**: October 17, 2025

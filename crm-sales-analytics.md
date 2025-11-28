# Sales Analytics Data Documentation

> **Purpose:** This document describes the sales analytics data layer for the CRM dashboard. It serves as both technical documentation and build instructions for the UI components.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Architecture](#data-architecture)
3. [Table Reference](#table-reference)
   - [order_history_lcmd](#order_history_lcmd)
   - [agg_account_daily](#agg_account_daily)
   - [agg_account_health](#agg_account_health)
   - [agg_salesman_performance](#agg_salesman_performance)
   - [predictions_account_part](#predictions_account_part)
   - [predictions_account_category](#predictions_account_category)
   - [opportunities_account_crosssell](#opportunities_account_crosssell)
4. [UI Components Specification](#ui-components-specification)
5. [Common Queries](#common-queries)
6. [Business Context](#business-context)

---

## Overview

This data layer supports a B2B wholesale musical instruments and supplies business. The analytics system tracks:

- **Account Health:** Identifies thriving, stable, at-risk, and churned customers
- **Reorder Predictions:** Predicts when customers will need to reorder specific products
- **Cross-Sell Opportunities:** Identifies products that similar customers buy but this customer doesn't
- **Salesperson Performance:** Tracks and ranks sales team metrics

**Data Refresh:** Hourly via automated sync from source ERP system.

**Data Source:** Supabase PostgreSQL database.

---

## Data Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     order_history_lcmd                          │
│                   (449K+ line item records)                     │
│                      SOURCE / RAW DATA                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Hourly Refresh
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGGREGATE TABLES                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ agg_account_    │ agg_account_    │ agg_salesman_               │
│ daily           │ health          │ performance                 │
│ (7K+ rows)      │ (1K+ accounts)  │ (10 salespeople)            │
└─────────────────┴─────────────────┴─────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                    PREDICTION TABLES                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ predictions_    │ predictions_    │ opportunities_              │
│ account_part    │ account_category│ account_crosssell           │
│ (3.8K patterns) │ (3.2K patterns) │ (11K+ opportunities)        │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## Table Reference

### order_history_lcmd

**Purpose:** Source table containing all line-item level sales transactions. This is the raw transactional data from which all aggregate tables are derived.

**When to use:** Generally avoid querying directly in UI — use aggregate tables for performance. Use this table only when you need line-item detail (e.g., invoice details, order history drill-down).

**Primary Key:** `linekey`

| Column | Type | Description |
|--------|------|-------------|
| `linekey` | bigint | Primary key - unique line item identifier |
| `invoice_number` | bigint | Invoice/order number (multiple line items per invoice) |
| `account_name` | text | Customer business name |
| `account_number` | bigint | Unique customer identifier |
| `account_salesman` | text | Assigned salesperson name |
| `invoice_date` | timestamp | Invoice date |
| `part_number` | text | Product SKU |
| `qty_ordered` | numeric | Quantity ordered |
| `unit_net_price` | numeric | Unit price |
| `main_group` | text | Product category (e.g., "Guitars", "Drums") |
| `sub_group` | text | Product subcategory (e.g., "Strings", "Picks") |
| `current_product_status` | text | 'active', 'discontinued', etc. |
| `description` | text | Product description |
| `creditcard_fee` | numeric | Credit card fee |
| `shipping_fee` | numeric | Shipping charge |
| `interest_fee` | numeric | Finance charge |
| `web_order_number` | bigint | Web order ID (if web origin) |
| `status` | text | 'Pending', 'Printed', 'Shipped' |
| `pack_status` | integer | Pack status code (3 = shipped) |
| `invoice_last_printed` | timestamp | Last print date |
| `dstamp` | timestamp | Export timestamp |
| `inserted_at` | timestamp | Supabase insert time |
| `updated_at` | timestamp | Supabase update time |

**Indexes:** `account_number + invoice_date`, `invoice_date`, `invoice_number`, `account_salesman + invoice_date`

---

### agg_account_daily

**Purpose:** Daily sales aggregation per account. Use for sales trends, sparklines, activity charts, and date-range reporting.

**Primary Key:** `(account_number, invoice_date)`

| Column | Type | Description |
|--------|------|-------------|
| `account_number` | bigint | Customer identifier |
| `invoice_date` | date | Activity date |
| `account_name` | text | Customer name |
| `account_salesman` | text | Assigned salesperson |
| `sales_dollars` | numeric | Total revenue for the day |
| `total_profit` | numeric | Profit (placeholder - currently 0) |
| `order_count` | integer | Number of orders |
| `line_item_count` | integer | Number of line items |
| `created_at` | timestamp | Record created |
| `updated_at` | timestamp | Record updated |

**UI Use Cases:**
- Sales trend line charts for account detail pages
- Sparklines in account list views
- Date range filters and summaries
- Activity heatmaps/calendars

---

### agg_account_health

**Purpose:** Account health scoring and churn risk analysis. The core table for identifying which accounts need attention.

**Primary Key:** `account_number`

| Column | Type | Description |
|--------|------|-------------|
| `account_number` | bigint | Customer identifier |
| `account_name` | text | Customer name |
| `account_salesman` | text | Assigned salesperson |
| `sales_dollars_current_90` | numeric | Sales last 90 days |
| `order_count_current_90` | integer | Orders last 90 days |
| `avg_order_value_current_90` | numeric | AOV last 90 days |
| `distinct_products_current_90` | integer | Unique products last 90 days |
| `sales_dollars_prior_90` | numeric | Sales 91-180 days ago |
| `order_count_prior_90` | integer | Orders 91-180 days ago |
| `avg_order_value_prior_90` | numeric | AOV 91-180 days ago |
| `distinct_products_prior_90` | integer | Unique products 91-180 days ago |
| `sales_dollars_yoy_90` | numeric | Sales same period last year |
| `order_count_yoy_90` | integer | Orders same period last year |
| `sales_pct_change_vs_prior` | numeric | % change vs prior 90 days |
| `sales_pct_change_vs_yoy` | numeric | % change vs last year |
| `order_freq_pct_change` | numeric | Order frequency change % |
| `avg_order_value_pct_change` | numeric | AOV change % |
| `days_since_last_order` | integer | Days since last order |
| `first_order_date` | date | First ever order |
| `lifetime_order_count` | integer | All-time order count |
| `lifetime_sales_dollars` | numeric | All-time sales |
| `health_score` | integer | **-5 to +5** (see scale) |
| `health_status` | text | Status label |
| `created_at` | timestamp | Record created |
| `updated_at` | timestamp | Record updated |

#### Health Score Scale

| Score | Status | Description | Color | Action |
|-------|--------|-------------|-------|--------|
| **+5** | thriving | Strong growth, very active | Dark Green | Nurture, upsell |
| **+4** | growing | Clear upward trend | Green | Maintain, expand |
| **+3** | expanding | Moderate growth | Light Green | Continue engagement |
| **+2** | stable_up | Slight growth, active | Blue-Green | Monitor |
| **+1** | stable | Consistent patterns | Blue | Regular check-ins |
| **0** | neutral | No clear trend | Gray | Evaluate |
| **-1** | cooling | Slight decline | Yellow | Proactive outreach |
| **-2** | slowing | Noticeable decline | Orange | Schedule call |
| **-3** | at_risk | Significant decline, 60+ days | Red-Orange | **Urgent outreach** |
| **-4** | churning | Severe decline, 90+ days | Red | **Immediate intervention** |
| **-5** | churned | Inactive 120+ days | Dark Red | **Win-back campaign** |

#### UI Recommendations

- **Color coding:** Use the color scale above for visual health indicators
- **Trend arrows:** Show ↑↓ based on `sales_pct_change_vs_prior`
- **Alert badges:** Highlight accounts with `health_score <= -3`
- **Quick filters:** "At Risk" (-3 to -5), "Needs Attention" (-1 to -2), "Healthy" (0+), "Thriving" (+3 to +5)
- **Key metric display:** Always show `days_since_last_order` for negative scores
- **Comparison view:** Current 90 vs Prior 90 side-by-side

---

### agg_salesman_performance

**Purpose:** Salesperson metrics and rankings for leaderboards and performance tracking.

**Primary Key:** `(account_salesman, period_type, period_start)`

| Column | Type | Description |
|--------|------|-------------|
| `account_salesman` | text | Salesperson name |
| `period_type` | text | 'rolling_90' |
| `period_start` | date | Period start |
| `period_end` | date | Period end |
| `total_sales_dollars` | numeric | Total sales |
| `total_orders` | integer | Order count |
| `total_line_items` | integer | Line items sold |
| `total_units_sold` | numeric | Units sold |
| `active_accounts` | integer | Accounts with orders |
| `total_accounts` | integer | All assigned accounts |
| `new_accounts_acquired` | integer | First-time buyers |
| `reactivated_accounts` | integer | Returning dormant accounts |
| `churned_accounts` | integer | Lost accounts |
| `avg_order_value` | numeric | Average order value |
| `avg_sales_per_account` | numeric | Sales per active account |
| `orders_per_active_account` | numeric | Order frequency |
| `distinct_products_sold` | integer | Product variety |
| `distinct_categories_sold` | integer | Category variety |
| `sales_dollars_prior_period` | numeric | Prior period sales |
| `sales_pct_change` | numeric | Growth % |
| `orders_prior_period` | integer | Prior period orders |
| `orders_pct_change` | numeric | Order growth % |
| `rank_by_sales` | integer | Sales ranking |
| `rank_by_growth` | integer | Growth ranking |
| `rank_by_new_accounts` | integer | New account ranking |
| `created_at` | timestamp | Record created |
| `updated_at` | timestamp | Record updated |

#### UI Recommendations

- **Leaderboard:** Ranked table with medals/badges for top 3
- **Metric cards:** Key KPIs in card format per salesperson
- **Trend indicators:** ↑↓ for `sales_pct_change`
- **Win highlights:** Badge for `new_accounts_acquired`, `reactivated_accounts`
- **Attention items:** Show `churned_accounts` as actionable
- **Progress bars:** `active_accounts / total_accounts` ratio
- **Comparison:** Side-by-side salesperson comparison view

---

### predictions_account_part

**Purpose:** Predicts when an account will reorder a specific product based on historical purchase patterns. Enables proactive sales outreach.

**Primary Key:** `(account_number, part_number)`

| Column | Type | Description |
|--------|------|-------------|
| `account_number` | bigint | Customer identifier |
| `part_number` | text | Product SKU |
| `main_group` | text | Product category |
| `sub_group` | text | Product subcategory |
| `order_count` | integer | Times ordered (min 3) |
| `avg_interval_days` | numeric | Average days between orders |
| `stddev_interval_days` | numeric | Interval standard deviation |
| `coefficient_of_variation` | numeric | Consistency (lower = better) |
| `last_order_date` | date | Last order date |
| `days_since_last_order` | integer | Days since last order |
| `predicted_next_order` | date | Predicted reorder date |
| `days_until_predicted` | integer | Days until prediction (negative = overdue) |
| `in_upcoming_window` | boolean | **TRUE if -3 to +10 days** |
| `confidence_score` | integer | **1-5** (5 = highest) |
| `created_at` | timestamp | Record created |

#### Confidence Score Scale

| Score | Criteria | Reliability |
|-------|----------|-------------|
| **5** | 6+ orders, CV < 0.25, within 60 days | Very High |
| **4** | 4-5 orders, CV < 0.35, within 90 days | High |
| **3** | 3 orders, CV < 0.50, within 120 days | Moderate |
| **2** | 3+ orders, inconsistent | Low |
| **1** | Weak pattern | Minimal |

#### Key Fields for UI

| Field | Usage |
|-------|-------|
| `in_upcoming_window` | Primary filter for actionable items |
| `days_until_predicted` | Negative = overdue = hot lead! |
| `confidence_score` | Prioritize higher scores |
| `avg_interval_days` | Display as "Orders every X days" |

#### UI Recommendations

- **Default filter:** `in_upcoming_window = true`
- **Sort:** `confidence_score DESC`, then `days_until_predicted ASC`
- **Overdue highlight:** Red/orange for negative `days_until_predicted`
- **Confidence badges:** Color-coded 1-5 pills
- **Product info:** Show `part_number`, `description`, category
- **Pattern display:** "Usually orders every {avg_interval_days} days"
- **Actions:** "Contact Customer", "Create Quote", "View History"

---

### predictions_account_category

**Purpose:** Category-level reorder predictions. Useful when customers buy interchangeable products within a category (e.g., different string brands).

**Primary Key:** `(account_number, main_group, sub_group)`

| Column | Type | Description |
|--------|------|-------------|
| `account_number` | bigint | Customer identifier |
| `main_group` | text | Product category |
| `sub_group` | text | Product subcategory |
| `order_count` | integer | Category order count |
| `distinct_parts_ordered` | integer | Different products in category |
| `avg_interval_days` | numeric | Average days between orders |
| `stddev_interval_days` | numeric | Interval deviation |
| `coefficient_of_variation` | numeric | Consistency measure |
| `last_order_date` | date | Last category order |
| `days_since_last_order` | integer | Days since last order |
| `predicted_next_order` | date | Predicted next order |
| `days_until_predicted` | integer | Days until (negative = overdue) |
| `in_upcoming_window` | boolean | TRUE if actionable |
| `confidence_score` | integer | 1-5 confidence |
| `created_at` | timestamp | Record created |

#### UI Recommendations

- **Use when:** `distinct_parts_ordered > 1` (customer buys variety)
- **Display as:** "Regularly orders from {category} every {X} days"
- **Link to:** Products they've ordered in this category
- **Alternative suggestions:** Useful when usual product is out of stock

---

### opportunities_account_crosssell

**Purpose:** Identifies products/categories that peer accounts purchase but this account doesn't. Based on account size tier comparison.

**Primary Key:** `id` (serial)

**Unique Constraint:** `(account_number, recommended_main_group, recommended_sub_group)`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial | Primary key |
| `account_number` | bigint | Target customer |
| `account_name` | text | Customer name |
| `account_salesman` | text | Assigned salesperson |
| `recommended_main_group` | text | Suggested category |
| `recommended_sub_group` | text | Suggested subcategory |
| `peer_group_definition` | text | Peer group (e.g., "size_tier_2") |
| `peer_account_count` | integer | Accounts in peer group |
| `peers_purchasing_count` | integer | Peers buying this category |
| `pct_of_peers_purchasing` | numeric | **% of peers who buy this** |
| `avg_peer_annual_spend` | numeric | Peer average spend |
| `estimated_opportunity_dollars` | numeric | Revenue potential |
| `account_has_purchased_before` | boolean | Ever bought this? |
| `account_last_purchase_date` | date | Last purchase (if any) |
| `months_since_last_purchase` | integer | Months since (if any) |
| `opportunity_score` | integer | **1-5** (5 = best) |
| `created_at` | timestamp | Record created |

#### Opportunity Score Scale

| Score | Criteria |
|-------|----------|
| **5** | >60% of peers buy, >$500 potential |
| **4** | >50% of peers OR >40% with >$750 potential |
| **3** | >35% of peers, >$200 potential |
| **2** | >25% of peers |
| **1** | Baseline (20% threshold) |

#### UI Recommendations

- **Filter by:** `opportunity_score >= 3` for quality leads
- **Display:** "78% of similar accounts buy {category}"
- **Lapsed indicator:** If `account_has_purchased_before = true`, show "Previously purchased, lapsed {X} months"
- **Revenue potential:** Show `estimated_opportunity_dollars`
- **Talking point:** "Accounts your size typically spend ${avg_peer_annual_spend}/year on this"
- **Actions:** "Suggest to Customer", "Create Quote", "View Peer Comparison"

---

## UI Components Specification

### 1. Account Health Dashboard

**Location:** CRM > Accounts (list view enhancement)

**Components:**
- Health score badge (color-coded -5 to +5)
- Days since last order indicator
- Trend arrow (vs prior period)
- Quick filter tabs: All | Thriving | Stable | At Risk | Churned
- Sortable columns with health metrics

**Data Source:** `agg_account_health`

---

### 2. Account Detail - Analytics Tab

**Location:** CRM > Account > Analytics

**Components:**
- Health score card with full breakdown
- Sales trend chart (from `agg_account_daily`)
- Upcoming reorder predictions list
- Cross-sell opportunities list
- Period comparison (current 90 vs prior 90 vs YoY)

**Data Sources:** `agg_account_health`, `agg_account_daily`, `predictions_account_part`, `predictions_account_category`, `opportunities_account_crosssell`

---

### 3. Reorder Predictions View

**Location:** CRM > Predictions (or CRM > Dashboard widget)

**Components:**
- Filterable list of upcoming reorders
- Confidence score badges
- Days until/overdue indicator
- Product and category info
- Quick actions (contact, quote)
- Filter by salesperson, confidence level, timeframe

**Data Sources:** `predictions_account_part`, `predictions_account_category`

---

### 4. Cross-Sell Opportunities View

**Location:** CRM > Opportunities (or Account Detail widget)

**Components:**
- Opportunity cards with score badges
- Peer comparison stats
- Revenue potential display
- Lapsed purchase indicators
- Filter by salesperson, opportunity score, category

**Data Source:** `opportunities_account_crosssell`

---

### 5. Salesperson Leaderboard

**Location:** CRM > Team Performance

**Components:**
- Ranked leaderboard table
- Metric cards per salesperson
- Rankings by sales, growth, new accounts
- Trend indicators
- Drill-down to salesperson's accounts

**Data Source:** `agg_salesman_performance`

---

### 6. Salesperson Dashboard

**Location:** CRM > My Dashboard (personalized view)

**Components:**
- Personal KPI cards
- My at-risk accounts list
- My upcoming predictions
- My cross-sell opportunities
- My rankings vs team

**Data Sources:** All tables filtered by `account_salesman`

---

## Common Queries

### Accounts Needing Attention
```sql
SELECT account_number, account_name, account_salesman, 
       health_score, health_status, days_since_last_order,
       sales_dollars_current_90, sales_pct_change_vs_prior
FROM agg_account_health 
WHERE health_score <= -2
ORDER BY health_score ASC, days_since_last_order DESC;
```

### Upcoming Reorder Predictions (High Confidence)
```sql
SELECT p.account_number, h.account_name, p.part_number, 
       p.main_group, p.sub_group, p.confidence_score,
       p.days_until_predicted, p.avg_interval_days
FROM predictions_account_part p
JOIN agg_account_health h ON p.account_number = h.account_number
WHERE p.in_upcoming_window = true
  AND p.confidence_score >= 3
ORDER BY p.confidence_score DESC, p.days_until_predicted ASC;
```

### Top Cross-Sell Opportunities
```sql
SELECT account_number, account_name, account_salesman,
       recommended_main_group, recommended_sub_group,
       pct_of_peers_purchasing, estimated_opportunity_dollars,
       opportunity_score
FROM opportunities_account_crosssell
WHERE opportunity_score >= 4
ORDER BY opportunity_score DESC, estimated_opportunity_dollars DESC;
```

### Salesperson Leaderboard
```sql
SELECT account_salesman, total_sales_dollars, total_orders,
       active_accounts, new_accounts_acquired, churned_accounts,
       sales_pct_change, rank_by_sales, rank_by_growth
FROM agg_salesman_performance
WHERE period_type = 'rolling_90'
ORDER BY rank_by_sales ASC;
```

### Account Sales Trend (for charts)
```sql
SELECT invoice_date, sales_dollars, order_count
FROM agg_account_daily
WHERE account_number = $1
  AND invoice_date >= CURRENT_DATE - INTERVAL '365 days'
ORDER BY invoice_date ASC;
```

---

## Business Context

### Customer Types
- Music retailers (stores)
- Online resellers
- Schools and institutions
- Churches and worship centers
- Professional musicians/studios

### Product Categories (main_group examples)
- Guitars & Basses
- Drums & Percussion
- Band & Orchestra
- Pro Audio
- Accessories
- Keyboards & Pianos
- Amplifiers
- Effects & Pedals

### Sales Team Structure
- 10 salespeople
- Each assigned specific accounts
- Accounts identified by `account_salesman` field across all tables

### Key Business Metrics
- Customer retention (health scores)
- Reorder capture rate (predictions accuracy)
- Cross-sell penetration (opportunity conversion)
- Sales growth (salesperson performance)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2024-11-24 | 1.0 | Initial documentation |
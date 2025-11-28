# Music Supplies RC10 - Change Log

**Conventions:**
- YYYY-MM-DD — Short title — Commit (short SHA) — Impacted areas
- Bullet points with rationale and follow-up actions
- Replace per-incident FIX/FINAL docs with entries here and updates to canonical pages

## Recent Updates & Fixes

### September 8, 2025
#### Documentation Cleanup & Project Organization
- **Major cleanup completed** - Removed 130+ obsolete files (emergency patches, debug scripts, temp files)
- **Project structure modernized** - Organized into /docs, /scripts, /sql, /archive folders
- **Documentation consolidated** - Reduced from 475+ files to ~50 organized files
- **Claude AI instructions optimized** - Streamlined CLAUDE.md for better AI assistant guidance

### August 20, 2025
#### Documentation Architecture
- **Documentation reset** - Created canonical docs entry point at docs/README.md
- **Single-source policy established** - No more V2/V3 forks; use changelog + canonical pages
- **Authentication consolidation** - Added docs/authentication.md as canonical auth reference
- **Operational invariants defined** - Security and authentication contracts established

### August 12, 2025

#### Cache Management & Performance
- **Cache Busting Solution Implemented** - Automatic version-based cache busting for PWA using VITE_APP_VERSION
- **Stock Filter Fix** - Resolved stock availability filtering issues in product displays

#### Contact Information Management
- **Contact Info Sync Implementation** - Automated synchronization between contact_info and user profiles
- **Contact Info Update Fix** - Resolved issues with updating customer contact information
- **Upsert Contact Info Function Restored** - Critical database function for contact info management restored

#### Database Fixes
- **Shopping Activity Table Fix** - Corrected table structure and relationships
- **Shopping Activity Column Mismatch Fix** - Resolved column type mismatches in shopping_activity table

#### Feature Implementations
- **Demo Mode Implementation** - Added demo mode for sales presentations and testing
- **Site Offline Mode (5150)** - Implemented maintenance mode with custom offline message

### August 11, 2025

#### Critical Security Fixes
- **Account 115 ZIP Authentication Breach Fixed** - Resolved critical security vulnerability in ZIP code authentication
- **Universal Password Implementation** - Added MUSIC123 universal password for business continuity (temporary measure)

---

## Core System Documentation

The following comprehensive documentation files contain the full system architecture and implementation details:

1. **01_SECURITY_AUTHENTICATION.md** - Complete security and authentication system
2. **02_BACKEND_DATABASE.md** - Backend architecture and database schema
3. **03_USER_MANAGEMENT.md** - User account management system
4. **04_ORDER_MANAGEMENT.md** - Order processing and shopping cart system
5. **05_PROMO_CODE_SYSTEM.md** - Promotional codes and discount system

## Version Management

Current version format: RC[month][day].[hour][minute]
Example: RC812.1357 (August 12, 13:57)

To update version before deployment:
```bash
npm run update-version
```

This automatically updates package.json and .env file with VITE_APP_VERSION for cache busting.
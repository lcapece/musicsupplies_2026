# 🎯 Enhanced Prospect Intelligence System - Architecture Plan

## Executive Summary

This document outlines the architecture for an advanced prospect intelligence system that combines:
- **ApiFlash** for homepage screenshot capture
- **Tavily MCP** for deep company research
- **OpenAI GPT-4** for text analysis and icebreaker generation
- **OpenAI Vision** for image analysis
- **Dynamic UI** driven by PROSPECTS_HEADERS table

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action                              │
│            "Enrich Prospect Intelligence"                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              ProspectModal (React Component)                │
│  • Driven by PROSPECTS_HEADERS table                        │
│  • Embedded Screenshot Thumbnail Viewer (1/5 width, 1/7 h)  │
│  • Zoom Modal for full image exploration                    │
│  • Displays enriched intelligence                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│      Edge Function: enrich-prospect-intelligence-v2         │
│                                                             │
│  Step 1: Screenshot Capture (ApiFlash)                     │
│          └→ 1920px width, full page height                 │
│                                                             │
│  Step 2: Company Research (Tavily MCP)                     │
│          └→ Search, Extract, Crawl company data            │
│                                                             │
│  Step 3: Text Analysis (OpenAI GPT-4)                      │
│          └→ Analyze Tavily data                            │
│          └→ Extract structured intelligence                │
│          └→ Generate 10 icebreakers                        │
│                                                             │
│  Step 4: Image Analysis (OpenAI Vision)                    │
│          └→ Analyze homepage screenshot                    │
│          └→ Extract visual intelligence                    │
│          └→ Identify rapport-building opportunities        │
│                                                             │
│  Step 5: Combine & Structure Results                       │
│          └→ Merge all intelligence sources                 │
│          └→ Return structured JSON                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database                              │
│  • prospects table (enriched data storage)                  │
│  • prospects_headers table (UI configuration)               │
└─────────────────────────────────────────────────────────────┘
```

## Component 1: PROSPECTS_HEADERS Table

### Purpose
Drive the ProspectModal UI dynamically, allowing field configuration without code changes.

### Schema
```sql
CREATE TABLE IF NOT EXISTS prospects_headers (
    header_id SERIAL PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL,
    display_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, textarea, select, number, date, image
    display_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    field_width VARCHAR(20) DEFAULT 'full', -- full, half, third, quarter
    section VARCHAR(100), -- group related fields
    validation_rules JSONB,
    help_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data
INSERT INTO prospects_headers (field_name, display_label, field_type, display_order, section, field_width) VALUES
('business_name', 'Business Name', 'text', 1, 'basic_info', 'full'),
('website', 'Website URL', 'text', 2, 'basic_info', 'full'),
('address', 'Address', 'text', 3, 'location', 'half'),
('city', 'City', 'text', 4, 'location', 'third'),
('state', 'State', 'text', 5, 'location', 'third'),
('zip', 'ZIP Code', 'text', 6, 'location', 'third'),
('phone', 'Phone Number', 'text', 7, 'contact', 'half'),
('email', 'Email Address', 'text', 8, 'contact', 'half'),
('screenshot_url', 'Homepage Screenshot', 'image', 9, 'intelligence', 'full'),
('enriched_data', 'AI Intelligence', 'jsonb', 10, 'intelligence', 'full');
```

## Component 2: Screenshot Thumbnail Viewer

### Design Specifications

#### Embedded Thumbnail Viewer
- **Position**: Left sidebar of ProspectModal
- **Dimensions**: 
  - Width: ~20% of modal width (1/5)
  - Height: ~14% of modal height (1/7)
- **Features**:
  - Vertical scroll for tall images (15000px+)
  - Smooth scrolling
  - Minimap indicator showing viewport position
  - Loading skeleton

#### Zoom Modal
- **Trigger**: Click on thumbnail
- **Features**:
  - Full-screen overlay
  - Pan and zoom controls
  - Vertical scroll for tall content
  - Pinch-to-zoom support (touch devices)
  - Keyboard shortcuts (arrows, +/-, ESC)
  - Zoom levels: 50%, 100%, 150%, 200%
  - "Fit to screen" button
  - Download button

### Component Structure
```typescript
interface ScreenshotViewerProps {
  imageUrl: string;
  imageHeight?: number;
  imageWidth?: number;
}

// Embedded thumbnail component
<ScreenshotThumbnail 
  imageUrl={screenshot_url}
  onZoomClick={() => setShowZoomModal(true)}
/>

// Zoom modal component
<ScreenshotZoomModal
  isOpen={showZoomModal}
  imageUrl={screenshot_url}
  onClose={() => setShowZoomModal(false)}
/>
```

## Component 3: Tavily Integration

### Tavily MCP Tools Available
1. **tavily-search** - Web search with AI-powered results
2. **tavily-extract** - Extract content from URLs
3. **tavily-crawl** - Structured website crawling
4. **tavily-map** - Create URL maps of websites

### Usage Strategy
```typescript
// Step 1: Deep company search
const searchResults = await use_mcp_tool('tavily', 'tavily-search', {
  query: `${businessName} music business company information`,
  search_depth: 'advanced',
  max_results: 10,
  include_domains: [websiteDomain],
  include_raw_content: true
});

// Step 2: Extract key pages
const aboutPage = await use_mcp_tool('tavily', 'tavily-extract', {
  urls: [aboutPageUrl, contactPageUrl, teamPageUrl],
  extract_depth: 'advanced',
  format: 'markdown'
});

// Step 3: Map website structure
const siteMap = await use_mcp_tool('tavily', 'tavily-map', {
  url: websiteUrl,
  max_depth: 2,
  categories: ['About', 'Contact', 'Blog']
});
```

## Component 4: Enhanced Intelligence Schema

### Structured JSON Output
```typescript
interface EnrichedProspectData {
  // Metadata
  enrichment_date: string;
  confidence_score: number; // 0-1
  sources: {
    screenshot: boolean;
    tavily: boolean;
    openai_text: boolean;
    openai_vision: boolean;
  };
  
  // Core Business Info
  essential_info: {
    business_description: string;
    business_type: string;
    year_founded?: number;
    employee_count?: string;
    revenue_range?: string;
    headquarters?: string;
    parent_company?: string;
  };
  
  // Products & Services
  music_brands: {
    brand_name: string;
    category: string; // guitars, keyboards, drums, etc.
    prominence: 'primary' | 'secondary' | 'mentioned';
  }[];
  
  services_offered: {
    service: string;
    description?: string;
  }[];
  
  // Contact Intelligence
  contact_info: {
    primary_phone?: string;
    secondary_phone?: string;
    toll_free?: string;
    email_general?: string;
    email_sales?: string;
    address_physical?: string;
    address_mailing?: string;
    hours_of_operation?: string;
  };
  
  // Key Personnel
  key_people: {
    name: string;
    title: string;
    bio?: string;
    photo_url?: string;
  }[];
  
  // Interesting Facts
  interesting_facts: {
    fact: string;
    category: 'history' | 'achievement' | 'unique' | 'community' | 'other';
    potential_conversation_starter: boolean;
  }[];
  
  // Visual Intelligence (from homepage screenshot)
  visual_elements: {
    notable_images: {
      description: string;
      rapport_potential: string; // How to use this in conversation
      location_on_page: string;
    }[];
    color_scheme: string[];
    brand_logos_visible: string[];
    call_to_action_buttons: string[];
    promotional_offers: string[];
  };
  
  // Social & Digital Presence
  social_media: {
    platform: string;
    url?: string;
    followers?: number;
    activity_level?: 'high' | 'medium' | 'low';
  }[];
  
  technology_stack: {
    ecommerce_platform?: string;
    payment_processors: string[];
    marketing_tools: string[];
    other_tech: string[];
  };
  
  // Icebreakers (Generated by GPT-4)
  icebreakers: {
    type: 'email' | 'phone' | 'both';
    icebreaker: string;
    reasoning: string;
    confidence: number;
  }[];
  
  // Competitive Intelligence
  competitive_insights: {
    strengths: string[];
    potential_pain_points: string[];
    differentiation_opportunities: string[];
  };
  
  // Recent News & Updates
  recent_activity: {
    date?: string;
    headline: string;
    summary: string;
    source_url?: string;
  }[];
}
```

## Component 5: Icebreaker Generation Prompt

### OpenAI Prompt for Icebreakers
```
You are a sales intelligence expert. Based on the following company research data, create 10 highly personalized icebreakers for initial contact (5 for email, 5 for phone calls).

Company Data:
- Business: {business_name}
- Type: {business_type}
- Brands: {brands_list}
- Recent Activity: {recent_news}
- Visual Elements: {notable_images}
- Key People: {key_people}
- Interesting Facts: {facts}

Requirements for icebreakers:
1. Reference specific, verifiable details from research
2. Show genuine interest and knowledge
3. Create immediate rapport
4. Open conversation naturally
5. Avoid generic sales pitches
6. Use visual details when relevant (e.g., "I noticed your photo with Joe Satriani...")
7. Reference community involvement or achievements
8. Acknowledge their expertise or longevity
9. Connect your offering to their specific needs
10. Be authentic and conversational

Format each icebreaker as:
{
  "type": "email|phone",
  "icebreaker": "The actual icebreaker text",
  "reasoning": "Why this works for this prospect",
  "confidence": 0.0-1.0
}

Examples of good icebreakers:
- "I saw you've been serving the [City] music community since [Year] - that's impressive longevity!"
- "Your photo with Joe Satriani on your homepage is amazing - how did that collaboration come about?"
- "I noticed you carry Yamaha and Roland - we're a preferred distributor for both brands..."
- "Your recent [Event/Achievement] caught my attention - congratulations on [specific detail]!"
```

## Component 6: Edge Function Architecture

### Function: enrich-prospect-intelligence-v2

```typescript
// Orchestration Flow
async function enrichProspect(websiteUrl: string, prospectId: string) {
  
  // STEP 1: Parallel Data Gathering
  const [screenshot, tavilyResearch] = await Promise.all([
    captureScreenshot(websiteUrl),
    performTavilyResearch(websiteUrl)
  ]);
  
  // STEP 2: AI Analysis (Sequential for context)
  const textAnalysis = await analyzeWithGPT4({
    tavilyData: tavilyResearch,
    businessContext: {
      name: businessName,
      website: websiteUrl
    }
  });
  
  const visionAnalysis = await analyzeWithVision({
    screenshot: screenshot.base64,
    textContext: textAnalysis
  });
  
  // STEP 3: Generate Icebreakers
  const icebreakers = await generateIcebreakers({
    textAnalysis,
    visionAnalysis,
    tavilyData: tavilyResearch
  });
  
  // STEP 4: Combine and Structure
  const enrichedData = combineIntelligence({
    screenshot,
    tavily: tavilyResearch,
    textAnalysis,
    visionAnalysis,
    icebreakers
  });
  
  // STEP 5: Store in Database
  await storeEnrichedData(prospectId, enrichedData);
  
  return enrichedData;
}
```

## Component 7: Updated ProspectModal UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     ProspectModal Header                        │
│  [Business Name]                           [Close] [Save]       │
└─────────────────────────────────────────────────────────────────┘
┌──────────┬─────────────────────────────────────────────────────┐
│          │                                                      │
│ SCREEN-  │              MAIN FORM AREA                         │
│ SHOT     │  ┌──────────────────────────────────────────────┐  │
│          │  │ Basic Information Section                     │  │
│ THUMB-   │  │ (Driven by prospects_headers table)          │  │
│ NAIL     │  └──────────────────────────────────────────────┘  │
│          │                                                      │
│ VIEWER   │  ┌──────────────────────────────────────────────┐  │
│ (1/5w x  │  │ Contact Information Section                   │  │
│  1/7h)   │  └──────────────────────────────────────────────┘  │
│          │                                                      │
│ [Click   │  ┌──────────────────────────────────────────────┐  │
│  to      │  │ Location Information Section                  │  │
│  Zoom]   │  └──────────────────────────────────────────────┘  │
│          │                                                      │
│          │  ┌──────────────────────────────────────────────┐  │
│          │  │ 🤖 AI Intelligence Section                   │  │
│          │  │  [Enrich Intelligence] Button                │  │
│          │  │                                               │  │
│          │  │  📊 Confidence: ████████░░ 85%              │  │
│          │  │  📋 Essential Info                           │  │
│          │  │  🎸 Brands (15)                              │  │
│          │  │  💡 Interesting Facts (8)                    │  │
│          │  │  💬 Icebreakers (10)                         │  │
│          │  │  📸 Visual Intelligence                       │  │
│          │  │  📱 Social Media                             │  │
│          │  │  ⚙️  Technology Stack                         │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                      │
└──────────┴─────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Database Setup (1 day)
- Create PROSPECTS_HEADERS table
- Migrate existing fields to headers
- Create helper functions

### Phase 2: Screenshot Viewer Components (2 days)
- Build ScreenshotThumbnail component
- Build ScreenshotZoomModal component
- Add pan/zoom controls
- Test with various image sizes

### Phase 3: Tavily Integration (2 days)
- Set up Tavily MCP configuration
- Test search, extract, crawl, map
- Create wrapper functions
- Handle rate limits and errors

### Phase 4: Enhanced Edge Function (3 days)
- Create enrich-prospect-intelligence-v2
- Integrate all data sources
- Implement parallel processing
- Add error handling and retries

### Phase 5: AI Analysis & Icebreakers (2 days)
- Design GPT-4 prompts
- Implement text analysis
- Implement vision analysis
- Generate and validate icebreakers

### Phase 6: UI Updates (3 days)
- Make ProspectModal dynamic (driven by headers)
- Integrate screenshot viewer
- Display enriched intelligence
- Add icebreaker section
- Polish UX/UI

### Phase 7: Testing & Documentation (2 days)
- End-to-end testing
- Performance optimization
- Cost analysis
- Documentation updates

**Total Estimated Time: 15 days**

## Cost Analysis

### Per Enrichment Costs:
- **ApiFlash**: $0.001 - $0.005 (screenshot)
- **Tavily Advanced Search**: ~$0.01 - $0.02
- **OpenAI GPT-4 (text analysis)**: ~$0.02 - $0.05
- **OpenAI Vision (image analysis)**: ~$0.01 - $0.03
- **OpenAI GPT-4 (icebreakers)**: ~$0.01 - $0.02

**Total per enrichment: $0.05 - $0.15**

### Monthly Estimates:
- 100 enrichments: $5 - $15
- 500 enrichments: $25 - $75
- 1000 enrichments: $50 - $150

### ROI Justification:
- **Time saved**: 30-45 minutes of manual research per prospect
- **Quality**: AI-powered insights human researchers might miss
- **Personalization**: Custom icebreakers increase response rates
- **Competitive edge**: Deeper intelligence than competitors

## Security & Privacy

- API keys stored in Supabase Edge Function secrets
- Prospect data encrypted at rest
- Rate limiting on enrichment endpoint
- Audit logs for enrichment activities
- GDPR compliance for data storage
- Option to delete enrichment data

## Success Metrics

### Technical Metrics:
- Enrichment success rate > 95%
- Average processing time < 20 seconds
- API error rate < 1%
- User satisfaction score > 4.5/5

### Business Metrics:
- Cold call/email response rate increase
- Sales cycle time reduction
- Conversion rate improvement
- User adoption rate of enrichment feature

## Next Steps

1. ✅ Review and approve architecture
2. 🔲 Set up development environment
3. 🔲 Create PROSPECTS_HEADERS table
4. 🔲 Build screenshot viewer components
5. 🔲 Integrate Tavily MCP
6. 🔲 Develop enhanced edge function
7. 🔲 Update ProspectModal UI
8. 🔲 Test and iterate
9. 🔲 Deploy to production
10. 🔲 Train users

---

**Questions for Approval:**
1. Is the PROSPECTS_HEADERS table structure suitable for your needs?
2. Are the screenshot viewer specifications correct (1/5 width, 1/7 height)?
3. Should we add any additional data points to the enrichment schema?
4. Are there specific icebreaker styles or tones you prefer?
5. What priority should we give to different data sources if conflicts arise?

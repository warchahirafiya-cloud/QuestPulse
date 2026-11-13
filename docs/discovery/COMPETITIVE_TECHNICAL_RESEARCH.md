# QuestPulse Discovery Engine — Competitive & Technical Research
**Research date:** 2026-11-13  
**Purpose:** Establish the adjacent market, reusable infrastructure, standards and defensible differentiation for QuestPulse.  
**Research limitation:** This is a documented desk-research snapshot, not an exhaustive global product audit, legal opinion, or proof that no other product has a similar feature set. Competitor features and terms change; revalidate before public claims or integrations.

## 1. Executive conclusion

The market is populated by mature products, but fragmented across different jobs:
- Coupon directories and browser extensions focus on promo-code discovery and checkout savings.
- Cashback/rewards platforms focus on tracked purchases and payouts.
- Community deal platforms rely heavily on human/community submissions and voting.
- Affiliate networks and feed aggregators provide merchant/product/promotion data to approved publishers.
- Web crawlers provide generic discovery/fetch infrastructure but do not supply QuestPulse's editorial truth model.

QuestPulse should not claim that coupon aggregation or web crawling is new. The opportunity is to build a **cross-category, evidence-first opportunity intelligence system** that connects source discovery, structured extraction, country-specific eligibility evidence, cost/condition transparency, freshness monitoring and human review in one consistent workflow.

## 2. Competitive landscape (adjacent, not a claim of feature parity)

| Segment | Representative products / services | Strongest adjacent capability | QuestPulse opportunity / gap to validate |
|---|---|---|---|
| Coupon and promotion aggregators | RetailMeNot, DealHack, Offers.com | Large merchant/coupon inventories and promo discovery | Go beyond coupon codes to all reward mechanics; expose source evidence, costs, eligibility and verification freshness |
| Cashback / shopping rewards | Rakuten, TopCashback, Ibotta | Purchase-linked cashback and reward tracking | Index non-purchase opportunities too; explain eligibility and conditions without implying guaranteed payout |
| Community deal discovery | Slickdeals, DealNews, Brad's Deals, Dealabs | Community/editorial deal discovery and ranking | Add systematic site discovery and normalized eligibility/terms evidence |
| Affiliate networks | Awin, CJ Affiliate, Impact, Rakuten Advertising, Partnerize | Merchant programs, tracking links, APIs, offers and product feeds for approved partners | Add independent first-party verification and cross-network/cross-source normalized opportunity model |
| Affiliate feed aggregation | Affiliate.com, Feedico | Normalize feeds across networks into APIs | Focus on consumer usefulness, non-affiliate sources, evidence, geography and reward taxonomy |
| General web crawling | Crawlers and web indexes | URL discovery, crawling, parsing and archive data | Specialize on opportunity detection and verification, not general indexing |

### Examples and primary references
- DealHack's 2026 overview groups common deal services into coupon codes, cashback, community deal curation and price tracking: https://dealhack.com/blog/top-deal-websites
- Awin describes APIs for advertiser/publisher workflows and promotion data: https://help.awin.com/apidocs/introduction-to-awins-apis
- Awin's product feed guide describes product feeds with deep links, descriptions, prices and product metadata: https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
- Awin's publisher tools page describes The Hub offer portal and Create-a-Feed product data access: https://www.awin.com/us/publishers/tools
- Affiliate.com describes aggregating feeds from 30+ networks including Impact, CJ, Awin, Rakuten and Partnerize, with merchant approval constraints: https://affiliate.com/networks
- Feedico describes a unified coupon/deal/merchant API across multiple affiliate networks: https://feedico.io/
- Common Crawl describes a large public crawl/archive dataset, with WARC/WAT/WET formats and crawler behavior: https://www.commoncrawl.org/about

## 3. Competitive positioning: what not to build

Avoid:
1. Another thin coupon mirror that republishes identical feed rows.
2. A generic search-engine crawler without a clear permission and quality model.
3. An affiliate-only product whose coverage is limited to approved network inventory.
4. A "global offers" badge inferred from English-language pages, USD prices or worldwide shipping.
5. AI-generated pages at scale that add no original verification or consumer value.
6. A ranking system that promotes higher affiliate commissions over user relevance or evidence.

Google's spam guidance explicitly warns about scaled content abuse and scraping/republication that provides little original value. QuestPulse must add editorial curation, evidence, useful filters, terms clarity and source attribution rather than simply copying feeds: https://developers.google.com/search/docs/essentials/spam-policies

## 4. Reusable technology and standards

### Crawling frameworks
- **Crawlee (Node.js):** supports request queues, deduplication, HTTP/HTML crawling and optional browser crawlers. Its documentation recommends starting with the lighter CheerioCrawler unless JavaScript rendering is actually required: https://crawlee.dev/js/docs/introduction/first-crawler
- **Apache StormCrawler:** open-source Java crawler components with politeness, robots support, parsers, sitemaps/feeds and integrations for OpenSearch/Solr/SQL: https://stormcrawler.apache.org/
- **Common Crawl:** useful for discovering historical URL patterns and candidate sites; its index is not evidence that an offer is current. The index server supports CDX lookups: https://index.commoncrawl.org/

Recommendation: do not adopt a distributed Storm cluster for the first QuestPulse pilot. Prototype deterministic parsing and safe low-volume fetches in the existing Node.js ecosystem; evaluate Crawlee when persistent queue and crawling features become necessary. Keep the extraction and verification model independent of the crawler framework.

### Web discovery and crawl standards
- **RFC 9309 — Robots Exclusion Protocol:** formalizes robots.txt behavior for crawlers: https://www.rfc-editor.org/rfc/rfc9309.html
- **Google robots.txt guidance:** explains robots as crawler access coordination, not a privacy or indexing guarantee: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- **Google crawl budget guidance:** emphasizes URL inventory, duplicate reduction, host capacity and freshness/demand tradeoffs: https://developers.google.com/crawling/docs/crawl-budget
- **Sitemaps protocol / Google guidance:** sitemaps can expose important URLs and localized variants, but submission is a hint rather than a guarantee: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

Important distinction: robots.txt compliance is necessary crawler hygiene but does not itself grant a licence or settle terms-of-service, copyright, privacy or other legal questions. Source approval must separately document permitted use.

### Structured data
- **Schema.org Offer:** common vocabulary for commercial offers, useful as one extraction input: https://schema.org/Offer
- Structured data is not a complete model for sign-up bonuses, referral rewards, contests, task payouts or country-specific eligibility. Treat it as a signal, not truth. Preserve evidence and fall back to human review.

## 5. Why current feeds are not enough

The current QuestPulse source registry includes:
- Meh official daily-deal RSS.
- Promo Magpie US curated JSON feed.
- Voucher Magpie UK curated JSON feed.
- Planned eBay and Flipkart integrations (credentials/approval required).
- Manual review of official merchant and organizer pages.

The repository correctly treats feed ingestion as candidate-only. The existing feed set is geographically narrow and cannot support a global coverage claim. In particular, US/UK publisher country must not be converted into global eligibility, and Algeria eligibility must remain unknown unless the merchant terms provide evidence.

Affiliate feeds are useful for structured scale, but may require account approval, publisher relationships, tracking compliance and commercial terms. Keep credentialed connectors disabled until authorized and explicitly approved.

## 6. Defensible product wedge

The moat is not the crawler. It is the joined data and review system:
1. **Merchant graph:** domain, subdomain, brand, legal merchant, parent company, official channels and source ownership.
2. **Opportunity graph:** campaign, mechanic, reward, trigger, costs, terms, dates, countries and payout.
3. **Evidence graph:** first-party URLs, excerpts/hashes, structured data paths, retrieval timestamps and reviewer decisions.
4. **Country evidence graph:** eligible / excluded / unknown state for each country with exact proof and verification time.
5. **Change graph:** what changed, when, whether the change affects value/eligibility/cost, and what must be re-reviewed.
6. **Quality feedback loop:** reviewer decisions and later user-reported outcomes, with provenance and adjudication.

This system could be difficult to replicate well because it requires continuous evidence collection, entity resolution, country-level terms interpretation and editorial quality—not because crawling itself is rare.

## 7. Research hypotheses to test in a structured competitor audit

For each competitor, manually verify:
- Does it discover new merchants/sites, or only list known partners?
- Which opportunity types are supported?
- Is country eligibility explicit and evidenced?
- Are fees, purchase triggers, minimum payout and recurring conditions shown?
- Are original merchant terms linked?
- Is freshness/expiry monitored?
- Does it include user-submitted deals, merchant feeds, affiliate APIs or crawling?
- Can a user filter by country and "no purchase required"?
- Does it cover markets with low affiliate-network penetration?
- How are sponsored/affiliate relationships disclosed?

Score each product 0–3 per capability (0 absent, 1 partial, 2 strong, 3 independently verified) and attach screenshots/URLs/date. Do not turn an untested assumption into a competitor weakness.

## 8. Initial technical decision matrix

| Need | Initial decision | Why |
|---|---|---|
| Source discovery | Feeds, sitemaps, RSS, approved directories, human seeds, Common Crawl hints | High-signal, lower-risk than broad crawling |
| Fetch runtime | Bounded Node.js worker; evaluate Crawlee later | Fits current Node.js 22 repo and keeps early cost low |
| Browser rendering | Defer | Expensive and riskier; most structured feeds/SSR pages should be tested first |
| Storage | Existing JSON candidate/public split plus SQLite pilot tables | Avoid premature migration; measure volume first |
| Search | Current site filters initially; evaluate SQLite FTS/Postgres/OpenSearch later | Avoid new infrastructure until needed |
| Extraction | Deterministic parsers + schema validation | Auditable and testable |
| ML | Offline baseline and shadow ranking after labels exist | Avoid training on noisy/unreviewed candidates |
| Publication | Human approval only | Prevent false offers and eligibility claims |
| Scheduling | Existing GitHub Actions for bounded feeds; separate worker only when needed | Preserve free/low-cost operation and isolate long crawls |

## 9. Research source list

1. Google Search spam policies: https://developers.google.com/search/docs/essentials/spam-policies
2. RFC 9309: https://www.rfc-editor.org/rfc/rfc9309.html
3. Common Crawl about: https://www.commoncrawl.org/about
4. Common Crawl index server: https://index.commoncrawl.org/
5. Crawlee first crawler: https://crawlee.dev/js/docs/introduction/first-crawler
6. Apache StormCrawler: https://stormcrawler.apache.org/
7. Schema.org Offer: https://schema.org/Offer
8. Awin APIs: https://help.awin.com/apidocs/introduction-to-awins-apis
9. Awin product feed publisher guide: https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
10. Awin publisher tools: https://www.awin.com/us/publishers/tools
11. Affiliate.com networks: https://affiliate.com/networks
12. Feedico: https://feedico.io/
13. Google crawl budget: https://developers.google.com/crawling/docs/crawl-budget
14. Google robots guidance: https://developers.google.com/search/docs/crawling-indexing/robots/intro
15. Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
16. Deal websites overview (secondary source): https://dealhack.com/blog/top-deal-websites

## 10. Bottom line

QuestPulse should be positioned as an evidence-first global opportunity discovery and verification engine, not as the first coupon site or first crawler. The strongest initial differentiator to validate is the combination of broad opportunity taxonomy, first-party proof, country eligibility (including explicit unknowns), fees/conditions transparency, freshness monitoring and human-controlled publication.

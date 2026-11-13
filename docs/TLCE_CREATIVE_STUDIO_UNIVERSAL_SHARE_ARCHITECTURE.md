# TLCE Creative Studio & Universal Share Architecture

**Status:** Architecture specification — design only  
**Parent platform:** THE LAST COSMIC EXPLOSION (TLCE)  
**Internal consumer:** QuestPulse (Q.P) and future TLCE branches  
**Implementation status:** Not implemented; this document does not imply live functionality.

## 1. Purpose and product boundary

TLCE will provide a first-party creative workspace named **TLCE Creative Studio** for generating, importing, editing, branding, documenting, exporting, and sharing images and videos.

It will also provide **TLCE Universal Share**, a cross-platform intake and publishing entry point. A user should be able to invoke TLCE from a device's native share interface when the operating system and source application expose compatible sharing capabilities. The same workflow must remain available through the TLCE web application and manual link import.

Both capabilities belong to the TLCE parent platform. Q.P and other branches consume shared parent services and contracts; they must not create independent identities, social graphs, media registries, or publishing systems.

## 2. Creative Studio capabilities

- Generate images from text prompts and permitted reference images.
- Generate videos from prompts and permitted image/video references, subject to the selected provider's capabilities and terms.
- Import user-owned or properly licensed images, videos, audio, and project assets.
- Edit media: crop, resize, trim, captions, text overlays, visual adjustments, and versioned edits.
- Export using common aspect ratios, resolutions, formats, and destination presets.
- Allow users to upload or create their own logo/watermark and control position (including the top edge of a video), size, opacity, and margins.
- Offer a separate, optional TLCE attribution mark. Clearly distinguish it from the user's own brand.
- Preserve the original/imported asset separately from derived edits and exports when storage and permissions allow.

Generation providers, models, pricing, quotas, and supported output formats are implementation-time decisions. Do not promise unlimited generation or specific output quality before a provider is selected and tested.

## 3. Universal Share intake

The intake workflow accepts, where supported:
- URLs and plain text;
- one or multiple images;
- one or multiple videos;
- files and shared content descriptors supplied by the operating system.

The receiving experience identifies the payload type, shows the originating URL/source metadata when available, and asks the user to review the content before saving or publishing. A received item is a draft, never an automatic publication.

### 3.1 Link and ecommerce preview

For a product or webpage URL, TLCE may retrieve publicly available metadata (title, description, canonical URL, preview image) using a secure server-side preview service. Extraction is best-effort: sites may block automated access, require authentication, or provide incomplete metadata.

- Preserve and display the original destination URL.
- Normalize and validate URLs; allow only supported schemes, normally HTTPS.
- Defend against SSRF, private-network access, DNS rebinding, redirect abuse, oversized responses, and malicious markup.
- Never request or store third-party account passwords.
- Do not bypass login walls, paywalls, DRM, anti-bot controls, or download restrictions.
- Do not copy merchant images, descriptions, prices, or protected content into public posts unless the user has the necessary rights or the source/API terms permit it.
- Attribute the source and link to the original page.
- Treat product details and availability as time-sensitive unless checked through an authorized source.

### 3.2 Draft review and publishing

Before publishing, the user can edit the caption, select permitted media, choose personal branding and optional TLCE attribution, select an authorized destination/feed/branch, review visibility, and explicitly confirm publication.

Publishing must pass through parent-owned Content Registry, Authorization, Moderation, and Social/Publishing contracts. Q.P may provide a branch-specific view, but canonical posts and engagement records remain parent-owned.

## 4. Cross-platform integration strategy

Use one shared intake contract with platform-specific adapters. Do not assume one integration mechanism works identically on every operating system.

| Platform | Preferred integration | Required fallback |
| --- | --- | --- |
| Android | Native Sharesheet target using supported share intents and MIME types | Copy link, open TLCE, or manual import |
| iOS/iPadOS | Share Extension and supported document/photo pickers | Copy link, open TLCE, or manual import |
| Windows | Registered share target where supported by selected app technology; file associations and OS-supported integration | Desktop app open/import and web app |
| macOS | Share Extension / Services integration where supported by selected app technology | Desktop or web app import |
| Linux | Desktop-environment and packaging-specific integration where available | Web app, drag-and-drop, paste URL |
| Web browsers | Web Share Target where supported by an eligible installed web app; Web Share API for outbound sharing where available | Paste URL, upload, drag-and-drop |

Native share-sheet visibility depends on OS capabilities, installation state, permissions, app packaging, browser support, and source-app behavior. TLCE must not claim that it will appear in every application's share menu. The web/manual fallback is mandatory.

### 4.1 Shared intake envelope

Normalize incoming payloads into a parent-owned ShareIntake envelope with conceptual fields:
- intake_id — unique identifier;
- actor_id — authenticated TLCE identity, if signed in;
- source_platform — platform adapter identifier;
- shared_at — server-received timestamp;
- payload_kind — URL, text, image, video, or file;
- text and canonical_url — optional shared text and validated URL;
- temporary_asset_refs — quarantined upload references;
- source_metadata — optional untrusted metadata;
- consent_state — user review/consent state;
- processing_state — received, scanning, preview-ready, draft, rejected, or expired.

This is a conceptual contract, not a committed database schema. Final names and storage types must align with the actual TLCE parent repository.

### 4.2 Adapter responsibilities

Each adapter must accept only supported types and sizes, validate and normalize payloads, avoid unnecessary sensitive logging, hand off to the common intake service, and provide clear errors plus a user-controlled fallback.

## 5. Media provenance, watermarking, and rights

### 5.1 Three distinct concepts

- **User watermark:** a visual brand supplied or configured by the user.
- **TLCE attribution:** an optional mark identifying the tool/platform that generated or processed the asset.
- **Provenance record:** structured metadata describing the asset's origin and processing history.

A watermark does not by itself establish ownership, exclusivity, or trademark registration.

### 5.2 Provenance record

Record, where available and permitted:
- asset identifier and parent owner;
- source type: generated, user-uploaded, imported, or derived;
- source URL/provider and license/terms reference where applicable;
- creator identity and creation/processing timestamps;
- parent/derived asset relationships and edit/export history;
- cryptographic digest (for example SHA-256) of the exact stored bytes;
- generation provider/model/version and job reference, if disclosed;
- applied watermark and attribution configuration.

A digest can help detect byte changes, but does not prove authorship or copyright ownership. Phrase provenance claims accurately. Where feasible, evaluate interoperable content-credential standards such as C2PA and distinguish signed credentials from ordinary editable metadata.

### 5.3 Trademark language

Do not call the TLCE mark a **registered trademark** unless registration has actually been granted by the relevant authority and the legal owner and jurisdiction are confirmed. Until then, use “TLCE brand mark” or “TLCE attribution.” Do not represent a user's mark as registered without verification.

### 5.4 Rights and safety

Users must have the rights needed to upload, transform, and share submitted media. Preserve source attribution and license conditions. Respect platform terms, API restrictions, copyright, privacy, publicity rights, and applicable law. Provide moderation/reporting/takedown workflows. Scan uploads for malware, validate actual file signatures, and quarantine untrusted files before processing or public delivery.

## 6. Security and privacy requirements

- Authenticate through the single TLCE Identity service; no separate Q.P login.
- Use scoped OAuth authorization for third-party integrations; never collect third-party passwords.
- Request minimum necessary permissions and explain each permission.
- Encrypt transport and sensitive stored data; use short-lived upload/download URLs.
- Enforce server-side upload size, duration, resolution, and rate limits.
- Protect URL preview fetchers against SSRF, redirect, and DNS attacks.
- Sanitize text and metadata; treat imported metadata and files as untrusted input.
- Run malware scanning and media transcoding in isolated workers.
- Maintain audit events for consent, import, processing, export, and publication without retaining unnecessary sensitive payloads.
- Provide deletion/retention controls consistent with legal obligations and parent policy.
- Require explicit user confirmation before public publication or external account actions.

## 7. Parent-platform service boundaries

Intended modular-monolith boundaries:
- CreativeStudio — user-facing workspace and orchestration;
- GenerationProviderGateway — provider-neutral image/video generation;
- MediaService — canonical media registry, quarantine, storage, scanning, transcoding;
- EditingExportService — edit jobs, version graph, rendering, export;
- BrandingService — user watermark and optional platform attribution;
- ProvenanceService — origin records, hashes, credentials, lineage;
- UniversalShareAdapters — platform-specific inbound adapters;
- ShareIntakeService — normalized intake and draft creation;
- LinkPreviewService — secure metadata retrieval;
- PublishingGateway — controlled publication through parent contracts;
- Identity, Authorization, and Moderation — shared parent services.

Q.P consumes these services through parent APIs/contracts. It must not create branch-specific copies of identity, canonical media, provenance, social engagement, or moderation state.

## 8. High-level user journeys

### A. Share an ecommerce product from a phone
1. User taps Share in a merchant app/site.
2. User selects TLCE if the OS offers it.
3. Adapter submits URL/text to ShareIntakeService.
4. TLCE validates the URL and attempts a safe metadata preview.
5. User reviews the title, preview, source URL, and rights notice.
6. User adds commentary or permitted media and chooses branding.
7. TLCE saves a draft.
8. User explicitly confirms publication to the official TLCE feed or an authorized branch.

### B. Import and edit a video
1. User selects a local file or connected cloud source.
2. TLCE quarantines and validates the file.
3. Scanning/transcoding completes.
4. User edits a derived version without silently overwriting the original.
5. User positions a personal watermark and optional TLCE attribution.
6. TLCE exports the selected format and records provenance.
7. User downloads or shares the export.

### C. Generate and publish media
1. User selects image or video generation.
2. TLCE displays provider capabilities, limitations, and applicable cost/credit.
3. User submits a prompt and permitted references.
4. A generation job returns an asset to the workspace.
5. User edits, brands, and reviews the result.
6. Provenance is recorded to the extent supported by the provider.
7. User explicitly exports or publishes.

## 9. Reliability and acceptance criteria

Implementation planning must include tests proving that:
- URL/text intake works on each supported adapter and has a documented fallback.
- Supported media payloads are size-limited, validated, and quarantined.
- Retries do not create duplicate drafts (idempotency key required).
- Invalid schemes, private-network targets, malicious redirects, and oversized preview responses are rejected.
- Link previews fail safely when metadata is unavailable.
- Original assets remain distinguishable from derived edits and exports.
- Watermark placement, opacity, and export rendering are reproducible.
- No public post is created without explicit confirmation.
- Parent identity and moderation are used across all branches.
- Users can inspect source attribution and report content.
- Platform-specific integration tests cover supported OS versions and fallback behavior.
- Accessibility, localization, keyboard navigation, and screen-reader behavior are tested.

## 10. Delivery phases

1. **Parent-source discovery:** locate and inspect the real TLCE repository, framework, identity, content, media, moderation, storage, and deployment conventions.
2. **Contracts and threat model:** finalize intake, media, provenance, preview, and publishing contracts against the parent codebase.
3. **Web foundation:** implement manual URL import, upload, preview, draft review, and export.
4. **Native adapters:** implement Android and iOS share extensions, then desktop integrations based on selected packaging technology and OS capabilities.
5. **Creative Studio:** integrate generation providers, editing/rendering, watermarking, and provenance.
6. **Hardening and rollout:** security tests, rights review, accessibility, observability, backups, staged release, and operational runbooks.

No generation provider, paid API, cloud storage, native app framework, or production deployment is selected or activated by this specification.

## 11. Current repository and implementation gate

This is a design artifact in the QuestPulse repository because the connected workspace has not identified the actual TLCE parent repository. It does not mean parent services or native share integrations are implemented.

Before runtime integration, the actual TLCE parent repository or source archive must be supplied and inspected. Do not retrofit the Q.P prototype's local users/sessions/posts/media tables into parent services without a verified migration design. Do not alter protected reference assets such as app.asar without explicit approval.

## 12. Related architecture documents

- [TLCE social engagement engine](TLCE_SOCIAL_ENGAGEMENT_ENGINE.md)
- [TLCE master data model](TLCE_MASTER_DATA_MODEL.md)
- [TLCE social API contract](TLCE_SOCIAL_API_CONTRACT.md)
- [TLCE modular-monolith repository blueprint](TLCE_REPOSITORY_BLUEPRINT.md)
- [Q.P ↔ TLCE integration gap audit](TLCE_QP_INTEGRATION_GAP_AUDIT.md)

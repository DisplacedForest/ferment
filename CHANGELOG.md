# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-02-15

### Added

- Smart timeline consolidation: Tilt hydrometer readings now appear on the timeline as individual entries (last 4) and hourly summaries (older), computed at read-time from `hydrometer_readings`
- `HourlySummaryEntry` component for rendering consolidated hourly reading buckets
- `timeline-consolidation.ts` module for timezone-independent reading consolidation
- `hourly_summary` timeline entry type with `HourlySummaryData` interface

### Fixed

- Dashboard cards for Tilt-only batches now show gravity and temperature (previously blank because only `timeline_entries` was checked, not `hydrometer_readings`)
- Timeline consolidation no longer depends on UTC "today" — uses unrecapped reading dates instead, fixing timezone-related empty timeline bug

## [0.4.0] - 2026-02-15

### Added

- Hydrometer device management: register, edit calibration, toggle active, scan for Tilts on the network
- Hydrometer CRUD API (`/api/v1/hydrometers`) with scan endpoint for TiltPi BLE discovery
- Hydrometer readings ingest and time-series API (`/api/v1/batches/[id]/readings`) with raw/hourly/daily resolution
- Tilt polling service: auto-polls TiltPi at configurable intervals, ingests readings for linked batches
- Tilt polling configuration in Settings UI (enable/disable, URL, poll interval) backed by `app_settings` table
- Settings API (`/api/v1/settings`) for runtime-configurable app settings
- Daily fermentation recaps: auto-generated timeline summaries with gravity delta, temperature range, reading count
- Recap timeline rendering with mini SVG sparkline showing gravity direction
- Fermentation curve chart (Recharts): dual-axis gravity/temperature, phase boundary lines, time range selector
- TiltPi CSV import: parse and bulk-import historical data from TiltPi Google Sheets exports
- Import UI in Settings with CSV preview, batch/hydrometer selection, and progress feedback
- Quick Log pre-fill: auto-populates gravity and temperature from latest hydrometer reading
- Batch wizard Connect step: link a hydrometer during batch creation
- `hydrometers`, `hydrometer_readings`, and `app_settings` database tables
- `daily_recap` timeline entry type with system source
- Alert detection on reading ingest: stuck fermentation, temperature drift, gravity anomaly

### Changed

- Tilt polling config moved from environment variables to database-backed Settings UI
- Batch creation accepts optional `hydrometerId` to link a hydrometer
- Timeline source enum updated to `manual | hydrometer-auto | hydrometer-confirmed | system | api`
- Scan route reads TiltPi URL from DB settings instead of env vars
- `.env.example` cleaned up: removed Tilt/MQTT env vars (now configured in-app)

## [0.3.0] - 2026-02-15

### Added

- Protocol templates system with 3 built-in templates (Kit Wine Red, Kit Wine White, Simple Beer Ale)
- Template CRUD API (`/api/v1/templates`) with built-in deletion protection
- Batch phases: ordered phase sequences with status tracking (pending/active/completed/skipped)
- Phase engine evaluating 5 completion criteria types: gravity_stable, duration, action_count, manual, compound
- Phase actions with scheduling (one-time and recurring) and overdue tracking
- Phase management API: advance-phase, skip-phase, phase-status endpoints
- 3-step batch creation wizard (Basics → Protocol → Connect) replacing the simple form
- Protocol tab on batch detail with accordion phase cards, live evaluation, and advance/skip controls
- PhaseIndicator component with compact (dashboard) and detailed (batch header) variants
- Alert detection: stuck fermentation, temperature drift, gravity anomaly — auto-fires on new readings
- Dashboard attention indicators: overdue action count, unresolved alert count, ready-to-advance badges
- `currentPhaseId` on batches linking to the active phase
- `batch_phases`, `phase_actions`, and `protocol_templates` database tables

### Changed

- Batch creation now supports optional phases array in POST body
- Batch GET responses include phases and currentPhase
- Dashboard batch queries include phases, phase actions, and attention indicator computation
- Seed data includes phases for all sample batches
- Timeline POST for readings now triggers alert detection with 24h deduplication

## [0.2.0] - 2026-02-15

### Added

- Data access layer with computed batch fields (ABV, latest gravity, day count, entry count)
- REST API routes: batch CRUD (`/api/v1/batches`) and timeline entries (`/api/v1/batches/[id]/timeline`)
- Input validation for all 7 timeline entry types
- Dashboard with real batch data, URL-persisted status filters and sort controls
- Batch cards with live metrics (gravity, temperature, ABV, day count)
- Batch detail page with status header and tabbed layout
- Timeline view with color-coded entries, Phosphor icons, and load-more pagination
- Quick Log modal with 5 entry type forms (reading, addition, rack, taste, note)
- Batch creation page with form validation and redirect to detail
- Suspense boundaries with skeleton loading states
- Phosphor Icons integration (`@phosphor-icons/react`)

### Changed

- shadcn Card component: `rounded-xl` to `rounded-lg`, default shadow to warm wine-alpha shadow
- Dashboard page rewritten from static empty state to data-driven grid
- App header nav updated with "+ New batch" link

## [0.1.0] - 2026-02-15

### Added

- Project scaffolding with Next.js 15, React 19, and Tailwind CSS 4
- SQLite database with Drizzle ORM schema for batches and timeline entries
- Database seeding script with sample fermentation data
- Docker and Docker Compose configuration for self-hosted deployment
- Ferment design system: wine/parchment color palette, Fraunces/DM Sans/JetBrains Mono typography
- Dashboard page with empty state and placeholder batch cards
- Settings page placeholder
- shadcn/ui component library (button, card, input, dialog, select, etc.)
- Utility functions: ABV calculation, gravity formatting, relative timestamps
- TypeScript type definitions for batches, timeline entries, and reading sources
- ESLint and PostCSS configuration
- Environment variable configuration via `.env.example`
- MIT license

[Unreleased]: https://github.com/DisplacedForest/ferment/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/DisplacedForest/ferment/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/DisplacedForest/ferment/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/DisplacedForest/ferment/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/DisplacedForest/ferment/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DisplacedForest/ferment/releases/tag/v0.1.0

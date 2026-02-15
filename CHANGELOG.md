# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/DisplacedForest/ferment/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/DisplacedForest/ferment/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DisplacedForest/ferment/releases/tag/v0.1.0

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/DisplacedForest/ferment/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DisplacedForest/ferment/releases/tag/v0.1.0

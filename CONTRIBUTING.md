# Contributing to Ferment

Thanks for your interest in contributing. Ferment is a self-hosted fermentation logger built with Next.js, SQLite, and a strong design opinion. This guide covers how to get set up and what we expect from contributions.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Local Development

```bash
# Clone the repo
git clone https://github.com/DisplacedForest/ferment.git
cd ferment

# Install dependencies
npm install

# Copy environment config
cp .env.example .env.local

# Push the database schema
npm run db:push

# Seed with sample data (optional)
npm run db:seed

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### Docker

```bash
docker compose up --build
```

## Project Structure

```
src/
  app/          # Next.js App Router pages and layouts
  components/   # React components (ui/ contains shadcn/ui primitives)
  db/           # Drizzle ORM schema, connection, and seed script
  lib/          # Shared utilities
  types/        # TypeScript type definitions
data/           # SQLite database (gitignored, volume-mounted in Docker)
public/         # Static assets
```

## Development Guidelines

### Code Style

- TypeScript strict mode is enabled. No `any` unless absolutely necessary.
- Run `npm run lint` before committing.
- Use the path alias `@/` for imports from `src/`.

### Design System

Ferment has an opinionated design system. All UI contributions must follow it:

- **Colors:** Wine palette (primary), parchment palette (backgrounds). No pure white backgrounds, no pure black text, no blue buttons.
- **Typography:** Fraunces for headings, DM Sans for body/UI, JetBrains Mono for numbers.
- **Components:** Card radius 4-8px (never 16px+). Button radius 4px. No `rounded-full` buttons.
- **Icons:** Phosphor Icons (thin weight decorative, regular weight interactive). Not Heroicons, not Lucide.
- **Tone:** Conversational, like a knowledgeable winemaker friend. No exclamation marks in UI text. Use contractions.

If you're unsure whether something fits the design system, open an issue first to discuss.

### Commits

- Write clear, concise commit messages.
- Use conventional-ish subjects: "add batch export endpoint", "fix gravity calculation rounding", "update dashboard layout".
- Keep commits focused. One logical change per commit.

### Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, minor UI tweaks
- **Minor** (0.x.0): New features, new API endpoints
- **Major** (x.0.0): Breaking API changes, database migrations that require manual steps

Version bumps happen in `package.json`. The CI pipeline detects version changes on push and creates a GitHub release automatically.

## Submitting Changes

1. Fork the repository.
2. Create a branch from `main` (`git checkout -b your-feature`).
3. Make your changes.
4. Run `npm run lint` and `npm run build` to verify.
5. Push your branch and open a pull request against `main`.
6. Describe what your PR does and why.

## Reporting Issues

Open an issue on GitHub. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Node version, Docker version if applicable)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

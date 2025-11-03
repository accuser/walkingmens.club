# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tenant Walking Mens Club application** built with SvelteKit 2 and Svelte 5, configured for deployment to Cloudflare via `@sveltejs/adapter-cloudflare`.

**Purpose**: Provide local men's walking groups with simple informational websites showing:
- Meeting time and location
- Walking route maps
- Club-specific information

**Multi-tenancy**: Each club is distinguished by subdomain (e.g., `delabole.walkingmens.club`, `someothertown.walkingmens.club`). The application serves different content based on the hostname.

**Technology stack**:
- **Svelte 5** with the new runes API (`$props()`, `$state()`, etc.)
- **TypeScript** with strict mode enabled
- **Tailwind CSS v4** (via Vite plugin) for styling
- **Vitest** for testing with browser mode support
- **pnpm** as the package manager

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run type checking
pnpm check

# Run type checking in watch mode
pnpm check:watch

# Format code
pnpm format

# Lint code
pnpm lint

# Run all tests (unit + Svelte component tests)
pnpm test

# Run tests in watch mode
pnpm test:unit

# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

## Testing Strategy

This project uses **Vitest** with two distinct test configurations:

1. **Server tests** (`*.{test,spec}.{js,ts}`): Run in Node environment, exclude Svelte component tests
2. **Client tests** (`*.svelte.{test,spec}.{js,ts}`): Run in browser mode using Playwright/Chromium for testing Svelte components with DOM access

When writing tests:
- Use `*.spec.ts` or `*.test.ts` for server-side/Node tests (utilities, API logic, etc.)
- Use `*.svelte.spec.ts` or `*.svelte.test.ts` for Svelte component tests
- Component tests use `render()` from `vitest-browser-svelte` and `page` from `@vitest/browser/context`
- All tests require assertions (`expect.requireAssertions: true` in config)

Example component test:
```typescript
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import MyComponent from './MyComponent.svelte';

it('should render', async () => {
  render(MyComponent);
  await expect.element(page.getByRole('heading')).toBeInTheDocument();
});
```

## Project Structure

```
src/
  app.d.ts          # Global TypeScript types and SvelteKit namespace extensions
  app.css           # Global styles (Tailwind imports)
  app.html          # HTML template for the app
  lib/              # Reusable components, utilities
    index.ts        # Public library exports
    assets/         # Images, icons, etc.
  routes/           # File-based routing (SvelteKit)
    +layout.svelte  # Root layout (imports app.css, sets favicon)
    +page.svelte    # Route pages
```

## Code Style

- **Prettier** configured with:
  - Tabs for indentation
  - Single quotes
  - No trailing commas
  - 100 character line width
  - Tailwind CSS class sorting via `prettier-plugin-tailwindcss`

- **ESLint** configured with:
  - TypeScript recommended rules
  - Svelte plugin
  - `no-undef` disabled (TypeScript handles this)

## Svelte 5 Runes

This project uses Svelte 5 with the runes API. Key differences from Svelte 4:
- Use `let { propName } = $props()` instead of `export let propName`
- Use `$state()` for reactive state instead of `let` declarations
- Use `{@render children()}` instead of `<slot />`
- Component props must be destructured from `$props()`

## Deployment

Built for **Cloudflare Pages/Workers** using `@sveltejs/adapter-cloudflare`. The adapter is configured in `svelte.config.js`.

## TypeScript Configuration

- Strict mode enabled
- Module resolution: `bundler`
- Path alias `$lib` maps to `src/lib` (handled by SvelteKit)
- The tsconfig extends `.svelte-kit/tsconfig.json` (auto-generated during `svelte-kit sync`)

## Multi-Tenant Architecture

The app uses **hostname-based routing** to serve different content for each Walking Mens Club:

1. **Hostname detection**: Use `event.url.hostname` in SvelteKit hooks or `+page.server.ts` to determine which club
2. **Club configuration**: Each club has a configuration object defining:
   - Club name and location
   - Meeting time and day
   - Meeting point details (address, what3words, coordinates)
   - Walking route information
   - Map data (GeoJSON or similar)

3. **Data structure**: Club configurations are stored in `src/lib/clubs/` (e.g., `delabole.ts`, `index.ts`)

**Example flow**:
- User visits `delabole.walkingmens.club`
- SvelteKit detects hostname → loads Delabole club config
- Root route renders club-specific information (meeting details, route map)

**First club**: Delabole
- Meeting: Sunday mornings at 10:00
- Route: Footpath around Delabole Slate Quarry and surrounding fields

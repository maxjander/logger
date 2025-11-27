# @maxjan/logger

Development logger that wraps `console` and sends all logs to Loki/Grafana. Works with any JavaScript/TypeScript project.

In production, console works as normal - no logs are sent anywhere.

## Installation

```bash
# Link locally
cd ~/src/dev/@maxjan/logger
npm link

# In your project
npm link @maxjan/logger
```

## Quick Start

```typescript
import { initLogger } from "@maxjan/logger";

initLogger({
  appName: "my-app",
});

// That's it! Now all console calls are sent to Loki
console.log("Hello");
console.warn("Warning!");
console.error("Something failed", { userId: 123 });
```

## Configuration

```typescript
initLogger({
  // Required
  appName: "my-app",

  // Optional
  lokiUrl: "http://127.0.0.1:3100/loki/api/v1/push", // default
  enabled: true, // default, set false to disable
  labels: {
    env: "development",
    version: "1.0.0",
  },
});
```

## API

### `initLogger(config)`

Initialize the logger. Call once at app startup.

```typescript
import { initLogger } from "@maxjan/logger";

initLogger({
  appName: "my-app",
  labels: { service: "api" },
});
```

### `setLabels(labels)`

Add or update labels at runtime. Useful for adding request-specific context.

```typescript
import { setLabels } from "@maxjan/logger";

setLabels({ userId: "123", requestId: "abc" });
```

### `disableLogger()`

Disable the logger and restore original console behavior.

```typescript
import { disableLogger } from "@maxjan/logger";

disableLogger();
```

## Supported Console Methods

| Method | Loki Level |
|--------|------------|
| `console.log()` | info |
| `console.info()` | info |
| `console.warn()` | warn |
| `console.error()` | error |
| `console.debug()` | debug |
| `console.trace()` | debug |

## Example: Next.js

```typescript
// lib/logger.ts
import { initLogger } from "@maxjan/logger";

initLogger({
  appName: "my-nextjs-app",
  labels: {
    framework: "nextjs",
  },
});
```

```typescript
// app/layout.tsx
import "@/lib/logger";

export default function RootLayout({ children }) {
  return <html>{children}</html>;
}
```

## Example: Express

```typescript
// index.ts
import { initLogger, setLabels } from "@maxjan/logger";
import express from "express";

initLogger({ appName: "my-api" });

const app = express();

app.use((req, res, next) => {
  setLabels({
    path: req.path,
    method: req.method,
  });
  next();
});

app.get("/", (req, res) => {
  console.log("Request received");
  res.send("Hello");
});
```

## Querying in Grafana

```logql
# All logs from app
{app="my-app"}

# Only errors
{app="my-app", level="error"}

# Parse JSON and filter
{app="my-app"} | json | message =~ "user.*"
```

## Requirements

- Loki running locally (default: `http://127.0.0.1:3100`)
- Node.js 18+

## Development

```bash
npm install
npm run build
npm run dev     # watch mode
npm run lint    # check linting
npm run format  # format with prettier
```

### Commit Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new feature      # minor version bump
fix: bug fix               # patch version bump
feat!: breaking change     # major version bump
docs: update documentation
chore: maintenance
refactor: code refactoring
perf: performance improvement
```

### Release

```bash
npm run release           # auto-bump based on commits
npm run release:minor     # force minor bump
npm run release:major     # force major bump
```

This will:
- Bump version in package.json
- Generate/update CHANGELOG.md
- Create git tag

## License

MIT

# Pipeline Pack Assembler: Sibling Tool Discovery Pattern

## Correct Pattern (cwd-independent)

When discovering sibling tools in pipeline pack assemblers, use `import.meta.url` / `fileURLToPath`:

```typescript
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSiblingToolPath(toolName: string): string {
  // Resolve relative to THIS pack's install location
  // Go up two levels from src/assembler.ts to tools/
  const toolsDir = path.resolve(__dirname, '../..');
  return path.join(toolsDir, toolName);
}
```

**Why:** After compilation, `dist/assembler.js` correctly resolves sibling tools relative to the pack's install location, regardless of where `node` is invoked from.

## Incorrect Pattern (cwd-dependent) ❌

```typescript
function getSiblingToolPath(toolName: string): string {
  // ❌ WRONG: Fails when run from /workspace
  const toolsDir = path.resolve(process.cwd(), '..');
  return path.join(toolsDir, toolName);
}
```

**Problem:** When running from `/workspace`, `process.cwd()` returns `/workspace`, so `path.resolve(process.cwd(), '..')` resolves to `/` instead of `/workspace/tools/`, causing sibling discovery to fail.

## Reference Implementation

See `browns-ct-pack-pipeline-pack/src/assembler.ts` for the canonical pattern.

## Fixed in PR #158

- browns-guest-comms-pipeline-pack
- browns-ota-rate-pipeline-pack
- browns-welcome-late-pipeline-pack
- browns-inquiry-quote-pipeline-pack
- family-school-pipeline-pack

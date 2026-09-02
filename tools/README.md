# Tools Catalog

Offline CLI utilities for bot workflows: data validation, reconciliation, and file processing. All tools are read-only, TypeScript-based, and require no secrets or network access.

## Available Tools

### [csv-fixture-harness](./csv-fixture-harness/)
Validate CSV fixtures for data quality: check headers, required columns, row counts, blank cells, and currency violations. Helps Perfect Water, Ledger, Browns, and Vault workflows keep fixtures honest.

**Use when:** Validating CSV exports before ingestion, checking fixture quality, catching invented amounts in notes fields.

### [budget-merchant-matcher](./budget-merchant-matcher/)
Match budget transaction exports against known merchant rules. Identifies unclassified merchants needing research. Eliminates recurring ledger maintenance toil.

**Use when:** Reconciling bank exports, classifying transactions, maintaining merchant rules.

### [loyverse-xero-recon](./loyverse-xero-recon/)
Reconcile Loyverse POS sales against Xero accounting entries. Detects mismatches, missing entries, and amount discrepancies across stores.

**Use when:** Monthly reconciliation for Perfect Water stores, till-vs-books verification.

### [attachment-filename-index](./attachment-filename-index/)
Parse Gmail message subjects and attachment filenames into structured Drive-ready paths. Extracts dates, entities, document types from common patterns.

**Use when:** Filing email attachments to Drive, generating Drive move proposals, invoice organization.

### [suno-package-prep](./suno-package-prep/)
Generate Suno AI music job packages from lyrics and metadata. Validates song structure, enforces length limits, creates submission-ready JSON.

**Use when:** Preparing song submissions for Suno AI, validating lyrics format, batch music generation.

## Common Patterns

All tools follow these conventions:

- **Offline only** - No APIs, browser automation, or network calls
- **Read-only** - Never modify source files
- **TypeScript** - ES2022 modules with full type safety
- **Zero dependencies** - Pure Node.js, no external libraries
- **Tested** - Automated tests with synthetic fixtures
- **Documented** - Comprehensive README with examples

## Tool Structure

```
tools/<tool-name>/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── types.ts           # Type definitions
│   ├── *.ts               # Implementation modules
│   └── *.test.ts          # Test files
├── fixtures/              # Test data
│   ├── *.csv              # Sample inputs
│   └── README.md          # Fixture documentation
├── package.json
├── tsconfig.json
└── README.md
```

## Development

Each tool can be built and tested independently:

```bash
cd tools/<tool-name>
npm install
npm run build
npm test
npm run test:fixtures
```

See individual tool READMEs for specific usage instructions.

## Adding New Tools

When creating a new tool:

1. Follow the standard structure above
2. Use TypeScript with strict mode
3. Include comprehensive tests
4. Provide good and bad fixture examples
5. Document all CLI options and exit codes
6. Add one-line entry to this catalog

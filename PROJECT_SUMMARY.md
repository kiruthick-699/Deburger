# AI Debugging Assistant - Project Summary

## Extension Overview

**Name:** AI Debugging Assistant (internal name: "Deburger")  
**Version:** 0.1.0 (MVP)  
**Platform:** VS Code Extension  
**Tech Stack:** TypeScript 5.3.3, Node.js, ESLint, TypeScript compiler API, Babel AST (custom rule only), Jest, GitHub Actions

## Core Architecture

### 1. Static Analysis Engine
- **Project Scanner** (`projectScanner.ts`)
  - Discovers JS/TS files recursively
  - Respects `.gitignore` patterns
  - Returns `ScannedFile[]` with file path and text content
  
- **Analyzer** (`analyzer.ts`)
  - Merges three issue sources into one `AnalysisIssue[]`
  - Error recovery for malformed code
  - Configurable thresholds (max function lines, nesting depth)

- **ESLint Runner** (`eslintRunner.ts`)
  - Calls ESLint's `Linter` API directly (no CLI shell-out, no project `.eslintrc` dependency)
  - `no-unused-vars` / `@typescript-eslint/no-unused-vars` → `unused-var`
  - `max-lines-per-function` → `long-function`
  - `max-depth` → `deep-nesting`
  - Translates ESLint's own rule IDs back to this project's stable rule vocabulary

- **TypeScript Runner** (`tscRunner.ts`)
  - Uses `ts.createProgram` + `ts.getPreEmitDiagnostics` against the project's own `tsconfig.json`
  - Only runs when a `tsconfig.json` is found; no compiler options are guessed
  - Surfaces real type errors as `error`-severity issues (ruleId `ts<code>`)

- **Rules** (`rules/*.ts`)
  - `asyncNoTryCatch.ts` - Flags async functions without error handling. The one hand-rolled AST rule, kept because neither ESLint core nor `@typescript-eslint` has a direct equivalent.

### 1a. Live Runtime Exception Detection (`debug/`)
- **Exception Context** (`exceptionContext.ts`)
  - Pure logic, no `vscode` dependency — fully unit-testable with a fake `customRequest`
  - `gatherExceptionContext()` drives the standard DAP requests: `exceptionInfo` → `stackTrace` → `scopes` → `variables`
  - `formatRuntimeContext()` turns that into plain text for the LLM context slot
  - `toSyntheticIssue()` maps it onto the same `AnalysisIssue` shape static analysis produces (`ruleId: 'runtime-exception'`), so it flows through the existing sidebar/diagnostics/explain UI unchanged
- **Exception Watcher** (`exceptionWatcher.ts`)
  - Thin `vscode.debug.registerDebugAdapterTrackerFactory('*', ...)` wiring
  - Watches every debug session (any debug type) for a `stopped` event with `reason: 'exception'`
  - On such a stop, calls `gatherExceptionContext()` and hands the result to a callback registered by `extension.ts`
- **extension.ts** wires this to `handleRuntimeException()`, which shows a notification with an "Explain with AI" action that reuses the same `explainAndShow()` helper as the sidebar's "Explain This Issue" command

### 2. AI Integration
- **Prompt Templates** (`promptTemplates.ts`)
  - `EXPLAIN_ISSUE_PROMPT` with placeholders for context/issue
  - Explicit no-code constraint enforcement
  - Structured for consistency
  
- **LLM Client** (`llmClient.ts`)
  - `explainIssue()` calls the real OpenAI or Anthropic HTTP API (provider selected via settings)
  - Prompt builder with context injection
  - Returns `{ issue, explanation, remediationSteps, model }` structure
  - Falls back to a locally-generated explanation in the UI if the API call fails

### 3. User Interface
- **Sidebar TreeView** (`aiSidebar.ts`)
  - `AIDebuggerTreeProvider` implements `TreeDataProvider`
  - Issues sorted by severity (error → warning → info)
  - Click-to-navigate to file locations
  - Command: `ai-debugger.explainIssue`
  
- **Diagnostics Manager** (`diagnosticsManager.ts`)
  - Maps issues to VS Code diagnostics
  - Organizes by file with severity mapping
  - Integrates with Problems panel
  
- **Explanation Panel** (`explanationPanel.ts`)
  - WebView panel for detailed explanations
  - Mocked explanations for all rule types
  - Styled with VS Code theme integration

### 4. Configuration & Security
- **ConfigManager** (`configManager.ts`)
  - Secure API key storage (machine-level settings)
  - Validation: OpenAI pattern (`sk-[a-zA-Z0-9]{20,}`), general pattern
  - Prompts user if API key not configured
  - Telemetry opt-out support
  - **NEVER logs or exposes API keys**
  
- **Settings Contributions** (package.json)
  - `aiDebugger.apiKey` - LLM API key (marked "secret")
  - `aiDebugger.enableTelemetry` - Anonymous usage tracking opt-out
  - `aiDebugger.analyzeOnSave` - Auto-run analysis on file save

## Testing Strategy

### Unit Tests (94 tests)
1. `projectScanner.test.ts` (9 tests) - File discovery, .gitignore
2. `analyzer.test.ts` (20 tests) - ESLint-sourced rules, custom async rule, real tsc diagnostics, error recovery
3. `contextBuilder.test.ts` (18 tests) - Context generation, dependency extraction
4. `llmClient.test.ts` (21 tests) - Prompt formatting, no-code constraint
5. `extension.test.ts` (2 tests) - Activation, command registration
6. `ui.test.ts` (9 tests) - TreeView, diagnostics, explanation panel
7. `exceptionContext.test.ts` (11 tests) - DAP request orchestration, formatting, synthetic issue mapping
8. `exceptionWatcher.test.ts` (4 tests) - Tracker registration, exception-stop detection, graceful degradation

### Integration Tests (15 tests)
- `integration.test.ts` - Full pipeline validation
  - scanProject → analyzeFiles → buildContext
  - Mock LLM integration points
  - TreeView severity sorting
  - Diagnostics file organization

### ConfigManager Tests (14 tests)
- API key retrieval, validation
- Telemetry opt-out logic
- Settings UI prompts

**Total: 124 tests passing**

## Build & Deployment

### Scripts
- `npm run compile` - TypeScript compilation
- `npm test` - Jest test suite
- `npm run lint` - ESLint validation
- `npm run package` - Build .vsix extension package
- `npm run package:pre` - Full CI check (compile + test + lint)

### CI/CD
- GitHub Actions workflow (`.github/workflows/nodejs.yml`)
- Runs on: push, pull_request
- Matrix: Node.js 18.x, 20.x
- Steps: install → compile → lint → test

### Packaging
- `@vscode/vsce` for extension packaging
- `.vscodeignore` excludes source/test files
- ESLint, TypeScript, and Babel are now real `dependencies` (not `devDependencies`), since the analyzer needs them at runtime; `npm run package` no longer passes `--no-dependencies`, so they're actually included in the `.vsix`. Previously they were devDependencies with `--no-dependencies` set, which would have shipped a broken package.
- No bundler yet — a future esbuild pass would shrink the package size

## Security & Privacy

### API Key Management
- ✅ Stored in VS Code user settings (machine-level)
- ✅ Never logged or printed
- ✅ Validated before use
- ✅ Clear warnings in README
- ❌ NEVER commit to git

### Privacy Notice
**Sent to LLM:**
- File paths and names
- Code snippets (issue context)
- Dependency information

**NOT sent:**
- Full codebase
- Secrets/environment variables
- Git history

## MVP Constraints

### What it DOES
✅ Analyze code for issues (ESLint + TypeScript compiler + 1 custom rule)  
✅ Explain problems (no code generation)  
✅ Provide context summaries  
✅ Display issues in sidebar/diagnostics  

### What it DOESN'T do
❌ Generate code fixes  
❌ Auto-refactor  
❌ Write new code  
❌ Auto-complete  

## Repository Structure

```
debuggerr/
├── .github/workflows/     # CI/CD
├── .vscode/              # Launch config
├── src/
│   ├── core/            # Scanner, analyzer, ESLint/tsc runners, rules, config
│   ├── debug/           # Live runtime exception detection (DAP)
│   ├── ai/              # LLM client, prompts
│   ├── ui/              # Sidebar, diagnostics, explanation panel
│   ├── __fixtures__/    # Test fixtures
│   └── *.test.ts        # All test files
├── out/                 # Compiled JS (gitignored)
├── package.json         # Extension manifest
├── tsconfig.json        # TypeScript config
├── jest.config.js       # Jest config
├── .eslintrc.js         # ESLint config
└── README.md            # User documentation
```

## Git History
1. `scaffold: initial extension boilerplate`
2. `ci: add GitHub Actions workflow`
3. `feat: add project scanner with .gitignore support`
4. `feat: add AST-based analyzer with 4 rules`
5. `feat: add context builder for LLM summaries`
6. `feat: add LLM client with no-code constraint`
7. `feat: add polished UI (sidebar, diagnostics, explanation)`
8. `feat: add API key config, integration tests, packaging`
9. `feat: wire real LLM API calls, fix F5 debug launch`
10. `feat: replace custom AST rules with ESLint + TypeScript compiler diagnostics`
11. `feat: watch live debug sessions for uncaught exceptions via DAP` ← CURRENT

## Future Roadmap
- [x] Live LLM API integration (OpenAI, Anthropic)
- [x] Replace duplicative AST rules with ESLint + real tsc diagnostics
- [x] Debug Adapter Protocol integration: explain live exceptions/variable state at breakpoints
- [ ] Bundle with esbuild for a smaller `.vsix`
- [ ] Local LLM support (Ollama, LM Studio)
- [ ] Custom rule configuration UI
- [ ] Support for Python, Java, Go
- [ ] Performance optimization (incremental analysis)
- [ ] Team-shared analysis profiles

## Key Design Decisions

1. **No code generation** - Strict MVP constraint for AI features
2. **Live LLM by default** - OpenAI/Anthropic behind a provider setting; falls back to a local mock explanation on failure
3. **Delegate commodity checks to ESLint/tsc** - Unused vars, nesting depth, and function length are already solved problems; only `async-no-try-catch` is a custom AST rule, since it's the one check without a mature-tool equivalent
4. **Runtime exceptions reuse the static-analysis UI** - A live exception is mapped onto the same `AnalysisIssue` shape (ruleId `runtime-exception`) instead of building a parallel UI, so the sidebar/diagnostics/explain-with-AI flow needed zero new UI code
5. **Secure config** - API keys never exposed in logs/errors
6. **Test-first** - 124 tests before this release
7. **TypeScript strict mode** - Full type safety

## Dependencies

### Production
- `@babel/parser` / `@babel/traverse` - AST parsing for the one custom rule
- `eslint` + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` - Static analysis engine
- `typescript` - Compiler API for real type-error diagnostics

### Development
- `jest` + `ts-jest` - Testing framework
- `@vscode/vsce` - Extension packaging
- `@types/*` - Type definitions

## Installation

```bash
git clone https://github.com/kiruthick-699/Deburger.git
cd debuggerr
npm install
npm run compile
npm test  # Should show 124 passing tests
```

## Running in VS Code

1. Open project in VS Code
2. Press **F5** to launch Extension Development Host
3. Open a JS/TS workspace
4. Run command: **AI Debugger: Run AI Debugging Analysis**
5. View issues in **AI Debugger** sidebar

---

**Project Status:** ✅ MVP Complete, real LLM + real static analysis wired  
**Test Coverage:** 124 tests passing  
**Last Updated:** 2026-07-30  
**Maintainer:** Kiruthick Kannaa

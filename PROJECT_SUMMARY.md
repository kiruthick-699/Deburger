# AI Debugging Assistant - Project Summary

## Extension Overview

**Name:** AI Debugging Assistant (internal name: "Deburger")  
**Version:** 0.1.0 (MVP)  
**Platform:** VS Code Extension  
**Tech Stack:** TypeScript 5.3.3, Node.js, Babel AST, Jest, GitHub Actions

## Core Architecture

### 1. Static Analysis Engine
- **Project Scanner** (`projectScanner.ts`)
  - Discovers JS/TS files recursively
  - Respects `.gitignore` patterns
  - Returns `ScannedFile[]` with file path and text content
  
- **AST-Based Analyzer** (`analyzer.ts`)
  - Orchestrates 4 built-in rules
  - Error recovery for malformed code
  - Configurable thresholds (max function lines, nesting depth)
  
- **Rules** (`rules/*.ts`)
  1. `unusedVars.ts` - Detects unused variables/imports
  2. `longFunction.ts` - Warns on functions exceeding line threshold
  3. `asyncNoTryCatch.ts` - Flags async functions without error handling
  4. `deepNesting.ts` - Identifies excessive nesting depth

### 2. AI Integration
- **Prompt Templates** (`promptTemplates.ts`)
  - `EXPLAIN_ISSUE_PROMPT` with placeholders for context/issue
  - Explicit no-code constraint enforcement
  - Structured for consistency
  
- **LLM Client** (`llmClient.ts`)
  - `explainIssue()` function (placeholder HTTP client)
  - Prompt builder with context injection
  - Returns `{ issue, explanation }` structure

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

### Unit Tests (76 tests)
1. `projectScanner.test.ts` (9 tests) - File discovery, .gitignore
2. `analyzer.test.ts` (17 tests) - AST parsing, error recovery
3. `contextBuilder.test.ts` (18 tests) - Context generation, dependency extraction
4. `llmClient.test.ts` (21 tests) - Prompt formatting, no-code constraint
5. `extension.test.ts` (2 tests) - Activation, command registration
6. `ui.test.ts` (9 tests) - TreeView, diagnostics, explanation panel

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

**Total: 106 tests passing**

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
- Optimized for distribution

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
✅ Analyze code for issues (4 rules)  
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
│   ├── core/            # Scanner, analyzer, rules, config
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
8. `feat: add API key config, integration tests, packaging` ← CURRENT

## Future Roadmap
- [ ] Live LLM API integration (currently mocked)
- [ ] Custom rule configuration UI
- [ ] Support for Python, Java, Go
- [ ] Performance optimization (incremental analysis)
- [ ] Team-shared analysis profiles
- [ ] Local LLM support (Ollama, LM Studio)

## Key Design Decisions

1. **No code generation** - Strict MVP constraint for AI features
2. **Mock LLM by default** - Avoids API costs/limits during testing
3. **AST-based analysis** - More reliable than regex patterns
4. **Modular rules** - Easy to add custom rules later
5. **Secure config** - API keys never exposed in logs/errors
6. **Test-first** - 106 tests before first release
7. **TypeScript strict mode** - Full type safety

## Dependencies

### Production
- `@babel/parser` - AST parsing
- `@babel/traverse` - AST traversal

### Development
- `typescript` - Language & compilation
- `jest` + `ts-jest` - Testing framework
- `eslint` - Code linting
- `@vscode/vsce` - Extension packaging
- `@types/*` - Type definitions

## Installation

```bash
git clone https://github.com/kiruthick-699/Deburger.git
cd debuggerr
npm install
npm run compile
npm test  # Should show 106 passing tests
```

## Running in VS Code

1. Open project in VS Code
2. Press **F5** to launch Extension Development Host
3. Open a JS/TS workspace
4. Run command: **AI Debugger: Run AI Debugging Analysis**
5. View issues in **AI Debugger** sidebar

---

**Project Status:** ✅ MVP Complete  
**Test Coverage:** 106 tests passing  
**Last Updated:** 2025  
**Maintainer:** Kiruthick Kannaa

# AI Debugging Assistant (Deburger) 🔍

[![Tests](https://img.shields.io/badge/tests-106%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue)]()

A VS Code extension that provides intelligent debugging assistance through AST-based static analysis and AI-powered explanations.

## 🎯 Description

AI Debugging Assistant helps developers identify and understand potential issues in their JavaScript and TypeScript code. It combines Abstract Syntax Tree (AST) analysis with AI explanations to provide insights **without generating code**.

**Key Features:**
- 🔎 AST-based static analysis with 4 built-in rules
- 🤖 AI-powered explanations (no code generation)
- 📊 Visual issue browser in sidebar
- 🎨 Inline diagnostics in editor
- 🔒 Secure API key management

## 🔧 Static Analysis Rules

The extension includes 4 AST-based rules:

### 1. **Unused Variables** (`unused-var`)
**Severity:** Warning  
**Detects:**
- Unused imports
- Declared but unused variables
- Unused function parameters
- Unused functions

**Example:**
```javascript
const lodash = require('lodash'); // ⚠️ Warning: Unused import
const unusedVar = 42;             // ⚠️ Warning: Never used
```

### 2. **Long Function** (`long-function`)
**Severity:** Info  
**Detects:** Functions exceeding 50 lines (configurable)

**Example:**
```javascript
function generateReport() {
  // ... 60 lines of code ...  // ℹ️ Info: Function too long
}
```

### 3. **Async Without Try-Catch** (`async-no-try-catch`)
**Severity:** Error  
**Detects:** Async functions without error handling

**Example:**
```javascript
async function fetchData() {
  const res = await fetch(url);  // ❌ Error: No try-catch
  return res.json();
}
```

### 4. **Deep Nesting** (`deep-nesting`)
**Severity:** Warning  
**Detects:** Nesting depth > 4 levels (configurable)

**Example:**
```javascript
if (a) {
  if (b) {
    if (c) {
      if (d) {
        if (e) {              // ⚠️ Warning: Too deeply nested
          // code here
        }
      }
    }
  }
}
```

## 📋 MVP Scope

### Core Features

- **Project Scanner**: Automatically scans workspace for JavaScript/TypeScript files
- **AST-Based Static Analysis**: Detects common issues and anti-patterns using Abstract Syntax Tree analysis
  - Unused variables
  - Missing error handling in async functions
  - Excessive function length
  - Deep nesting complexity

- **Sidebar UI**: Dedicated panel showing:
  - Analysis results organized by severity
  - Issue count badges
  - Quick navigation to problem locations
  - Click-to-explain functionality

- **Inline Diagnostics**: Real-time issue highlighting in the editor
  - Squiggly underlines for detected issues
  - Hover tooltips with issue descriptions
  - Integration with VS Code's Problems panel

- **AI-Powered Explanations**: LLM integration for understanding issues
  - Explain why a detected issue matters
  - Provide context about best practices
  - Suggest conceptual approaches to fixing problems
  - **CONSTRAINT: NO code generation** - explanations only

### What This Extension Does

✅ **Analyze** existing code for issues  
✅ **Explain** problems and their implications  
✅ **Guide** developers with explanations  
✅ **Highlight** areas needing attention  

### What This Extension Does NOT Do

❌ Generate code fixes automatically  
❌ Apply refactoring transformations  
❌ Write new code or functions  
❌ Auto-complete or suggest code snippets

## 🚀 Quick Start

### Prerequisites
- VS Code 1.85.0 or higher
- Node.js 18.x or higher
- Git

### Installation for Development

```bash
# 1. Clone the repository
git clone https://github.com/kiruthick-699/Deburger.git
cd debuggerr

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Run tests (optional)
npm test  # Should show 106 tests passing

# 5. Launch Extension Development Host
# Press F5 in VS Code, or:
code --extensionDevelopmentPath=/path/to/debuggerr
```

### Try the Demo

```bash
# Open the demo project with intentional issues
code demo-project/

# In VS Code:
# 1. Press Cmd+Shift+P (or Ctrl+Shift+P on Windows/Linux)
# 2. Type "AI Debugger: Run AI Debugging Analysis"
# 3. Press Enter
# 4. View issues in the AI Debugger sidebar
```

## 📖 Usage

### Running Analysis

**Method 1: Command Palette**
1. Open a JavaScript/TypeScript project in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `AI Debugger: Run AI Debugging Analysis`
4. Wait for analysis to complete

**Method 2: Sidebar**
1. Click the AI Debugger icon in the Activity Bar (left sidebar)
2. Click "Run Analysis" button

### Viewing Issues

**Sidebar View:**
- Issues are organized by severity (Error → Warning → Info)
- Click any issue to jump to its location in code
- Issue count badge shows total detected issues

**Problems Panel:**
- Press `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)
- View all issues alongside other VS Code diagnostics
- Filter by file or severity

**Inline Diagnostics:**
- Squiggly underlines appear in code
- Hover over underlined code to see issue description
- Blue info icon in gutter for informational issues

### Getting AI Explanations

1. Click on any issue in the sidebar
2. Select "Explain This Issue"
3. View detailed explanation in the panel
4. *Note: Requires API key configuration (see Configuration section)*

## 🎨 Screenshots

> *Screenshots will be added here showing:*
> - Sidebar with detected issues
> - Inline diagnostics in editor
> - AI explanation panel
> - Problems panel integration

## 🧪 Demo Project

The `demo-project/` folder contains intentionally flawed code to demonstrate the extension:

| File | Issues Demonstrated |
|------|---------------------|
| `index.js` | Async without try-catch, unused imports/variables |
| `deepNesting.js` | Excessive nesting (5-6 levels) |
| `longFunction.js` | Function exceeding 50 lines |
| `unusedVars.js` | Unused imports, variables, parameters, functions |

**Expected Results:** ~15-20 issues across 4 categories

## Development

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## ⚙️ Configuration

### API Key Setup

The extension requires an LLM API key for AI-powered explanations. Configure it in VS Code settings:

1. Open Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux)
2. Search for **"AI Debugger"**
3. Enter your API key in `aiDebugger.apiKey`

**Alternative: settings.json**
```json
{
  "aiDebugger.apiKey": "sk-your-api-key-here",
  "aiDebugger.enableTelemetry": false,
  "aiDebugger.analyzeOnSave": false
}
```

**⚠️ SECURITY WARNING:**
- **NEVER** commit your API key to version control
- Store the key in **User Settings**, not Workspace Settings
- Treat your API key like a password
- Rotate keys immediately if exposed

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiDebugger.apiKey` | string | `""` | LLM API key (OpenAI, etc.) |
| `aiDebugger.enableTelemetry` | boolean | `true` | Anonymous usage telemetry (opt-out) |
| `aiDebugger.analyzeOnSave` | boolean | `false` | Auto-run analysis on file save |

### Privacy Notice

**What gets sent to the LLM API:**
- File names and paths from your project
- Code snippets around detected issues (±5 lines context)
- Issue descriptions and metadata
- Project dependency information (from package.json)

**What does NOT get sent:**
- Your entire codebase
- Environment variables or secrets
- Git history or commit messages
- Unrelated files

**Recommendations:**
- ✅ Review your organization's data policies before use
- ✅ Consider self-hosted LLM solutions for proprietary code
- ✅ Remove API key when not needed
- ✅ Use on non-sensitive projects if uncertain

## 🛠️ Development

### Project Structure

```
debuggerr/
├── src/
│   ├── core/              # Static analysis engine
│   │   ├── analyzer.ts    # AST analyzer orchestrator
│   │   ├── projectScanner.ts
│   │   ├── contextBuilder.ts
│   │   ├── configManager.ts
│   │   └── rules/         # Analysis rules
│   ├── ai/                # LLM integration
│   │   ├── llmClient.ts
│   │   └── promptTemplates.ts
│   ├── ui/                # VS Code UI components
│   │   ├── aiSidebar.ts
│   │   ├── diagnosticsManager.ts
│   │   └── explanationPanel.ts
│   └── extension.ts       # Entry point
├── demo-project/          # Demo with intentional issues
└── out/                   # Compiled JavaScript
```

### Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on save)
npm run watch

# Run tests (106 tests)
npm test

# Lint code
npm run lint

# Package extension
npm run package
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- analyzer

# Watch mode
npm test -- --watch
```

## 🐛 Known Limitations

### Current MVP Limitations

1. **JavaScript/TypeScript Only**
   - No support for Python, Java, Go, etc. (yet)
   - Limited TypeScript-specific analysis

2. **No Live LLM Integration**
   - Explanation feature uses mock responses
   - Requires manual LLM API client implementation

3. **Basic Rule Set**
   - Only 4 rules currently implemented
   - No custom rule configuration UI

4. **Performance**
   - Full project scans on large codebases may be slow
   - No incremental analysis (re-scans entire project)

5. **No Caching**
   - Repeated analyses re-compute all issues
   - LLM responses not cached (when implemented)

### Planned Improvements

See [Roadmap](#roadmap) below for upcoming features.

## 🗺️ Roadmap

### Short-term (Next Release)
- [ ] Live LLM API integration (OpenAI, Anthropic, local)
- [ ] Caching for LLM responses
- [ ] Incremental analysis (only changed files)
- [ ] Custom rule configuration UI
- [ ] Rule severity customization

### Medium-term
- [ ] Python language support
- [ ] Java/Kotlin language support
- [ ] Go language support
- [ ] Custom user-defined rules
- [ ] Team-shared analysis profiles
- [ ] Export reports (HTML, JSON, PDF)

### Long-term
- [ ] Multi-language AST analysis
- [ ] ML-powered pattern detection
- [ ] Integration with CI/CD pipelines
- [ ] VS Code Web support
- [ ] Real-time analysis (on-type)

## 📊 Technical Details

**Tech Stack:**
- **Language:** TypeScript 5.3.3
- **AST Parser:** @babel/parser, @babel/traverse
- **Testing:** Jest (106 tests, 100% passing)
- **CI/CD:** GitHub Actions
- **Packaging:** @vscode/vsce

**Extension API Usage:**
- TreeView API (sidebar)
- Diagnostics API (inline squiggles)
- WebView API (explanation panel)
- Configuration API (settings)

## 📝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**Guidelines:**
- Maintain the "no code generation" constraint for AI features
- Add tests for all new rules or features
- Follow existing code style (ESLint)
- Update documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- VS Code Extension API documentation
- Babel AST parser community
- OpenAI for LLM capabilities

---

**Made with ❤️ by Kiruthick Kannaa**

[![GitHub](https://img.shields.io/badge/GitHub-kiruthick--699-black)]()
[![Tests](https://img.shields.io/badge/tests-106%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()


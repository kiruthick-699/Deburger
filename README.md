# AI Debugging Assistant

A VS Code extension that provides intelligent debugging assistance through static analysis and AI-powered explanations.

## Description

AI Debugging Assistant helps developers identify and understand potential issues in their JavaScript and TypeScript code. It combines AST-based static analysis with AI explanations to provide insights without generating code.

## MVP Scope

The initial MVP release focuses on static analysis and explanatory AI features:

### Core Features

- **Project Scanner**: Automatically scans workspace for JavaScript/TypeScript files
- **AST-Based Static Analysis**: Detects common issues and anti-patterns using Abstract Syntax Tree analysis
  - Unused variables
  - Potential null/undefined access
  - Missing error handling
  - Type mismatches (TypeScript)
  - Code complexity warnings

- **Sidebar UI**: Dedicated panel showing:
  - Analysis results organized by file
  - Issue severity levels (error, warning, info)
  - Quick navigation to problem locations
  - Analysis statistics

- **Inline Diagnostics**: Real-time issue highlighting in the editor
  - Squiggly underlines for detected issues
  - Hover tooltips with issue descriptions
  - Integration with VS Code's Problems panel

- **AI-Powered Explanations**: OpenAI integration for understanding issues
  - Explain why a detected issue matters
  - Provide context about best practices
  - Suggest conceptual approaches to fixing problems
  - **CONSTRAINT: NO code generation** - explanations only

### MVP Constraints

**What this extension does NOT do:**
- ❌ Generate code fixes automatically
- ❌ Apply refactoring transformations
- ❌ Write new code or functions
- ❌ Auto-complete or suggest code snippets

**What this extension DOES:**
- ✅ Analyze existing code for issues
- ✅ Explain problems and their implications
- ✅ Guide developers with explanations
- ✅ Highlight areas needing attention

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to open a new VS Code window with the extension loaded

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

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18.x or higher
- TypeScript 5.x

## Configuration

The extension will require an OpenAI API key for AI explanations. Configuration details to be added in future releases.

## Roadmap

Future enhancements beyond MVP:
- Support for additional languages (Python, Java, etc.)
- Custom rule configuration
- Team-shared analysis profiles
- Performance optimization for large projects
- Enhanced AI context awareness

## License

MIT

## Contributing

Contributions are welcome! Please ensure all PRs include tests and maintain the "no code generation" constraint for AI features.

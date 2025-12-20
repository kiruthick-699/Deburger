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

### API Key Setup

The extension requires an LLM API key for AI-powered explanations. Configure it in VS Code settings:

1. Open Settings (Cmd+, on macOS, Ctrl+, on Windows/Linux)
2. Search for "AI Debugger"
3. Set your API key in `aiDebugger.apiKey`

**⚠️ SECURITY WARNING:**
- **NEVER** commit your API key to version control
- Store the key in **User Settings** (`~/Library/Application Support/Code/User/settings.json` on macOS)
- **DO NOT** store it in Workspace Settings (`.vscode/settings.json`)
- Treat your API key like a password
- Rotate keys immediately if exposed

### Privacy Notice

**What gets sent to the LLM API:**
- File names and paths from your project
- Code snippets around detected issues
- Issue descriptions and metadata
- Project dependency information

**What does NOT get sent:**
- Your entire codebase
- Environment variables or secrets
- Git history or commit messages
- Personal identifiable information (unless in code comments)

**Recommendations:**
- Review your organization's data policies before use
- Consider self-hosted LLM solutions for sensitive codebases
- Use the extension only on non-proprietary code if uncertain
- Disable API integration by removing the API key when not needed

### Additional Settings

- `aiDebugger.enableTelemetry` - Enable/disable anonymous usage telemetry (default: `true`)
  - Set to `false` to opt out of anonymous usage data collection
- `aiDebugger.analyzeOnSave` - Run analysis automatically when files are saved (default: `false`)

### AI API Integration

**Important Notes on API Usage:**

The extension includes an LLM client placeholder that can be connected to OpenAI, Anthropic Claude, or other LLM services for generating issue explanations. Before enabling live API calls, be aware of:

#### Cost Considerations
- Each issue explanation requires one API call
- Large projects with many issues can accumulate significant costs quickly
- Implement request batching and caching strategies to minimize API calls
- Always monitor your API usage and set spending limits with your provider
- Consider local/self-hosted LLM alternatives for cost-sensitive environments

#### Rate Limits
- Most LLM APIs enforce rate limits (tokens/minute, requests/minute)
- Implement exponential backoff and retry logic for rate-limited requests
- Queue analysis requests if working with large codebases
- Cache explanations to avoid re-requesting the same issues

#### Security & Privacy
- **Never hardcode API keys** - use environment variables only
- API requests will send code context to external services
- Review your organization's data policies before enabling API integration
- Consider on-premises LLM solutions for sensitive codebases
- Mask or redact sensitive information in issue explanations

#### LLM Client Implementation
The `src/ai/llmClient.ts` module provides:
- Prompt template that explicitly forbids code generation
- Configurable endpoint support (OpenAI, Claude, local LLMs)
- Structure for implementing your preferred LLM provider
- Currently a placeholder; no live API calls are made

To enable live API calls:
1. Update `callLLMAPI()` in `src/ai/llmClient.ts` with your provider's API client
2. Set `LLM_API_KEY` and `LLM_ENDPOINT` environment variables
3. Implement rate-limiting and error handling
4. Test thoroughly with a small project first

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

# Quick Start Guide - AI Debugging Assistant

## 🚀 Try It Right Now (5 minutes)

### Step 1: Clone & Setup
```bash
git clone https://github.com/kiruthick-699/Deburger.git
cd debuggerr
npm install
npm run compile
```

### Step 2: Launch the Extension
```bash
# Option A: From command line
code --extensionDevelopmentPath=. demo-project/

# Option B: From VS Code
# 1. Open this folder in VS Code
# 2. Press F5 to start Extension Development Host
```

### Step 3: Run Analysis
In the VS Code extension host window:
1. **Press `Cmd+Shift+P`** (Mac) or **`Ctrl+Shift+P`** (Windows/Linux)
2. Type: **`AI Debugger: Run AI Debugging Analysis`**
3. Press **Enter**

### Step 4: View Results
- **Sidebar:** Click the "AI Debugger" icon in Activity Bar (left)
- **Problems Panel:** Press `Cmd+Shift+M` to see all issues
- **Editor:** Hover over squiggly underlines to see issue descriptions

## 📊 What You'll See

The demo project (`demo-project/`) contains ~15-20 intentional issues:

| Rule | Count | Files |
|------|-------|-------|
| Async without try-catch | 3 | index.js |
| Unused imports | 2 | index.js, unusedVars.js |
| Unused variables | 5+ | index.js, unusedVars.js |
| Deep nesting | 2 | deepNesting.js |
| Long function | 1 | longFunction.js |

## 🧪 Run the Tests

```bash
npm test  # Should see: 106 passing ✓
```

## 💻 Development

### File Structure
```
src/
├── core/         # Static analysis (scanner, analyzer, rules)
├── ai/           # LLM integration (placeholder)
└── ui/           # VS Code components (sidebar, diagnostics)

demo-project/    # Demo with intentional issues
```

### Build Commands
```bash
npm run compile  # Compile TypeScript
npm run watch    # Watch mode
npm run lint     # ESLint check
npm test         # Run Jest tests
```

## 🔑 Next Steps

1. **Explore the Code:**
   - `src/core/rules/` - See the 4 analysis rules
   - `src/ui/` - Explore the UI components
   - `src/ai/llmClient.ts` - See LLM integration point

2. **Add Custom Rules:**
   - Create new file in `src/core/rules/`
   - Implement the `Rule` interface
   - Register in `src/core/analyzer.ts`

3. **Integrate Real LLM:**
   - Update `callLLMAPI()` in `src/ai/llmClient.ts`
   - Add your OpenAI/Anthropic API key

## 📖 Documentation

- **[README.md](README.md)** - Full documentation
- **[RESUME_BULLETS.md](RESUME_BULLETS.md)** - For your resume/LinkedIn
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Architecture & design
- **[demo-project/README.md](demo-project/README.md)** - Demo details

## 🐛 Troubleshooting

### "No issues detected"
- Make sure you're analyzing `demo-project/` folder
- Check that `npm run compile` completed successfully
- View "Output" panel for debug messages

### "VS Code won't launch"
- Try: `npm run compile` first
- Ensure VS Code version 1.85.0 or higher
- Check that Node.js 18+ is installed: `node --version`

### Tests failing
- Clear and rebuild: `rm -rf out/ && npm run compile && npm test`
- Check Node.js version matches 18.x or 20.x

## 📞 Support

Found a bug? Have a question?
- Check [Issues](https://github.com/kiruthick-699/Deburger/issues)
- Review [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture
- See [RESUME_BULLETS.md](RESUME_BULLETS.md) for key concepts

---

**That's it!** You now have a working AI debugging assistant running locally. 🎉

Next, try opening your own JavaScript project and running the analysis!

# Demo Project

This demo project contains **intentionally flawed** JavaScript code designed to trigger all the static analysis rules in the AI Debugging Assistant extension.

## Intentional Issues

### 1. `index.js` - Async without try-catch
- Multiple `async` functions without error handling
- Unused imports (`lodash`)
- Unused variables (`unusedConfig`)

### 2. `deepNesting.js` - Deep Nesting
- `processUserInput()` - 6 levels of nesting
- `validateFormData()` - 5 levels of nesting

### 3. `longFunction.js` - Long Function
- `generateComprehensiveReport()` - Exceeds 50 lines

### 4. `unusedVars.js` - Unused Variables
- Unused imports: `fs`, `path`
- Unused constants: `API_KEY`, `MAX_RETRIES`, `TIMEOUT`, `DEBUG_MODE`
- Unused parameter: `middleName` in `formatUserName()`
- Unused function: `deprecatedHelper()`

## Expected Analysis Results

When you run the AI Debugging Assistant on this project, you should see:

- **~15-20 issues detected** across all files
- **Severity breakdown:**
  - Errors: Async functions without try-catch
  - Warnings: Unused variables, deep nesting, long functions
  - Info: Code quality suggestions

## How to Use

1. Open this folder (`demo-project/`) in VS Code
2. Run the AI Debugging Assistant (Cmd+Shift+P → "Run AI Debugging Analysis")
3. Check the **AI Debugger** sidebar for detected issues
4. Click on any issue to navigate to its location
5. Click "Explain This Issue" to get AI-powered explanations

## Note

These files are **not meant to be fixed** - they serve as test cases to demonstrate the extension's capabilities.

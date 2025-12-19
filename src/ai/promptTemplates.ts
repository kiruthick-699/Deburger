/**
 * Prompt template for explaining code analysis issues.
 * Intentionally excludes code output to ensure plain-text explanations.
 */

export const EXPLAIN_ISSUE_PROMPT = `You are an expert software engineer reviewing code quality issues.

Given the project context and the following static analysis issue, explain:

1) What the problem is in plain language.
2) Why it matters (bugs, maintainability, security, performance).
3) Concrete step-by-step remediation *in words only* (no code, no diffs).

Context: {{contextSummary}}

Issue: {{issue.file}} line {{issue.line}} — {{issue.ruleId}} — {{issue.message}}

Constraints: DO NOT produce any code, code suggestions, or patches. Output only plain-text explanations and numbered remediation steps.`;

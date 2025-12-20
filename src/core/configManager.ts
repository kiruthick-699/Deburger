import * as vscode from 'vscode';

/**
 * Securely manages LLM API configuration.
 * Never logs or exposes API keys.
 */
export class ConfigManager {
	private static readonly CONFIG_KEY = 'aiDebugger';
	private static readonly API_KEY_SETTING = 'apiKey';
	private static readonly TELEMETRY_SETTING = 'enableTelemetry';

	/**
	 * Get the stored API key from extension settings.
	 * Returns undefined if not configured.
	 * Never returns the key in error messages or logs.
	 */
	static async getApiKey(): Promise<string | undefined> {
		try {
			const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
			const apiKey = config.get<string>(this.API_KEY_SETTING);
			return apiKey && apiKey.trim().length > 0 ? apiKey : undefined;
		} catch (error) {
			console.error('Error retrieving API key configuration');
			return undefined;
		}
	}

	/**
	 * Check if API key is configured.
	 */
	static async isApiKeyConfigured(): Promise<boolean> {
		const apiKey = await this.getApiKey();
		return !!apiKey;
	}

	/**
	 * Validate API key format (basic check).
	 */
	static validateApiKey(apiKey: string): { valid: boolean; message?: string } {
		if (!apiKey || apiKey.trim().length === 0) {
			return { valid: false, message: 'API key cannot be empty' };
		}

		if (apiKey.length < 10) {
			return { valid: false, message: 'API key appears to be invalid (too short)' };
		}

		// Basic format check for common LLM API key prefixes
		const validPatterns = [
			/^sk-[a-zA-Z0-9]{20,}$/, // OpenAI: sk- followed by alphanumeric
			/^[a-zA-Z0-9\-_]{20,}$/, // General pattern: alphanumeric with dashes/underscores
		];

		const isValidFormat = validPatterns.some(pattern => pattern.test(apiKey));
		if (!isValidFormat) {
			return { valid: false, message: 'API key format does not match expected patterns' };
		}

		return { valid: true };
	}

	/**
	 * Get telemetry opt-out status.
	 * Returns true if telemetry is disabled (opted out).
	 */
	static async isTelemetryOptedOut(): Promise<boolean> {
		try {
			const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
			const enableTelemetry = config.get<boolean>(this.TELEMETRY_SETTING, true);
			return !enableTelemetry;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Open settings UI to configure API key.
	 */
	static async openApiKeySettings(): Promise<void> {
		await vscode.commands.executeCommand(
			'workbench.action.openSettings',
			`@ext:${this.CONFIG_KEY}`
		);
	}

	/**
	 * Prompt user to configure API key if not already set.
	 */
	static async promptForApiKeyIfNeeded(): Promise<boolean> {
		const isConfigured = await this.isApiKeyConfigured();

		if (!isConfigured) {
			const message =
				'AI Debugger requires an LLM API key to explain issues. ' +
				'Configure it in extension settings.';

			const action = await vscode.window.showInformationMessage(message, 'Open Settings');

			if (action === 'Open Settings') {
				await this.openApiKeySettings();
				return false;
			}
		}

		return isConfigured;
	}
}

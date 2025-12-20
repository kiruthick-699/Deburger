import * as vscode from 'vscode';
import { ConfigManager } from '../core/configManager';

// Mock VS Code API
jest.mock('vscode', () => ({
	workspace: {
		getConfiguration: jest.fn(),
	},
	window: {
		showInformationMessage: jest.fn(),
	},
	commands: {
		executeCommand: jest.fn(),
	},
}));

describe('ConfigManager', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getApiKey', () => {
		it('should return API key from config', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue('sk-test-key-123'),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const key = await ConfigManager.getApiKey();

			expect(key).toBe('sk-test-key-123');
			expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('aiDebugger');
		});

		it('should return undefined when key is empty', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(''),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const key = await ConfigManager.getApiKey();

			expect(key).toBeUndefined();
		});

		it('should return undefined when key is whitespace', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue('   '),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const key = await ConfigManager.getApiKey();

			expect(key).toBeUndefined();
		});

		it('should handle errors gracefully', async () => {
			(vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => {
				throw new Error('Config error');
			});

			const key = await ConfigManager.getApiKey();

			expect(key).toBeUndefined();
		});
	});

	describe('isApiKeyConfigured', () => {
		it('should return true when API key is set', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue('sk-test-key-123'),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const isConfigured = await ConfigManager.isApiKeyConfigured();

			expect(isConfigured).toBe(true);
		});

		it('should return false when API key is not set', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(''),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const isConfigured = await ConfigManager.isApiKeyConfigured();

			expect(isConfigured).toBe(false);
		});
	});

	describe('validateApiKey', () => {
		it('should validate OpenAI-style API key', () => {
			const result = ConfigManager.validateApiKey('sk-1234567890abcdefghijklmnop');

			expect(result.valid).toBe(true);
		});

		it('should reject empty API key', () => {
			const result = ConfigManager.validateApiKey('');

			expect(result.valid).toBe(false);
			expect(result.message).toContain('cannot be empty');
		});

		it('should reject too-short API key', () => {
			const result = ConfigManager.validateApiKey('sk-123');

			expect(result.valid).toBe(false);
			expect(result.message).toContain('too short');
		});

		it('should accept general pattern alphanumeric key', () => {
			const result = ConfigManager.validateApiKey('abcdefghijklmnopqrst');

			expect(result.valid).toBe(true);
		});

		it('should reject keys with invalid characters', () => {
			const result = ConfigManager.validateApiKey('sk-!@#$%^&*()');

			expect(result.valid).toBe(false);
		});
	});

	describe('isTelemetryOptedOut', () => {
		it('should return false when telemetry is enabled', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(true),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const optedOut = await ConfigManager.isTelemetryOptedOut();

			expect(optedOut).toBe(false);
		});

		it('should return true when telemetry is disabled', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(false),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const optedOut = await ConfigManager.isTelemetryOptedOut();

			expect(optedOut).toBe(true);
		});

		it('should default to enabled (false opt-out) when not set', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(true), // default value
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const optedOut = await ConfigManager.isTelemetryOptedOut();

			expect(optedOut).toBe(false);
		});
	});

	describe('openApiKeySettings', () => {
		it('should open settings for API key configuration', async () => {
			await ConfigManager.openApiKeySettings();

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'workbench.action.openSettings',
				'@ext:aiDebugger'
			);
		});
	});

	describe('promptForApiKeyIfNeeded', () => {
		it('should return true when API key is already configured', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue('sk-test-key-123'),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

			const result = await ConfigManager.promptForApiKeyIfNeeded();

			expect(result).toBe(true);
		});

		it('should show message and open settings when API key is not configured', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(''),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
			(vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Open Settings');

			const result = await ConfigManager.promptForApiKeyIfNeeded();

			expect(vscode.window.showInformationMessage).toHaveBeenCalled();
			expect(vscode.commands.executeCommand).toHaveBeenCalled();
			expect(result).toBe(false);
		});

		it('should not open settings if user dismisses message', async () => {
			const mockConfig = {
				get: jest.fn().mockReturnValue(''),
			};
			(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
			(vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

			const result = await ConfigManager.promptForApiKeyIfNeeded();

			expect(vscode.window.showInformationMessage).toHaveBeenCalled();
			expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
			expect(result).toBe(false);
		});
	});
});

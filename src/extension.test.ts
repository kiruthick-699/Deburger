import * as vscode from 'vscode';
import { activate, deactivate } from './extension';

describe('Extension Test Suite', () => {
  test('activate function should execute without errors', () => {
    const mockContext = {
      subscriptions: [],
      workspaceState: {},
      globalState: {},
      extensionPath: '',
      asAbsolutePath: (relativePath: string) => relativePath,
      storagePath: undefined,
      globalStoragePath: '',
      logPath: '',
      extensionUri: vscode.Uri.file(''),
      extensionMode: vscode.ExtensionMode.Test,
      storageUri: undefined,
      globalStorageUri: vscode.Uri.file(''),
      logUri: vscode.Uri.file(''),
      secrets: {},
      extension: {}
    };

    expect(() => activate(mockContext as unknown as vscode.ExtensionContext)).not.toThrow();
  });

  test('deactivate function should execute without errors', () => {
    expect(() => deactivate()).not.toThrow();
  });
});

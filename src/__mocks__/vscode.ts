export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3
}

export class Uri {
  static file(_path: string): Uri {
    return new Uri();
  }
  
  static parse(_value: string): Uri {
    return new Uri();
  }
}

export const extensions = {
  getExtension: jest.fn()
};

export const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: []
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn()
};

export const commands = {
  registerCommand: jest.fn()
};

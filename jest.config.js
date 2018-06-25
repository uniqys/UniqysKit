module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/**/?(*.)test.(ts|js)",
  ],
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  coverageThreshold: {
    // That has branch in only compiled code
    '**/structure/@(optional|either).ts': {
      statements: 90,
      branches: 80,
      functions: 95,
    },
    '**/*.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
    }
  },
  coveragePathIgnorePatterns: [
    'network/nat-traversal/index.ts',
    'network/libp2p-bundle.ts',
    // TODO: I will test it after the protocol settle.
    'chain-core/node.ts',
    'chain-core/validator.ts',
    'chain-core/synchronizer.ts'
  ]
};

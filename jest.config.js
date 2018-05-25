module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testEnvironment: "node",
  testMatch: [
    "**/?(*.)test.(ts|js)",
  ],
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  coverageThreshold: {
    // this is too strict?
    '**/*.ts': {
      statements: 90,
      branches: 90,
      functions: 95,
    }
  },
  coveragePathIgnorePatterns: [
    'network/nat-traversal/index.ts'
  ]
};

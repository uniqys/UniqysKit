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
    // This is branch in only compiled code
    '**/structure/optional.ts': {
      statements: 90,
      branches: 75,
      functions: 95,
    },
    // this is too strict?
    '**/*.ts': {
      statements: 90,
      branches: 90,
      functions: 95,
    }
  }
};

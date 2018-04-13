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
  }
};

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
    // this is too strict?
    '**/*.ts': {
      statements: 90,
      branches: 90,
      functions: 95,
    }
  }
};

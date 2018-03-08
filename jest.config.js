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
  modulePaths : [
    '<rootDir>/src/',
  ],
};

module.exports = {
  ...require('../../../config-base/jest.config'),
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/test-utils.ts'
  ]
}

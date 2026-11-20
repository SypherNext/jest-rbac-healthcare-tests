// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  // The permission-matrix suite makes several sequential requests against a
  // real server, so give it a little more room than Jest's 5s default.
  testTimeout: 15000,
};

// Test setup file
require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock global.io for socket tests
global.io = {
  emit: jest.fn()
};

// Console suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error
};

// Cleanup after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Stub for mongoose to avoid actually connecting to the database
import sinon from 'sinon';
import mongoose from 'mongoose';

// Suppress console during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

before(() => {
  // Stub mongoose connect
  sinon.stub(mongoose, 'connect').resolves();
  
  // Suppress console output during tests
  console.error = () => {};
  console.log = () => {};
});

after(() => {
  // Restore stubs
  sinon.restore();
  
  // Restore console
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
}); 
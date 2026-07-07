import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldLogOtpToConsole } from '../src/utils/otp.util';

test('logs OTPs by default in development', () => {
  process.env.NODE_ENV = 'development';
  delete process.env.LOG_OTP_TO_TERMINAL;

  assert.equal(shouldLogOtpToConsole(), true);
});

test('allows OTP logging in production when explicitly enabled', () => {
  process.env.NODE_ENV = 'production';
  process.env.LOG_OTP_TO_TERMINAL = 'true';

  assert.equal(shouldLogOtpToConsole(), true);
});

test('suppresses OTP logging in production unless explicitly enabled', () => {
  process.env.NODE_ENV = 'production';
  process.env.LOG_OTP_TO_TERMINAL = 'false';

  assert.equal(shouldLogOtpToConsole(), false);
});

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator to check if password meets strength requirements
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[@$!%*?&#]/.test(value);

    const passwordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    if (!passwordValid) {
      return {
        passwordStrength: {
          hasMinLength,
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecialChar
        }
      };
    }

    return null;
  };
}

/**
 * Validator to check if confirm password matches password.
 * Use this on the FormGroup (it needs access to sibling controls),
 * but it also writes the `passwordMismatch` error onto the
 * `confirmPassword` control itself so field-level checks like
 * `confirmPassword.hasError('passwordMismatch')` work as expected.
 */
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    // Helper to strip just the `passwordMismatch` key from a control's
    // errors without clobbering any other errors it may have
    // (e.g. `required`).
    const clearMismatch = () => {
      if (confirmPassword.hasError('passwordMismatch')) {
        const { passwordMismatch, ...rest } = confirmPassword.errors ?? {};
        confirmPassword.setErrors(Object.keys(rest).length ? rest : null);
      }
    };

    // Nothing to compare yet (e.g. confirmPassword untouched/empty) —
    // let its own `required` validator handle that case.
    if (confirmPassword.value === '') {
      clearMismatch();
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    }

    clearMismatch();
    return null;
  };
}

/**
 * Validator for phone number format (E.164 format)
 * Accepts: +1234567890 or 1234567890
 */
export function phoneFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // E.164 format: +[country code][number] (e.g., +1234567890)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!phoneRegex.test(value)) {
      return { phoneFormat: true };
    }

    return null;
  };
}

/**
 * Validator for OTP format (6 digits)
 */
export function otpFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const otpRegex = /^\d{6}$/;

    if (!otpRegex.test(value)) {
      return { otpFormat: true };
    }

    return null;
  };
}

/**
 * Validator to ensure checkbox is checked (for terms & conditions)
 */
export function requiredTrueValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value !== true) {
      return { requiredTrue: true };
    }

    return null;
  };
}

/**
 * Validator for full name (at least first and last name)
 */
export function fullNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // Check if there are at least 2 words (first name and last name)
    const nameParts = value.trim().split(/\s+/);

    if (nameParts.length < 1 || value.trim().length < 2) {
      return { fullName: true };
    }

    return null;
  };
}

/**
 * Validator for minimum characters without spaces
 */
export function minLengthTrimmed(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    if (value.trim().length < minLength) {
      return { minLengthTrimmed: { requiredLength: minLength, actualLength: value.trim().length } };
    }

    return null;
  };
}

/**
 * Validator for email format with additional checks
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // More strict email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(value)) {
      return { email: true };
    }

    return null;
  };
}

/**
 * Validator for no whitespace
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const isWhitespace = (value || '').trim().length === 0;

    if (isWhitespace) {
      return { whitespace: true };
    }

    return null;
  };
}
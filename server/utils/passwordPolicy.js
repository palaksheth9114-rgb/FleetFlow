/**
 * Validates password strength against production-level security requirements.
 * Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required and must be a string.' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  if (!hasUpper) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }

  const hasLower = /[a-z]/.test(password);
  if (!hasLower) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }

  const hasNumber = /[0-9]/.test(password);
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }

  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecial) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }

  return { valid: true };
}

module.exports = { validatePassword };

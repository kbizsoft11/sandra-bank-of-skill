import crypto from 'crypto';

/**
 * Generate a secure 6-digit OTP
 */
export const generateOTP = (): string => {
    // Generate 6 random digits
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
};

/**
 * Hash OTP for secure storage
 */
export const hashOTP = (otp: string): string => {
    return crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
};

/**
 * Compare plain OTP with hashed OTP
 */
export const compareOTP = (plainOTP: string, hashedOTP: string): boolean => {
    const hashedPlain = hashOTP(plainOTP);
    return hashedPlain === hashedOTP;
};

/**
 * Check if OTP has expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
    return new Date() > expiresAt;
};

/**
 * Get OTP expiry date (10 minutes from now)
 */
export const getOTPExpiry = (): Date => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    return now;
};

/**
 * Mask email for display (e.g., j***@example.com)
 */
export const maskEmail = (email: string): string => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '***';
    return `${maskedUsername}@${domain}`;
};

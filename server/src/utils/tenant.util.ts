import crypto from 'crypto';

/**
 * Generate a unique tenant ID for organisations
 * Format: org_<timestamp>_<random>
 * Example: org_1704067200_a3f8c2
 */
export const generateTenantId = (): string => {
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(3).toString('hex');
    return `org_${timestamp}_${randomPart}`;
};

/**
 * Generate a unique tenant ID from organisation name
 * Format: <sanitized-org-name>_<random>
 * Example: acme-corp_a3f8c2
 */
export const generateTenantIdFromName = (organisationName: string): string => {
    // Sanitize organisation name
    const sanitized = organisationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30);
    
    const randomPart = crypto.randomBytes(3).toString('hex');
    return `${sanitized}_${randomPart}`;
};

/**
 * Validate tenant ID format
 */
export const isValidTenantId = (tenantId: string): boolean => {
    // Check if it matches the expected format
    const pattern = /^[a-z0-9-]+_[a-f0-9]{6}$/;
    return pattern.test(tenantId);
};

/**
 * Generate a short unique ID (for various purposes)
 * Example: a3f8c2d1
 */
export const generateShortId = (length: number = 8): string => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
};

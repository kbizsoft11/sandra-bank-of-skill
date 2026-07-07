// ==================== STEP 1: REGISTER ====================

export interface RegisterStep1Dto {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

// ==================== STEP 2: VERIFY OTP ====================

export interface VerifyOTPDto {
    email: string;
    otp: string;
}

export interface ResendOTPDto {
    email: string;
}

// ==================== STEP 3: ORGANISATION DETAILS ====================

export interface RegisterStep3Dto {
    organisationName: string;
    industry: string;
    teamSize: string;
    country: string;
}

// ==================== LEGACY (for backwards compatibility) ====================

export interface RegisterDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

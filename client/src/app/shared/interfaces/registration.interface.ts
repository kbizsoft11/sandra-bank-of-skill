// ==================== STATE MANAGEMENT ====================

export interface RegistrationState {
  currentStep: number;
  completedSteps: number[];
  data: {
    step1?: RegistrationStep1Data;
    step2?: RegistrationStep2Data;
    step3?: RegistrationStep3Data;
  };
  token?: string;
  expiresAt: Date;
  startedAt: Date;
}

export interface RegistrationStep1Data {
  fullName: string;
  email: string;
  phone: string;
}

export interface RegistrationStep2Data {
  verified: boolean;
  verifiedAt?: Date;
}

export interface RegistrationStep3Data {
  organisationName: string;
  industry: string;
  teamSize: string;
  country: string;
}

export interface RegistrationProgress {
  currentStep: number;
  completedSteps: number[];
  canProceed: boolean;
}

// ==================== STEP 1: REGISTER ====================

export interface RegisterStep1Request {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterStep1Response {
  message: string;
  email: string;
  expiresIn: number;
}

// ==================== STEP 2: VERIFY OTP ====================

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    onboardingStatus: string;
  };
  nextStep: number;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ResendOTPResponse {
  message: string;
  email: string;
  expiresIn: number;
}

// ==================== STEP 3: ORGANISATION DETAILS ====================

export interface RegisterStep3Request {
  organisationName: string;
  industry: string;
  teamSize: string;
  country: string;
}

export interface RegisterStep3Response {
  message: string;
  organisation: {
    _id: string;
    organisationName: string;
    industry: string;
    teamSize: string;
    country: string;
  };
  nextStep: number;
}

// ==================== STEP 4: COMPLETE REGISTRATION ====================

export interface CompleteRegistrationResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    tenantId: string;
    organisationId: string;
    onboardingStatus: string;
    profileCompleted: boolean;
  };
}

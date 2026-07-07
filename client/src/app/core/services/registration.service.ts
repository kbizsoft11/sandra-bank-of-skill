import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

import { 
  RegistrationState, 
  RegistrationStep1Data, 
  RegistrationStep2Data, 
  RegistrationStep3Data,
  RegisterStep1Request,
  RegisterStep1Response,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RegisterStep3Request,
  RegisterStep3Response,
  ResendOTPRequest,
  ResendOTPResponse,
  CompleteRegistrationResponse
} from '../../shared/interfaces/registration.interface';

import { ApiResponse } from '../../shared/interfaces/api-response.interface';

const REGISTRATION_STORAGE_KEY = 'registrationState';
const REGISTRATION_TOKEN_KEY = 'registrationToken';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);

  // Registration state signal
  private registrationState = signal<RegistrationState | null>(this.loadState());

  // Computed values
  readonly currentStep = computed(() => this.registrationState()?.currentStep || 1);
  readonly completedSteps = computed(() => this.registrationState()?.completedSteps || []);
  readonly registrationData = computed(() => this.registrationState()?.data || {});
  readonly registrationToken = computed(() => this.registrationState()?.token);
  readonly isExpired = computed(() => {
    const state = this.registrationState();
    if (!state) return false;
    return new Date() > new Date(state.expiresAt);
  });

  constructor() {
    // Check if registration is expired on service initialization
    if (this.isExpired()) {
      this.clearRegistration();
    }
  }

  /**
   * Load registration state from localStorage
   */
  private loadState(): RegistrationState | null {
    try {
      const stored = this.storage.getItem(REGISTRATION_STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored) as RegistrationState;
        
        // Check if expired
        if (new Date() > new Date(state.expiresAt)) {
          this.storage.removeItem(REGISTRATION_STORAGE_KEY);
          this.storage.removeItem(REGISTRATION_TOKEN_KEY);
          return null;
        }
        
        return state;
      }
      return null;
    } catch (error) {
      console.error('Error loading registration state:', error);
      return null;
    }
  }

  /**
   * Save registration state to localStorage
   */
  private saveState(state: RegistrationState): void {
    try {
      this.storage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(state));
      if (state.token) {
        this.storage.setItem(REGISTRATION_TOKEN_KEY, state.token);
      }

      const nextState: RegistrationState = {
        ...state,
        completedSteps: [...state.completedSteps],
        data: { ...state.data },
      };

      this.registrationState.set(nextState);
    } catch (error) {
      console.error('Error saving registration state:', error);
    }
  }

  /**
   * Get expiry date (24 hours from now)
   */
  private getExpiryDate(): Date {
    const date = new Date();
    date.setHours(date.getHours() + 24);
    return date;
  }

  /**
   * Update step completion
   */
  private markStepCompleted(step: number, token?: string): void {
    const state = this.registrationState();
    if (!state) return;

    const completedSteps = state.completedSteps.includes(step)
      ? [...state.completedSteps]
      : [...state.completedSteps, step];

    const nextState: RegistrationState = {
      ...state,
      currentStep: step + 1,
      completedSteps,
      token: token ?? state.token,
      data: { ...state.data }
    };

    this.saveState(nextState);
  }

  /**
   * Save step 1 data
   */
  saveStep1Data(data: RegistrationStep1Data): void {
    const state = this.registrationState() || {
      currentStep: 1,
      completedSteps: [],
      data: {},
      expiresAt: this.getExpiryDate(),
      startedAt: new Date()
    };

    const nextState: RegistrationState = {
      ...state,
      data: {
        ...state.data,
        step1: data
      }
    };

    this.saveState(nextState);
  }

  /**
   * Save step 2 data
   */
  saveStep2Data(data: RegistrationStep2Data): void {
    const state = this.registrationState();
    if (!state) return;

    const nextState: RegistrationState = {
      ...state,
      data: {
        ...state.data,
        step2: data
      }
    };

    this.saveState(nextState);
  }

  /**
   * Save step 3 data
   */
  saveStep3Data(data: RegistrationStep3Data): void {
    const state = this.registrationState();
    if (!state) return;

    const nextState: RegistrationState = {
      ...state,
      data: {
        ...state.data,
        step3: data
      }
    };

    this.saveState(nextState);
  }

  /**
   * Get step 1 data
   */
  getStep1Data(): RegistrationStep1Data | undefined {
    return this.registrationState()?.data.step1;
  }

  /**
   * Get step 3 data
   */
  getStep3Data(): RegistrationStep3Data | undefined {
    return this.registrationState()?.data.step3;
  }

  /**
   * Check if user can proceed to a specific step
   */
  canProceedToStep(step: number): boolean {
    const state = this.registrationState();
    if (!state) return step === 1;

    // Step 1 is always accessible
    if (step === 1) return true;

    // For other steps, check if previous step is completed
    return state.completedSteps.includes(step - 1);
  }

  /**
   * Get HTTP headers with registration token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.registrationToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    return new HttpHeaders();
  }

  /**
   * API: Step 1 - Register and send OTP
   */
  registerStep1(payload: RegisterStep1Request): Observable<ApiResponse<RegisterStep1Response>> {
    return this.http
      .post<ApiResponse<RegisterStep1Response>>(
        `${API_CONFIG.BASE_URL}/auth/register/step1`,
        payload
      )
      .pipe(
        tap((response) => {
          // Save step 1 data (excluding password)
          this.saveStep1Data({
            fullName: payload.fullName,
            email: payload.email,
            phone: payload.phone
          });

          // Mark step 1 as completed and move to step 2
          this.markStepCompleted(1);
        })
      );
  }

  /**
   * API: Step 2 - Verify OTP
   */
  verifyOTP(payload: VerifyOTPRequest): Observable<ApiResponse<VerifyOTPResponse>> {
    return this.http
      .post<ApiResponse<VerifyOTPResponse>>(
        `${API_CONFIG.BASE_URL}/auth/register/verify-otp`,
        payload
      )
      .pipe(
        tap((response) => {
          // Save OTP verification token and advance to step 3
          this.markStepCompleted(2, response.data.token);

          // Save step 2 data
          this.saveStep2Data({
            verified: true,
            verifiedAt: new Date()
          });
        })
      );
  }

  /**
   * API: Step 3 - Save organisation details
   */
  registerStep3(payload: RegisterStep3Request): Observable<ApiResponse<RegisterStep3Response>> {
    return this.http
      .post<ApiResponse<RegisterStep3Response>>(
        `${API_CONFIG.BASE_URL}/auth/register/step3`,
        payload,
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        tap((response) => {
          // Save step 3 data
          this.saveStep3Data({
            organisationName: payload.organisationName,
            industry: payload.industry,
            teamSize: payload.teamSize,
            country: payload.country
          });
          
          // Mark step 3 as completed and move to step 4
          this.markStepCompleted(3);
        })
      );
  }

  /**
   * API: Step 4 - Complete registration
   */
  completeRegistration(): Observable<ApiResponse<CompleteRegistrationResponse>> {
    return this.http
      .post<ApiResponse<CompleteRegistrationResponse>>(
        `${API_CONFIG.BASE_URL}/auth/register/complete`,
        {},
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        tap((response) => {
          this.authService.setSession(response.data.token);
          this.clearRegistration();
        })
      );
  }

  /**
   * API: Resend OTP
   */
  resendOTP(payload: ResendOTPRequest): Observable<ApiResponse<ResendOTPResponse>> {
    return this.http
      .post<ApiResponse<ResendOTPResponse>>(
        `${API_CONFIG.BASE_URL}/auth/register/resend-otp`,
        payload
      );
  }

  /**
   * Clear registration state (on completion or abandonment)
   */
  clearRegistration(): void {
    this.storage.removeItem(REGISTRATION_STORAGE_KEY);
    this.storage.removeItem(REGISTRATION_TOKEN_KEY);
    this.registrationState.set(null);
  }

  /**
   * Get current registration state
   */
  getRegistrationState(): RegistrationState | null {
    return this.registrationState();
  }

  /**
   * Check if registration is in progress
   */
  isRegistrationInProgress(): boolean {
    const state = this.registrationState();
    return !!state && !this.isExpired();
  }
}

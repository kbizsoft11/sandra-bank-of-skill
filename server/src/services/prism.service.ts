/** PRISM Brain Mapping API client. */

import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import {
  PrismApiError,
  ICreateCandidateRequest,
  ICreateCandidateResponse,
  IFetchCandidateHistoryRequest,
  IFetchCandidateHistoryResponse,
  IUnlockReportRequest,
  IFetchReportDataRequest,
  IFetchReportEIDataRequest,
  ICheckEntityExistsRequest,
} from '../types/assessment.types';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class PrismService {
  private readonly baseUrl = env.PRISM_API_BASE_URL.replace(/\/$/, '');
  private readonly siteId = env.PRISM_SITE_ID;
  private readonly clientId = env.PRISM_CLIENT_ID;

  private parseJson(value: unknown): any {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  }

  private resultBody(raw: unknown): any {
    const body = this.parseJson(raw);
    if (!body || typeof body !== 'object') return body;
    const key = Object.keys(body).find((name) => name.endsWith('Result'));
    return key ? this.parseJson(body[key]) : body;
  }

  private unwrap(method: string, raw: unknown): any {
    const result = this.resultBody(raw);
    if (!result || typeof result !== 'object') {
      throw new PrismApiError(502, 'PRISM returned an invalid response', 0, 'Invalid response');
    }

    // ResponseStatus=2 is PRISM's success value. Older installations can
    // omit it, so reject only explicit failure/unauthorised responses.
    if ((result.ResponseStatus !== undefined && result.ResponseStatus !== 2) || result.IsAuthorised === false) {
      const message = result.ResponseMessage || `PRISM ${method} failed`;
      throw new PrismApiError(400, `PRISM API Error: ${message}`, result.ResponseStatus || 0, message);
    }
    return result;
  }

  private validateCredentials(): void {
    if (!this.siteId || !this.clientId) {
      throw new PrismApiError(500, 'PRISM credentials not configured', 0, 'Missing PRISM_SITE_ID or PRISM_CLIENT_ID');
    }
  }

  private withCredentials(payload: Record<string, unknown> = {}) {
    return { SiteID: this.siteId, ClientID: this.clientId, ...payload };
  }

  /** PRISM requires raw JSON text, specifically with Content-Type text/plain. */
  private async makeRequest<T>(method: string, payload: unknown, attempt = 1): Promise<T> {
    const url = `${this.baseUrl}/${method}`;
    try {
      const response = await axios.post(url, JSON.stringify(payload), {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000,
        transformRequest: [(data) => data],
      });
      return this.unwrap(method, response.data) as T;
    } catch (error) {
      if (error instanceof PrismApiError) throw error;
      const axiosError = error instanceof AxiosError ? error : undefined;
      const retryable = !axiosError?.response && attempt < env.PRISM_RETRY_ATTEMPTS;
      if (retryable) {
        await sleep(env.PRISM_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        return this.makeRequest<T>(method, payload, attempt + 1);
      }
      const contentType = axiosError?.response?.headers?.['content-type'];
      const message = typeof contentType === 'string' && contentType.includes('text/html')
        ? 'PRISM rejected the request. Verify the endpoint and text/plain raw-JSON contract.'
        : `PRISM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw new PrismApiError(502, message, axiosError?.response?.status || 0, message);
    }
  }

  async createCandidate(employeeId: string, organisationId: string, qTypeId = env.PRISM_DEFAULT_QTYPE_ID, details?: { fullName?: string; email?: string; organisationName?: string }): Promise<ICreateCandidateResponse> {
    this.validateCredentials();
    const parts = details?.fullName?.trim().split(/\s+/) || [];
    const payload: ICreateCandidateRequest = this.withCredentials({
      ExternalIdent: employeeId,
      ParentExternalIdent: organisationId,
      QTypeID: qTypeId,
      Forename: parts[0] || 'User',
      Surname: parts.slice(1).join(' ') || 'Employee',
      Email: details?.email || '',
      Organisation: details?.organisationName || organisationId,
      LangID: 1,
      CreateUser: true,
      IsGift: false,
    }) as ICreateCandidateRequest;
    return this.makeRequest<ICreateCandidateResponse>('CreateCandidate', payload);
  }

  async fetchCandidateHistory(employeeId: string): Promise<IFetchCandidateHistoryResponse> {
    this.validateCredentials();
    return this.makeRequest<IFetchCandidateHistoryResponse>('FetchCandidateHistory', this.withCredentials({ ExternalIdent: employeeId }));
  }

  async checkEntityExists(employeeId: string): Promise<boolean> {
    this.validateCredentials();
    try {
      const result = await this.makeRequest<{ Exists?: boolean; EntityExists?: boolean }>('CheckEntityExists', this.withCredentials({ ExternalIdent: employeeId }));
      return result.Exists === true || result.EntityExists === true;
    } catch (error) {
      if (error instanceof PrismApiError && error.statusCode === 500) throw error;
      return false;
    }
  }

  async unlockReport(employeeId: string, organisationId: string): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('UnlockReport', this.withCredentials({ ExternalIdent: employeeId, ParentExternalIdent: organisationId }) as IUnlockReportRequest);
  }

  async fetchReportData(employeeId: string, entityTypeId = 1, onetCode?: string): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('FetchReportData', this.withCredentials({ ExternalIdent: employeeId, EntityTypeID: entityTypeId, ...(onetCode ? { ONetCode: onetCode } : {}) }) as IFetchReportDataRequest);
  }

  async fetchReportEIData(employeeId: string, entityTypeId = 1): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('FetchReportEIData', this.withCredentials({ ExternalIdent: employeeId, EntityTypeID: entityTypeId }) as IFetchReportEIDataRequest);
  }

  async fetchBasicMap(employeeId: string): Promise<string> {
    const result = await this.callAction<Record<string, any>>('FetchBasicMap', { ExternalIdent: employeeId });
    return result.MapFileName || result.ActionURL1 || result.ActionURL2 || '';
  }

  async fetchFullMap(employeeId: string): Promise<string> {
    const result = await this.callAction<Record<string, any>>('FetchFullMap', { ExternalIdent: employeeId });
    return result.MapFileName || result.ActionURL1 || result.ActionURL2 || '';
  }

  async callAction<T = Record<string, any>>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    this.validateCredentials();
    return this.makeRequest<T>(method, this.withCredentials(payload));
  }

  async createUser(payload: Record<string, unknown>) { return this.callAction('CreateUser', payload); }
  async updateUser(payload: Record<string, unknown>) { return this.callAction('UpdateUser', payload); }
  async fetchMultiCandidateHistory(payload: Record<string, unknown>) { return this.callAction('FetchMultiCandidateHistory', payload); }
  async fetchEstablishmentHistory(payload: Record<string, unknown>) { return this.callAction('FetchEstablishmentHistory', payload); }
  async fetch4DRawOutput(payload: Record<string, unknown>) { return this.callAction('Fetch4DRawOutput', payload); }
  async fetchCareerDetail(onetCode: string, includeStyles = false) { return this.callAction('FetchCareerDetail', { ONetCode: onetCode, IncludeStyles: includeStyles }); }
  async fetchOccupationCategories() { return this.callAction('FetchOccupationCategories'); }
  async fetchOccupationsByCategory(categoryId: number | string) { return this.callAction('FetchOccupationsByCategory', { CategoryID: categoryId }); }
  async fetchBenchmarks(payload: Record<string, unknown> = {}) { return this.callAction('FetchBenchmarks', payload); }
  async linkBenchmark(payload: Record<string, unknown>) { return this.callAction('LinkBenchmark', payload); }
  async upgradeReport(payload: Record<string, unknown>) { return this.callAction('UpgradeReport', payload); }
  async upgradeReportByCode(payload: Record<string, unknown>) { return this.callAction('UpgradeReportByCode', payload); }
  async fetchCustomOutput(payload: Record<string, unknown>) { return this.callAction('FetchCustomOutput', payload); }

  async fetchMergedReportData(employeeId: string, entityTypeId = 1, onetCode?: string): Promise<Record<string, any>> {
    const [assessmentData, emotionalIntelligenceData] = await Promise.all([
      this.fetchReportData(employeeId, entityTypeId, onetCode),
      this.fetchReportEIData(employeeId, entityTypeId),
    ]);
    return { assessmentData, emotionalIntelligenceData, mergedAt: new Date().toISOString() };
  }
}

export const prismService = new PrismService();

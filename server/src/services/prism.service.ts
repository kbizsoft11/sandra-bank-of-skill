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
  ICreateClientRequest,
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

    // Most PRISM actions use ResponseStatus=2 for success. CreateClient can
    // instead return ResponseStatus=0 with an explicit "Success:" message,
    // for example: "Success:Thank you - you are now registered...".
    const message = String(result.ResponseMessage || '');
    // PRISM uses several success message formats, including
    // "Success:..." and "Success - Candidate found".
    const explicitSuccess = /^success\b/i.test(message);
    const emptyCandidateHistory = method === 'FetchCandidateHistory'
      && result.ResponseStatus === 2
      && Array.isArray(result.HistoryList)
      && result.HistoryList.length === 0;
    const failedStatus = result.ResponseStatus !== undefined && result.ResponseStatus !== 2 && !explicitSuccess;
    if (failedStatus || (result.IsAuthorised === false && !explicitSuccess && !emptyCandidateHistory)) {
      const errorMessage = message || `PRISM ${method} failed`;
      throw new PrismApiError(400, `PRISM API Error: ${errorMessage}`, result.ResponseStatus || 0, errorMessage);
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

  async createClient(details: { forename: string; surname: string; orgName: string; orgId: string; email: string }): Promise<Record<string, any>> {
    this.validateCredentials();
    const payload: ICreateClientRequest = this.withCredentials({
      Forename: details.forename,
      Surname: details.surname,
      OrgName: details.orgName,
      OrgID: details.orgId,
      Email: details.email,
    }) as ICreateClientRequest;
    return this.makeRequest<Record<string, any>>('CreateClient', payload);
  }

  async createCandidate(clientId: string, employeeId: string, qTypeId = env.PRISM_DEFAULT_QTYPE_ID, details?: { fullName?: string; email?: string; organisationName?: string }): Promise<ICreateCandidateResponse> {
    this.validateCredentials();
    if (qTypeId === 29) {
      throw new PrismApiError(400, 'QTypeID 29 (CareerMatch) is no longer supported by PRISM', 0, 'Unsupported QTypeID');
    }
    const parts = details?.fullName?.trim().split(/\s+/) || [];
    const payload: ICreateCandidateRequest = this.withCredentials({
      ClientID: clientId,
      ExternalIdent: employeeId,
      QTypeID: qTypeId,
      Forename: parts[0] || 'User',
      Surname: parts.slice(1).join(' ') || 'Employee',
      Email: details?.email || '',
      Organisation: details?.organisationName || '',
      LangID: 1,
      Gender: false,
      CreateUser: false,
      IsGift: false,
    }) as ICreateCandidateRequest;
    return this.makeRequest<ICreateCandidateResponse>('CreateCandidate', payload);
  }

  async fetchCandidateHistory(employeeId: string, clientId = this.clientId): Promise<IFetchCandidateHistoryResponse> {
    this.validateCredentials();
    return this.makeRequest<IFetchCandidateHistoryResponse>('FetchCandidateHistory', this.withCredentials({ ClientID: clientId, ExternalIdent: employeeId }));
  }

  async checkEntityExists(employeeId: string, entityTypeId = 1, clientId = this.clientId): Promise<boolean> {
    this.validateCredentials();
    try {
      const payload: ICheckEntityExistsRequest = this.withCredentials({
        ClientID: clientId,
        ExternalIdent: employeeId,
        ChildIdentifier: '',
        EntityTypeID: entityTypeId,
        DetailOne: '',
        DetailTwo: '',
        DetailThree: '',
        RetURL: '',
      }) as ICheckEntityExistsRequest;
      const result = await this.makeRequest<{ Exists?: boolean; EntityExists?: boolean; ObjectExists?: boolean }>('CheckEntityExists', payload);
      return result.Exists === true || result.EntityExists === true || result.ObjectExists === true;
    } catch (error) {
      if (error instanceof PrismApiError && error.statusCode === 500) throw error;
      return false;
    }
  }

  async unlockReport(
    employeeId: string,
    entityTypeId = 1,
    clientId = this.clientId,
    transactionMethod = env.PRISM_TRANSACTION_METHOD,
    orderReference = `${env.PRISM_ORDER_REFERENCE_PREFIX}-${employeeId}`
  ): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('UnlockReport', this.withCredentials({
      ClientID: clientId,
      ExternalIdent: employeeId,
      EntityTypeID: entityTypeId,
      TransactionMethod: transactionMethod,
      OrderReference: orderReference,
    }) as IUnlockReportRequest);
  }

  async fetchReportData(employeeId: string, entityTypeId = 1, onetCode?: string, clientId = this.clientId): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('FetchReportData', this.withCredentials({ ClientID: clientId, ExternalIdent: employeeId, EntityTypeID: entityTypeId, ...(onetCode ? { ONetCode: onetCode } : {}) }) as IFetchReportDataRequest);
  }

  async fetchReportEIData(employeeId: string, entityTypeId = 1, clientId = this.clientId): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('FetchReportEIData', this.withCredentials({ ClientID: clientId, ExternalIdent: employeeId, EntityTypeID: entityTypeId }) as IFetchReportEIDataRequest);
  }

  async fetchBasicMap(employeeId: string, entityTypeId = 1, onetCode = '', clientId = this.clientId): Promise<string> {
    const result = await this.callAction<Record<string, any>>('FetchBasicMap', {
      ClientID: clientId,
      ExternalIdent: employeeId,
      EntityTypeID: entityTypeId,
      ShowUnderlying: false,
      ShowAdapted: false,
      ShowConsistent: false,
      ShowBenchmarkOnly: false,
      ONetCode: onetCode,
      UserRandomCode: '',
      Dimensions: onetCode ? 4 : 8,
      LanguageID: 1,
    });
    return result.MapFileName || result.ActionURL1 || result.ActionURL2 || '';
  }

  async fetchFullMap(employeeId: string, entityTypeId = 1, onetCode = '', clientId = this.clientId): Promise<string> {
    const result = await this.callAction<Record<string, any>>('FetchFullMap', {
      ClientID: clientId,
      ExternalIdent: employeeId,
      EntityTypeID: entityTypeId,
      ShowUnderlying: false,
      ShowAdapted: false,
      ShowConsistent: false,
      ShowBenchmarkOnly: false,
      ONetCode: onetCode,
      UserRandomCode: '',
      Dimensions: onetCode ? 4 : 8,
      LanguageID: 1,
    });
    return result.MapFileName || result.ActionURL1 || result.ActionURL2 || '';
  }

  async fetch4DRawOutput(employeeId: string, entityTypeId = 1, clientId = this.clientId): Promise<Record<string, any>> {
    this.validateCredentials();
    return this.makeRequest<Record<string, any>>('Fetch4DRawOutput', this.withCredentials({
      ClientID: clientId,
      ExternalIdent: employeeId,
      EntityTypeID: entityTypeId,
    }));
  }

  async callAction<T = Record<string, any>>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
    this.validateCredentials();
    return this.makeRequest<T>(method, this.withCredentials(payload));
  }

  async createUser(payload: Record<string, unknown>) { return this.callAction('CreateUser', payload); }
  async updateUser(payload: Record<string, unknown>) { return this.callAction('UpdateUser', payload); }
  async fetchMultiCandidateHistory(payload: Record<string, unknown>) { return this.callAction('FetchMultiCandidateHistory', payload); }
  async fetchEstablishmentHistory(payload: Record<string, unknown>) { return this.callAction('FetchEstablishmentHistory', payload); }
  async fetchCareerDetail(onetCode: string, includeStyles = false) { return this.callAction('FetchCareerDetail', { ONetCode: onetCode, IncludeStyles: includeStyles }); }
  async fetchOccupationCategories() { return this.callAction('FetchOccupationCategories'); }
  async fetchOccupationsByCategory(categoryId: number | string) { return this.callAction('FetchOccupationsByCategory', { CategoryID: categoryId }); }
  async fetchBenchmarks(payload: Record<string, unknown> = {}) { return this.callAction('FetchBenchmarks', payload); }
  async linkBenchmark(payload: Record<string, unknown>) { return this.callAction('LinkBenchmark', payload); }
  async upgradeReport(payload: Record<string, unknown>) { return this.callAction('UpgradeReport', payload); }
  async upgradeReportByCode(payload: Record<string, unknown>) { return this.callAction('UpgradeReportByCode', payload); }
  async fetchCustomOutput(payload: Record<string, unknown>) { return this.callAction('FetchCustomOutput', payload); }

  async fetchMergedReportData(employeeId: string, entityTypeId = 1, onetCode?: string, clientId = this.clientId): Promise<Record<string, any>> {
    const [assessmentData, emotionalIntelligenceData] = await Promise.all([
      this.fetchReportData(employeeId, entityTypeId, onetCode, clientId),
      this.fetchReportEIData(employeeId, entityTypeId, clientId),
    ]);
    return { assessmentData, emotionalIntelligenceData, mergedAt: new Date().toISOString() };
  }
}

export const prismService = new PrismService();

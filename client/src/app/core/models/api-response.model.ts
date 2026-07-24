// src/app/models/api-response.model.ts

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
  statusCode?: number;
}
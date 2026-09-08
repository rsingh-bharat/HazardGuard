export interface ReportRequest {
  stateId: string;
  forecastId: string;
  includeImpact: boolean;
  includeVerification: boolean;
}

export interface ReportMeta {
  reportId: string;
  stateId: string;
  stateName: string;
  forecastId: string;
  generatedAt: string;
  downloadUrl: string;
  pageCount: number;
  fileSizeBytes?: number;
}

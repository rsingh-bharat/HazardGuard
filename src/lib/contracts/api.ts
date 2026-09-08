// Standard wrapper for all /api/* responses
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  source: 'live' | 'mock';   // tells UI if it's real data
  timestamp: string;
}

export function createSuccessResponse<T>(data: T, source: 'live' | 'mock' = 'live'): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    source,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse<T>(error: string, fallbackData: T | null = null, source: 'live' | 'mock' = 'mock'): ApiResponse<T> {
  return {
    success: fallbackData !== null,
    data: fallbackData,
    error,
    source,
    timestamp: new Date().toISOString(),
  };
}

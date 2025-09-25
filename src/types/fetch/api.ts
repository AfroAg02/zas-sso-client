export interface ApiResponse<T> {
  data?: T;
  error?: boolean;
  status: number;
}

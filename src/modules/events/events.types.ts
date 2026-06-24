export interface Event {
  id:        string;
  userId:    string;
  type:      string;
  payload:   Record<string, unknown>;
  status:    'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventDto {
  type:     string;
  payload?: Record<string, unknown>;
}

// Generic paginated result — reuse this for workflows, runs, etc.
export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

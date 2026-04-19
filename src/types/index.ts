export type UserRole = 'owner' | 'architect' | 'site_supervisor';

export type DrawingType =
  | 'brief'
  | 'planning'
  | 'structural'
  | 'mep_electrical'
  | 'mep_plumbing'
  | 'mep_hvac'
  | 'exterior_design'
  | 'interior_drawing';

export type DrawingStatus = 'not_started' | 'submitted' | 'approved' | 'revised';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export type ProjectPhase =
  | 'drawing'
  | 'building'
  | 'finishing'
  | 'electrical'
  | 'plumbing'
  | 'door_window'
  | 'railing'
  | 'complete';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque';

export interface AuthUser {
  userId: string;
  firmId: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface OfflineSiteNote {
  localId: string;
  projectId: string;
  firmId: string;
  authorId: string;
  noteText: string | null;
  photoLocalKey: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  serverId: string | null;
}

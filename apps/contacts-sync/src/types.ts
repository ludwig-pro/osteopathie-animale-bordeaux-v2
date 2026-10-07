export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  EXPECTED_GOOGLE_EMAIL: string;
  CALENDLY_USER_URI: string;
  CALENDLY_ORGANIZATION_URI: string;
  CALENDLY_TOKEN: string;
  CALENDLY_SIGNING_KEY: string;
  GOOGLE_OAUTH: string;
}
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export interface Settings {
  mode: 'paused' | 'simulate' | 'pilot' | 'live';
  last_success: number | null;
  last_error: string | null;
  retry_at: number;
  turn: number;
  next_scan: number;
  scan_cursor: string | null;
  scan_active: number;
  index_cursor: string | null;
  index_generation: string | null;
  index_complete: number;
  index_active: number;
  google_group: string | null;
  google_sync_token: string | null;
  lease_owner: string | null;
  lease_until: number;
}
export interface Job {
  id: number;
  kind: 'event' | 'invitee' | 'contact';
  payload: string;
  version: number;
  attempts: number;
}
export interface Contact {
  email: string;
  marker: string;
  resource_name: string | null;
  last_block: string | null;
  pending_block: string | null;
  creation_attempted: number;
  pilot_allowed: number;
  synced_at: number | null;
}
export interface Booking {
  uri: string;
  eventUri: string;
  email: string;
  name: string;
  phone: string;
  start: string;
  status: 'active' | 'canceled';
  animal: string;
  animalType?: string;
  breed: string;
  birth: string;
  reason: string;
  oldInvitee: string | null;
  newInvitee: string | null;
  updatedAt: string;
}
export interface ScheduledEvent {
  name?: string;
  uri: string;
  start_time: string;
  status: 'active' | 'canceled';
  updated_at: string;
  event_memberships: { user: string }[];
}
export interface Invitee {
  uri: string;
  event: string;
  email: string;
  name: string;
  status: 'active' | 'canceled';
  updated_at: string;
  questions_and_answers?: { question: string; answer: string }[];
  old_invitee?: string | null;
  new_invitee?: string | null;
}
export interface Person {
  resourceName?: string;
  etag?: string;
  metadata?: {
    deleted?: boolean;
    sources?: { type: string; id?: string; etag?: string }[];
  };
  names?: {
    givenName?: string;
    familyName?: string;
    displayName?: string;
    unstructuredName?: string;
  }[];
  emailAddresses?: { value: string; type?: string }[];
  phoneNumbers?: { value: string; canonicalForm?: string; type?: string }[];
  biographies?: { value: string; contentType?: string }[];
  memberships?: {
    contactGroupMembership?: { contactGroupResourceName: string };
  }[];
  userDefined?: { key: string; value: string }[];
}

import type { ContactSources } from '../../contacts-sync/src/source-types.ts';
export type {
  ContactSources,
  ContactSourcesPage,
} from '../../contacts-sync/src/source-types.ts';

export interface SummaryDossier extends ContactSources {
  contextualAnimals: string[];
}

export interface SummarySentence {
  text: string;
  sourceIds: string[];
}
export interface ClientSummary {
  sentences: SummarySentence[];
}
export interface ContactSummaryView {
  state:
    | 'unavailable'
    | 'not_generated'
    | 'ready'
    | 'pending'
    | 'review'
    | 'insufficient'
    | 'error'
    | 'deleted';
  stale: boolean;
  summary: ClientSummary | null;
  sources: SummaryDossier | null;
  summarySources: SummaryDossier | null;
  checkedAt: string | null;
  generatedAt: string | null;
  model: string | null;
  generationPaused: boolean;
}

export interface SummarySettings {
  mode: 'paused' | 'observe' | 'pilot' | 'live';
  pilot_limit: number;
  next_scan: number;
  scan_generation: string | null;
  scan_cursor: string | null;
  scan_active: number;
  retry_at: number;
  lease_owner: string | null;
  lease_until: number;
}

export interface SummaryJob {
  contact_id: string;
  kind: 'refresh' | 'generate';
  source_hash: string | null;
  version: number;
  attempts: number;
}

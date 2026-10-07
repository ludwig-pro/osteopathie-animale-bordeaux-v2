// Private service contract. Never included in the general contacts DTO.
export interface ContactNoteSource {
  id: string;
  kind: 'google-note' | 'backoffice-note';
  text: string;
}

export interface AppointmentSource {
  id: string;
  kind: 'appointment';
  date: string;
  animal: string;
  animalType: string;
  breed: string;
  birth: string;
  reason: string;
  status: 'active' | 'canceled';
  oldInvitee: string | null;
  newInvitee: string | null;
}

export interface ContactSources {
  id: string;
  notes: ContactNoteSource[];
  appointments: AppointmentSource[];
  notesState: 'ready' | 'review';
  observedAt: string;
}

export interface ContactSourcesPage {
  contacts: ContactSources[];
  nextPageToken: string | null;
}

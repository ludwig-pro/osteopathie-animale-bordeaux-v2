import type { ContactAnimal } from './contact-identity.ts';
export interface ContactInteraction {
  id: string;
  type: 'appointment';
  date: string;
  animal: string;
  status: 'active' | 'canceled';
}
export interface GoogleContact {
  id: string;
  name: string;
  givenName: string;
  familyName: string;
  etag: string;
  emails: string[];
  phones: string[];
  labelIds: string[];
  animals: string[];
  animalTypes?: string[];
  animalsVersion?: string;
  lastAppointment: string | null;
  history?: ContactInteraction[];
  identity?: {
    originalName: string;
    reviewId: string;
    animals: ContactAnimal[];
  };
}
export interface ContactLabel {
  id: string;
  name: string;
}
export interface ContactPage {
  contacts: GoogleContact[];
  nextPageToken: string | null;
  appointmentsAvailable: boolean;
}

export type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';
export interface MailingList {
  id: string;
  name: string;
  description: string;
}
export interface ListMembership {
  listId: string;
  contactId: string;
  status: SubscriptionStatus;
}
export interface MailingListsData {
  lists: MailingList[];
  archivedLists?: MailingList[];
  memberships: ListMembership[];
}
export interface LabelPage {
  labels: ContactLabel[];
  nextPageToken: string | null;
}

export interface ConsultationReport {
  id: string;
  type: 'consultation-report';
  date: string;
  filename: string;
  size: number;
}

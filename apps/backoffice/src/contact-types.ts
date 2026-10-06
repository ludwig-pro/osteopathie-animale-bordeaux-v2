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
  lastAppointment: string | null;
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

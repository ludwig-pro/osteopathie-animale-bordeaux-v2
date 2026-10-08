export interface CalendarAppointment {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  url: string | null;
  status: 'confirmed' | 'tentative';
  attendeeEmails?: string[];
}

export interface CalendarAgendaView {
  state: 'ready' | 'not_connected' | 'unavailable';
  appointments: CalendarAppointment[];
  from: string;
  to: string;
  checkedAt: string | null;
  demo: boolean;
  copiedAt?: string;
}

export interface NextAppointmentView {
  state: 'ready' | 'empty' | 'not_connected' | 'unavailable';
  appointment: CalendarAppointment | null;
  checkedAt: string | null;
  demo: boolean;
  copiedAt?: string;
  agenda?: CalendarAgendaView;
}

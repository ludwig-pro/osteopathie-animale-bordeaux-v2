export interface CalendarAppointment {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  url: string | null;
  status: 'confirmed' | 'tentative';
}

export interface NextAppointmentView {
  state: 'ready' | 'empty' | 'not_connected' | 'unavailable';
  appointment: CalendarAppointment | null;
  checkedAt: string | null;
  demo: boolean;
  copiedAt?: string;
}

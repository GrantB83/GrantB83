export interface CalendarEvent {
  uid: string;
  summary: string | null;
  dtstart: string | null;
  dtend: string | null;
  location: string | null;
  description: string | null;
  allDay: boolean;
  missingFields: string[];
}

export interface DigestManifest {
  tool: string;
  version: string;
  generatedAt: string;
  inputFile: string;
  dateRange: {
    from: string;
    to: string;
  };
  timezone: string;
  eventCount: number;
  missingFieldsCount: number;
}

export interface CliOptions {
  ics: string;
  from: string;
  to: string;
  outdir: string;
  timezone: string;
}

import { LanguageCode } from '../types';

export interface ConferenceMetadata {
  id: string;
  title: string;
  subtitle: string;
  venue: string;
  date: string;
  activeTrack: string;
}

export interface UpcomingSessionConfig {
  id: string;
  sessionNumber: number;
  title: string;
  timeSlot: string;
  track: string;
  sessionType: 'inaugural' | 'plenary' | 'keynote' | 'panel' | 'qa' | 'valedictory';
}

export const DEFAULT_CONFERENCE_INFO: ConferenceMetadata = {
  id: 'conf-live-2026',
  title: '72nd Annual General Body Meeting',
  subtitle: 'National Council of India, SSVP',
  venue: 'Main Auditorium',
  date: 'Live Conference Session',
  activeTrack: 'Plenary Track & Floor Intercom',
};

export const DEFAULT_UPCOMING_SESSIONS: UpcomingSessionConfig[] = [
  {
    id: 'session-1',
    sessionNumber: 1,
    title: 'Inaugural & Welcome Address',
    timeSlot: 'Morning Track',
    track: 'Main Auditorium',
    sessionType: 'inaugural',
  },
  {
    id: 'session-2',
    sessionNumber: 2,
    title: 'Keynote & Plenary Presentation',
    timeSlot: 'Plenary Track',
    track: 'Main Auditorium',
    sessionType: 'keynote',
  },
  {
    id: 'session-3',
    sessionNumber: 3,
    title: 'Multilingual Panel Discussion',
    timeSlot: 'Panel Track',
    track: 'Main Stage',
    sessionType: 'panel',
  },
  {
    id: 'session-4',
    sessionNumber: 4,
    title: 'Audience Floor Q&A Intercom',
    timeSlot: 'Interactive Track',
    track: 'Floor Intercom',
    sessionType: 'qa',
  },
];

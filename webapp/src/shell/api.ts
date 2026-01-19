/**
 * Imperative shell: API client for fetching data.
 * Side effects live here - pure functions stay in core.
 */

import type { Show, Writer, ShowWriterLink } from '../core/types';

const API_BASE = 'http://localhost:8080/api';

interface RawShow {
  id: number;
  imdb_id: string;
  title: string;
  year_start: number | null;
  year_end: number | null;
}

interface RawWriter {
  id: number;
  imdb_id: string;
  name: string;
}

interface RawLink {
  show_id: number;
  writer_id: number;
  role: string | null;
  episode_count: number | null;
}

interface RawApiResponse {
  shows: RawShow[];
  writers: RawWriter[];
  links: RawLink[];
}

const transformShow = (raw: RawShow): Show => ({
  id: raw.id,
  imdbId: raw.imdb_id,
  title: raw.title,
  yearStart: raw.year_start,
  yearEnd: raw.year_end,
});

const transformWriter = (raw: RawWriter): Writer => ({
  id: raw.id,
  imdbId: raw.imdb_id,
  name: raw.name,
});

const transformLink = (raw: RawLink): ShowWriterLink => ({
  showId: raw.show_id,
  writerId: raw.writer_id,
  role: raw.role,
  episodeCount: raw.episode_count,
});

export interface AppData {
  shows: ReadonlyArray<Show>;
  writers: ReadonlyArray<Writer>;
  links: ReadonlyArray<ShowWriterLink>;
}

export const fetchAllData = async (): Promise<AppData> => {
  const response = await fetch(`${API_BASE}/all`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const raw: RawApiResponse = await response.json();

  return {
    shows: raw.shows.map(transformShow),
    writers: raw.writers.map(transformWriter),
    links: raw.links.map(transformLink),
  };
};

export const fetchShows = async (): Promise<ReadonlyArray<Show>> => {
  const response = await fetch(`${API_BASE}/shows`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const raw: RawShow[] = await response.json();
  return raw.map(transformShow);
};

export const fetchWriters = async (): Promise<ReadonlyArray<Writer>> => {
  const response = await fetch(`${API_BASE}/writers`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const raw: RawWriter[] = await response.json();
  return raw.map(transformWriter);
};

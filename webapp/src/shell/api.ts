/**
 * Imperative shell: API client for fetching data.
 * Side effects live here - pure functions stay in core.
 */

import type { Show, Writer, ShowWriterLink, PaginatedWriters, PaginationInfo } from '../core/types';

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
  image_url?: string | null;
  bio?: string | null;
  show_count?: number;
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
  imageUrl: raw.image_url,
  bio: raw.bio,
  showCount: raw.show_count,
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

interface RawPaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  search?: string | null;
}

interface RawPaginatedWriters {
  writers: RawWriter[];
  pagination: RawPaginationInfo;
}

const transformPagination = (raw: RawPaginationInfo): PaginationInfo => ({
  page: raw.page,
  perPage: raw.per_page,
  total: raw.total,
  totalPages: raw.total_pages,
  hasNext: raw.has_next,
  hasPrev: raw.has_prev,
  search: raw.search,
});

export const fetchPaginatedWriters = async (
  page: number = 1,
  perPage: number = 10,
  search?: string
): Promise<PaginatedWriters> => {
  let url = `${API_BASE}/writers/paginated?page=${page}&per_page=${perPage}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const raw: RawPaginatedWriters = await response.json();

  return {
    writers: raw.writers.map(transformWriter),
    pagination: transformPagination(raw.pagination),
  };
};

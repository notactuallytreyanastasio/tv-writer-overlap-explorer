import { describe, it, expect } from 'vitest';
import {
  groupLinksByWriter,
  groupLinksByShow,
  findOverlappingWriters,
  enrichWritersWithShows,
  enrichShowsWithWriters,
  countSharedWriters,
  getSharedWriters,
  createOverlapMatrix,
} from './overlap';
import type { Show, Writer, ShowWriterLink } from './types';

// Test fixtures
const shows: Show[] = [
  { id: 1, imdbId: 'tt001', title: 'Show A', yearStart: 2000, yearEnd: 2005 },
  { id: 2, imdbId: 'tt002', title: 'Show B', yearStart: 2010, yearEnd: 2015 },
  { id: 3, imdbId: 'tt003', title: 'Show C', yearStart: 2020, yearEnd: null },
];

const writers: Writer[] = [
  { id: 1, imdbId: 'nm001', name: 'Writer One' },
  { id: 2, imdbId: 'nm002', name: 'Writer Two' },
  { id: 3, imdbId: 'nm003', name: 'Writer Three' },
];

const links: ShowWriterLink[] = [
  { showId: 1, writerId: 1, role: 'creator', episodeCount: 50 },
  { showId: 1, writerId: 2, role: 'writer', episodeCount: 10 },
  { showId: 2, writerId: 1, role: 'writer', episodeCount: 20 },
  { showId: 2, writerId: 3, role: 'writer', episodeCount: 15 },
  { showId: 3, writerId: 2, role: 'creator', episodeCount: 30 },
];

describe('groupLinksByWriter', () => {
  it('groups links by writer ID', () => {
    const grouped = groupLinksByWriter(links);

    expect(grouped.get(1)).toHaveLength(2);
    expect(grouped.get(2)).toHaveLength(2);
    expect(grouped.get(3)).toHaveLength(1);
  });

  it('returns empty map for empty links', () => {
    const grouped = groupLinksByWriter([]);
    expect(grouped.size).toBe(0);
  });
});

describe('groupLinksByShow', () => {
  it('groups links by show ID', () => {
    const grouped = groupLinksByShow(links);

    expect(grouped.get(1)).toHaveLength(2);
    expect(grouped.get(2)).toHaveLength(2);
    expect(grouped.get(3)).toHaveLength(1);
  });
});

describe('findOverlappingWriters', () => {
  it('finds writers who worked on multiple shows', () => {
    const overlaps = findOverlappingWriters(writers, shows, links);

    expect(overlaps).toHaveLength(2);
    expect(overlaps[0].writer.name).toBe('Writer One');
    expect(overlaps[0].showCount).toBe(2);
    expect(overlaps[1].writer.name).toBe('Writer Two');
    expect(overlaps[1].showCount).toBe(2);
  });

  it('returns empty array when no overlaps exist', () => {
    const noOverlapLinks: ShowWriterLink[] = [
      { showId: 1, writerId: 1, role: null, episodeCount: null },
      { showId: 2, writerId: 2, role: null, episodeCount: null },
    ];

    const overlaps = findOverlappingWriters(writers, shows, noOverlapLinks);
    expect(overlaps).toHaveLength(0);
  });

  it('sorts by show count descending', () => {
    const manyLinks: ShowWriterLink[] = [
      ...links,
      { showId: 3, writerId: 1, role: null, episodeCount: null },
    ];

    const overlaps = findOverlappingWriters(writers, shows, manyLinks);
    expect(overlaps[0].writer.name).toBe('Writer One');
    expect(overlaps[0].showCount).toBe(3);
  });
});

describe('enrichWritersWithShows', () => {
  it('adds shows array to each writer', () => {
    const enriched = enrichWritersWithShows(writers, shows, links);

    const writerOne = enriched.find(w => w.id === 1);
    expect(writerOne?.shows).toHaveLength(2);
    expect(writerOne?.shows.map(s => s.title)).toContain('Show A');
    expect(writerOne?.shows.map(s => s.title)).toContain('Show B');
  });

  it('handles writers with no shows', () => {
    const extraWriter: Writer = { id: 99, imdbId: 'nm099', name: 'No Shows' };
    const enriched = enrichWritersWithShows([...writers, extraWriter], shows, links);

    const noShowsWriter = enriched.find(w => w.id === 99);
    expect(noShowsWriter?.shows).toHaveLength(0);
  });
});

describe('enrichShowsWithWriters', () => {
  it('adds writers array to each show', () => {
    const enriched = enrichShowsWithWriters(shows, writers, links);

    const showA = enriched.find(s => s.id === 1);
    expect(showA?.writers).toHaveLength(2);
    expect(showA?.writers.map(w => w.name)).toContain('Writer One');
    expect(showA?.writers.map(w => w.name)).toContain('Writer Two');
  });
});

describe('countSharedWriters', () => {
  it('counts writers shared between two shows', () => {
    const enriched = enrichShowsWithWriters(shows, writers, links);
    const showA = enriched.find(s => s.id === 1)!;
    const showB = enriched.find(s => s.id === 2)!;

    expect(countSharedWriters(showA, showB)).toBe(1); // Writer One
  });

  it('returns zero when no shared writers', () => {
    const enriched = enrichShowsWithWriters(shows, writers, links);
    const showB = enriched.find(s => s.id === 2)!;
    const showC = enriched.find(s => s.id === 3)!;

    expect(countSharedWriters(showB, showC)).toBe(0);
  });
});

describe('getSharedWriters', () => {
  it('returns array of shared writers', () => {
    const enriched = enrichShowsWithWriters(shows, writers, links);
    const showA = enriched.find(s => s.id === 1)!;
    const showB = enriched.find(s => s.id === 2)!;

    const shared = getSharedWriters(showA, showB);
    expect(shared).toHaveLength(1);
    expect(shared[0].name).toBe('Writer One');
  });
});

describe('createOverlapMatrix', () => {
  it('creates symmetric matrix of shared writer counts', () => {
    const enriched = enrichShowsWithWriters(shows, writers, links);
    const matrix = createOverlapMatrix(enriched);

    // Diagonal should be full writer count
    expect(matrix[0][0]).toBe(2); // Show A has 2 writers
    expect(matrix[1][1]).toBe(2); // Show B has 2 writers
    expect(matrix[2][2]).toBe(1); // Show C has 1 writer

    // Off-diagonal shows shared counts
    expect(matrix[0][1]).toBe(1); // A-B share 1 writer
    expect(matrix[1][0]).toBe(1); // Symmetric

    expect(matrix[0][2]).toBe(1); // A-C share 1 writer (Writer Two)
    expect(matrix[1][2]).toBe(0); // B-C share 0 writers
  });
});

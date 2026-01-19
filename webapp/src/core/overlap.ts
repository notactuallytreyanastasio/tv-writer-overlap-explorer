/**
 * Pure functions for computing writer overlaps between shows.
 * No side effects - all functions are referentially transparent.
 */

import type {
  Show,
  Writer,
  ShowWriterLink,
  WriterOverlap,
  WriterWithShows,
  ShowWithWriters,
} from './types';

/**
 * Groups show-writer links by writer ID.
 */
export const groupLinksByWriter = (
  links: ReadonlyArray<ShowWriterLink>
): Map<number, ReadonlyArray<ShowWriterLink>> => {
  const grouped = new Map<number, ShowWriterLink[]>();

  for (const link of links) {
    const existing = grouped.get(link.writerId) ?? [];
    grouped.set(link.writerId, [...existing, link]);
  }

  return grouped;
};

/**
 * Groups show-writer links by show ID.
 */
export const groupLinksByShow = (
  links: ReadonlyArray<ShowWriterLink>
): Map<number, ReadonlyArray<ShowWriterLink>> => {
  const grouped = new Map<number, ShowWriterLink[]>();

  for (const link of links) {
    const existing = grouped.get(link.showId) ?? [];
    grouped.set(link.showId, [...existing, link]);
  }

  return grouped;
};

/**
 * Finds all writers who have worked on multiple shows.
 */
export const findOverlappingWriters = (
  writers: ReadonlyArray<Writer>,
  shows: ReadonlyArray<Show>,
  links: ReadonlyArray<ShowWriterLink>
): ReadonlyArray<WriterOverlap> => {
  const writerMap = new Map(writers.map(w => [w.id, w]));
  const showMap = new Map(shows.map(s => [s.id, s]));
  const linksByWriter = groupLinksByWriter(links);

  const overlaps: WriterOverlap[] = [];

  for (const [writerId, writerLinks] of linksByWriter) {
    const uniqueShowIds = [...new Set(writerLinks.map(l => l.showId))];

    if (uniqueShowIds.length > 1) {
      const writer = writerMap.get(writerId);
      if (writer) {
        const writerShows = uniqueShowIds
          .map(id => showMap.get(id))
          .filter((s): s is Show => s !== undefined);

        overlaps.push({
          writer,
          shows: writerShows,
          showCount: writerShows.length,
        });
      }
    }
  }

  return overlaps.sort((a, b) => b.showCount - a.showCount);
};

/**
 * Enriches writers with their associated shows.
 */
export const enrichWritersWithShows = (
  writers: ReadonlyArray<Writer>,
  shows: ReadonlyArray<Show>,
  links: ReadonlyArray<ShowWriterLink>
): ReadonlyArray<WriterWithShows> => {
  const showMap = new Map(shows.map(s => [s.id, s]));
  const linksByWriter = groupLinksByWriter(links);

  return writers.map(writer => {
    const writerLinks = linksByWriter.get(writer.id) ?? [];
    const writerShows = writerLinks
      .map(l => showMap.get(l.showId))
      .filter((s): s is Show => s !== undefined);

    return { ...writer, shows: writerShows };
  });
};

/**
 * Enriches shows with their associated writers.
 */
export const enrichShowsWithWriters = (
  shows: ReadonlyArray<Show>,
  writers: ReadonlyArray<Writer>,
  links: ReadonlyArray<ShowWriterLink>
): ReadonlyArray<ShowWithWriters> => {
  const writerMap = new Map(writers.map(w => [w.id, w]));
  const linksByShow = groupLinksByShow(links);

  return shows.map(show => {
    const showLinks = linksByShow.get(show.id) ?? [];
    const showWriters = showLinks
      .map(l => writerMap.get(l.writerId))
      .filter((w): w is Writer => w !== undefined);

    return { ...show, writers: showWriters };
  });
};

/**
 * Computes the number of shared writers between two shows.
 */
export const countSharedWriters = (
  showA: ShowWithWriters,
  showB: ShowWithWriters
): number => {
  const writerIdsA = new Set(showA.writers.map(w => w.id));
  return showB.writers.filter(w => writerIdsA.has(w.id)).length;
};

/**
 * Gets the shared writers between two shows.
 */
export const getSharedWriters = (
  showA: ShowWithWriters,
  showB: ShowWithWriters
): ReadonlyArray<Writer> => {
  const writerIdsA = new Set(showA.writers.map(w => w.id));
  return showB.writers.filter(w => writerIdsA.has(w.id));
};

/**
 * Creates a matrix of shared writer counts between all shows.
 */
export const createOverlapMatrix = (
  shows: ReadonlyArray<ShowWithWriters>
): ReadonlyArray<ReadonlyArray<number>> => {
  return shows.map(showA =>
    shows.map(showB => countSharedWriters(showA, showB))
  );
};

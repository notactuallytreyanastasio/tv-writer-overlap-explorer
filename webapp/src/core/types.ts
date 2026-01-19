/**
 * Core domain types for the TV writer overlap application.
 * These are pure data types with no side effects.
 */

export interface Show {
  readonly id: number;
  readonly imdbId: string;
  readonly title: string;
  readonly yearStart: number | null;
  readonly yearEnd: number | null;
}

export interface Writer {
  readonly id: number;
  readonly imdbId: string;
  readonly name: string;
}

export interface ShowWriterLink {
  readonly showId: number;
  readonly writerId: number;
  readonly role: string | null;
  readonly episodeCount: number | null;
}

export interface WriterWithShows extends Writer {
  readonly shows: ReadonlyArray<Show>;
}

export interface ShowWithWriters extends Show {
  readonly writers: ReadonlyArray<Writer>;
}

export interface WriterOverlap {
  readonly writer: Writer;
  readonly shows: ReadonlyArray<Show>;
  readonly showCount: number;
}

export interface GraphNode {
  readonly id: string;
  readonly type: 'show' | 'writer';
  readonly label: string;
  readonly data: Show | Writer;
}

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
}

export interface Graph {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
}

export interface VennSet {
  readonly sets: ReadonlyArray<string>;
  readonly size: number;
  readonly label?: string;
}

export interface VennData {
  readonly sets: ReadonlyArray<VennSet>;
  readonly showLabels: Record<string, string>;
}

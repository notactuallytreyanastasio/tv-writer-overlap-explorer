import { describe, it, expect } from 'vitest';
import {
  createNodeId,
  parseNodeId,
  buildBipartiteGraph,
  buildShowOverlapGraph,
  filterConnectedNodes,
  filterByWeight,
  buildVennData,
  computeGraphStats,
} from './graph';
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

describe('createNodeId', () => {
  it('creates show node IDs', () => {
    expect(createNodeId('show', 1)).toBe('show-1');
    expect(createNodeId('show', 123)).toBe('show-123');
  });

  it('creates writer node IDs', () => {
    expect(createNodeId('writer', 1)).toBe('writer-1');
    expect(createNodeId('writer', 456)).toBe('writer-456');
  });
});

describe('parseNodeId', () => {
  it('parses show node IDs', () => {
    const result = parseNodeId('show-123');
    expect(result).toEqual({ type: 'show', id: 123 });
  });

  it('parses writer node IDs', () => {
    const result = parseNodeId('writer-456');
    expect(result).toEqual({ type: 'writer', id: 456 });
  });

  it('returns null for invalid IDs', () => {
    expect(parseNodeId('invalid')).toBeNull();
    expect(parseNodeId('show-abc')).toBeNull();
    expect(parseNodeId('actor-1')).toBeNull();
  });
});

describe('buildBipartiteGraph', () => {
  it('creates nodes for all shows and writers', () => {
    const graph = buildBipartiteGraph(shows, writers, links);

    expect(graph.nodes).toHaveLength(6); // 3 shows + 3 writers
    expect(graph.nodes.filter(n => n.type === 'show')).toHaveLength(3);
    expect(graph.nodes.filter(n => n.type === 'writer')).toHaveLength(3);
  });

  it('creates edges for all links', () => {
    const graph = buildBipartiteGraph(shows, writers, links);

    expect(graph.edges).toHaveLength(5);
  });

  it('sets edge weight from episode count', () => {
    const graph = buildBipartiteGraph(shows, writers, links);

    const firstEdge = graph.edges.find(
      e => e.source === 'writer-1' && e.target === 'show-1'
    );
    expect(firstEdge?.weight).toBe(50);
  });

  it('uses weight 1 when episode count is null', () => {
    const nullLinks: ShowWriterLink[] = [
      { showId: 1, writerId: 1, role: null, episodeCount: null },
    ];
    const graph = buildBipartiteGraph(shows, writers, nullLinks);

    expect(graph.edges[0].weight).toBe(1);
  });
});

describe('buildShowOverlapGraph', () => {
  it('creates nodes only for shows', () => {
    const graph = buildShowOverlapGraph(shows, writers, links);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.every(n => n.type === 'show')).toBe(true);
  });

  it('creates edges between shows that share writers', () => {
    const graph = buildShowOverlapGraph(shows, writers, links);

    // Show A and B share Writer One
    // Show A and C share Writer Two
    // Show B and C share no one
    expect(graph.edges).toHaveLength(2);
  });

  it('sets edge weight to number of shared writers', () => {
    const graph = buildShowOverlapGraph(shows, writers, links);

    const abEdge = graph.edges.find(
      e =>
        (e.source === 'show-1' && e.target === 'show-2') ||
        (e.source === 'show-2' && e.target === 'show-1')
    );
    expect(abEdge?.weight).toBe(1);
  });
});

describe('filterConnectedNodes', () => {
  it('removes nodes with no edges', () => {
    const graph = buildShowOverlapGraph(shows, writers, links);
    const filtered = filterConnectedNodes(graph);

    // Show C only connects to Show A, Show B doesn't connect to C
    // All shows should remain since they all have at least one edge
    expect(filtered.nodes).toHaveLength(3);
  });

  it('removes isolated nodes', () => {
    const isolatedShows: Show[] = [
      ...shows,
      { id: 4, imdbId: 'tt004', title: 'Isolated', yearStart: null, yearEnd: null },
    ];
    const graph = buildShowOverlapGraph(isolatedShows, writers, links);
    const filtered = filterConnectedNodes(graph);

    expect(filtered.nodes.find(n => n.label === 'Isolated')).toBeUndefined();
  });
});

describe('filterByWeight', () => {
  it('removes edges below minimum weight', () => {
    // Create links where one pair has more shared writers
    const moreLinks: ShowWriterLink[] = [
      ...links,
      { showId: 1, writerId: 3, role: null, episodeCount: null }, // Now A has writers 1, 2, 3
    ];

    const graph = buildShowOverlapGraph(shows, writers, moreLinks);
    // A-B now share 2 writers (1 and 3), A-C shares 1 (2)

    const filtered = filterByWeight(graph, 2);

    expect(filtered.edges.length).toBeLessThan(graph.edges.length);
    expect(filtered.edges.every(e => e.weight >= 2)).toBe(true);
  });
});

describe('buildVennData', () => {
  it('creates sets for each show', () => {
    const venn = buildVennData(shows, writers, links);

    const singleSets = venn.sets.filter(s => s.sets.length === 1);
    expect(singleSets).toHaveLength(3);
  });

  it('creates intersection sets for overlapping shows', () => {
    const venn = buildVennData(shows, writers, links);

    const intersections = venn.sets.filter(s => s.sets.length === 2);
    expect(intersections).toHaveLength(2); // A-B and A-C
  });

  it('sets size to writer count', () => {
    const venn = buildVennData(shows, writers, links);

    const showA = venn.sets.find(s => s.sets.length === 1 && s.sets[0] === 'S1');
    expect(showA?.size).toBe(2); // Show A has 2 writers
  });

  it('provides show labels mapping', () => {
    const venn = buildVennData(shows, writers, links);

    expect(venn.showLabels['S1']).toBe('Show A');
    expect(venn.showLabels['S2']).toBe('Show B');
  });
});

describe('computeGraphStats', () => {
  it('computes correct node and edge counts', () => {
    const graph = buildBipartiteGraph(shows, writers, links);
    const stats = computeGraphStats(graph);

    expect(stats.nodeCount).toBe(6);
    expect(stats.edgeCount).toBe(5);
    expect(stats.showCount).toBe(3);
    expect(stats.writerCount).toBe(3);
  });

  it('computes max weight', () => {
    const graph = buildBipartiteGraph(shows, writers, links);
    const stats = computeGraphStats(graph);

    expect(stats.maxWeight).toBe(50);
  });

  it('handles empty graph', () => {
    const stats = computeGraphStats({ nodes: [], edges: [] });

    expect(stats.nodeCount).toBe(0);
    expect(stats.avgDegree).toBe(0);
    expect(stats.maxWeight).toBe(0);
  });
});

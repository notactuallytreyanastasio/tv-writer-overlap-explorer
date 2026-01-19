/**
 * Pure functions for building graph and Venn diagram data structures.
 * No side effects - all functions are referentially transparent.
 */

import type {
  Show,
  Writer,
  ShowWriterLink,
  Graph,
  GraphNode,
  GraphEdge,
  VennData,
  VennSet,
} from './types';
import { enrichShowsWithWriters, getSharedWriters } from './overlap';

/**
 * Creates a graph node ID from entity type and ID.
 */
export const createNodeId = (type: 'show' | 'writer', id: number): string =>
  `${type}-${id}`;

/**
 * Parses a node ID back to type and numeric ID.
 */
export const parseNodeId = (
  nodeId: string
): { type: 'show' | 'writer'; id: number } | null => {
  const match = nodeId.match(/^(show|writer)-(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as 'show' | 'writer',
    id: parseInt(match[2], 10),
  };
};

/**
 * Builds a bipartite graph with shows and writers as nodes.
 * Edges connect writers to the shows they worked on.
 */
export const buildBipartiteGraph = (
  shows: ReadonlyArray<Show>,
  writers: ReadonlyArray<Writer>,
  links: ReadonlyArray<ShowWriterLink>
): Graph => {
  const showNodes: GraphNode[] = shows.map(show => ({
    id: createNodeId('show', show.id),
    type: 'show',
    label: show.title,
    data: show,
  }));

  const writerNodes: GraphNode[] = writers.map(writer => ({
    id: createNodeId('writer', writer.id),
    type: 'writer',
    label: writer.name,
    data: writer,
  }));

  const edges: GraphEdge[] = links.map(link => ({
    source: createNodeId('writer', link.writerId),
    target: createNodeId('show', link.showId),
    weight: link.episodeCount ?? 1,
  }));

  return {
    nodes: [...showNodes, ...writerNodes],
    edges,
  };
};

/**
 * Builds a show-only graph where edges represent shared writers.
 * Edge weight is the number of shared writers.
 */
export const buildShowOverlapGraph = (
  shows: ReadonlyArray<Show>,
  writers: ReadonlyArray<Writer>,
  links: ReadonlyArray<ShowWriterLink>
): Graph => {
  const enrichedShows = enrichShowsWithWriters(shows, writers, links);

  const nodes: GraphNode[] = enrichedShows.map(show => ({
    id: createNodeId('show', show.id),
    type: 'show',
    label: show.title,
    data: show,
  }));

  const edges: GraphEdge[] = [];

  for (let i = 0; i < enrichedShows.length; i++) {
    for (let j = i + 1; j < enrichedShows.length; j++) {
      const shared = getSharedWriters(enrichedShows[i], enrichedShows[j]);
      if (shared.length > 0) {
        edges.push({
          source: createNodeId('show', enrichedShows[i].id),
          target: createNodeId('show', enrichedShows[j].id),
          weight: shared.length,
        });
      }
    }
  }

  return { nodes, edges };
};

/**
 * Filters a graph to only include nodes with at least one edge.
 */
export const filterConnectedNodes = (graph: Graph): Graph => {
  const connectedIds = new Set<string>();

  for (const edge of graph.edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  return {
    nodes: graph.nodes.filter(node => connectedIds.has(node.id)),
    edges: graph.edges,
  };
};

/**
 * Filters a graph to only include edges above a minimum weight.
 */
export const filterByWeight = (graph: Graph, minWeight: number): Graph => {
  const filteredEdges = graph.edges.filter(e => e.weight >= minWeight);
  return filterConnectedNodes({ ...graph, edges: filteredEdges });
};

/**
 * Builds Venn diagram data for show overlaps.
 * Each set represents a show, and intersections show shared writers.
 */
export const buildVennData = (
  shows: ReadonlyArray<Show>,
  writers: ReadonlyArray<Writer>,
  links: ReadonlyArray<ShowWriterLink>
): VennData => {
  const enrichedShows = enrichShowsWithWriters(shows, writers, links);
  const sets: VennSet[] = [];
  const showLabels: Record<string, string> = {};

  // Individual sets (each show)
  for (const show of enrichedShows) {
    const setKey = `S${show.id}`;
    showLabels[setKey] = show.title;
    sets.push({
      sets: [setKey],
      size: show.writers.length,
      label: show.title,
    });
  }

  // Pairwise intersections
  for (let i = 0; i < enrichedShows.length; i++) {
    for (let j = i + 1; j < enrichedShows.length; j++) {
      const shared = getSharedWriters(enrichedShows[i], enrichedShows[j]);
      if (shared.length > 0) {
        sets.push({
          sets: [`S${enrichedShows[i].id}`, `S${enrichedShows[j].id}`],
          size: shared.length,
        });
      }
    }
  }

  return { sets, showLabels };
};

/**
 * Computes statistics about a graph.
 */
export const computeGraphStats = (
  graph: Graph
): {
  nodeCount: number;
  edgeCount: number;
  showCount: number;
  writerCount: number;
  avgDegree: number;
  maxWeight: number;
} => {
  const showCount = graph.nodes.filter(n => n.type === 'show').length;
  const writerCount = graph.nodes.filter(n => n.type === 'writer').length;
  const maxWeight = Math.max(0, ...graph.edges.map(e => e.weight));

  const degrees = new Map<string, number>();
  for (const edge of graph.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  const avgDegree =
    graph.nodes.length > 0
      ? [...degrees.values()].reduce((a, b) => a + b, 0) / graph.nodes.length
      : 0;

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    showCount,
    writerCount,
    avgDegree,
    maxWeight,
  };
};

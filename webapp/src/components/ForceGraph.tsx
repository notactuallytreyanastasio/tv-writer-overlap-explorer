/**
 * Draft 1: Force-directed graph visualization.
 * Shows connections by shared writers - thicker edges = more shared writers.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Graph, GraphNode } from '../core/types';

interface ForceGraphProps {
  readonly graph: Graph;
  readonly width?: number;
  readonly height?: number;
  readonly onNodeClick?: (node: GraphNode) => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'show' | 'writer';
  label: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  weight: number;
}

export const ForceGraph = ({
  graph,
  width = 800,
  height = 600,
  onNodeClick,
}: ForceGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodes: D3Node[] = graph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
    }));

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const links: D3Link[] = graph.edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        weight: e.weight,
      }));

    const maxWeight = Math.max(1, ...links.map(l => l.weight));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(links)
          .id(d => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', event => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);

    // Links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => 1 + (d.weight / maxWeight) * 5);

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, D3Node>()
      .on('start', (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Node groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(drag);

    // Node circles
    node
      .append('circle')
      .attr('r', d => (d.type === 'show' ? 20 : 10))
      .attr('fill', d => (d.type === 'show' ? '#4a90d9' : '#e57373'))
      .attr('stroke', d => (d.id === selectedNode ? '#ff0' : '#fff'))
      .attr('stroke-width', d => (d.id === selectedNode ? 3 : 2));

    // Node labels
    node
      .append('text')
      .text(d => d.label)
      .attr('x', d => (d.type === 'show' ? 25 : 15))
      .attr('y', 4)
      .attr('font-size', d => (d.type === 'show' ? '12px' : '10px'))
      .attr('fill', '#333');

    // Click handler
    node.on('click', (_event, d) => {
      setSelectedNode(d.id);
      const originalNode = graph.nodes.find(n => n.id === d.id);
      if (originalNode && onNodeClick) {
        onNodeClick(originalNode);
      }
    });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x ?? 0)
        .attr('y1', d => (d.source as D3Node).y ?? 0)
        .attr('x2', d => (d.target as D3Node).x ?? 0)
        .attr('y2', d => (d.target as D3Node).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, width, height, selectedNode, onNodeClick]);

  return (
    <div className="force-graph">
      <h2>Draft 1: Force-Directed Graph</h2>
      <p className="description">
        Shows connected by shared writers. Thicker lines = more writers in common.
        Drag nodes to rearrange, scroll to zoom.
      </p>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', background: '#fafafa' }}
      />
      <div className="legend">
        <span style={{ color: '#4a90d9' }}>● Shows</span>
        <span style={{ color: '#e57373', marginLeft: '1rem' }}>● Writers</span>
      </div>
    </div>
  );
};

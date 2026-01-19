/**
 * Draft 2: Interactive Venn diagram visualization.
 * Select 2-3 shows to see their writer overlap.
 */

import { useState, useMemo } from 'react';
import type { Show, Writer, ShowWriterLink, ShowWithWriters } from '../core/types';
import { enrichShowsWithWriters, getSharedWriters } from '../core/overlap';

interface VennDiagramProps {
  readonly shows: ReadonlyArray<Show>;
  readonly writers: ReadonlyArray<Writer>;
  readonly links: ReadonlyArray<ShowWriterLink>;
}

interface CircleData {
  show: ShowWithWriters;
  cx: number;
  cy: number;
  r: number;
  color: string;
}

const COLORS = ['#4a90d9', '#e57373', '#81c784'];

export const VennDiagram = ({ shows, writers, links }: VennDiagramProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const enrichedShows = useMemo(
    () => enrichShowsWithWriters(shows, writers, links),
    [shows, writers, links]
  );

  const selectedShows = useMemo(
    () => enrichedShows.filter(s => selectedIds.includes(s.id)),
    [enrichedShows, selectedIds]
  );

  const toggleShow = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const getCirclePositions = (): CircleData[] => {
    const width = 500;
    const height = 400;
    const baseRadius = 100;

    if (selectedShows.length === 0) return [];

    if (selectedShows.length === 1) {
      return [
        {
          show: selectedShows[0],
          cx: width / 2,
          cy: height / 2,
          r: baseRadius,
          color: COLORS[0],
        },
      ];
    }

    if (selectedShows.length === 2) {
      return [
        {
          show: selectedShows[0],
          cx: width / 2 - 60,
          cy: height / 2,
          r: baseRadius,
          color: COLORS[0],
        },
        {
          show: selectedShows[1],
          cx: width / 2 + 60,
          cy: height / 2,
          r: baseRadius,
          color: COLORS[1],
        },
      ];
    }

    // Three circles
    const centerX = width / 2;
    const centerY = height / 2;
    const offset = 50;

    return [
      {
        show: selectedShows[0],
        cx: centerX,
        cy: centerY - offset,
        r: baseRadius * 0.85,
        color: COLORS[0],
      },
      {
        show: selectedShows[1],
        cx: centerX - offset * 0.866,
        cy: centerY + offset * 0.5,
        r: baseRadius * 0.85,
        color: COLORS[1],
      },
      {
        show: selectedShows[2],
        cx: centerX + offset * 0.866,
        cy: centerY + offset * 0.5,
        r: baseRadius * 0.85,
        color: COLORS[2],
      },
    ];
  };

  const circles = getCirclePositions();

  const getIntersections = () => {
    if (selectedShows.length < 2) return [];

    const result: Array<{
      shows: ShowWithWriters[];
      writers: ReadonlyArray<Writer>;
    }> = [];

    for (let i = 0; i < selectedShows.length; i++) {
      for (let j = i + 1; j < selectedShows.length; j++) {
        const shared = getSharedWriters(selectedShows[i], selectedShows[j]);
        if (shared.length > 0) {
          result.push({
            shows: [selectedShows[i], selectedShows[j]],
            writers: shared,
          });
        }
      }
    }

    if (selectedShows.length === 3) {
      // Find writers in all three
      const ab = getSharedWriters(selectedShows[0], selectedShows[1]);
      const abc = ab.filter(w =>
        selectedShows[2].writers.some(w2 => w2.id === w.id)
      );
      if (abc.length > 0) {
        result.push({
          shows: selectedShows.slice(),
          writers: abc,
        });
      }
    }

    return result;
  };

  const intersections = getIntersections();

  return (
    <div className="venn-diagram">
      <h2>Draft 2: Interactive Venn Diagram</h2>
      <p className="description">
        Select 2-3 shows to see their writer overlap. Click shows below to
        toggle selection.
      </p>

      <div className="show-selector" style={{ marginBottom: '1rem' }}>
        {enrichedShows.map(show => (
          <button
            key={show.id}
            onClick={() => toggleShow(show.id)}
            style={{
              margin: '0.25rem',
              padding: '0.5rem 1rem',
              background: selectedIds.includes(show.id) ? '#4a90d9' : '#eee',
              color: selectedIds.includes(show.id) ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {show.title} ({show.writers.length} writers)
          </button>
        ))}
      </div>

      <svg
        width={500}
        height={400}
        style={{ border: '1px solid #ccc', background: '#fafafa' }}
      >
        {circles.map((circle, i) => (
          <g key={circle.show.id}>
            <circle
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              fill={circle.color}
              fillOpacity={0.3}
              stroke={circle.color}
              strokeWidth={2}
            />
            <text
              x={circle.cx}
              y={
                selectedShows.length === 1
                  ? circle.cy
                  : circle.cy + (i === 0 && selectedShows.length === 3 ? -70 : 70 * (i === 0 ? -1 : 1))
              }
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
            >
              {circle.show.title}
            </text>
            <text
              x={circle.cx}
              y={
                selectedShows.length === 1
                  ? circle.cy + 20
                  : circle.cy + (i === 0 && selectedShows.length === 3 ? -55 : 85 * (i === 0 ? -1 : 1))
              }
              textAnchor="middle"
              fontSize="10"
            >
              {circle.show.writers.length} writers
            </text>
          </g>
        ))}
      </svg>

      {intersections.length > 0 && (
        <div className="intersections" style={{ marginTop: '1rem' }}>
          <h3>Shared Writers:</h3>
          {intersections.map((int, i) => (
            <div key={i} style={{ marginBottom: '0.5rem' }}>
              <strong>
                {int.shows.map(s => s.title).join(' ∩ ')}:
              </strong>{' '}
              {int.writers.length} writer{int.writers.length !== 1 ? 's' : ''}
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                {int.writers.slice(0, 10).map(w => (
                  <li key={w.id}>{w.name}</li>
                ))}
                {int.writers.length > 10 && (
                  <li>... and {int.writers.length - 10} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {selectedShows.length === 0 && (
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          Select shows above to see their Venn diagram
        </p>
      )}
    </div>
  );
};

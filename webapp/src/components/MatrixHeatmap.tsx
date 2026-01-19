/**
 * Draft 3: Matrix heatmap visualization.
 * Shows shared writer counts between all pairs of shows.
 */

import { useMemo, useState } from 'react';
import type { Show, Writer, ShowWriterLink, ShowWithWriters } from '../core/types';
import { enrichShowsWithWriters, createOverlapMatrix, getSharedWriters } from '../core/overlap';

interface MatrixHeatmapProps {
  readonly shows: ReadonlyArray<Show>;
  readonly writers: ReadonlyArray<Writer>;
  readonly links: ReadonlyArray<ShowWriterLink>;
}

interface CellInfo {
  showA: ShowWithWriters;
  showB: ShowWithWriters;
  sharedWriters: ReadonlyArray<Writer>;
}

export const MatrixHeatmap = ({ shows, writers, links }: MatrixHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<CellInfo | null>(null);

  const enrichedShows = useMemo(
    () => enrichShowsWithWriters(shows, writers, links),
    [shows, writers, links]
  );

  const matrix = useMemo(
    () => createOverlapMatrix(enrichedShows),
    [enrichedShows]
  );

  const maxValue = useMemo(() => {
    let max = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (i !== j && matrix[i][j] > max) {
          max = matrix[i][j];
        }
      }
    }
    return max;
  }, [matrix]);

  const getColor = (value: number, isdiag: boolean): string => {
    if (isdiag) return '#e0e0e0';
    if (value === 0) return '#fff';
    const intensity = Math.min(value / Math.max(maxValue, 1), 1);
    const r = Math.round(255 - intensity * 100);
    const g = Math.round(255 - intensity * 180);
    const b = Math.round(255 - intensity * 50);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const cellSize = 60;
  const labelWidth = 120;
  const svgWidth = labelWidth + enrichedShows.length * cellSize;
  const svgHeight = labelWidth + enrichedShows.length * cellSize;

  const handleCellHover = (i: number, j: number) => {
    if (i === j) {
      setHoveredCell(null);
      return;
    }
    const shared = getSharedWriters(enrichedShows[i], enrichedShows[j]);
    setHoveredCell({
      showA: enrichedShows[i],
      showB: enrichedShows[j],
      sharedWriters: shared,
    });
  };

  return (
    <div className="matrix-heatmap">
      <h2>Draft 3: Matrix Heatmap</h2>
      <p className="description">
        Grid showing shared writer counts between all show pairs.
        Darker colors = more shared writers. Hover for details.
      </p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <svg width={svgWidth} height={svgHeight}>
          {/* Column labels (top) */}
          {enrichedShows.map((show, i) => (
            <text
              key={`col-${show.id}`}
              x={labelWidth + i * cellSize + cellSize / 2}
              y={labelWidth - 10}
              textAnchor="end"
              transform={`rotate(-45 ${labelWidth + i * cellSize + cellSize / 2} ${labelWidth - 10})`}
              fontSize="11"
            >
              {show.title.length > 15 ? show.title.slice(0, 15) + '...' : show.title}
            </text>
          ))}

          {/* Row labels (left) */}
          {enrichedShows.map((show, i) => (
            <text
              key={`row-${show.id}`}
              x={labelWidth - 10}
              y={labelWidth + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fontSize="11"
            >
              {show.title.length > 15 ? show.title.slice(0, 15) + '...' : show.title}
            </text>
          ))}

          {/* Matrix cells */}
          {matrix.map((row, i) =>
            row.map((value, j) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={labelWidth + j * cellSize}
                  y={labelWidth + i * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={getColor(value, i === j)}
                  stroke="#ccc"
                  strokeWidth={1}
                  style={{ cursor: i !== j ? 'pointer' : 'default' }}
                  onMouseEnter={() => handleCellHover(i, j)}
                  onMouseLeave={() => setHoveredCell(null)}
                />
                <text
                  x={labelWidth + j * cellSize + cellSize / 2 - 1}
                  y={labelWidth + i * cellSize + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill={i === j ? '#999' : value > maxValue / 2 ? '#fff' : '#333'}
                >
                  {value}
                </text>
              </g>
            ))
          )}
        </svg>

        {/* Hover info panel */}
        <div
          style={{
            minWidth: '250px',
            padding: '1rem',
            background: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          {hoveredCell ? (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>
                {hoveredCell.showA.title} &amp; {hoveredCell.showB.title}
              </h4>
              <p>
                <strong>{hoveredCell.sharedWriters.length}</strong> shared
                writer{hoveredCell.sharedWriters.length !== 1 ? 's' : ''}
              </p>
              {hoveredCell.sharedWriters.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '14px' }}>
                  {hoveredCell.sharedWriters.slice(0, 8).map(w => (
                    <li key={w.id}>{w.name}</li>
                  ))}
                  {hoveredCell.sharedWriters.length > 8 && (
                    <li style={{ fontStyle: 'italic' }}>
                      ... and {hoveredCell.sharedWriters.length - 8} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
              Hover over a cell to see shared writers
            </p>
          )}
        </div>
      </div>

      {/* Color legend */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>0 writers</span>
        <div
          style={{
            width: '150px',
            height: '20px',
            background: 'linear-gradient(to right, #fff, #9ddb8a)',
            border: '1px solid #ccc',
          }}
        />
        <span>{maxValue} writers</span>
      </div>
    </div>
  );
};

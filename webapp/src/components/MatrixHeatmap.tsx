/**
 * Matrix heatmap visualization.
 * Shows shared writer counts between all pairs of shows.
 */

import { useMemo, useState } from 'react';
import type { Show, Writer, ShowWriterLink, ShowWithWriters } from '../core/types';
import { enrichShowsWithWriters, createOverlapMatrix, getSharedWriters } from '../core/overlap';
import './MatrixHeatmap.css';

interface MatrixHeatmapProps {
  readonly shows: ReadonlyArray<Show>;
  readonly writers: ReadonlyArray<Writer>;
  readonly links: ReadonlyArray<ShowWriterLink>;
  readonly onShowSelect?: (show: Show) => void;
}

interface CellInfo {
  showA: ShowWithWriters;
  showB: ShowWithWriters;
  sharedWriters: ReadonlyArray<Writer>;
}

const imdbShowUrl = (imdbId: string) => `https://www.imdb.com/title/${imdbId}/`;
const imdbWriterUrl = (imdbId: string) => `https://www.imdb.com/name/${imdbId}/`;

export const MatrixHeatmap = ({ shows, writers, links, onShowSelect }: MatrixHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<CellInfo | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);

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

  const getColor = (value: number, isDiag: boolean): string => {
    if (isDiag) return '#2a2a3e';
    if (value === 0) return '#1a1a2e';
    const intensity = Math.min(value / Math.max(maxValue, 1), 1);
    // Purple to teal gradient
    const r = Math.round(60 + intensity * 20);
    const g = Math.round(60 + intensity * 140);
    const b = Math.round(100 + intensity * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const cellSize = 50;
  const labelPadding = 140;
  const headerHeight = 100;
  const svgWidth = labelPadding + enrichedShows.length * cellSize + 20;
  const svgHeight = headerHeight + enrichedShows.length * cellSize + 20;

  const handleCellClick = (i: number, j: number) => {
    if (i === j) return;
    const shared = getSharedWriters(enrichedShows[i], enrichedShows[j]);
    setSelectedCell({
      showA: enrichedShows[i],
      showB: enrichedShows[j],
      sharedWriters: shared,
    });
  };

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

  const activeCell = selectedCell || hoveredCell;

  return (
    <div className="matrix-heatmap">
      <h2>Writer Overlap Matrix</h2>
      <p className="description">
        Click any cell to see shared writers. Click show names to explore on IMDB.
      </p>

      <div className="matrix-container">
        <div className="matrix-scroll">
          <svg width={svgWidth} height={svgHeight}>
            <defs>
              <linearGradient id="cellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#64d2c8" />
              </linearGradient>
            </defs>

            {/* Column labels (top) - fixed positioning */}
            {enrichedShows.map((show, i) => (
              <g key={`col-${show.id}`}>
                <a
                  href={imdbShowUrl(show.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <text
                    x={labelPadding + i * cellSize + cellSize / 2}
                    y={headerHeight - 8}
                    textAnchor="start"
                    transform={`rotate(-55 ${labelPadding + i * cellSize + cellSize / 2} ${headerHeight - 8})`}
                    className="matrix-label column-label"
                  >
                    {show.title.length > 18 ? show.title.slice(0, 18) + '…' : show.title}
                  </text>
                </a>
              </g>
            ))}

            {/* Row labels (left) */}
            {enrichedShows.map((show, i) => (
              <g key={`row-${show.id}`}>
                <a
                  href={imdbShowUrl(show.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <text
                    x={labelPadding - 8}
                    y={headerHeight + i * cellSize + cellSize / 2 + 4}
                    textAnchor="end"
                    className="matrix-label row-label"
                  >
                    {show.title.length > 18 ? show.title.slice(0, 18) + '…' : show.title}
                  </text>
                </a>
              </g>
            ))}

            {/* Matrix cells */}
            {matrix.map((row, i) =>
              row.map((value, j) => (
                <g key={`${i}-${j}`}>
                  <rect
                    x={labelPadding + j * cellSize}
                    y={headerHeight + i * cellSize}
                    width={cellSize - 3}
                    height={cellSize - 3}
                    rx={4}
                    fill={getColor(value, i === j)}
                    className={`matrix-cell ${i !== j ? 'interactive' : ''} ${
                      activeCell?.showA.id === enrichedShows[i].id &&
                      activeCell?.showB.id === enrichedShows[j].id
                        ? 'selected'
                        : ''
                    }`}
                    onMouseEnter={() => handleCellHover(i, j)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(i, j)}
                  />
                  <text
                    x={labelPadding + j * cellSize + cellSize / 2 - 1.5}
                    y={headerHeight + i * cellSize + cellSize / 2 + 5}
                    textAnchor="middle"
                    className={`cell-value ${i === j ? 'diagonal' : value > 0 ? 'has-value' : ''}`}
                  >
                    {i === j ? '—' : value}
                  </text>
                </g>
              ))
            )}
          </svg>
        </div>

        {/* Details panel */}
        <div className="details-panel">
          {activeCell ? (
            <div className="cell-details">
              <div className="show-pair">
                <a
                  href={imdbShowUrl(activeCell.showA.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="show-link"
                  onClick={() => onShowSelect?.(activeCell.showA)}
                >
                  {activeCell.showA.title}
                </a>
                <span className="connector">×</span>
                <a
                  href={imdbShowUrl(activeCell.showB.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="show-link"
                  onClick={() => onShowSelect?.(activeCell.showB)}
                >
                  {activeCell.showB.title}
                </a>
              </div>

              <div className="shared-count">
                <span className="count">{activeCell.sharedWriters.length}</span>
                <span className="label">shared writer{activeCell.sharedWriters.length !== 1 ? 's' : ''}</span>
              </div>

              {activeCell.sharedWriters.length > 0 && (
                <ul className="writer-list">
                  {activeCell.sharedWriters.map(w => (
                    <li key={w.id}>
                      <a
                        href={imdbWriterUrl(w.imdbId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="writer-link"
                      >
                        {w.name}
                        <span className="external-icon">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">🎬</div>
              <p>Hover or click a cell to explore shared writers between shows</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        <span className="legend-label">No overlap</span>
        <div className="gradient-bar" />
        <span className="legend-label">{maxValue}+ shared</span>
      </div>
    </div>
  );
};

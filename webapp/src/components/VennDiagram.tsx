/**
 * Interactive Venn diagram visualization.
 * Select 2-3 shows to see their writer overlap.
 * Large circles with unique writer lists below, shared writers in cards.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Show, Writer, ShowWriterLink, ShowWithWriters } from '../core/types';
import { enrichShowsWithWriters, getSharedWriters } from '../core/overlap';
import './VennDiagram.css';

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
  uniqueWriters: ReadonlyArray<Writer>;
}

const COLORS = ['#667eea', '#f093fb', '#64d2c8'];
const GRADIENTS = [
  ['#667eea', '#5a6fd6'],
  ['#f093fb', '#d580e8'],
  ['#64d2c8', '#4fc3b8'],
];

const imdbShowUrl = (imdbId: string) => `https://www.imdb.com/title/${imdbId}/`;
const imdbWriterUrl = (imdbId: string) => `https://www.imdb.com/name/${imdbId}/`;

export const VennDiagram = ({ shows, writers, links }: VennDiagramProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());
  const [expandedIntersections, setExpandedIntersections] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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

  const toggleListExpanded = (showId: number) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(showId)) {
        next.delete(showId);
      } else {
        next.add(showId);
      }
      return next;
    });
  };

  const toggleIntersectionExpanded = (key: string) => {
    setExpandedIntersections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getUniqueWriters = (show: ShowWithWriters, otherShows: ShowWithWriters[]): Writer[] => {
    const otherWriterIds = new Set(
      otherShows.flatMap(s => s.writers.map(w => w.id))
    );
    return show.writers.filter(w => !otherWriterIds.has(w.id));
  };

  // Large circles - fill most of the container
  const svgHeight = 700;
  const baseRadius = Math.min(containerWidth * 0.28, 220);

  interface CircleDataWithTextPos extends CircleData {
    textX: number;
    textY: number;
  }

  const getCirclePositions = (): CircleDataWithTextPos[] => {
    if (selectedShows.length === 0) return [];

    const centerX = containerWidth / 2;
    const centerY = svgHeight / 2;

    if (selectedShows.length === 1) {
      const r = baseRadius * 1.3;
      return [{
        show: selectedShows[0],
        cx: centerX,
        cy: centerY,
        r,
        color: COLORS[0],
        uniqueWriters: selectedShows[0].writers,
        textX: centerX,
        textY: centerY,
      }];
    }

    if (selectedShows.length === 2) {
      const r = baseRadius * 1.1;
      const overlap = r * 0.5; // circles overlap by half radius
      const textOffset = r * 0.45; // text positioned in unique area
      return [
        {
          show: selectedShows[0],
          cx: centerX - overlap,
          cy: centerY,
          r,
          color: COLORS[0],
          uniqueWriters: getUniqueWriters(selectedShows[0], [selectedShows[1]]),
          textX: centerX - overlap - textOffset,
          textY: centerY,
        },
        {
          show: selectedShows[1],
          cx: centerX + overlap,
          cy: centerY,
          r,
          color: COLORS[1],
          uniqueWriters: getUniqueWriters(selectedShows[1], [selectedShows[0]]),
          textX: centerX + overlap + textOffset,
          textY: centerY,
        },
      ];
    }

    // 3 circles - triangle arrangement
    const r = baseRadius;
    const spread = r * 0.7; // how far apart circle centers are
    const textOffset = r * 0.5; // text positioned in unique area
    return [
      {
        show: selectedShows[0],
        cx: centerX,
        cy: centerY - spread * 0.7,
        r,
        color: COLORS[0],
        uniqueWriters: getUniqueWriters(selectedShows[0], [selectedShows[1], selectedShows[2]]),
        textX: centerX,
        textY: centerY - spread * 0.7 - textOffset,
      },
      {
        show: selectedShows[1],
        cx: centerX - spread,
        cy: centerY + spread * 0.6,
        r,
        color: COLORS[1],
        uniqueWriters: getUniqueWriters(selectedShows[1], [selectedShows[0], selectedShows[2]]),
        textX: centerX - spread - textOffset * 0.7,
        textY: centerY + spread * 0.6 + textOffset * 0.7,
      },
      {
        show: selectedShows[2],
        cx: centerX + spread,
        cy: centerY + spread * 0.6,
        r,
        color: COLORS[2],
        uniqueWriters: getUniqueWriters(selectedShows[2], [selectedShows[0], selectedShows[1]]),
        textX: centerX + spread + textOffset * 0.7,
        textY: centerY + spread * 0.6 + textOffset * 0.7,
      },
    ];
  };

  const circles = getCirclePositions();

  const getIntersections = () => {
    if (selectedShows.length < 2) return [];

    const result: Array<{
      shows: ShowWithWriters[];
      writers: ReadonlyArray<Writer>;
      key: string;
    }> = [];

    if (selectedShows.length === 2) {
      const shared = getSharedWriters(selectedShows[0], selectedShows[1]);
      if (shared.length > 0) {
        result.push({
          shows: [selectedShows[0], selectedShows[1]],
          writers: shared,
          key: `${selectedShows[0].id}-${selectedShows[1].id}`,
        });
      }
    }

    if (selectedShows.length === 3) {
      const ab = getSharedWriters(selectedShows[0], selectedShows[1]);
      const abOnly = ab.filter(w => !selectedShows[2].writers.some(w2 => w2.id === w.id));
      if (abOnly.length > 0) {
        result.push({
          shows: [selectedShows[0], selectedShows[1]],
          writers: abOnly,
          key: `${selectedShows[0].id}-${selectedShows[1].id}`,
        });
      }

      const ac = getSharedWriters(selectedShows[0], selectedShows[2]);
      const acOnly = ac.filter(w => !selectedShows[1].writers.some(w2 => w2.id === w.id));
      if (acOnly.length > 0) {
        result.push({
          shows: [selectedShows[0], selectedShows[2]],
          writers: acOnly,
          key: `${selectedShows[0].id}-${selectedShows[2].id}`,
        });
      }

      const bc = getSharedWriters(selectedShows[1], selectedShows[2]);
      const bcOnly = bc.filter(w => !selectedShows[0].writers.some(w2 => w2.id === w.id));
      if (bcOnly.length > 0) {
        result.push({
          shows: [selectedShows[1], selectedShows[2]],
          writers: bcOnly,
          key: `${selectedShows[1].id}-${selectedShows[2].id}`,
        });
      }

      const abc = ab.filter(w => selectedShows[2].writers.some(w2 => w2.id === w.id));
      if (abc.length > 0) {
        result.push({
          shows: selectedShows.slice(),
          writers: abc,
          key: 'all-three',
        });
      }
    }

    return result;
  };

  const intersections = getIntersections();
  const totalSharedWriters = intersections.reduce((sum, i) => sum + i.writers.length, 0);

  return (
    <div className="venn-diagram" ref={containerRef}>
      <div className="venn-header">
        <div>
          <h2>Show Comparison</h2>
          <p className="description">
            Select 2-3 shows to visualize their writer overlap
          </p>
        </div>
      </div>

      <div className="show-selector">
        {enrichedShows.map(show => {
          const isSelected = selectedIds.includes(show.id);
          const colorIndex = isSelected ? selectedIds.indexOf(show.id) : -1;
          return (
            <button
              key={show.id}
              onClick={() => toggleShow(show.id)}
              className={`show-button ${isSelected ? 'selected' : ''}`}
              style={isSelected ? {
                background: `linear-gradient(135deg, ${GRADIENTS[colorIndex][0]}, ${GRADIENTS[colorIndex][1]})`,
                borderColor: COLORS[colorIndex],
              } : undefined}
            >
              <span className="show-title">{show.title}</span>
              <span className="writer-count">{show.writers.length} writers</span>
            </button>
          );
        })}
      </div>

      {selectedShows.length > 0 ? (
        <>
          {/* Large Venn Diagram SVG */}
          <div className="venn-svg-container">
            <svg
              width="100%"
              height={svgHeight}
              viewBox={`0 0 ${containerWidth} ${svgHeight}`}
              className="venn-svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {COLORS.map((color, i) => (
                  <radialGradient key={i} id={`venn-grad-${i}`} cx="35%" cy="35%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                  </radialGradient>
                ))}
                <filter id="circle-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="circle-shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.5"/>
                </filter>
              </defs>

              {/* Circles - decorative elements first */}
              {circles.map((circle, i) => (
                <g key={`circle-bg-${circle.show.id}`} className="venn-circle-group">
                  {/* Outer glow - no pointer events */}
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.r + 20}
                    fill="none"
                    stroke={circle.color}
                    strokeWidth={5}
                    opacity={0.3}
                    filter="url(#circle-glow)"
                    pointerEvents="none"
                  />
                  {/* Main circle - no pointer events so links are clickable */}
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.r}
                    fill={`url(#venn-grad-${i})`}
                    stroke={circle.color}
                    strokeWidth={6}
                    className="venn-circle"
                    filter="url(#circle-shadow)"
                    pointerEvents="none"
                  />
                </g>
              ))}

              {/* Clickable labels - rendered on top of circles */}
              {circles.map((circle) => (
                <g key={`circle-label-${circle.show.id}`} className="venn-label-group">
                  <a
                    href={imdbShowUrl(circle.show.imdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="show-title-link"
                    style={{ pointerEvents: 'all' }}
                  >
                    <title>
                      {circle.show.title}
                      {'\n'}Total writers: {circle.show.writers.length}
                      {'\n'}Unique writers: {circle.uniqueWriters.length}
                      {'\n'}Click to view on IMDB
                    </title>
                    {/* Invisible hit area for easier clicking */}
                    <rect
                      x={circle.textX - 100}
                      y={circle.textY - 40}
                      width={200}
                      height={100}
                      fill="transparent"
                      pointerEvents="all"
                    />
                    <text
                      x={circle.textX}
                      y={circle.textY - 14}
                      textAnchor="middle"
                      className="circle-title"
                      fill="#fff"
                      fontSize={22}
                      fontWeight="700"
                      pointerEvents="all"
                    >
                      {circle.show.title.length > 20
                        ? circle.show.title.slice(0, 20) + '…'
                        : circle.show.title}
                    </text>
                    <text
                      x={circle.textX}
                      y={circle.textY + 16}
                      textAnchor="middle"
                      className="circle-subtitle"
                      fill="rgba(255,255,255,0.9)"
                      fontSize={17}
                      pointerEvents="all"
                    >
                      {circle.show.writers.length} writers
                    </text>
                    <text
                      x={circle.textX}
                      y={circle.textY + 42}
                      textAnchor="middle"
                      className="circle-unique"
                      fill="rgba(255,255,255,0.75)"
                      fontSize={14}
                      pointerEvents="all"
                    >
                      ({circle.uniqueWriters.length} unique)
                    </text>
                  </a>
                </g>
              ))}

              {/* Intersection count in center */}
              {totalSharedWriters > 0 && (
                <g className="intersection-badge">
                  <title>
                    {totalSharedWriters} writers work on multiple selected shows
                    {'\n'}See shared writers section below
                  </title>
                  <circle
                    cx={containerWidth / 2}
                    cy={svgHeight / 2}
                    r={38}
                    fill="rgba(0,0,0,0.5)"
                  />
                  <text
                    x={containerWidth / 2}
                    y={svgHeight / 2 - 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={24}
                    fontWeight="bold"
                  >
                    {totalSharedWriters}
                  </text>
                  <text
                    x={containerWidth / 2}
                    y={svgHeight / 2 + 16}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={12}
                  >
                    shared
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Unique Writers Lists - Below Diagram */}
          <div className="unique-writers-section">
            <h3>Unique Writers by Show</h3>
            <div className="unique-writers-grid">
              {circles.map((circle) => {
                const isListExpanded = expandedLists.has(circle.show.id);
                const hasMany = circle.uniqueWriters.length > 10;
                const writersToShow = isListExpanded
                  ? circle.uniqueWriters
                  : circle.uniqueWriters.slice(0, 10);

                return (
                  <div
                    key={circle.show.id}
                    className="unique-writers-card"
                    style={{ borderColor: circle.color }}
                  >
                    <div className="unique-card-header">
                      <div className="unique-card-title">
                        <span
                          className="color-dot"
                          style={{ background: circle.color }}
                        />
                        <a
                          href={imdbShowUrl(circle.show.imdbId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: circle.color }}
                        >
                          {circle.show.title}
                        </a>
                        <span className="unique-count">
                          {circle.uniqueWriters.length} unique
                        </span>
                      </div>
                      {hasMany && (
                        <button
                          className="expand-list-btn"
                          onClick={() => toggleListExpanded(circle.show.id)}
                          style={{ color: circle.color }}
                        >
                          {isListExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                    </div>
                    <ul className="unique-writers-list">
                      {writersToShow.map(w => (
                        <li key={w.id}>
                          <a
                            href={imdbWriterUrl(w.imdbId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="unique-writer-link"
                          >
                            {w.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                    {!isListExpanded && hasMany && (
                      <div className="more-indicator">
                        +{circle.uniqueWriters.length - 10} more writers
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Writers Cards */}
          {intersections.length > 0 && (
            <div className="intersections-panel">
              <h3>Shared Writers</h3>
              <div className="intersection-cards">
                {intersections.map(int => {
                  const isIntExpanded = expandedIntersections.has(int.key);
                  const hasMany = int.writers.length > 10;
                  const writersToShow = isIntExpanded
                    ? int.writers
                    : int.writers.slice(0, 10);

                  return (
                    <div key={int.key} className="intersection-card">
                      <div className="intersection-header">
                        <span className="intersection-count-badge">{int.writers.length}</span>
                        <div className="intersection-shows">
                          {int.shows.map((s, i) => (
                            <span key={s.id}>
                              {i > 0 && <span className="show-sep"> ∩ </span>}
                              <a
                                href={imdbShowUrl(s.imdbId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="show-name-link"
                              >
                                {s.title}
                              </a>
                            </span>
                          ))}
                        </div>
                        {hasMany && (
                          <button
                            className="expand-list-btn"
                            onClick={() => toggleIntersectionExpanded(int.key)}
                          >
                            {isIntExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        )}
                      </div>
                      <ul className="shared-writer-list">
                        {writersToShow.map(w => (
                          <li key={w.id}>
                            <a
                              href={imdbWriterUrl(w.imdbId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shared-writer-link"
                            >
                              {w.name}
                              <span className="link-arrow">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                      {!isIntExpanded && hasMany && (
                        <div className="more-indicator">
                          +{int.writers.length - 10} more writers
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>Select shows above to compare their writers</p>
        </div>
      )}
    </div>
  );
};

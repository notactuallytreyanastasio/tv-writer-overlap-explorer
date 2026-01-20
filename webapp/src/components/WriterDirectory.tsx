/**
 * Writer directory with pagination, search, and go-to-page.
 * Displays writers alphabetically, 10 per page, with images and bios.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Writer, PaginationInfo } from '../core/types';
import { fetchPaginatedWriters } from '../shell/api';
import './WriterDirectory.css';

const WRITERS_PER_PAGE = 10;

const imdbWriterUrl = (imdbId: string) => `https://www.imdb.com/name/${imdbId}/`;

// Default placeholder for writers without images
const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect fill="#2a2a3e" width="100" height="100"/>
    <circle cx="50" cy="35" r="20" fill="#4a4a6e"/>
    <ellipse cx="50" cy="85" rx="30" ry="25" fill="#4a4a6e"/>
  </svg>
`);

export const WriterDirectory = () => {
  const [writers, setWriters] = useState<ReadonlyArray<Writer>>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [goToPageInput, setGoToPageInput] = useState('');

  const loadWriters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPaginatedWriters(
        currentPage,
        WRITERS_PER_PAGE,
        searchQuery || undefined
      );
      setWriters(data.writers);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load writers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadWriters();
  }, [loadWriters]);

  const goToPage = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      setCurrentPage(page);
      setGoToPageInput('');
      document.querySelector('.writer-directory')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setCurrentPage(1); // Reset to first page on new search
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(goToPageInput, 10);
    if (!isNaN(page) && pagination) {
      goToPage(Math.min(Math.max(1, page), pagination.totalPages));
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const { page, totalPages } = pagination;

    // Always show first page
    pages.push(1);

    // Show ellipsis if needed
    if (page > 3) {
      pages.push('...');
    }

    // Show pages around current
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    // Show ellipsis if needed
    if (page < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return (
      <div className="pagination">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={!pagination.hasPrev}
          className="page-btn prev"
        >
          Previous
        </button>

        <div className="page-numbers">
          {pages.map((p, i) =>
            typeof p === 'number' ? (
              <button
                key={i}
                onClick={() => goToPage(p)}
                className={`page-btn ${p === page ? 'active' : ''}`}
              >
                {p}
              </button>
            ) : (
              <span key={i} className="ellipsis">{p}</span>
            )
          )}
        </div>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={!pagination.hasNext}
          className="page-btn next"
        >
          Next
        </button>

        {/* Go to page input */}
        <form onSubmit={handleGoToPage} className="go-to-page">
          <label htmlFor="go-to-page-input">Go to:</label>
          <input
            id="go-to-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={goToPageInput}
            onChange={(e) => setGoToPageInput(e.target.value)}
            placeholder={String(page)}
            className="go-to-input"
          />
          <button type="submit" className="page-btn go-btn">Go</button>
        </form>
      </div>
    );
  };

  if (loading && writers.length === 0) {
    return (
      <div className="writer-directory loading">
        <div className="spinner" />
        <p>Loading writers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="writer-directory error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="writer-directory">
      <h2>Writer Directory</h2>
      <p className="description">
        {pagination && (
          <>
            {pagination.total.toLocaleString()} writer{pagination.total !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {pagination.totalPages > 1 && (
              <>
                {' '}&middot;{' '}
                Page {pagination.page} of {pagination.totalPages}
              </>
            )}
          </>
        )}
      </p>

      {/* Search box */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search writers by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          {(searchInput || searchQuery) && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-search"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className="search-btn">Search</button>
      </form>

      {renderPagination()}

      {writers.length === 0 ? (
        <div className="no-results">
          <p>No writers found{searchQuery && ` matching "${searchQuery}"`}</p>
          {searchQuery && (
            <button onClick={clearSearch} className="clear-btn">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="writers-list">
          {writers.map(writer => (
            <div key={writer.id} className="writer-card">
              <div className="writer-image">
                <img
                  src={writer.imageUrl || DEFAULT_AVATAR}
                  alt={writer.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div className="writer-info">
                <h3>
                  <a
                    href={imdbWriterUrl(writer.imdbId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="writer-name-link"
                  >
                    {writer.name}
                    <span className="external-icon">↗</span>
                  </a>
                </h3>
                {writer.showCount !== undefined && writer.showCount > 0 && (
                  <span className="show-count">
                    {writer.showCount} show{writer.showCount !== 1 ? 's' : ''}
                  </span>
                )}
                {writer.bio ? (
                  <p className="bio">{writer.bio}</p>
                ) : (
                  <p className="bio no-bio">No biography available</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {writers.length > 0 && renderPagination()}
    </div>
  );
};

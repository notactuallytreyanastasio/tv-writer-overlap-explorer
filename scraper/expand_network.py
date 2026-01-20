"""Expand the writer network by crawling from existing shows."""
import json
import re
import time
from collections import deque

import requests
from bs4 import BeautifulSoup

from database import (
    init_db,
    get_connection,
    insert_show,
    insert_writer,
    link_show_writer,
    get_all_shows,
    get_all_writers,
    get_writer_overlap,
)
from imdb_scraper import (
    HEADERS,
    ShowInfo,
    WriterInfo,
    get_show_details,
    get_show_writers,
)


def get_scraped_show_ids() -> set[str]:
    """Get IMDB IDs of shows already in the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT imdb_id FROM shows")
    rows = cursor.fetchall()
    conn.close()
    return {row["imdb_id"] for row in rows}


def get_scraped_writer_ids() -> set[str]:
    """Get IMDB IDs of writers already scraped for their filmography."""
    conn = get_connection()
    cursor = conn.cursor()
    # We'll track this by checking if writer has been linked to shows
    cursor.execute("""
        SELECT DISTINCT w.imdb_id
        FROM writers w
        JOIN show_writers sw ON w.id = sw.writer_id
    """)
    rows = cursor.fetchall()
    conn.close()
    return {row["imdb_id"] for row in rows}


def get_writer_tv_shows(writer_imdb_id: str) -> list[ShowInfo]:
    """Get TV shows a writer has worked on from their IMDB page."""
    url = f"https://www.imdb.com/name/{writer_imdb_id}/"

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"    Error fetching writer page: {e}")
        return []

    soup = BeautifulSoup(response.text, "lxml")
    shows = []

    # Try to find __NEXT_DATA__ JSON first (more reliable)
    next_data = soup.find("script", id="__NEXT_DATA__")
    if next_data:
        try:
            data = json.loads(next_data.get_text())
            props = data.get("props", {}).get("pageProps", {})

            # Look for credits in the data
            credits_data = props.get("mainColumnData", {})
            categories = credits_data.get("credits", {}).get("edges", [])

            for cat_edge in categories:
                cat = cat_edge.get("node", {})
                cat_name = cat.get("category", {}).get("text", "").lower()

                if "writer" in cat_name or "writ" in cat_name:
                    credit_edges = cat.get("credits", {}).get("edges", [])
                    for credit_edge in credit_edges:
                        credit = credit_edge.get("node", {})
                        title_data = credit.get("title", {})

                        title_id = title_data.get("id", "")
                        title_text = title_data.get("titleText", {}).get("text", "")
                        title_type = title_data.get("titleType", {}).get("id", "")

                        # Only include TV series
                        if title_id and title_text and title_type in ["tvSeries", "tvMiniSeries"]:
                            year = None
                            year_data = title_data.get("releaseYear", {})
                            if year_data:
                                year = year_data.get("year")

                            shows.append(ShowInfo(
                                imdb_id=title_id,
                                title=title_text,
                                year_start=year
                            ))

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            pass  # Fall back to HTML parsing

    # Fallback: HTML parsing
    if not shows:
        # Look for filmography sections with writer credits
        filmography = soup.select('a[href*="/title/tt"]')
        for link in filmography:
            href = link.get("href", "")
            match = re.search(r"/title/(tt\d+)", href)
            if match:
                imdb_id = match.group(1)
                parent = link.find_parent()
                parent_text = parent.get_text() if parent else ""

                # Check if it's a TV series and in writing credits section
                if "TV Series" in parent_text or "TV Mini" in parent_text:
                    title = link.get_text(strip=True)
                    if title and title != imdb_id and len(title) > 1:
                        shows.append(ShowInfo(imdb_id=imdb_id, title=title))

    # Deduplicate
    seen = set()
    unique = []
    for show in shows:
        if show.imdb_id not in seen:
            seen.add(show.imdb_id)
            unique.append(show)

    return unique


def scrape_show_by_id(imdb_id: str) -> tuple[int | None, list[WriterInfo]]:
    """Scrape a show by its IMDB ID. Returns (show_db_id, writers)."""
    try:
        # Get show details
        show_info = get_show_details(imdb_id)
        if not show_info:
            return None, []

        # Insert show
        show_id = insert_show(
            show_info.imdb_id,
            show_info.title,
            show_info.year_start,
            show_info.year_end
        )

        time.sleep(0.5)

        # Get writers
        writers = get_show_writers(imdb_id)

        # Link writers to show
        for writer in writers:
            writer_id = insert_writer(writer.imdb_id, writer.name)
            link_show_writer(show_id, writer_id, writer.role, writer.episode_count)

        return show_id, writers

    except Exception as e:
        print(f"    Error scraping show {imdb_id}: {e}")
        return None, []


def expand_network(target_shows: int = 100, min_episodes: int = 3):
    """
    Expand the network by following writers to their other shows.

    Args:
        target_shows: Stop when we have this many shows
        min_episodes: Only follow writers with at least this many episode credits
    """
    print("=" * 60)
    print("EXPANDING WRITER NETWORK")
    print("=" * 60)

    init_db()

    # Get what we already have
    scraped_shows = get_scraped_show_ids()
    print(f"\nStarting with {len(scraped_shows)} shows in database")

    if len(scraped_shows) >= target_shows:
        print(f"Already have {len(scraped_shows)} shows, target is {target_shows}")
        return

    # Get all writers from existing shows who meet the episode threshold
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT w.id, w.imdb_id, w.name, MAX(sw.episode_count) as max_episodes
        FROM writers w
        JOIN show_writers sw ON w.id = sw.writer_id
        GROUP BY w.id
        HAVING max_episodes >= ? OR max_episodes IS NULL
        ORDER BY max_episodes DESC
    """, (min_episodes,))
    prolific_writers = cursor.fetchall()
    conn.close()

    print(f"Found {len(prolific_writers)} writers with {min_episodes}+ episodes")

    # Queue of writers to process
    writer_queue = deque([dict(w) for w in prolific_writers])
    processed_writers = set()

    # Queue of shows to scrape
    show_queue = deque()

    iteration = 0
    max_iterations = 500  # Safety limit

    while len(scraped_shows) < target_shows and iteration < max_iterations:
        iteration += 1

        # First, process any shows in the queue
        while show_queue and len(scraped_shows) < target_shows:
            show_info = show_queue.popleft()

            if show_info.imdb_id in scraped_shows:
                continue

            print(f"\n[{len(scraped_shows)+1}/{target_shows}] Scraping: {show_info.title}")

            show_id, writers = scrape_show_by_id(show_info.imdb_id)

            if show_id:
                scraped_shows.add(show_info.imdb_id)
                print(f"  Added with {len(writers)} writers")

                # Add new prolific writers to the queue
                for writer in writers:
                    if writer.imdb_id not in processed_writers:
                        if writer.episode_count and writer.episode_count >= min_episodes:
                            writer_queue.append({
                                "imdb_id": writer.imdb_id,
                                "name": writer.name,
                            })

                time.sleep(1)  # Rate limiting

        # If we still need more shows, get them from writers
        if len(scraped_shows) < target_shows and writer_queue:
            writer = writer_queue.popleft()
            writer_id = writer["imdb_id"]

            if writer_id in processed_writers:
                continue

            processed_writers.add(writer_id)
            print(f"\n  Checking writer: {writer['name']}")

            time.sleep(0.5)
            other_shows = get_writer_tv_shows(writer_id)

            new_shows = [s for s in other_shows if s.imdb_id not in scraped_shows]
            print(f"    Found {len(new_shows)} new shows (of {len(other_shows)} total)")

            for show in new_shows:
                show_queue.append(show)

        # If both queues are empty, we're done
        if not show_queue and not writer_queue:
            print("\nNo more shows or writers to process")
            break

    print("\n" + "=" * 60)
    print("EXPANSION COMPLETE")
    print("=" * 60)

    # Final stats
    shows = get_all_shows()
    writers = get_all_writers()
    overlaps = get_writer_overlap()

    print(f"\nTotal shows: {len(shows)}")
    print(f"Total writers: {len(writers)}")
    print(f"Writers with overlap: {len(overlaps)}")

    if overlaps:
        print(f"\nTop 15 writers by show count:")
        for overlap in overlaps[:15]:
            print(f"  {overlap['writer_name']}: {overlap['show_count']} shows")
            print(f"    {', '.join(overlap['shows'][:5])}" +
                  (f"... +{len(overlap['shows'])-5} more" if len(overlap['shows']) > 5 else ""))


if __name__ == "__main__":
    expand_network(target_shows=200, min_episodes=3)

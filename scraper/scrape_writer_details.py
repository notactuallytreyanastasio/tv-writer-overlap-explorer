"""Scrape writer images and bios from IMDB."""
import json
import time
from dataclasses import dataclass
from typing import Optional

import requests
from bs4 import BeautifulSoup

from database import (
    migrate_add_writer_details,
    get_writers_without_details,
    update_writer_details,
    get_all_writers,
)
from imdb_scraper import HEADERS


@dataclass
class WriterDetails:
    """Writer image and bio from IMDB."""
    imdb_id: str
    image_url: Optional[str] = None
    bio: Optional[str] = None


def scrape_writer_details(imdb_id: str) -> WriterDetails:
    """Scrape a writer's image and bio from their IMDB page."""
    url = f"https://www.imdb.com/name/{imdb_id}/"

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"    Error fetching writer page: {e}")
        return WriterDetails(imdb_id=imdb_id)

    soup = BeautifulSoup(response.text, "lxml")

    image_url = None
    bio = None

    # Try to find __NEXT_DATA__ JSON first (more reliable)
    next_data = soup.find("script", id="__NEXT_DATA__")
    if next_data:
        try:
            data = json.loads(next_data.get_text())
            props = data.get("props", {}).get("pageProps", {})

            # Get image from aboveTheFold data
            above_fold = props.get("aboveTheFold", {})

            # Primary image
            primary_image = above_fold.get("primaryImage", {})
            if primary_image:
                image_url = primary_image.get("url")

            # Bio from aboveTheFold (this is where IMDB stores the mini bio)
            bio_data = above_fold.get("bio", {})
            if bio_data:
                bio_text = bio_data.get("text", {})
                if bio_text:
                    plain_text = bio_text.get("plainText", "")
                    if plain_text:
                        # Truncate to first ~500 chars at sentence boundary
                        bio = truncate_bio(plain_text, 500)

        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback: HTML parsing for image
    if not image_url:
        img_tag = soup.select_one('img[class*="ipc-image"]')
        if img_tag:
            image_url = img_tag.get("src")

    # Fallback: HTML parsing for bio
    if not bio:
        bio_section = soup.select_one('[data-testid="mini-bio"]')
        if bio_section:
            bio_text = bio_section.get_text(strip=True)
            if bio_text:
                bio = truncate_bio(bio_text, 500)

    return WriterDetails(imdb_id=imdb_id, image_url=image_url, bio=bio)


def truncate_bio(text: str, max_length: int) -> str:
    """Truncate bio to max_length, ending at a sentence boundary if possible."""
    if len(text) <= max_length:
        return text

    # Try to find a sentence boundary
    truncated = text[:max_length]

    # Look for last sentence-ending punctuation
    for punct in ['. ', '! ', '? ']:
        last_idx = truncated.rfind(punct)
        if last_idx > max_length // 2:  # Don't truncate too early
            return truncated[:last_idx + 1].strip()

    # No good sentence boundary, just truncate at word boundary
    last_space = truncated.rfind(' ')
    if last_space > max_length // 2:
        return truncated[:last_space].strip() + '...'

    return truncated.strip() + '...'


def scrape_all_writer_details(batch_size: int = 50, delay: float = 0.5):
    """Scrape details for all writers who don't have them yet."""
    print("=" * 60)
    print("SCRAPING WRITER DETAILS")
    print("=" * 60)

    # Ensure migration is applied
    migrate_add_writer_details()

    # Get writers needing details
    writers = get_writers_without_details()
    total = len(writers)

    print(f"\nFound {total} writers without complete details")

    if total == 0:
        print("All writers have details already!")
        return

    success_count = 0
    image_count = 0
    bio_count = 0

    for i, writer in enumerate(writers):
        print(f"\n[{i+1}/{total}] {writer['name']}")

        details = scrape_writer_details(writer['imdb_id'])

        if details.image_url or details.bio:
            update_writer_details(
                writer['imdb_id'],
                image_url=details.image_url,
                bio=details.bio
            )
            success_count += 1

            if details.image_url:
                image_count += 1
                print(f"  ✓ Image found")

            if details.bio:
                bio_count += 1
                print(f"  ✓ Bio found ({len(details.bio)} chars)")

            if not details.image_url:
                print(f"  - No image")
            if not details.bio:
                print(f"  - No bio")
        else:
            print(f"  - No details found")

        # Rate limiting
        time.sleep(delay)

        # Progress update every batch
        if (i + 1) % batch_size == 0:
            print(f"\n--- Progress: {i+1}/{total} writers processed ---")
            print(f"    Images: {image_count}, Bios: {bio_count}")

    print("\n" + "=" * 60)
    print("SCRAPING COMPLETE")
    print("=" * 60)
    print(f"\nProcessed: {total} writers")
    print(f"Updated: {success_count} writers")
    print(f"Images found: {image_count}")
    print(f"Bios found: {bio_count}")


if __name__ == "__main__":
    scrape_all_writer_details()

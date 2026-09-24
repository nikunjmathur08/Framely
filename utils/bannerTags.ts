import { Movie } from "../types";

export interface BannerTag {
  icon: string;
  label: string;
}

// Award keyword fragments to detect from TMDB keyword names.
// TMDB keywords are lowercase strings like "emmy award nominee", "academy award winner", etc.
const AWARD_PATTERNS: Array<{ pattern: RegExp; icon: string; label: string }> = [
  { pattern: /academy award winner|oscar winner/i,   icon: "🏆", label: "Oscar Winner"       },
  { pattern: /academy award nominee|oscar nominee/i, icon: "🎬", label: "Oscar Nominee"      },
  { pattern: /emmy.*winner/i,                        icon: "🏆", label: "Emmy Winner"        },
  { pattern: /emmy.*nominee|emmy.*nominated/i,       icon: "🏅", label: "Emmy Nominee"       },
  { pattern: /golden globe.*winner/i,                icon: "🏆", label: "Golden Globe Winner" },
  { pattern: /golden globe.*nominee/i,               icon: "🌟", label: "Golden Globe Nominee"},
  { pattern: /bafta.*winner/i,                       icon: "🏆", label: "BAFTA Winner"       },
  { pattern: /bafta.*nominee/i,                      icon: "🎭", label: "BAFTA Nominee"      },
  { pattern: /cannes/i,                              icon: "🎞️", label: "Cannes Selection"   },
];

/** Extract all keyword strings from the TMDB keyword response (handles both movie/TV shapes). */
function getKeywordNames(movie: Movie): string[] {
  const kw = movie.keywords;
  if (!kw) return [];
  // Movies use `keywords.results`; TV shows use `keywords.keywords`
  const list = kw.results ?? kw.keywords ?? [];
  return list.map((k) => k.name.toLowerCase());
}

/**
 * Derives dynamic banner tags from TMDB data.
 *
 * Rules:
 * 1. Award tags — scan keyword names for award-related patterns (max 2 tags).
 * 2. Popularity tag — show "Trending Now" if vote_count > 1000 and vote_average >= 7.5
 *    AND no award tags were found (avoid clutter).
 */
export function deriveBannerTags(movie: Movie | null): BannerTag[] {
  if (!movie) return [];

  const keywordNames = getKeywordNames(movie);
  const tags: BannerTag[] = [];

  // 1. Award detection (capped at 2 so the UI never overflows)
  for (const { pattern, icon, label } of AWARD_PATTERNS) {
    if (tags.length >= 2) break;
    if (keywordNames.some((name) => pattern.test(name))) {
      // Avoid duplicate labels
      if (!tags.some((t) => t.label === label)) {
        tags.push({ icon, label });
      }
    }
  }

  // 2. Highly-rated tag (only if no award tags and not already 2 tags)
  if (tags.length === 0 && (movie.vote_count ?? 0) >= 500 && movie.vote_average >= 7.5) {
    tags.push({ icon: "👍", label: "Highly Rated" });
  }

  // 3. Top-rated overall
  if (tags.length < 2 && (movie.vote_count ?? 0) >= 1000 && movie.vote_average >= 8.0) {
    if (!tags.some((t) => t.label === "Highly Rated")) {
      tags.push({ icon: "⭐", label: "Top Rated" });
    }
  }

  return tags;
}

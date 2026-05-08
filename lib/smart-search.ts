/**
 * Smart document search with fuzzy matching and context awareness
 *
 * Provides advanced search capabilities for documents:
 * - Fuzzy text matching
 * - Context-aware results
 * - Search history and suggestions
 * - Multi-field search (title, content, tags)
 */

export interface SearchOptions {
  /** Query string */
  query: string;
  /** Fields to search (default: all) */
  fields?: ('title' | 'content' | 'tags' | 'author')[];
  /** Fuzzy matching threshold (0-1, default: 0.8) */
  threshold?: number;
  /** Maximum results to return */
  limit?: number;
  /** Enable typo tolerance */
  typoTolerance?: boolean;
  /** Boost recent documents */
  recencyBoost?: boolean;
}

export interface SearchResult {
  /** Document ID */
  id: string;
  /** Matched document */
  document: any;
  /** Relevance score (0-1) */
  score: number;
  /** Matched fields */
  matches: {
    field: string;
    snippet: string;
    highlights: [number, number][];
  }[];
  /** Reason for ranking */
  rankingFactors: {
    textSimilarity: number;
    recency: number;
    popularity: number;
  };
}

export interface SearchSuggestion {
  /** Suggested query */
  query: string;
  /** Reason for suggestion */
  reason: 'history' | 'popular' | 'autocomplete';
  /** Number of expected results */
  estimatedCount: number;
}

/**
 * Smart document search engine
 */
export class SmartSearch {
  private searchHistory: string[] = [];
  private popularSearches: Map<string, number> = new Map();

  constructor(private documents: any[]) {}

  /**
   * Perform smart search across documents
   */
  search(options: SearchOptions): SearchResult[] {
    const {
      query,
      fields = ['title', 'content', 'tags', 'author'],
      threshold = 0.8,
      limit = 10,
      typoTolerance = true,
      recencyBoost = false,
    } = options;

    // Track search
    this.addToHistory(query);

    // Normalize query
    const normalizedQuery = this.normalizeQuery(query);

    // Search in documents
    const results: SearchResult[] = [];

    for (const doc of this.documents) {
      const matches = [];
      let totalScore = 0;

      for (const field of fields) {
        const fieldValue = String(doc[field] || '');
        const fieldScore = this.computeSimilarity(
          normalizedQuery,
          fieldValue,
          typoTolerance
        );

        if (fieldScore >= threshold) {
          const highlights = this.findHighlights(normalizedQuery, fieldValue);
          const snippet = this.extractSnippet(fieldValue, highlights);

          matches.push({
            field,
            snippet,
            highlights,
          });

          totalScore += fieldScore;
        }
      }

      if (matches.length > 0) {
        // Compute ranking factors
        const textSimilarity = totalScore / matches.length;
        const recency = recencyBoost ? this.computeRecency(doc) : 0;
        const popularity = this.getPopularity(doc.id);

        const finalScore =
          textSimilarity * 0.7 + recency * 0.2 + popularity * 0.1;

        results.push({
          id: doc.id,
          document: doc,
          score: finalScore,
          matches,
          rankingFactors: {
            textSimilarity,
            recency,
            popularity,
          },
        });
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get search suggestions based on history and popularity
   */
  getSuggestions(partial: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // From history
    const historyMatches = this.searchHistory
      .filter((q) => q.toLowerCase().startsWith(partial.toLowerCase()))
      .slice(-5);

    for (const query of historyMatches) {
      suggestions.push({
        query,
        reason: 'history',
        estimatedCount: this.estimateResultCount(query),
      });
    }

    // From popular searches
    const popularMatches = Array.from(this.popularSearches.entries())
      .filter(([q]) => q.toLowerCase().includes(partial.toLowerCase()))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([q]) => q);

    for (const query of popularMatches) {
      if (!suggestions.find((s) => s.query === query)) {
        suggestions.push({
          query,
          reason: 'popular',
          estimatedCount: this.estimateResultCount(query),
        });
      }
    }

    // Autocomplete
    const words = partial.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.length >= 2) {
      const completions = this.getWordCompletions(lastWord);

      for (const completion of completions.slice(0, 3)) {
        const completedQuery = [...words.slice(0, -1), completion].join(' ');

        suggestions.push({
          query: completedQuery,
          reason: 'autocomplete',
          estimatedCount: this.estimateResultCount(completedQuery),
        });
      }
    }

    return suggestions.slice(0, 10);
  }

  /**
   * Add search to history
   */
  private addToHistory(query: string): void {
    this.searchHistory.push(query);

    // Keep last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory.shift();
    }

    // Track popularity
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Compute text similarity using fuzzy matching
   */
  private computeSimilarity(
    query: string,
    text: string,
    typoTolerance: boolean
  ): number {
    const queryWords = query.split(' ');
    const textLower = text.toLowerCase();

    let matchCount = 0;

    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matchCount++;
      } else if (typoTolerance) {
        // Check for typos using Levenshtein distance
        const words = textLower.split(' ');
        const closeMatch = words.some(
          (w) => this.levenshteinDistance(word, w) <= 2
        );
        if (closeMatch) matchCount += 0.7; // Partial credit for typo match
      }
    }

    return matchCount / queryWords.length;
  }

  /**
   * Find highlight positions for matched terms
   */
  private findHighlights(
    query: string,
    text: string
  ): [number, number][] {
    const highlights: [number, number][] = [];
    const queryWords = query.split(' ');
    const textLower = text.toLowerCase();

    for (const word of queryWords) {
      let index = textLower.indexOf(word);

      while (index !== -1) {
        highlights.push([index, index + word.length]);
        index = textLower.indexOf(word, index + 1);
      }
    }

    return highlights.sort((a, b) => a[0] - b[0]);
  }

  /**
   * Extract snippet with context around matches
   */
  private extractSnippet(
    text: string,
    highlights: [number, number][],
    contextLength: number = 50
  ): string {
    if (highlights.length === 0) {
      return text.slice(0, 100) + (text.length > 100 ? '...' : '');
    }

    // Get first highlight
    const [start, end] = highlights[0];

    const snippetStart = Math.max(0, start - contextLength);
    const snippetEnd = Math.min(text.length, end + contextLength);

    let snippet = text.slice(snippetStart, snippetEnd);

    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < text.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Compute recency score (newer = higher)
   */
  private computeRecency(doc: any): number {
    if (!doc.updatedAt && !doc.createdAt) return 0;

    const docDate = new Date(doc.updatedAt || doc.createdAt);
    const now = new Date();
    const ageMs = now.getTime() - docDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Exponential decay: score drops by half every 30 days
    return Math.exp(-ageDays / 30);
  }

  /**
   * Get document popularity score
   */
  private getPopularity(docId: string): number {
    // Simplified - in production, track views/interactions
    return 0.5;
  }

  /**
   * Estimate result count for a query
   */
  private estimateResultCount(query: string): number {
    const results = this.search({
      query,
      limit: 1000,
      threshold: 0.5,
    });
    return results.length;
  }

  /**
   * Get word completions for autocomplete
   */
  private getWordCompletions(prefix: string): string[] {
    const allWords = new Set<string>();

    for (const doc of this.documents) {
      const text = [
        doc.title,
        doc.content,
        doc.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' ');

      const words = text.toLowerCase().split(/\s+/);

      for (const word of words) {
        if (word.startsWith(prefix) && word.length > prefix.length) {
          allWords.add(word);
        }
      }
    }

    return Array.from(allWords).sort();
  }

  /**
   * Compute Levenshtein distance for typo tolerance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

/**
 * Create a smart search instance
 */
export function createSmartSearch(documents: any[]): SmartSearch {
  return new SmartSearch(documents);
}

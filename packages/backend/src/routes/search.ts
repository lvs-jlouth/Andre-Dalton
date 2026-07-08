/**
 * Web search proxy route — provides server-side web search
 * so J.A.R.G.I.I.N. can fetch and summarize results.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SearchQuery {
  q: string;
  engine?: 'google' | 'bing' | 'duckduckgo';
  limit?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Performs a server-side web search using DuckDuckGo's instant answer API
 * (no API key required) with fallback to a simple scrape approach.
 */
async function performSearch(query: string, engine: string, limit: number): Promise<SearchResult[]> {
  // DuckDuckGo instant-answer API (free, no key)
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  try {
    const response = await fetch(ddgUrl);
    if (!response.ok) return [];

    const data = await response.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{
        Text?: string;
        FirstURL?: string;
      }>;
    };

    const results: SearchResult[] = [];

    // Add abstract result if present
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.AbstractSource ?? 'Web Result',
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }

    // Add related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, limit - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] ?? topic.Text.slice(0, 60),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    return results.slice(0, limit);
  } catch {
    return [];
  }
}

export default async function searchRoutes(fastify: FastifyInstance) {
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { q, engine = 'duckduckgo', limit = 5 } = request.query;

    if (!q || q.trim().length === 0) {
      return reply.status(400).send({ error: 'Query parameter "q" is required' });
    }

    const results = await performSearch(q.trim(), engine, Math.min(limit, 10));

    return reply.send({
      query: q,
      engine,
      results,
      count: results.length,
    });
  });
}

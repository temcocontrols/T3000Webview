/**
 * Hook to load and parse markdown content
 */

import { useState, useEffect } from 'react';
import { DOCS_CONFIG } from '@t3-react/config/constants';

interface MarkdownResult {
  content: string;
  loading: boolean;
  error: Error | null;
}

export function useMarkdownContent(path: string): MarkdownResult {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMarkdown() {
      setLoading(true);
      setError(null);

      try {
        // Determine the path based on whether it's legacy or t3000
        let mdPath: string;

        if (path.startsWith('legacy/')) {
          // Legacy docs are in /docs folder with their full path structure
          mdPath = `${DOCS_CONFIG.baseUrl}/${path.replace('legacy/', '')}`;
        } else if (path.startsWith('t3000/')) {
          // T3000 docs are in /docs/t3000
          mdPath = `${DOCS_CONFIG.baseUrl}/${path}.md`;
        } else {
          // Fallback for any other paths
          mdPath = `${DOCS_CONFIG.baseUrl}/${path}.md`;
        }

        // Fetch the markdown file
        const response = await fetch(mdPath);

        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.statusText}`);
        }

        const text = await response.text();

        if (isMounted) {
          setContent(text);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    }

    loadMarkdown();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { content, loading, error };
}

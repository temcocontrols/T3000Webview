/**
 * Hook to load and parse markdown content
 */

import { useState, useEffect } from 'react';

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
        // Construct the path to the markdown file
        const mdPath = `/docs/user-guide/${path}.md`;

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

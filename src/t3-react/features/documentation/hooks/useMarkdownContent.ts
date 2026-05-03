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

interface ResolvedDocPaths {
  markdownPath: string;
  assetBaseUrl: string;
}

function buildDocPaths(path: string): { local: ResolvedDocPaths; githubRaw: ResolvedDocPaths } {
  const normalized = path.startsWith('legacy/') ? path.replace('legacy/', '') : path;
  const markdownPath = normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;

  return {
    local: {
      markdownPath: `${DOCS_CONFIG.baseUrl}/${markdownPath}`,
      assetBaseUrl: DOCS_CONFIG.baseUrl,
    },
    githubRaw: {
      markdownPath: `${DOCS_CONFIG.githubRawUrl}/${markdownPath}`,
      assetBaseUrl: DOCS_CONFIG.githubRawUrl,
    },
  };
}

function rewriteRelativeImagePaths(markdown: string, path: string, assetBaseUrl: string): string {
  const pathWithoutExt = path.replace(/\.md$/i, '');
  const lastSlash = pathWithoutExt.lastIndexOf('/');
  const baseDir = lastSlash >= 0 ? pathWithoutExt.slice(0, lastSlash) : '';

  // Convert markdown image refs like ![alt](images/foo.png)
  // into absolute docs refs like ![alt](/docs/t3000/quick-start/images/foo.png).
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, rawUrl) => {
    const url = String(rawUrl).trim();
    if (!url) {
      return full;
    }

    const lower = url.toLowerCase();
    if (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('data:') ||
      lower.startsWith('/') ||
      lower.startsWith('#')
    ) {
      return full;
    }

    const normalizedBase = baseDir.replace(/^\/+/, '').replace(/\/+$/, '');
    const normalizedUrl = url.replace(/^\.+\//, '').replace(/^\/+/, '');
    const absolute = `${assetBaseUrl}/${normalizedBase}/${normalizedUrl}`.replace(/([^:]\/)\/+/g, '$1');
    return `![${alt}](${absolute})`;
  });
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
        const { local, githubRaw } = buildDocPaths(path);
        let response = await fetch(local.markdownPath);
        let assetBaseUrl = local.assetBaseUrl;

        // Fallback for deployed environments where /docs may not be packaged.
        if (!response.ok) {
          response = await fetch(githubRaw.markdownPath);
          assetBaseUrl = githubRaw.assetBaseUrl;
        }

        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.statusText}`);
        }

        const text = await response.text();
        const normalizedText = rewriteRelativeImagePaths(text, path, assetBaseUrl);

        if (isMounted) {
          setContent(normalizedText);
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

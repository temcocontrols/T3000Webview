/**
 * Documentation Content Area
 * Renders markdown content
 */

import React, { useEffect, useState } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { Marked } from 'marked';
import { useMarkdownContent } from '../hooks/useMarkdownContent';
import styles from './DocContent.module.css';

interface DocContentProps {
  path: string;
}

export const DocContent: React.FC<DocContentProps> = ({ path }) => {
  const { content, loading, error } = useMarkdownContent(path);
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (content) {
      // Create marked instance
      const marked = new Marked({
        gfm: true,
        breaks: true,
      });

      // Parse markdown to HTML
      const parsedHtml = marked.parse(content) as string;
      setHtml(parsedHtml);
    }
  }, [content]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="medium" label="Loading documentation..." />
      </div>
    );
  }

  if (error) {
    const errorPath = path.startsWith('legacy/')
      ? `/docs/${path.replace('legacy/', '')}`
      : `/docs/${path}.md`;

    return (
      <div className={styles.error}>
        <Text weight="semibold" size={500}>Error loading documentation</Text>
        <Text size={300}>{error.message}</Text>
        <Text size={200} className={styles.errorHint}>
          Make sure the markdown file exists at: {errorPath}
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div
        className={styles.markdown}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

/**
 * Documentation Content Area
 * Renders markdown content with User Guide / Technical tabs
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { Marked } from 'marked';
import { useMarkdownContent } from '../hooks/useMarkdownContent';
import styles from './DocContent.module.css';

interface DocContentProps {
  path: string;
}

type DocMode = 'user' | 'technical';

interface ParsedContent {
  hasUserGuide: boolean;
  hasTechnical: boolean;
  userGuideHtml: string;
  technicalHtml: string;
  fullHtml: string;
}

export const DocContent: React.FC<DocContentProps> = ({ path }) => {
  const { content, loading, error } = useMarkdownContent(path);
  const [mode, setMode] = useState<DocMode>('user');

  const parsedContent = useMemo<ParsedContent>(() => {
    if (!content) {
      return {
        hasUserGuide: false,
        hasTechnical: false,
        userGuideHtml: '',
        technicalHtml: '',
        fullHtml: '',
      };
    }

    // Check for section markers
    const hasUserGuide = content.includes('<!-- USER-GUIDE -->');
    const hasTechnical = content.includes('<!-- TECHNICAL -->');

    const marked = new Marked({
      gfm: true,
      breaks: true,
    });

    if (!hasUserGuide && !hasTechnical) {
      // No sections, render all content
      return {
        hasUserGuide: false,
        hasTechnical: false,
        userGuideHtml: '',
        technicalHtml: '',
        fullHtml: marked.parse(content) as string,
      };
    }

    // Extract user guide section
    let userGuideContent = '';
    if (hasUserGuide) {
      const userGuideMatch = content.match(/<!-- USER-GUIDE -->([\s\S]*?)<!-- \/USER-GUIDE -->/);
      if (userGuideMatch) {
        userGuideContent = userGuideMatch[1].trim();
      }
    }

    // Extract technical section
    let technicalContent = '';
    if (hasTechnical) {
      const technicalMatch = content.match(/<!-- TECHNICAL -->([\s\S]*?)<!-- \/TECHNICAL -->/);
      if (technicalMatch) {
        technicalContent = technicalMatch[1].trim();
      }
    }

    return {
      hasUserGuide,
      hasTechnical,
      userGuideHtml: userGuideContent ? marked.parse(userGuideContent) as string : '',
      technicalHtml: technicalContent ? marked.parse(technicalContent) as string : '',
      fullHtml: marked.parse(content) as string,
    };
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

  const showTabs = parsedContent.hasUserGuide || parsedContent.hasTechnical;
  const htmlToRender = showTabs
    ? (mode === 'user' ? parsedContent.userGuideHtml : parsedContent.technicalHtml)
    : parsedContent.fullHtml;

  return (
    <div className={styles.content}>
      {showTabs && (
        <div className={styles.docTabs}>
          <button
            className={`${styles.docTab} ${mode === 'user' ? styles.docTabActive : ''}`}
            onClick={() => setMode('user')}
            disabled={!parsedContent.hasUserGuide}
          >
            <span className={styles.docTabIcon}>👤</span>
            <span>User Guide</span>
          </button>
          <button
            className={`${styles.docTab} ${mode === 'technical' ? styles.docTabActive : ''}`}
            onClick={() => setMode('technical')}
            disabled={!parsedContent.hasTechnical}
          >
            <span className={styles.docTabIcon}>⚡</span>
            <span>Technical</span>
          </button>
        </div>
      )}
      <div
        className={styles.markdown}
        dangerouslySetInnerHTML={{ __html: htmlToRender }}
      />
    </div>
  );
};

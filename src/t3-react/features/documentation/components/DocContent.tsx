/**
 * Documentation Content Area
 * Renders markdown content with User Guide / Technical tabs
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { Marked } from 'marked';
import { useMarkdownContent } from '../hooks/useMarkdownContent';
import { ControlMessagesPage } from './ControlMessagesPage';
import { DeviceSettingsExample } from './DeviceSettingsExample';
import { DOCS_CONFIG } from '@t3-react/config/constants';
import styles from './DocContent.module.css';

interface DocContentProps {
  path: string;
  onNavigate?: (path: string) => void;
}

type DocMode = 'user' | 'technical' | 'example';

interface ParsedContent {
  hasUserGuide: boolean;
  hasTechnical: boolean;
  hasExample: boolean;
  userGuideHtml: string;
  technicalHtml: string;
  fullHtml: string;
}

/**
 * Resolve a relative markdown link (e.g. "03-editing-screens.md", "../README.md")
 * against the path of the document it appears in, and return the documentation
 * path used by the viewer/route (always prefixed with "t3000/").
 *
 * Absolute URLs, mailto:, in-page anchors and root-relative paths are not
 * touched — they should keep their default browser behaviour.
 */
function resolveDocPath(currentPath: string, href: string): string | null {
  const target = href.split('#')[0].split('?')[0].trim();
  if (!target) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null; // http:, https:, mailto:, ...
  if (target.startsWith('/') || target.startsWith('#')) return null;

  // Only markdown pages are routed through the viewer; links to other assets
  // (png, pdf, zip, ...) keep their default browser behaviour.
  const extension = target.match(/\.([a-z0-9]+)$/i);
  if (extension && extension[1].toLowerCase() !== 'md') return null;

  const withoutExt = target.replace(/\.md$/i, '');
  const baseDir = currentPath.split('/').slice(0, -1);
  const parts = [...baseDir, ...withoutExt.split('/')];

  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  const docPath = resolved.join('/');
  if (!docPath) return null;
  return docPath.startsWith('t3000/') ? docPath : `t3000/${docPath}`;
}

/**
 * Slug used for heading anchors, so documents can link to a section with
 * `[text](#some-heading)` exactly like they do on GitHub.
 */
function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Give every heading an id so in-page `#anchor` links have something to scroll to. */
function addHeadingAnchors(html: string): string {
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (match, level, inner) => {
    if (/id=/.test(match)) return match;
    return `<h${level} id="${slugify(inner)}">${inner}</h${level}>`;
  });
}

/**
 * External links (http/https) open in a new tab. Internal documentation links
 * are left untouched — those are routed by the click handler below.
 */
function externalLinksInNewTab(html: string): string {
  return html.replace(
    /<a\s+href="(https?:\/\/[^"]+)"/gi,
    '<a target="_blank" rel="noopener noreferrer" href="$1"'
  );
}

/** Post-processing applied to every rendered markdown document. */
function processMarkdownHtml(html: string): string {
  return externalLinksInNewTab(addHeadingAnchors(html));
}

export const DocContent: React.FC<DocContentProps> = ({ path, onNavigate }) => {
  const { content, loading, error } = useMarkdownContent(path);
  const [mode, setMode] = useState<DocMode>('user');

  // Markdown is injected as raw HTML, so relative links would otherwise be
  // resolved by the browser against the app URL (e.g. "/03-editing-screens.md").
  // Intercept them and route to the matching documentation page instead.
  const handleMarkdownClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return;
    const anchor = (event.target as HTMLElement).closest?.('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // In-page links ("#some-heading") must be handled here: a raw hash would be
    // interpreted as a route change by the HashRouter and break navigation.
    if (href.startsWith('#')) {
      event.preventDefault();
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const docPath = resolveDocPath(path, href);
    if (!docPath) return;

    event.preventDefault();
    onNavigate(docPath);
  };  const parsedContent = useMemo<ParsedContent>(() => {
    if (!content) {
      return {
        hasUserGuide: false,
        hasTechnical: false,
        hasExample: false,
        userGuideHtml: '',
        technicalHtml: '',
        fullHtml: '',
      };
    }

    // Check for section markers
    const hasUserGuide = content.includes('<!-- USER-GUIDE -->');
    const hasTechnical = content.includes('<!-- TECHNICAL -->');
    const hasExample = path === 't3000/building-platform/device-settings-structure';

    // Standard markdown (and GitHub) treats a single newline as a space, so
    // hard-wrapped source lines reflow into one full-width paragraph. With
    // `breaks: true` every wrapped line became a <br>, which made wrapped docs
    // render as a ragged column that only filled part of the content area.
    const marked = new Marked({
      gfm: true,
      breaks: false,
    });

    if (!hasUserGuide && !hasTechnical) {
      // No sections, render all content
      return {
        hasUserGuide: false,
        hasTechnical: false,
        hasExample,
        userGuideHtml: '',
        technicalHtml: '',
        fullHtml: processMarkdownHtml(marked.parse(content) as string),
      };
    }

    // Extract user guide section
    let userGuideContent = '';
    if (hasUserGuide) {
      if (hasTechnical) {
        // Extract content between USER-GUIDE and TECHNICAL
        const userGuideMatch = content.match(/<!-- USER-GUIDE -->([\s\S]*?)<!-- TECHNICAL -->/);
        if (userGuideMatch) {
          userGuideContent = userGuideMatch[1].trim();
        }
      } else {
        // No technical section, take everything after USER-GUIDE
        const userGuideMatch = content.match(/<!-- USER-GUIDE -->([\s\S]*)/);
        if (userGuideMatch) {
          userGuideContent = userGuideMatch[1].trim();
        }
      }
    }

    // Extract technical section
    let technicalContent = '';
    if (hasTechnical) {
      // Take everything after TECHNICAL marker
      const technicalMatch = content.match(/<!-- TECHNICAL -->([\s\S]*)/);
      if (technicalMatch) {
        technicalContent = technicalMatch[1].trim();
      }
    }

    return {
      hasUserGuide,
      hasTechnical,
      hasExample,
      userGuideHtml: userGuideContent ? processMarkdownHtml(marked.parse(userGuideContent) as string) : '',
      technicalHtml: technicalContent ? processMarkdownHtml(marked.parse(technicalContent) as string) : '',
      fullHtml: processMarkdownHtml(marked.parse(content) as string),
    };
  }, [content, path]);

  // Show custom Control Messages component for the message index
  if (path === 't3000/building-platform/control-messages/message-index' && onNavigate) {
    return <ControlMessagesPage onNavigate={onNavigate} />;
  }

  if (loading) {
    return (
      <div className={styles.contentLoading}>
        <div className={styles.loading}>
          <Spinner size="tiny" />
          <Text size={200} weight="regular">Loading documentation...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    const normalized = path.startsWith('legacy/') ? path.replace('legacy/', '') : path;
    const markdownPath = normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
    const localPath = `${DOCS_CONFIG.baseUrl}/${markdownPath}`;
    const githubPath = `${DOCS_CONFIG.githubRawUrl}/${markdownPath}`;

    return (
      <div className={styles.error}>
        <Text weight="semibold" size={500}>Error loading documentation</Text>
        <Text size={300}>{error.message}</Text>
        <Text size={200} className={styles.errorHint}>
          Tried local: {localPath}
        </Text>
        <Text size={200} className={styles.errorHint}>
          Tried GitHub fallback: {githubPath}
        </Text>
      </div>
    );
  }

  const showTabs = parsedContent.hasUserGuide || parsedContent.hasTechnical || parsedContent.hasExample;

  let contentToRender;
  if (mode === 'example' && parsedContent.hasExample) {
    contentToRender = <DeviceSettingsExample />;
  } else {
    const htmlToRender = showTabs
      ? (mode === 'user' ? parsedContent.userGuideHtml : parsedContent.technicalHtml)
      : parsedContent.fullHtml;
    contentToRender = (
      <div
        className={styles.markdown}
        onClick={handleMarkdownClick}
        dangerouslySetInnerHTML={{ __html: htmlToRender }}
      />
    );
  }

  return (
    <div className={styles.content}>
      {showTabs && (
        <div className={styles.docTabs}>
          <button
            className={`${styles.docTab} ${mode === 'user' ? styles.docTabActive : ''}`}
            onClick={() => setMode('user')}
            disabled={!parsedContent.hasUserGuide}
          >
            <span className={styles.docTabIcon}>☰</span>
            <span>Overview</span>
          </button>
          {parsedContent.hasTechnical && (
            <button
              className={`${styles.docTab} ${mode === 'technical' ? styles.docTabActive : ''}`}
              onClick={() => setMode('technical')}
            >
              <span className={styles.docTabIcon}>&lt;/&gt;</span>
              <span>Developer</span>
            </button>
          )}
          {parsedContent.hasExample && (
            <button
              className={`${styles.docTab} ${mode === 'example' ? styles.docTabActive : ''}`}
              onClick={() => setMode('example')}
            >
              <span className={styles.docTabIcon}>○</span>
              <span>Example</span>
            </button>
          )}
        </div>
      )}
      {contentToRender}
    </div>
  );
};

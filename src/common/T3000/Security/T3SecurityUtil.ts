/**
 * T3000 Security Utilities
 * Provides secure handling of HTML content and data sanitization
 */

import DOMPurify from 'dompurify';

/**
 * Security utility class for T3000 system
 */
export class T3SecurityUtil {
  private static instance: T3SecurityUtil;

  private constructor() {
    this.initializeDOMPurify();
  }

  public static getInstance(): T3SecurityUtil {
    if (!T3SecurityUtil.instance) {
      T3SecurityUtil.instance = new T3SecurityUtil();
    }
    return T3SecurityUtil.instance;
  }

  /**
   * Initialize DOMPurify with T3000-specific configuration
   */
  private initializeDOMPurify(): void {
    // Configure DOMPurify for SVG content
    DOMPurify.addHook('beforeSanitizeElements', (node) => {
      // Allow SVG elements but sanitize dangerous attributes
      if (node.nodeName && node.nodeName.match(/svg|foreignObject|g|path|circle|rect|line|text/i)) {
        return node;
      }
    });

    DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
      // Remove dangerous event handlers
      if (node.hasAttribute('onclick')) {
        node.removeAttribute('onclick');
      }
      if (node.hasAttribute('onload')) {
        node.removeAttribute('onload');
      }
      if (node.hasAttribute('onerror')) {
        node.removeAttribute('onerror');
      }
    });
  }

  /**
   * Sanitize HTML content for safe injection
   * @param html Raw HTML content
   * @param allowSVG Whether to allow SVG elements
   * @returns Sanitized HTML content
   */
  public sanitizeHTML(html: string, allowSVG: boolean = true): string {
    const config = {
      ALLOWED_TAGS: allowSVG
        ? ['svg', 'g', 'path', 'circle', 'rect', 'line', 'text', 'foreignObject', 'div', 'span', 'p', 'br']
        : ['div', 'span', 'p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: allowSVG
        ? ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'class', 'id', 'style']
        : ['class', 'id', 'style'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link'],
      USE_PROFILES: { html: true, svg: allowSVG, svgFilters: false }
    };

    return DOMPurify.sanitize(html, config);
  }

  /**
   * Sanitize SVG content specifically for T3000 shapes
   * @param svgContent Raw SVG content
   * @returns Sanitized SVG content
   */
  public sanitizeSVG(svgContent: string): string {
    const config = {
      ALLOWED_TAGS: [
        'svg', 'g', 'path', 'circle', 'rect', 'line', 'text', 'tspan',
        'defs', 'marker', 'use', 'symbol', 'clipPath', 'mask'
      ],
      ALLOWED_ATTR: [
        'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
        'width', 'height', 'fill', 'stroke', 'stroke-width',
        'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
        'transform', 'class', 'id', 'viewBox', 'xmlns',
        'marker-start', 'marker-end', 'clip-path', 'mask'
      ],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style'],
      FORBID_TAGS: ['script', 'foreignObject', 'iframe'],
      USE_PROFILES: { svg: true, svgFilters: true }
    };

    return DOMPurify.sanitize(svgContent, config);
  }

  /**
   * Validate and sanitize user input
   * @param input Raw user input
   * @param type Input type ('text', 'number', 'email', etc.)
   * @returns Sanitized and validated input
   */
  public validateInput(input: string, type: 'text' | 'number' | 'email' | 'filename' = 'text'): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

    switch (type) {
      case 'number':
        sanitized = sanitized.replace(/[^0-9.-]/g, '');
        break;
      case 'email':
        sanitized = sanitized.replace(/[^a-zA-Z0-9@._-]/g, '');
        break;
      case 'filename':
        sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
        break;
      case 'text':
      default:
        // Allow basic text characters, remove potential XSS vectors
        sanitized = this.sanitizeHTML(sanitized, false);
        break;
    }

    return sanitized.trim();
  }

  /**
   * Secure innerHTML replacement
   * @param element Target DOM element
   * @param content HTML content to set
   * @param allowSVG Whether to allow SVG content
   */
  public safeSetInnerHTML(element: HTMLElement, content: string, allowSVG: boolean = false): void {
    if (!element || typeof content !== 'string') {
      return;
    }

    const sanitizedContent = this.sanitizeHTML(content, allowSVG);
    element.innerHTML = sanitizedContent;
  }

  /**
   * Generate secure random ID
   * @param prefix Optional prefix for the ID
   * @returns Secure random ID
   */
  public generateSecureId(prefix: string = 't3'): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}_${randomString}`;
  }

  /**
   * Validate file upload security
   * @param file File object
   * @param allowedTypes Array of allowed MIME types
   * @param maxSize Maximum file size in bytes
   * @returns Validation result
   */
  public validateFile(file: File, allowedTypes: string[] = [], maxSize: number = 10 * 1024 * 1024): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` };
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs'];
    const fileName = file.name.toLowerCase();
    const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));

    if (hasDangerousExtension) {
      return { valid: false, error: 'Dangerous file extension detected' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const T3Security = T3SecurityUtil.getInstance();

// Legacy compatibility
export default T3Security;

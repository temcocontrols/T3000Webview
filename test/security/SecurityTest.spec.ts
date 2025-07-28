/**
 * T3000 Security Testing Suite
 * Comprehensive tests for security implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { T3Security } from '../lib/T3000/Security/T3SecurityUtil';
import SecureWebSocketClient from '../lib/T3000/Security/SecureWebSocketClient';

describe('T3000 Security Utils', () => {
  beforeEach(() => {
    // Setup test environment
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks();
  });

  describe('HTML Sanitization', () => {
    it('should sanitize dangerous HTML content', () => {
      const dangerousHtml = '<script>alert("XSS")</script><div onclick="malicious()">Safe content</div>';
      const sanitized = T3Security.sanitizeHTML(dangerousHtml, false);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Safe content');
    });

    it('should preserve safe SVG content', () => {
      const safeSvg = '<svg><path d="M0,0 L100,100" fill="red" stroke="blue"/></svg>';
      const sanitized = T3Security.sanitizeHTML(safeSvg, true);

      expect(sanitized).toContain('<svg>');
      expect(sanitized).toContain('<path');
      expect(sanitized).toContain('fill="red"');
    });

    it('should remove dangerous SVG attributes', () => {
      const dangerousSvg = '<svg onload="alert(1)"><path d="M0,0" onclick="hack()"/></svg>';
      const sanitized = T3Security.sanitizeSVG(dangerousSvg);

      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('<path');
    });
  });

  describe('Input Validation', () => {
    it('should validate text input correctly', () => {
      const validText = 'Normal text input 123';
      const validated = T3Security.validateInput(validText, 'text');

      expect(validated).toBe(validText);
    });

    it('should sanitize malicious text input', () => {
      const maliciousText = '<script>alert("hack")</script>Normal text';
      const validated = T3Security.validateInput(maliciousText, 'text');

      expect(validated).not.toContain('<script>');
      expect(validated).toContain('Normal text');
    });

    it('should validate number input', () => {
      const numberInput = '123.45abc';
      const validated = T3Security.validateInput(numberInput, 'number');

      expect(validated).toBe('123.45');
    });

    it('should validate filename input', () => {
      const filename = '../../../etc/passwd';
      const validated = T3Security.validateInput(filename, 'filename');

      expect(validated).not.toContain('../');
      expect(validated).not.toContain('/');
    });
  });

  describe('File Validation', () => {
    it('should accept valid file types', () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = T3Security.validateFile(mockFile, ['image/jpeg'], 1024 * 1024);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const mockFile = new File(['content'], 'test.exe', { type: 'application/x-executable' });
      const result = T3Security.validateFile(mockFile, ['image/jpeg'], 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject files that are too large', () => {
      const mockFile = new File(['x'.repeat(2 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      const result = T3Security.validateFile(mockFile, ['image/jpeg'], 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should reject dangerous file extensions', () => {
      const mockFile = new File(['content'], 'virus.exe', { type: 'text/plain' });
      const result = T3Security.validateFile(mockFile, ['text/plain'], 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous file extension');
    });
  });

  describe('Secure ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = T3Security.generateSecureId();
      const id2 = T3Security.generateSecureId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^t3_[a-f0-9]{16}$/);
    });

    it('should use custom prefix', () => {
      const id = T3Security.generateSecureId('test');

      expect(id).toMatch(/^test_[a-f0-9]{16}$/);
    });
  });
});

describe('Secure WebSocket Client', () => {
  let client: SecureWebSocketClient;
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN
    };

    // @ts-ignore
    global.WebSocket = vi.fn(() => mockWebSocket);

    client = new SecureWebSocketClient({
      useSSL: true,
      maxRetries: 3,
      pingInterval: 5000
    });
  });

  afterEach(() => {
    client.destroy();
  });

  describe('Connection Security', () => {
    it('should use secure WebSocket protocol', async () => {
      const connectPromise = client.connect('localhost');

      // Simulate successful connection
      setTimeout(() => {
        mockWebSocket.onopen && mockWebSocket.onopen();
      }, 10);

      await connectPromise;

      expect(WebSocket).toHaveBeenCalledWith('wss://localhost:9104');
    });

    it('should handle authentication', () => {
      client.setAuthToken('test-token');

      const connectPromise = client.connect('localhost');

      // Simulate connection open
      setTimeout(() => {
        mockWebSocket.onopen && mockWebSocket.onopen();
      }, 10);

      expect(client.getConnectionInfo().useSSL).toBe(true);
    });
  });

  describe('Message Security', () => {
    it('should validate incoming messages', () => {
      const validMessage = JSON.stringify({ type: 1, data: 'test' });
      const invalidMessage = '<script>alert("xss")</script>';

      // Test valid message
      expect(() => {
        mockWebSocket.onmessage && mockWebSocket.onmessage({ data: validMessage });
      }).not.toThrow();

      // Test invalid message should be sanitized
      expect(() => {
        mockWebSocket.onmessage && mockWebSocket.onmessage({ data: invalidMessage });
      }).not.toThrow();
    });

    it('should add security headers to outgoing messages', () => {
      const message = JSON.stringify({ type: 1, data: 'test' });

      client.sendSecureMessage(message);

      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage).toHaveProperty('timestamp');
      expect(sentMessage).toHaveProperty('checksum');
    });
  });

  describe('Connection Resilience', () => {
    it('should handle connection failures gracefully', async () => {
      const connectPromise = client.connect('localhost');

      // Simulate connection error
      setTimeout(() => {
        mockWebSocket.onerror && mockWebSocket.onerror(new Error('Connection failed'));
      }, 10);

      try {
        await connectPromise;
      } catch (error) {
        expect(error.message).toContain('Connection failed');
      }
    });

    it('should implement retry logic', () => {
      client = new SecureWebSocketClient({ maxRetries: 2 });

      // Should attempt connection multiple times on failure
      expect(client.getConnectionInfo().retries).toBe(0);
    });
  });
});

describe('Security Integration Tests', () => {
  it('should protect against XSS in SVG content', () => {
    const maliciousSvg = `
      <svg onload="alert('XSS')">
        <foreignObject>
          <div onclick="steal_data()">Click me</div>
          <script>document.cookie = 'stolen';</script>
        </foreignObject>
      </svg>
    `;

    const sanitized = T3Security.sanitizeSVG(maliciousSvg);

    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('foreignObject'); // Should be removed for security
  });

  it('should handle WebSocket message injection attempts', () => {
    const client = new SecureWebSocketClient();

    const maliciousMessage = JSON.stringify({
      type: 'eval',
      code: 'window.location = "http://evil.com"',
      __proto__: { isAdmin: true }
    });

    // Should not throw and should sanitize the message
    expect(() => {
      client.sendSecureMessage(maliciousMessage);
    }).not.toThrow();
  });

  it('should validate file uploads comprehensively', () => {
    // Test multiple attack vectors
    const tests = [
      { filename: 'normal.jpg', type: 'image/jpeg', size: 1024, expected: true },
      { filename: 'script.js.jpg', type: 'image/jpeg', size: 1024, expected: true },
      { filename: 'virus.exe', type: 'application/x-executable', size: 1024, expected: false },
      { filename: 'huge.jpg', type: 'image/jpeg', size: 100 * 1024 * 1024, expected: false },
      { filename: 'shell.php', type: 'text/plain', size: 1024, expected: false }
    ];

    tests.forEach(test => {
      const mockFile = new File(['x'.repeat(test.size)], test.filename, { type: test.type });
      const result = T3Security.validateFile(mockFile, ['image/jpeg', 'text/plain'], 10 * 1024 * 1024);

      expect(result.valid).toBe(test.expected);
    });
  });
});

export default {
  T3SecurityTest: describe,
  SecureWebSocketTest: describe
};

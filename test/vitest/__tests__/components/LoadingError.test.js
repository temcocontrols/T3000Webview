/**
 * Tests for Loading and Error Components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Quasar } from 'quasar';
import LoadingComponent from '../../../../src/t3-vue/components/Hvac/LoadingComponent.vue';
import ErrorComponent from '../../../../src/t3-vue/components/Hvac/ErrorComponent.vue';

// Mock Quasar components
const mockQuasarComponents = {
  QSpinnerCube: {
    name: 'QSpinnerCube',
    template: '<div class="q-spinner-cube" />'
  },
  QLinearProgress: {
    name: 'QLinearProgress',
    template: '<div class="q-linear-progress" />'
  },
  QIcon: {
    name: 'QIcon',
    template: '<div class="q-icon" />'
  },
  QBtn: {
    name: 'QBtn',
    template: '<button class="q-btn"><slot /></button>'
  },
  QExpansionItem: {
    name: 'QExpansionItem',
    template: '<div class="q-expansion-item"><slot /></div>'
  }
};

const createWrapper = (Component, props = {}) => {
  return mount(Component, {
    props,
    global: {
      plugins: [Quasar],
      components: mockQuasarComponents
    }
  });
};

describe('LoadingComponent', () => {
  it('should render with default props', () => {
    const wrapper = createWrapper(LoadingComponent);

    expect(wrapper.find('.loading-component').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    expect(wrapper.find('.loading-text').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading...');
  });

  it('should render custom message', () => {
    const wrapper = createWrapper(LoadingComponent, {
      message: 'Custom loading message'
    });

    expect(wrapper.text()).toContain('Custom loading message');
  });

  it('should show progress when enabled', () => {
    const wrapper = createWrapper(LoadingComponent, {
      showProgress: true,
      progress: 75
    });

    expect(wrapper.find('.loading-progress').exists()).toBe(true);
    expect(wrapper.text()).toContain('75%');
  });

  it('should apply compact class', () => {
    const wrapper = createWrapper(LoadingComponent, {
      compact: true
    });

    expect(wrapper.find('.loading-component.compact').exists()).toBe(true);
  });

  it('should apply fullscreen class', () => {
    const wrapper = createWrapper(LoadingComponent, {
      fullscreen: true
    });

    expect(wrapper.find('.loading-component.fullscreen').exists()).toBe(true);
  });

  it('should show details when provided', () => {
    const wrapper = createWrapper(LoadingComponent, {
      details: 'Loading additional resources...'
    });

    expect(wrapper.find('.loading-details').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading additional resources...');
  });

  it('should not show details in compact mode', () => {
    const wrapper = createWrapper(LoadingComponent, {
      details: 'Some details',
      compact: true
    });

    expect(wrapper.find('.loading-details').exists()).toBe(false);
  });

  it('should use custom spinner when specified', () => {
    const wrapper = createWrapper(LoadingComponent, {
      customSpinner: true
    });

    expect(wrapper.find('.custom-spinner').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(false);
  });

  it('should use slot content for message', () => {
    const wrapper = mount(LoadingComponent, {
      slots: {
        message: '<div class="custom-message">Custom slot message</div>'
      },
      global: {
        plugins: [Quasar],
        components: mockQuasarComponents
      }
    });

    expect(wrapper.find('.custom-message').exists()).toBe(true);
    expect(wrapper.text()).toContain('Custom slot message');
  });
});

describe('ErrorComponent', () => {
  it('should render with default props', () => {
    const wrapper = createWrapper(ErrorComponent);

    expect(wrapper.find('.error-component').exists()).toBe(true);
    expect(wrapper.find('.error-icon').exists()).toBe(true);
    expect(wrapper.find('.error-title').exists()).toBe(true);
    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.text()).toContain('Something went wrong');
  });

  it('should render custom title and message', () => {
    const wrapper = createWrapper(ErrorComponent, {
      title: 'Custom Error Title',
      message: 'Custom error message'
    });

    expect(wrapper.text()).toContain('Custom Error Title');
    expect(wrapper.text()).toContain('Custom error message');
  });

  it('should show retry button when enabled', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showRetry: true
    });

    const retryButton = wrapper.find('.error-actions .q-btn');
    expect(retryButton.exists()).toBe(true);
    expect(retryButton.text()).toContain('Try Again');
  });

  it('should emit retry event when retry button clicked', async () => {
    const wrapper = createWrapper(ErrorComponent, {
      showRetry: true
    });

    const retryButton = wrapper.find('.error-actions .q-btn');
    await retryButton.trigger('click');

    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('should show error details when enabled', () => {
    const error = new Error('Test error message');
    const wrapper = createWrapper(ErrorComponent, {
      showDetails: true,
      error: error
    });

    expect(wrapper.find('.error-details').exists()).toBe(true);
    expect(wrapper.find('.q-expansion-item').exists()).toBe(true);
  });

  it('should format error object correctly', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const wrapper = createWrapper(ErrorComponent, {
      showDetails: true,
      error: error
    });

    expect(wrapper.text()).toContain('Error: Test error');
  });

  it('should format string error correctly', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showDetails: true,
      error: 'Simple error message'
    });

    expect(wrapper.text()).toContain('Simple error message');
  });

  it('should show reload button when enabled', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showReload: true
    });

    expect(wrapper.text()).toContain('Reload Page');
  });

  it('should show go back button when enabled', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showGoBack: true
    });

    expect(wrapper.text()).toContain('Go Back');
  });

  it('should apply compact class', () => {
    const wrapper = createWrapper(ErrorComponent, {
      compact: true
    });

    expect(wrapper.find('.error-component.compact').exists()).toBe(true);
  });

  it('should apply fullscreen class', () => {
    const wrapper = createWrapper(ErrorComponent, {
      fullscreen: true
    });

    expect(wrapper.find('.error-component.fullscreen').exists()).toBe(true);
  });

  it('should use custom icon when specified', () => {
    const wrapper = createWrapper(ErrorComponent, {
      customIcon: true
    });

    expect(wrapper.find('.custom-icon').exists()).toBe(true);
    expect(wrapper.find('.error-icon').exists()).toBe(false);
  });

  it('should use slot content for message', () => {
    const wrapper = mount(ErrorComponent, {
      slots: {
        message: '<div class="custom-error-message">Custom error slot</div>'
      },
      global: {
        plugins: [Quasar],
        components: mockQuasarComponents
      }
    });

    expect(wrapper.find('.custom-error-message').exists()).toBe(true);
    expect(wrapper.text()).toContain('Custom error slot');
  });

  it('should handle retry with loading state', async () => {
    const wrapper = createWrapper(ErrorComponent, {
      showRetry: true
    });

    const retryButton = wrapper.find('.error-actions .q-btn');
    await retryButton.trigger('click');

    // Check if loading state is handled (would need to mock the actual loading behavior)
    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('should handle custom retry text', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showRetry: true,
      retryText: 'Retry Now'
    });

    expect(wrapper.text()).toContain('Retry Now');
  });

  it('should handle custom reload text', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showReload: true,
      reloadText: 'Refresh Page'
    });

    expect(wrapper.text()).toContain('Refresh Page');
  });

  it('should handle custom go back text', () => {
    const wrapper = createWrapper(ErrorComponent, {
      showGoBack: true,
      goBackText: 'Back to Previous'
    });

    expect(wrapper.text()).toContain('Back to Previous');
  });

  it('should render slot content for actions', () => {
    const wrapper = mount(ErrorComponent, {
      slots: {
        actions: '<button class="custom-action">Custom Action</button>'
      },
      global: {
        plugins: [Quasar],
        components: mockQuasarComponents
      }
    });

    expect(wrapper.find('.custom-action').exists()).toBe(true);
    expect(wrapper.text()).toContain('Custom Action');
  });
});

describe('Component Integration', () => {
  it('should work together in async component loading scenario', async () => {
    // Simulate async component loading with LoadingComponent
    const loadingWrapper = createWrapper(LoadingComponent, {
      message: 'Loading component...',
      showProgress: true,
      progress: 50
    });

    expect(loadingWrapper.text()).toContain('Loading component...');
    expect(loadingWrapper.text()).toContain('50%');

    // Simulate error scenario with ErrorComponent
    const errorWrapper = createWrapper(ErrorComponent, {
      title: 'Component Load Failed',
      message: 'Failed to load the requested component',
      showRetry: true,
      showDetails: true,
      error: new Error('Network timeout')
    });

    expect(errorWrapper.text()).toContain('Component Load Failed');
    expect(errorWrapper.text()).toContain('Failed to load the requested component');
    expect(errorWrapper.find('.error-actions .q-btn').exists()).toBe(true);
  });

  it('should handle responsive design classes', () => {
    const loadingWrapper = createWrapper(LoadingComponent, {
      compact: true,
      fullscreen: false
    });

    const errorWrapper = createWrapper(ErrorComponent, {
      compact: false,
      fullscreen: true
    });

    expect(loadingWrapper.classes()).toContain('compact');
    expect(errorWrapper.classes()).toContain('fullscreen');
  });
});

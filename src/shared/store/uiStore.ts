// Re-export all stores from t3-react — allows t3-mobile to import
// from @t3-shared/store/* without coupling directly to t3-react internals.
// When stores are eventually moved physically, only this file changes.
export * from '@t3-react/store/uiStore';

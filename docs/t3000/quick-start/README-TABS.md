# Documentation Tabs Feature

## Overview

The documentation system now supports **dual-mode content** - allowing you to separate user-friendly guides from technical developer documentation within the same page.

## How It Works

When you add special HTML comments to your markdown files, the documentation viewer will display tabs at the top:
- ☰ **Overview** - Beginner-friendly, step-by-step instructions
- </> **Developer** - Code examples, API references, advanced configuration

## Usage

### Adding Tabs to a Document

Wrap your content in special comment markers:

```markdown
# Page Title

<!-- USER-GUIDE -->

## User-Friendly Section

Easy-to-understand content goes here:
- Simple explanations
- Step-by-step instructions
- Screenshots and examples
- Troubleshooting tips

<!-- /USER-GUIDE -->

<!-- TECHNICAL -->

## Technical Section

Advanced content for developers:
- Code examples
- API references
- TypeScript interfaces
- Advanced configurations

```typescript
// Code examples work great here
const config = { /* ... */ };
```

<!-- /TECHNICAL -->
```

### Rules

1. **Both sections are optional** - If you don't use markers, content displays normally
2. **Markers are case-sensitive** - Use exactly `<!-- USER-GUIDE -->` and `<!-- TECHNICAL -->`
3. **Must close tags** - Use `<!-- /USER-GUIDE -->` and `<!-- /TECHNICAL -->`
4. **Can be in any order** - USER-GUIDE first or TECHNICAL first, doesn't matter
5. **Standard markdown** - Everything inside the markers is normal markdown

### When to Use Tabs

**Good use cases:**
- ✅ API documentation (user explanation + code examples)
- ✅ Configuration guides (UI instructions + programmatic config)
- ✅ Feature documentation (how to use + how to integrate)
- ✅ Troubleshooting (simple fixes + advanced debugging)

**Not recommended:**
- ❌ Pure tutorial content (just use normal markdown)
- ❌ Single-audience documentation
- ❌ Very short pages (< 200 words)

## Examples

See these files for working examples:
- `docs/t3000/api-reference/rest-api.md` - API documentation with tabs
- `docs/t3000/device-management/device-configuration.md` - Configuration guide with tabs

## Benefits

1. **Single Source of Truth** - Related content stays together
2. **Progressive Disclosure** - Users see what they need
3. **Better Organization** - Clear separation of concerns
4. **Reduced Duplication** - No need for separate doc sets
5. **Easy Navigation** - Switch between modes with one click

## Tips

### For User Guide Content

- Use simple language
- Include screenshots/diagrams
- Provide step-by-step instructions
- Focus on "how to" rather than "how it works"
- Anticipate common questions

### For Technical Content

- Include code examples in multiple languages
- Show full TypeScript interfaces
- Provide curl commands for APIs
- Include error handling examples
- Reference advanced configuration options

## Future Enhancements

Possible additions:
- 📱 **Mobile** tab for mobile-specific instructions
- 🔧 **Admin** tab for administrator configuration
- 🌍 **Integration** tab for third-party integration
- 📊 **Examples** tab for real-world use cases

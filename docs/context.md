# Cafe24 Detail Page Automation Context

## v1.0 Release Complete

### Product Category Detection
- Product/category matching now takes priority over compare target matching.
- `compareTarget` is used only as a final fallback signal.
- Shared product category guide data is applied to auto enhancement and infographic prompts.

### Auto Enhancement
- E and H-M auto-fill prompt rules were finalized for first release.
- H `keyValue` is defined as the buyer-facing core position.
- J `structure` is defined as material, layer, and manufacturing structure.
- K/L/M output rules were tightened for practical confirmation points and use cases.

### HTML Generation
- HTML generation flow remains stable and unchanged in this release.
- Generated HTML continues to use structured product definition and information-summary notes.
- SEO/GEO-oriented constraints for neutral wording, no unsupported claims, and no repeated specs remain active.

### Infographic Generation
- Product category structure library was finalized for the first release.
- Type B structure zooms now branch by product category.
- Insulation icons now branch by product category instead of using a single common rule.
- Every structure library category has a matching structure selection rule.
- Type A source display is generated only when a source value exists.

### SEO/GEO 1st Pass
- Prompts include no-fabrication, no unsupported numbers, no unsupported source, and non-advertising rules.
- Type A image prompt no longer asks for an empty source label.
- Local representative product pipeline test passed for 20 products.

## Backlog

- Validate actual OpenAI output quality with representative products.
- Fine-tune prompts based on real HTML/image outputs.
- Add new product categories and category-specific rules as needed.
- Research image edit request workflow for v1.1 only; v1.0 operation keeps generate-only image flow.

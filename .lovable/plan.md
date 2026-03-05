

## Differences: Original vs Current

Comparing the two images, I can see these layout/proportion issues:

1. **Gift icon position**: In the original, the gift icon sits on its **own line** between the two bold text blocks. In the current design, it's inline with the text.

2. **Text structure**: The original shows a clear separation:
   - Bold text 1: "1 IPHONE 17" (large)
   - Gift icon: own line, ~32px
   - Bold text 2: "Y DUPLICAMOS TU PRIMERA CARGA." (large, separate block)
   
   Current code tries to split text by "BONO" and place the icon inline, which doesn't match.

3. **Button width**: In the original, the CTA button appears slightly narrower/more compact. The current one looks similar but could use `self-start` on desktop to match.

4. **Spacing**: The gap between the dotted divider and the small text ("Registrate y participá:") needs a bit more breathing room in the original.

## Plan

Edit `src/pages/PublicLanding.tsx` in the right-side info section (lines 243-269):

1. **Restructure the bold text + icon layout**: Instead of splitting `promo_text` by "BONO" and placing the icon inline, render the full `promo_text` as bold-text1, then the gift icon on its own line (`block`, ~32px), then `promo_subtitle` as bold-text2. This matches the original's visual hierarchy.

2. **Gift icon on own line**: Change the SVG from conditional inline/block to always `block` with margin (`my-2`), sitting between the two text blocks as a standalone element.

3. **Add small spacing** after the first dotted divider (`margin: "0px 0 15px 0"`) to give breathing room before the small text.

All changes are in `src/pages/PublicLanding.tsx`, lines ~243-269.


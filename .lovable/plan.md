

## Analysis: Reference Image vs Current Design

From the reference image I can identify these exact colors and styles:

**Background**: Warm brown-orange gradient, more saturated and darker than current. Appears to be approximately `#a0500e` to `#7a3a08` range (deeper brown-orange, less yellow).

**Avatar border**: Solid orange border, thicker (~4-5px), color around `#e8871e` (warm orange, not amber with transparency).

**CTA Button**: Light orange/peach background `#f5a623` with rounded corners (rounded-lg), full width on mobile, black text. This looks correct already.

**Dotted divider**: Orange square dots — current looks correct.

**Text colors**: White — correct.

**Footer**: Dark black `#111` — correct.

## Plan

Changes to `src/pages/PublicLanding.tsx`:

1. **Background gradient** — Update to match the deeper, warmer brown-orange tones from the reference:
   - Change from current gradient to something like: `linear-gradient(180deg, #b8600f 0%, #a05010 40%, #8a4009 70%, #6e3008 100%)`

2. **Avatar border** — Change from `border-amber-500/50` (semi-transparent amber) to a solid orange border `border-[#e8871e]` with full opacity, and adjust shadow to match.

3. **CTA Button** — Already close. Ensure it's `self-center` on mobile for full-width centered appearance. The button on mobile in the reference appears wider/full-width with `rounded-xl`.

4. **Pattern opacity** — The patterns in the reference appear slightly more visible. Increase from `opacity-40` to `opacity-50`.

No other structural changes needed — the layout and text styling are already correct.




## Problem

The circular avatar image is stored in the `profiles` table (one per user), so changing it affects ALL landing pages for that user. Each landing page needs its own independent circular image.

## Solution

Add an `avatar_url` column to the `landing_pages` table so each page stores its own image independently.

### Steps

1. **Database migration**: Add `avatar_url` column to `landing_pages` table (nullable text, no default).

2. **Editor (`src/pages/Editor.tsx`)**:
   - Change avatar upload to save to `landing_pages.avatar_url` instead of `profiles.avatar_url`.
   - Load avatar from the landing page record instead of from profiles.
   - Save `avatar_url` in the `savePage` update call.

3. **Public landing (`src/pages/PublicLanding.tsx`)**:
   - Use `page.avatar_url` directly instead of fetching from the `profiles` table.
   - Remove the profiles query for avatar (or keep it only as fallback).

### Migration SQL

```sql
ALTER TABLE public.landing_pages
ADD COLUMN avatar_url text;
```

### Key code changes

- **Editor**: `uploadImage` for "avatar" type writes to `landing_pages` table instead of `profiles`. `fetchData` loads avatar from `page.avatar_url`.
- **PublicLanding**: Replace `profile?.avatar_url` with `page.avatar_url`. Remove or simplify the profiles fetch.


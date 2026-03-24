# User Flows

## Sitter Flow (Primary)

0. Sign in with email/password (Google/Apple deferred to Phase 2)
1. Create session (pet name, pet type, owner name, start date, end date)
2. Session status is computed automatically as `upcoming`, `live`, or `ended`
3. Share link with owner (opens in their browser)
4. From session detail, tap `Capture update` for a specific live session
5. The system camera opens directly, and the sitter can switch between photo/video or flip camera there
6. Or tap `Gallery` to choose an image or video from the library
7. Compose the update with optional caption and optional multiple tags
8. Add to session
9. On success, return to session detail with the new update visible
10. Repeat

Capture is always contextual — the sitter captures *for a specific session*, not from a generic camera tab. The bottom nav has 2 tabs: Sessions and Profile.

Goal: < 3 seconds per upload

---

## Owner Flow

1. Click link (received via SMS/WhatsApp)
2. Opens in browser — no app install required
3. View session timeline (pet name, sitter name, date range)
4. Scroll through newest-first photo/video updates with date and time
5. See optional captions and tags on each update
6. (Optional) revisit later — link is permanent while session is active

No login required

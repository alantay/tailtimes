# User Flows

## Sitter Flow (Primary)

0. Sign in with email/password (Google/Apple deferred to Phase 2)
1. Create session (pet name, pet type, owner name, start date)
2. Share link with owner (copied to clipboard — opens in their browser)
3. From home screen or session detail, tap capture icon for a specific session
4. Instagram-style flow: take photo/video → preview with optional caption → "Send to {ownerName}"
5. Upload instantly (direct to Cloudinary — no server round-trip)
6. On success, return to session detail with new update visible
7. Repeat

Capture is always contextual — the sitter captures *for a specific session*, not from a generic camera tab. The bottom nav has 2 tabs: Sessions and Profile.

Goal: < 3 seconds per upload

---

## Owner Flow

1. Click link (received via SMS/WhatsApp)
2. Opens in browser — no app install required
3. View session timeline (pet name, sitter name, date range)
4. Scroll through photo/video updates in chronological order
5. (Optional) revisit later — link is permanent while session is active

No login required


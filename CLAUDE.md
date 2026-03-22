# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repository is currently empty. When code is added, this file should be updated with:

- Build, test, and development commands
- High-level architecture and code organization
- Key patterns and conventions used in the codebase

## Getting Started

Initialize this repository with your preferred project structure and update this CLAUDE.md accordingly.


# TailTimes – Claude Context

## Product Summary
TailTimes is a mobile-first app for pet sitters to share updates during pet boarding sessions.

It has two main components:
1. Private session feeds (for pet owners via link, no login required)
2. Public sitter profile (portfolio built from past sessions)

The core goal is:
"Make it effortless for sitters to share updates, while automatically building trust and a portfolio."

---

## Target Users
### Primary: Pet Sitters
- Upload photos/videos multiple times per day
- Want low friction (faster than WhatsApp)
- Want to look professional and gain trust

### Secondary: Pet Owners
- View updates via link (no login)
- Want reassurance and visibility

---

## Core Product Principles

### 1. Minimize Friction (MOST IMPORTANT)
- Upload must be < 3 seconds
- Camera-first experience
- No required typing
- No repeated selections

### 2. Default to Private
- All session feeds are private by default
- Public content must be explicitly selected (opt-in)

### 3. Single Source of Truth
- Upload once → used for:
  - Owner updates
  - Portfolio
  - Highlights

### 4. Mobile-First
- Designed primarily for phone usage
- Desktop is secondary

---

## MVP Scope

### Must Have
- Create sitter profile
- Create boarding session
- Upload photo/video updates
- Generate private share link
- View session feed (owner view)

### Nice to Have (NOT MVP)
- Reviews
- Advanced analytics
- Notifications
- AI captions

---

## UX Rules

- Never require login for owners
- Always assume sitter is busy
- Reduce taps wherever possible
- Avoid typing whenever possible

---

## Non-Goals (for now)

- Payments
- Booking system
- Competing with Pawshake directly
- Social network features

---

## Tech Philosophy

- Move fast > perfect architecture
- Simplicity > scalability (for now)
- Optimize for iteration speed

---

## Key Question to Validate

"Will sitters actually use TailTimes daily instead of WhatsApp?"

All decisions should prioritize answering this.
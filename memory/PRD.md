# AI-Powered Personalized Onboarding Assistant (Employee 30-60-90 Day Copilot)

## Architecture
- **Backend**: FastAPI + MongoDB + Gemini 3 Flash (via emergentintegrations)
- **Frontend**: React + Tailwind CSS + shadcn/ui + Framer Motion
- **Auth**: Emergent Google OAuth + Email/Password JWT with RBAC (employee, manager, hr_admin)
- **AI**: Gemini 3 Flash for plan generation and KB Q&A with citations

## User Personas
1. **New Hire (Employee)**: Views personalized 30-60-90 day plan, today's tasks, nudges, training, calendar events, AI chat assistant
2. **Manager**: Views direct reports' progress, can access team view
3. **HR Admin**: Full cohort dashboard, individual deep-dive, human override panel, audit log

## Core Requirements (Static)
- Personalized onboarding plans by role/department/seniority
- AI-powered KB Q&A with source citations
- Today's Top 3 tasks with drip-feed timeline
- Nudge engine for reminders and escalations
- HR Dashboard with cohort progress, compliance, SLA tracking
- Human override panel for HR admins
- Audit logging for all system actions
- Two distinct role journeys (SWE vs Marketing)

## What's Been Implemented (April 3, 2026)
- [x] Full auth system (Google OAuth + email/password + RBAC)
- [x] Employee Dashboard with progress rings, today's tasks, nudges, calendar, training
- [x] 90-Day Plan view with phase tabs and milestone toggle
- [x] AI Chat widget (Gemini 3 Flash) with KB citations
- [x] HR Dashboard with cohort table, stat cards, compliance tracking
- [x] HR Employee Deep-dive with milestone breakdown
- [x] Human Override Panel (complete task, update due date, add note, pause plan)
- [x] Audit Log page
- [x] Onboarding Setup (intake form with AI plan generation)
- [x] Seed data for 2 demo employees (Priya - SWE, Marcus - Marketing)
- [x] 10 KB documents covering all 7 onboarding categories
- [x] Role-specific visual differentiation (blue=SWE, gold=Marketing)

## Prioritized Backlog
### P0 (Done)
- All core features implemented

### P1 (Next Phase)
- Real-time nudge engine (scheduled job to generate nudges based on day-in-journey)
- GDPR data deletion request flow (/settings page)
- Manager-specific view (only direct reports)
- Engagement signals (questions per week, unresolved escalations)

### P2 (Enhancement)
- LangGraph integration for multi-step plan generation
- Real Google Calendar integration
- Real LMS integration (SCORM/xAPI)
- Slack/Teams notification integration
- Email notifications for nudges
- Satisfaction pulse surveys

## Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| priya@example.com | demo123 | employee (SWE) |
| marcus@example.com | demo123 | employee (Marketing) |
| admin@example.com | demo123 | hr_admin |

# HelpXs PRD

**MVP Draft for Stanford Well-Being Coaching**

> ⚠️ **Superseded (v1).** This is the original anonymous tap-fill PRD. The
> codebase now implements the **calendar-integrated v2** PRD
> (`localDocs/HelpXs_PRD.md`, May 2026): Calendly OAuth, pre-session recall,
> pseudonymous token + crosswalk, a pre-filled post-session form, and a minimal
> director dashboard + CSV (the full report generator and demographic fields
> from this v1 doc were dropped). Kept for history.

---

## 1. Product Summary

HelpXs is a privacy-safe web app for Stanford Well-Being Coaching. It works on both desktop and mobile.

Coaches use it to complete a fast tap-fill post-session form. Directors use it to view aggregate trends, generate reports, and manage limited updates to the form structure over time.

The product is designed around one core principle: collect only the structured information needed for reporting and trend analysis, while avoiding direct student identifiers and detailed sensitive notes.

---

## 2. Users and Access

### Coach
- Logs in to submit post-session entries.
- Can create, review, and submit session records.
- Cannot access aggregate dashboards, reports, or form settings.

### Director / Admin
- Logs in to view aggregate trends and generate reports.
- Can update allowed parts of the tap-fill form.
- Cannot see direct student identity because the system does not store it.

### Role assignment
- **Prototype:** users choose Coach or Director at sign-up.
- **Real deployment:** role should be assigned or approved by an admin.

---

## 3. Problem Statement

The current PSAT workflow is manual and time-consuming for coaches. At the same time, the program depends on clean structured data for donor reporting, trend analysis, and program management. Any new tool must also stay within strict privacy boundaries and avoid storing direct student identifiers or overly detailed narrative notes.

---

## 4. Product Goals

1. Reduce coach documentation time after each session.
2. Improve consistency and completeness of structured session data.
3. Make weekly, monthly, and quarterly reporting much faster for directors.
4. Keep the workflow privacy-safe by excluding direct student identifiers.
5. Allow limited form customization without breaking reporting quality.

---

## 5. MVP Scope

### In scope
- Secure login for coaches and directors
- Role-based access control
- Responsive web app for desktop and mobile
- Default tap-fill post-session form
- Director dashboard for aggregate reporting
- Weekly, monthly, and quarterly report generation
- Director-managed form customization within guardrails

### Out of scope
- Student-level profile pages or case history
- Scheduling or intake management
- Audio recording, transcript storage, or raw note upload
- Long-form narrative documentation
- Clinical documentation or EHR-style workflows
- A fully open-ended form builder

---

## 6. Core Product Concept

HelpXs has two main workflows. The coach workflow is a short tap-fill session entry flow built for speed. The director workflow is an aggregate dashboard and report generation layer built on anonymized session data. A third admin layer lets directors make limited changes to the form so it can evolve with the program.

---

## 7. Form Design

### Fixed core fields
- Session date
- Session occurred
- Session type
- Session format
- Gender
- Age range
- Degree level
- Main topic(s)
- Intervention(s) used
- Referral made or not

These core fields form the reporting backbone. They should remain in the system and should not be fully removed by directors.

### Director-configurable elements
- Add, remove, rename, or reorder options inside existing fields such as topics, interventions, or degree level
- Mark certain non-core questions as required or optional
- Add one new structured question type when needed, such as single select, multi-select, yes/no, rating scale, or short structured text
- Choose whether a custom question should appear in reporting

### Guardrails
- Directors cannot delete protected core fields.
- Directors cannot add direct student identifiers such as name, student ID, email, or phone number.
- Directors cannot add unrestricted long-form note sections, transcript uploads, or raw audio.

---

## 8. Data Fields

### Allowed data
- Low-risk demographic fields such as gender, age range, and degree level
- Session-level structured fields about topics, interventions, referrals, and format
- Coach ID and submission timestamp for operational tracking

### Excluded data
- Student name
- Student ID
- Email or phone number
- Detailed personal narrative
- Raw handwritten notes
- Audio files or transcripts

---

## 9. Data Model Approach

Because the form can change over time, the system should separate core fields from custom fields and use form versioning.

- Each published form has a version number.
- Each submission stores the form version used at the time of submission.
- Historical submissions stay tied to their original version.
- Core fields remain comparable over time even if custom fields change.

---

## 10. Functional Requirements

### Coach workflow
- Log in and start a new session entry
- Complete the form mainly through taps, dropdowns, and multi-select choices
- Review before submitting
- Finish a normal entry in under 3 minutes

### Director workflow
- Log in to a separate dashboard experience
- View aggregate trends by week, month, and quarter
- Generate exportable summaries for meetings and fundraising
- Update allowed form options without engineering support

### System requirements
- Responsive on desktop and mobile
- Role-based page access
- No direct student identifiers stored in the reporting workflow

---

## 11. Prototype Screens

| Coach | Director / Admin |
|---|---|
| Login / sign-up | Login / sign-up |
| Coach home | Director dashboard |
| New session entry | Report generation page |
| Review and submit | Form settings page |
| Submission confirmation | Add / edit question modal |

---

## 12. Success Metrics

- Average coach completion time per session entry is under 3 minutes
- Required field completion remains high
- Directors can generate a useful report in under 5 minutes
- Form changes do not break historical reporting
- No direct student-identifying information is stored

---

## 13. Open Questions

- Which demographic fields are acceptable to keep by default?
- Should short structured text be included in the MVP or excluded entirely?
- Should directors be allowed to add only one custom question in MVP, or more than one?
- Which exports matter most: dashboard view, PDF, or slide-ready summary?

---

## 14. One-Sentence Definition

HelpXs is a privacy-safe coaching operations app that helps coaches log anonymized session data quickly and helps directors generate reports and adapt the session form as program needs evolve.

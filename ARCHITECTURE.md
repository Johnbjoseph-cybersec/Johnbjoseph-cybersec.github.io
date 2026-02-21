# GRC Practice Lab — Architecture

## Overview
GRC Practice Lab is a browser-based, project-driven GRC simulation platform designed for students and early-career professionals to practice real-world GRC workflows end-to-end.

It runs entirely on the client side (no server required) and stores user progress locally in the browser.

---

## High-Level Flow (Learning Workflow)
Projects follow a practical governance and risk workflow:

**Projects → Assets → Risks → Controls → Treatments → Evidence → Portfolio Output**

This mirrors how real GRC programs operate (identify scope, assess risk, implement controls, collect evidence, and produce audit-ready outputs).

---

## Core Components
### 1) Browser UI (Single-Page Experience)
- Sidebar navigation (modules)
- Project Mode experience (scenario-driven tasks)
- Modals/forms to create and manage records
- Portfolio Builder outputs (resume bullets + decision context)

### 2) Modules (Functional Areas)
- **Projects**: scenario selection and progress tracking
- **Assets**: inventory, classification, criticality
- **Risks**: risk statements, likelihood/impact scoring, owners
- **Controls**: framework mapping (e.g., ISO 27001), effectiveness, cadence
- **Treatments**: risk response plan (mitigate/transfer/avoid/accept), due dates, ownership
- **Evidence**: audit artifacts / screenshots / proof records
- **Portfolio Builder**: summarizes work into interview-ready outputs

### 3) Local Storage Persistence
- Data is stored in the browser using local persistence (e.g., LocalStorage).
- This allows users to:
  - keep progress without creating an account
  - export/import their portfolio or project data
  - run the lab offline

### 4) Export / Import (Portability)
- Export produces a portable data snapshot for backup or sharing.
- Import restores project state for continued practice.

---

## Simple Architecture Diagram

[ User ]
   |
   v
[ Browser UI / SPA ]
   |
   +-----------------------------+
   | Modules                     |
   | - Projects                  |
   | - Assets                    |
   | - Risks                     |
   | - Controls                  |
   | - Treatments                |
   | - Evidence                  |
   | - Portfolio Builder         |
   +-----------------------------+
   |
   v
[ Local Persistence ]
(LocalStorage / Client-side storage)
   |
   v
[ Export/Import ]
(JSON snapshot / file download)

---

## Design Principles
- **Practice-first**: teaches how GRC is done, not just definitions
- **Project-based**: realistic scenarios with outcomes and artifacts
- **No login**: privacy-friendly learning and easy adoption
- **Portfolio outputs**: converts practice into interview evidence

---

## Repository Link
(https://github.com/Johnbjoseph-cybersec/Johnbjoseph-cybersec.github.io)

\# AgeWinners (AW) â€” AI Agent Configuration



\## Project Overview

AgeWinners is a React + Supabase social network focused on wellbeing, beauty, sport, healthy lifestyle, and positive living.



Audience: ages 16â€“116, primarily urban, diverse, and lifestyle-oriented.



\## Assistant Role

You are a senior fullstack engineer, system architect, and UX/UI-oriented product builder.



Your responsibilities:

\- design architecture

\- implement features

\- optimize performance

\- explain solutions clearly to a semi-technical collaborator



\## Collaboration Style

\- Explain step by step

\- Minimize jargon

\- Provide ready-to-use code and commands

\- Prefer clarity over cleverness

\- Prefer practical solutions over theoretical ones



\---



\## Technical Stack



\### Frontend

\- React

\- Next.js

\- Tailwind CSS

\- shadcn/ui



\### Backend

\- Supabase

\- PostgreSQL



\### State

\- Context API

\- Zustand (optional)



\---



\## Project Memory Files



Always use these files as project memory:



\- `/AGENTS.md`

\- `/PROJECT\_CONTEXT.md`

\- `/docs/DATABASE.md`

\- `/docs/FILE\_STRUCTURE.md`

\- `/docs/ITERATION\_HISTORY.md`



Use them according to the context priority rules below.



\---



\## Context Priority



Use project context in this order of importance:



1\. `/docs/DATABASE.md`

&#x20;  - highest priority for database structure

&#x20;  - source of truth for tables, relations, fields, and DB logic



2\. `/docs/FILE\_STRUCTURE.md`

&#x20;  - source of truth for codebase orientation

&#x20;  - where logic lives

&#x20;  - which files are responsible for which features



3\. `/PROJECT\_CONTEXT.md`

&#x20;  - current project state

&#x20;  - active constraints

&#x20;  - current focus areas

&#x20;  - recent implementation direction



4\. `/docs/ITERATION\_HISTORY.md`

&#x20;  - supporting context for recent development continuity

&#x20;  - use mainly for recent iterations and iteration numbering



5\. actual codebase

&#x20;  - always verify assumptions against real files

&#x20;  - if code and documentation differ, treat code as implementation reality and explicitly report the mismatch



\---



\## Core System Rules (Critical)



\### 1. AW Logic â€” Source of Truth

All AW calculations, visibility, reveal logic, comment access, retroactive visibility changes, and AW recomputation must follow the official AgeWinners logic specification.



Source reference:

\- `zakladni logika-5-prehledne.odt`



Never simplify, reinterpret, or replace these rules with ad hoc logic.



If implementation and specification differ:

\- report the mismatch clearly

\- prefer the specification for intended behavior

\- prefer the real codebase for current implementation state



\---



\### 2. Architecture Rules

\- Keep the project modular

\- Separate UI from business logic

\- Prefer small, composable components

\- Avoid monolithic files

\- Split logic into appropriate layers:

&#x20; - components

&#x20; - hooks

&#x20; - api

&#x20; - utils

&#x20; - database / RPC where appropriate



\---



\### 3. Safety Rules

\- Never break authentication flow

\- Always respect Supabase RLS

\- Never assume database structure without checking documentation or code

\- Always explain DB-impacting changes before implementation

\- Never move privacy enforcement only to frontend

\- Frontend may interpret state, but privacy and access rules must be enforced in DB / backend logic



\---



\### 4. Change Rules

Before modifying code:



1\. Analyze the task

2\. Read only relevant documentation

3\. Identify affected files

4\. Propose a short implementation plan

5\. Mention behavior changes and risks

6\. Only then implement



For every non-trivial change, always state:

\- files affected

\- behavior change

\- unchanged behavior

\- risks / edge cases



\---



\### 5. Performance Rules

Prefer:

\- server-side filtering

\- efficient Supabase queries

\- minimal client-side recomputation

\- useMemo / useCallback when truly helpful

\- minimizing unnecessary re-renders



Avoid:

\- unnecessary fetching

\- duplicated state

\- deeply coupled UI logic

\- loading large historical context when not needed



\---



\## Key Features of the Platform



\- Auth (Supabase)

\- Feed

\- Profiles

\- Posts

\- Albums

\- Images

\- Comments

\- Notifications

\- My Tips (`/my-tips`)

\- Visibility system (`everyone / contacts / private`)

\- Author identity reveal delay

\- Content reveal delay

\- AW scoring system

\- Stats and charts

\- Admin / privileged viewer logic

\- Network / connections



\---



\## Coding Standards



Each file should start with a short header comment in this format:



```ts

/\*\*

&#x20;\* File purpose

&#x20;\* Main responsibilities

&#x20;\* Related APIs, components, or modules

&#x20;\*/



\## UI Consistency Rules

\- V akčních hlavičkách vždy zachovat pořadí ikon zleva doprava:

&#x20;  - nápověda (`?`)

&#x20;  - nastavení

&#x20;  - filtr / trychtýř

&#x20;  - refresh

\- Pokud některá ikona chybí, zbývající ikony zachovají stejné relativní pořadí.

&#x20;  - příklad bez nastavení a filtru: `?` → `refresh`


\## AI-Generated Photo Aspect Ratio Rules

\- Generate test-user photos as natural rectangular photographs by default, never as squares by default.

\- Prefer these aspect ratios:

&#x20;  - portrait: `4:5`, `3:4`, or `2:3`

&#x20;  - landscape: `4:3`, `3:2`, or `16:9` when the scene naturally calls for a wide frame

\- Choose portrait or landscape according to the scene, pose, period, and intended photo category.

\- Use a square (`1:1`) image only when the user explicitly requests it or when a clearly intentional source format requires it.

\- Do not create square contact-sheet cells and then use those cells as final user photos. Final exported photos must preserve the intended rectangular aspect ratio.

\- Existing square photos must remain supported by AW and displayed completely without cropping.


\## Profile Photo Rules

\- A profile photo must be a face-focused portrait, similar to an ID photo or a natural professional social-profile photo.

\- Prefer a portrait framed from the waist or chest upward, with the face centered and clearly recognizable.

\- Keep the entire head, hair, chin, and both eyes visible, with enough space around the head for a circular avatar crop.

\- Do not use a distant full-body photo, rear view, group photo, covered face, extreme close-up, or a crop that cuts off the head or hair.

\- When creating photos for an AI test user, always create or preserve at least one profile-suitable portrait that follows these rules.

\- Profile photos should remain natural and identity-consistent with the user's other generated photos.


\## Text Encoding Rules

\- Při každé tvorbě nebo úpravě textů vždy zachovat správné UTF-8 kódování.

\- Po změně českých textů vždy zkontrolovat, že se diakritika zobrazuje správně:

&#x20;  - žádné znaky typu `Ã`, `Ä`, `Å`, `â`

&#x20;  - žádné chybějící háčky a čárky

\- Před dokončením změny u uživatelských textů ověřit alespoň dotčené soubory vyhledáním mojibake znaků.

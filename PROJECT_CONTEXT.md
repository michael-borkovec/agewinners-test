\# AgeWinners — Project Context



\## Structure (high level)



\- src/

&#x20; - components/ → UI components

&#x20; - hooks/ → reusable logic

&#x20; - lib/

&#x20;   - supabase/ → client + DB interaction

&#x20;   - api/ → business logic wrappers

&#x20; - pages/ or app/ → routes



\- supabase/

&#x20; - migrations/

&#x20; - functions/



\---



\## Current System State



AW system:

\- defined (see AW logic doc)

\- not fully implemented in code yet



Visibility system:

\- designed

\- requires DB + RLS enforcement



Auth:

\- Supabase-based

\- must remain stable



\---



\## Core Modules (expected)



\- Auth system

\- Feed system

\- Profile system

\- Post / Album / Image hierarchy

\- Comments system

\- Visibility engine

\- AW calculation engine

\- /my-tips history



\---



\## Recent Changes



\- Initial architecture defined

\- AW logic finalized (strict rules)

\- Visibility + reveal logic specified



\---



\## Known Constraints



\- Real age must be snapshot (images.real\_age\_years)

\- Visibility is ALWAYS current (retroactive)

\- Comments depend on content visibility

\- Identity reveal depends on ALL images in post

\- Content reveal depends on user level



\---



\## Open Areas



\- DB schema finalization

\- RLS policies

\- Feed performance

\- Realtime updates


# Operating rules
The full specification is docs/BRIEF.md. It is the source of truth. If code and brief disagree, the brief wins unless docs/DECISIONS.md records an exception.
At the start of every session: read this file, then docs/PROGRESS.md, then the sections of docs/BRIEF.md for your current slice. Never rely on your memory of the brief.
Follow the build loop in section 1 of the brief for every slice: read, test first, build, verify, attack, fix, review, record, report.
Never say done, works or passes unless you ran the command in this session and read its output. Anything you could not verify is listed as UNVERIFIED.
Money is integer paise. Every staff action is authorized on the server. Every state change writes its event row in the same transaction. Never change the tech stack.
Commands: pnpm verify (lint, types, unit, integration, build), pnpm e2e, pnpm gate:phase1, pnpm gate:phase2.
Files you maintain: docs/PROGRESS.md, docs/REQUIREMENTS.md, docs/TRACEABILITY.md, docs/DECISIONS.md, docs/BLOCKERS.md.

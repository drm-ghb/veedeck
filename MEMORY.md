# MEMORY.md

## 2026-08-01, Panel klienta zostaje pod /client/[projectId] — Wariant A

**What was decided:**
Nie migrujemy panelu klienta z `/client/[projectId]` na `/client/[clientId]` (ani na hybrydę `clientId`+`projectId`). Zostajemy przy obecnym routingu opartym o `Project.id` i naprawiamy przyczynę bugów u źródła: gdy dla klienta bez prawdziwego projektu w ProjectFlow zakłada się "projekt-host" (żeby panel miał `projectId` w URL-u), trzeba pilnować, żeby kontakt miał też wiersz `ProjectClient` z tym `projectId` — zamiast dodawać kolejną dwutorową logikę resolvowania kontaktu (przez `clientId` albo przez `projectId`).

**Why:**
Migracja na `clientId` (Wariant B) dotyka: 18 route'ów API pod `/api/client/[projectId]/...`, 3 fizyczne strony SPA (`client/[projectId]/*`), oraz ~15 miejsc budujących linki `/client/{id}/...` w komponentach i mailach. Dodatkowo renders/moodboardy/płatności/harmonogram/ankiety pozostają własnością `Project`, nie `Client` — więc nawet po migracji `projectId` musiałby wrócić jeden poziom niżej w URL-u dla tych zasobów, co oznacza nie prostą zamianę nazwy parametru, tylko dodanie warstwy w strukturze. Do tego dochodzi konieczność przekierowań dla już wysłanych klientom linków aktywacyjnych ze starym wzorcem URL. To realnie osobny, wieloetapowy projekt (dzień-dwa pracy minimum), nie coś do zrobienia przy okazji naprawy buga z przyciskiem "Udostępnij klientowi".

**What was rejected:**
- Wariant B — pełna migracja panelu na `/client/[clientId]`, zgodnie z rekomendacją z zewnętrznej konsultacji (Claude.ai, rozmowa "Problem z linkiem aktywacyjnym w panelu klienta", 1 sierpnia 2026).
- Wariant C — hybryda: panel adresowany przez `clientId`, zasoby projektowe nadal przez `projectId` jako podścieżka.

Oba warianty odłożone jako świadomy dług architektoniczny do rozważenia później, nie porzucone na stałe.

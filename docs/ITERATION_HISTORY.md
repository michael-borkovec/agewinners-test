\# AgeWinners – Iteration History



This file contains only recent iterations needed for current project context.



Rules:

\- Keep exact iteration numbering

\- Preserve recent development history

\- Remove old iterations that no longer help current implementation

\- Use this file mainly for continuity and AWend iteration numbering







Iteration 021



Feature: User activity statistics (50 dní)



Files affected:



lib/api/stats.ts



app/profile/stats/page.tsx



SQL RPC aw\_user\_activity\_50\_days



Description:

Implementována tabulka aktivity uživatele za posledních 50 dní:



login



počet fotek



počet alb



počet postů



počet hodnocení



Zobrazení pouze dnů:



kdy byl login



nebo existuje aktivita



Important notes:



dny bez loginu se nezobrazují



optimalizováno pro přehlednost (žádné „nulové spam řádky“)



Iteration 022



Feature: Fix SQL struktury pro activity + schema alignment



Files affected:



SQL (RPC funkce)



Description:

Oprava neexistujících tabulek/sloupců:



user\_sessions → odstraněno



user\_id → nahrazeno správnými:



images.uploader\_user\_id



posts.author\_user\_id



albums.owner\_user\_id



Important notes:



sjednocení naming konvencí



kompatibilní s reálnou DB strukturou



Iteration 023



Feature: AW score normalization fix (UI)



Files affected:



MyStatsSummary.tsx



app/profile/stats/page.tsx



Description:

Oprava zobrazení AW skóre:



místo 106 % → +6 %



místo 94 % → -6 %



Important notes:



backend zůstal beze změny



UI interpretuje hodnotu relativně ke 100



Iteration 024



Feature: AW age computation fix (5-year rolling window)



Files affected:



SQL: get\_my\_aw\_age\_current



SQL: get\_my\_aw\_age\_trajectory



Description:

Změna logiky AW věku:



počítá se pouze z fotek v okně posledních 5 let



historické body používají sliding window



Important notes:



zásadní fix — řeší extrémní hodnoty (např. AW 24 vs real 60)



sjednocení s definicí „current AW“



Iteration 025



Feature: Trajectory graph (AW age over time)



Files affected:



AwAgeTrajectoryChart.tsx



lib/api/stats.ts



SQL: get\_my\_aw\_age\_trajectory



Description:

Implementován trajectory graf:



AW věk v čase



skutečný věk jako referenční čára



Pohledy:



50 dní (dny)



1 rok (týdny)



celý život (roky)



Important notes:



rolling window 5 let



správná časová rekonstrukce AW věku



Iteration 026



Feature: Continuous real age line (fix křivky)



Files affected:



AwAgeTrajectoryChart.tsx



SQL: get\_my\_aw\_age\_trajectory



Description:

Oprava černé čáry (real age):



místo skoků → plynulý věk (decimal)



výpočet přes epoch / 365.25



Important notes:



řeší „křivou čáru“ problém



odpovídá reálnému stárnutí



Iteration 027



Feature: Trajectory segmentation + logic refinement



Files affected:



AwAgeTrajectoryChart.tsx



SQL



Description:

Zpřesnění logiky podle specifikace:



50 dní → horizontální čára



1 rok → mírně rostoucí



life → lineární od 16 let



Important notes:



zjednodušení UX



lepší interpretace grafu



Iteration 028



Feature: Add 10-year trajectory view



Files affected:



AwAgeTrajectoryChart.tsx



lib/api/stats.ts



SQL: get\_my\_aw\_age\_trajectory



Description:

Nový pohled:



➡️ Posledních 10 let



granularita: měsíce



Important notes:



kompromis mezi detailností a výkonem



vhodné pro „aging trend“



Iteration 029



Feature: Tooltip semantic feedback (younger / older)



Files affected:



AwAgeTrajectoryChart.tsx



Description:

Tooltip nyní obsahuje interpretaci:



„vypadáš mladší“



„vypadáš starší“



„vypadáš přesně na svůj věk“



Important notes:



první krok k UX vysvětlení AW



zvyšuje srozumitelnost pro usera



Iterace 30 — Přechod na nový model alb



Feature / change: album už není svázané s jedním postem ani jedním rokem, ale funguje jako kolekce postů přes post\_albums

Files affected:



components/NewPostForm.tsx

components/PostCard.tsx

app/my-posts/page.tsx

lib/api/albums.ts

lib/api/posts.ts

lib/api/myTips.ts



Short description:



zrušena podmínka „stejný rok“

zrušena logika „album z jednoho postu“

album nově funguje jako značka / kolekce nad více posty

vazba album ↔ post je přes post\_albums



Important notes:



albums.description potvrzeno jako existující

album může mít 0 postů

nová privacy logika:

post mimo album → post.visibility

post v albu → album.visibility

Iterace 31 — UI pro přidání postu do alba



Feature / change: nový způsob přiřazení postu do alba při publikaci i u existujícího postu

Files affected:



components/NewPostForm.tsx

components/PostCard.tsx



Short description:



staré „Vytvořit album z postu“ nahrazeno akcí Přidat post do alba

přidán dialog:

seznam existujících alb uživatele

možnost vytvořit nové album pro tento post

nové album obsahuje:

název

popis



Important notes:



změna se týká jak nového postu, tak existujícího postu v Moje posty

stará logika omezení podle roku odstraněna

Iterace 32 — Založení stránky „Moje alba“



Feature / change: nová stránka pro přehled a správu alb

Files affected:



app/my-albums/page.tsx

lib/api/albums.ts



Short description:



přidána route my-albums

stránka zobrazuje alba aktuálního uživatele

v rámci alba se renderují jeho posty



Important notes:



data se načítají přes getAlbumsWithPosts()

výstup musí obsahovat album → posty → fotky

Iterace 33 — Robustní načítání album → posty → fotky



Feature / change: stabilní loader alb s navázanými posty a obrázky

Files affected:



lib/api/albums.ts



Short description:



getAlbumsWithPosts() přepsáno na vícefázové načítání:

albums

post\_albums

posts

user\_profiles

post\_images

images

data se skládají v TypeScriptu



Important notes:



záměrně se nepoužívá hluboký nested select

touto iterací se opravilo, že my-albums někdy ukazovalo jen alba bez postů

Iterace 34 — Mazání a editace alb



Feature / change: rozšíření správy alb na stránce Moje alba

Files affected:



app/my-albums/page.tsx

lib/api/albums.ts

components/PostCard.tsx



Short description:



přidáno mazání alba ve dvou režimech:

smazat jen album

smazat album i posty

přidána editace alba:

změna názvu

změna popisu

odebrání vybraných postů z alba

přidán prop hideAlbumBadge do PostCard



Important notes:



v my-albums se už nemá znovu opakovat badge s názvem alba uvnitř každého postu

tlačítko Smazat album přestylováno na zelené

Iterace 35 — Sjednocení detailu fotky ve statistikách



Feature / change: detail fotky otevřené z bodu v grafu

Files affected:



components/stats/RealVsGuessedScatter.tsx



Short description:



detail fotky po kliknutí na bod v grafu nyní používá jednotný box:

Skutečný věk

AW věk

AW skóre

datum převedeno do českého formátu



Important notes:



Foto #ID je globální ID fotky z tabulky images

finální specifikace pro statistiky je:

Skutečný věk

AW věk

AW skóre

Iterace 36 — Sjednocení zobrazení vlastních fotek v „Moje posty“ a „Moje alba“



Feature / change: stejné info boxy u vlastních fotek jako ve statistikách

Files affected:



components/PostCard.tsx

app/my-albums/page.tsx



Short description:



u vlastních fotek se zobrazuje:

Skutečný věk

AW věk

AW skóre

stejný box je vidět:

už v náhledu fotky

i při maximalizaci



Important notes:



týká se vlastních fotek v Moje posty a Moje alba

layout byl sjednocen podle vizuálu ze statistik

Iterace 37 — Přestavba myTips na nový album/post model



Feature / change: Moje tipy používají nový model alb a effective visibility

Files affected:



lib/api/myTips.ts

app/my-tips/page.tsx



Short description:



myTips už nepoužívají starou image-level visibility logiku

loadMyTipPosts() používá:

mimo album → post.visibility

v albu → album.visibility

do dat pro fotku doplněn i AW věk



Important notes:



zachována reveal logika

zachovány komentáře

zachovány filtry a layout

Iterace 38 — Finální úprava „Moje tipy“



Feature / change: finální info box a zoom detail v Moje tipy

Files affected:



app/my-tips/page.tsx

lib/api/myTips.ts



Short description:



u fotek v Moje tipy se zobrazuje:

Skutečný věk

AW věk

Můj tip

při maximalizaci fotky se navíc zobrazuje:

datum tipu ve formátu DD. MM. RRRR

ID fotky



Important notes:



Moje tipy se tímto záměrně liší od vlastních fotek:

vlastní fotky → AW skóre

moje tipy → Můj tip

Iterace 39 — Wellbeing deník: strava, historie, privacy a plány

Feature / change: rozšíření `/stats?section=wellbeing` o detailnější denní zápisy a dlouhodobé plány

Files affected:

app/stats/page.tsx
app/profile/privacy/page.tsx
lib/api/wellbeing.ts
lib/api/userProfiles.ts
components/stats/StatsMiniChart.tsx
types/db.ts
supabase/migrations/20260420_wellbeing_food_privacy_and_plans.sql
docs/DATABASE.md

Short description:

graf „Nálada v čase“ přejmenován na „Nálada“

spánek a pohyb jsou samostatné grafy

voda se zapisuje a zobrazuje v litrech po 0,5 l

přidána strava: množství + typ stravy s barevným grafem

přidána jedna volba viditelnosti pro celý denní wellbeing zápis: Všichni / Kontakty / Soukromé

přidána výchozí wellbeing privacy volba do `/profile/privacy`, výchozí hodnota je Všichni

přidána měsíční tabulka detailu a editace historie s hromadnou editací

„Návyky“ nahrazeny sekcí „Plány a návyky“ pro spánek, pohyb, vodu a stravu

Important notes:

vyžaduje aplikovat novou Supabase migraci

nová plánovací tabulka má owner-only RLS
Iterace 40 â€” Pořadové číslo registrace uživatele

Feature / change: přesné a trvalé pořadí registrace uživatelů od 1 výš

Files affected:

supabase/migrations/20260423_user_registration_numbers.sql
docs/DATABASE.md
docs/ITERATION_HISTORY.md
types/db.ts
lib/api/userProfiles.ts

Short description:

přidána DB evidence přesného pořadí registrace podle `auth.users.created_at`

nová pomocná tabulka `user_registration_orders` je source of truth

`user_profiles.registration_number` zrcadlí toto číslo pro snadné čtení z app vrstvy

staré účty se backfillují deterministicky podle času registrace a `auth.users.id`

Important notes:

noví uživatelé dostávají pořadové číslo automaticky při vzniku auth účtu

řešení není závislé na tom, kdy se poprvé vytvoří nebo doplní řádek v `user_profiles`

Iterace 41 — Gamifikační feed algoritmus v1

Feature / change: feed kandidátních fotek používá backendový výběr 7 preferovaných + 3 náhodných fotek s vazbou na Power score

Files affected:

supabase/migrations/20260509_gamified_feed_batch.sql
lib/api/posts.ts
app/page.tsx
docs/DATABASE.md
docs/ITERATION_HISTORY.md

Short description:

přidána RPC `get_gamified_feed_image_batch`

feed filtruje cizí, netipované, viditelné a neskryté fotky na backendu

`feed_score` kombinuje contribution score, Power score, under-tipped score, recency a diversity

dávka má limit 10 fotek a max 2 fotky od stejného autora

Power score slouží jen jako prioritizační signál feedu, nemění AW věk ani váhu tipů

Important notes:

aktivní album kontext používá `post_albums`, ne legacy `posts.album_id`

dokud není migrace aplikovaná v Supabase, frontend umí spadnout na původní loader

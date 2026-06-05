# AgeWinners – knowledge base pro Codex / AI asistenta

Tento dokument slouží jako kompaktní zdroj pravdy pro práci na projektu AgeWinners v Codexu nebo jiném AI coding prostředí.

Cíl: aby AI asistent rozuměl produktu, pravidlům, výpočtům, privacy logice, UX/marketing kontextu a technickým zásadám projektu.

---

## 1. Co je AgeWinners

AgeWinners je sociální síť zaměřená na pozitivní životní styl, wellbeing, vzhled, sport, zdravé stárnutí, krásu, vitalitu a komunitní zpětnou vazbu.

Hlavní unikátní princip:

> Uživatel nahraje fotku, ostatní tipují věk osoby na fotce a systém z toho počítá AW věk, AW skóre, přesnost tipů, reputaci tipujících a vývoj v čase.

AgeWinners odpovídá na otázku:

> „Na kolik let působím podle ostatních lidí?“

AgeWinners není jen další Instagram. Hlavní rozdíl je kombinace:

- fotek
- tipování věku
- anonymního / odloženého odhalení
- reputace tipujících
- statistik a grafů
- privacy s retroaktivním dopadem
- pozitivního lifestyle positioningu

Doporučený positioning:

> Sociální síť, kde lidé objevují, jak působí v čase, a získávají komunitní zpětnou vazbu na vitalitu, styl a mladistvý dojem.

---

## 2. Zásadní produktové principy

### 2.1 AW věk není biologický ani zdravotní údaj

AW věk nesmí být komunikován jako:

- biologický věk
- zdravotní ukazatel
- dermatologická diagnostika
- vědecká diagnostika
- medicínský výsledek

Správná interpretace:

> AW věk je komunitní vnímání dojmu z fotky nebo profilu.

### 2.2 Tón komunikace musí být pozitivní

AgeWinners pracuje s citlivým tématem věku a vzhledu. Komunikace musí být:

- hravá
- zvědavá
- podporující
- neponižující
- bez body-shamingu
- bez age-shamingu

Vyhýbat se formulacím typu:

- „vypadáš staře“
- „vypadáš špatně“
- „máš problém“
- „musíš omládnout“

Lepší formulace:

- „Na komunitu působíš mladším dojmem.“
- „Tahle fotka vyvolává energičtější dojem.“
- „Tvůj AW věk se v čase mění.“
- „Sleduj, jak různé situace ovlivňují první dojem.“

### 2.3 Privacy je konkurenční výhoda

Privacy není doplněk. Je to klíčový princip systému.

AgeWinners musí respektovat:

- visibility: `everyone`, `contacts`, `private`
- retroaktivní změny viditelnosti
- anonymitu autora
- delayed reveal obsahu
- pravidlo, že `/my-tips` není výjimka z privacy

### 2.4 Férovost systému

Tipy nejsou obyčejná anketa. Systém váží tipy podle reputace tipujícího.

Důležité:

- přesnější tipující mají vyšší váhu budoucích tipů
- váha se ukládá jako snapshot v okamžiku tipu
- minulost se nikdy nepřepočítává podle budoucí reputace

---

## 3. Cílová skupina

Cílová skupina je široká: přibližně 16 až 116 let.

Typičtí uživatelé:

- lidé zvědaví, jak působí na ostatní
- lidé sledující vlastní vzhled, styl, energii a vitalitu
- lidé pracující na lifestyle / fitness / beauty journey
- influenceři z oblasti lifestyle, beauty, fashion, fitness a wellness
- komunity kolem pozitivního aging tématu

Motivace uživatelů:

- zvědavost: „Na kolik let působím?“
- sebepoznání
- hra a soutěživost
- komunita
- sledování vývoje v čase
- reputace v tipování
- bezpečná zpětná vazba

---

## 4. Hlavní entity produktu

### 4.1 Uživatel / profil

Profil obsahuje veřejnou i soukromější část.

Základní profil:

- zobrazované jméno
- avatar
- bio
- veřejná profilová identita

Osobní profil:

- datum narození
- preference
- personalizační údaje
- souhlasy s personalizací a reklamou

Privacy profil:

- výchozí viditelnost nových postů
- výchozí viditelnost nových alb
- výchozí viditelnost nových fotek
- povolení / skrytí věku
- povolení žádostí o kontakt
- povolení sledování
- default anonymita tipů
- možnost odtajnit minulé tipy
- možnost aplikovat privacy změny zpětně

Statistiky profilu:

- AW věk
- AW skóre
- power score
- přesnost tipování
- graf vývoje AW věku
- graf real age vs AW age
- historie statistik
- aktivita za posledních 50 dnů

### 4.2 Posty

Post je základní publikační jednotka.

Post může obsahovat:

- jednu fotku
- více fotek
- text
- titulek
- vazbu na album
- visibility nastavení

Pravidlo:

> Prázdný post bez fotek není validní a má být odstraněn.

### 4.3 Fotky

Fotka je hlavní jednotka AW systému.

Fotka obsahuje:

- veřejnou URL
- náhledovou URL
- datum pořízení `taken_at`
- skutečný věk v době pořízení `real_age_years`
- viditelnost
- kategorii fotky
- komentář / popisek
- AW věk fotky
- počet tipů
- průměrný tipovaný věk
- `include_in_global_aw`

Zásadní pravidlo:

> Skutečný věk fotky se počítá k datu pořízení fotky, ne k dnešku.

### 4.4 Alba

Album je kolekce postů, ne kolekce fotek.

Aktuální model:

- album není jedna fotka
- album není jeden post
- album není omezené jedním rokem
- album může obsahovat více postů
- album může být prázdné
- vazba postu na album je přes `post_albums`
- starý sloupec `posts.album_id` je legacy a nemá se používat

Marketingové použití alb:

- proměny
- sportovní období
- dovolené
- životní etapy
- skincare journey
- fitness progress
- fashion styl

---

## 5. Tipování věku

Tipování je jádro aplikace.

Uživatel tipuje věk osoby na fotce.

Povolený rozsah:

```ts
MIN_AGE = 16
MAX_AGE = 116
```

Backend musí vždy clampovat hodnotu:

```ts
guess_age = clamp(guess_age, MIN_AGE, MAX_AGE)
```

UI může validovat slider, ale source of truth je backend / DB / RPC.

Systém u tipu ukládá:

- tipovaný věk
- skutečný věk fotky
- přesnost tipu
- odchylku tipu
- normalizovanou odchylku
- váhu tipujícího v okamžiku tipu
- čas tipu
- vazbu na fotku a uživatele

Důležité:

> Váha tipu se po uložení už nikdy nemění.

---

## 6. AW výpočty

### 6.1 Konstanty

```ts
MIN_AGE = 16
MAX_AGE = 116
CURRENT_AW_WINDOW_YEARS = 5
IDENTITY_DELAY_HOURS = 24
```

### 6.2 Skutečný věk fotky

Skutečný věk se nevztahuje k dnešku, ale k okamžiku pořízení fotky.

```ts
real_age = celé roky mezi images.taken_at - user_profiles.date_of_birth
```

Ukládá se jako neměnný snapshot:

```ts
images.real_age_years
```

Vlastnosti:

- neměnný
- auditovatelný
- férový
- žádný výpočet nepoužívá dnešní věk fotky

Anti-abuse pravidlo:

```ts
images.real_age_years >= MIN_AGE
```

Pokud výpočet vyjde pod 16, upload má být zakázán.

### 6.3 Maximální možná chyba

```ts
maxErr(real_age) = max(real_age - MIN_AGE, MAX_AGE - real_age)
```

Význam:

- určuje maximální možnou chybu pro daný věk
- odstraňuje zvýhodnění okrajů intervalu

### 6.4 AW přesnost tipu

```ts
errorYears = abs(guess_age - real_age)

aw_accuracy = clamp(
  100 * (1 - errorYears / maxErr(real_age)),
  0,
  100
)
```

Interpretace:

- 100 % = přesný tip
- 0 % = maximální možná chyba

### 6.5 AW bias / signed odchylka

```ts
deltaYears = guess_age - real_age
```

Interpretace:

- kladné = komunita tipuje starší věk
- záporné = komunita tipuje mladší věk

### 6.6 Normalizovaná signed odchylka

```ts
deltaNorm = (guess_age - real_age) / maxErr(real_age)
deltaNormPct = deltaNorm * 100
```

Rozsah:

```ts
deltaNorm ∈ <-1, +1>
```

### 6.7 Snapshot váhy tipu

Každý tip musí mít uloženou váhu v okamžiku odeslání.

```ts
age_guesses.weight_at_guess ∈ <0, 1>
```

Pravidla:

- váha se spočítá před započtením nového tipu
- po uložení tipu se už nikdy nemění
- reputace uživatele nesmí měnit minulost

### 6.8 Bayesovský výpočet váhy uživatele

Ukládané agregáty:

- `aw_guesses_count`
- `aw_accuracy_sum`

Konstanty:

```ts
PRIOR_COUNT = 5
PRIOR_ACCURACY = 60
```

Výpočet:

```ts
avgAcc =
  (PRIOR_COUNT * PRIOR_ACCURACY + aw_accuracy_sum)
  / (PRIOR_COUNT + aw_guesses_count)

aw_weight = avgAcc / 100
```

### 6.9 AW skóre – vážené agregace

Ve všech agregacích se používá vážený průměr s vahou:

```ts
w_i = weight_at_guess_i
```

Pokud:

```ts
Σ(w_i) = 0
```

výsledek je `N/A`.

AW bias v letech:

```ts
aw_bias_years =
  Σ(deltaYears_i * w_i) / Σ(w_i)
```

AW skóre normalizované:

```ts
aw_score_norm =
  Σ(deltaNorm_i * w_i) / Σ(w_i)

aw_score_norm_pct = aw_score_norm * 100
```

### 6.10 AW age pro fotku

```ts
aw_bias_years_from_norm = aw_score_norm * maxErr(real_age)

aw_age_image = clamp(
  real_age + aw_bias_years_from_norm,
  MIN_AGE,
  MAX_AGE
)
```

### 6.11 AW age pro uživatele

Pro každou fotku se spočte `aw_age_image_j`.

Poté:

```ts
W_j = Σ(weight_at_guess) přes všechny tipy dané fotky

aw_age_user =
  Σ(aw_age_image_j * W_j) / Σ(W_j)
```

Pokud:

```ts
Σ(W_j) = 0
```

výsledek je `N/A`.

### 6.12 Vyloučení fotek z globálního AW věku

Každá fotka má:

```ts
images.include_in_global_aw boolean
```

Význam:

- `true` = započítává se
- `false` = nezapočítává se

Výchozí hodnota:

```ts
true
```

### 6.13 Aktuální AW age profilu

Použije se filtr:

```sql
include_in_global_aw = true
AND taken_at >= (today - interval '5 years')
```

Uvnitř okna se použije stejná vážená agregace.

### 6.14 AW skóre – UI interpretace

AW skóre ukazuje, jestli člověk působí mladší nebo starší než jeho skutečný věk.

Interpretace:

- záporné skóre = působí mladší
- kladné skóre = působí starší
- kolem nuly = působí přibližně na svůj věk

V UI zobrazovat například:

- `106 %` jako `+6 %`
- `94 %` jako `-6 %`

Doporučené copy:

- `-6 % mladší dojem`
- `+4 % zralejší dojem`
- `přibližně na svůj věk`

Vyhnout se tvrdým formulacím typu „vypadáš starší“.

---

## 7. Transakční zápis tipu

Odeslání tipu musí proběhnout v jedné DB transakci.

Postup:

1. načíst `aw_guesses_count`, `aw_accuracy_sum`
2. spočítat aktuální `aw_weight`
3. načíst `images.real_age_years`
4. clampnout `guessed_age`
5. spočítat `aw_accuracy`, `deltaYears`, `deltaNorm`
6. uložit tip včetně `weight_at_guess`
7. aktualizovat agregáty tipaře

Invarianty:

- `weight_at_guess` se nikdy nemění
- žádný výpočet nepoužívá dnešní věk fotky
- `real_age_years` je neměnný snapshot
- žádná metrika není závislá na budoucím chování
- aktuální AW age profilu používá časové okno
- všechny agregace jsou dopočitatelné zpětně

---

## 8. Power score / skóre P

Power score je metrika aktivity a vlivu.

Okno:

```ts
90 dní
```

Konstanty:

```ts
I_public = 0.40
I_anonymous = 0.15
Y_allowed = 0.70
Y_denied = 0.15
R_coef = 3.0
B = 0
T = 0 // zatím
```

Pomocné veličiny:

- `guesses_public_90d`
- `guesses_anonymous_90d`
- `guesses_count_90d`
- `avgAcc_90d`
- `active_days_90d`
- `uploads_90d`
- `rejected_photos_360d`

Výpočty:

```ts
wA = avgAcc_90d / 100

aD = active_days_90d
sD = max(1, 90 - aD)

Y = allow_age_visible ? Y_allowed : Y_denied

A = wA * (I_public * guesses_public_90d + I_anonymous * guesses_anonymous_90d)
C = Y * A * (aD / sD)
R = uploads_90d * R_coef
T = rejected_photos_360d * (-100)
B = 0

P = A + C + T + R + B
```

Produktový význam:

- motivuje aktivní uživatele
- podporuje reputaci tipujících
- může být použito pro levely, odznaky, leaderboardy nebo unlocky

---

## 9. Odhalení identity autora

Identita autora není vždy vidět hned.

Avatar a jméno autora se zobrazí až tehdy, když mají všechny fotky v daném postu / albu tip starší než 24 hodin.

Výpočet:

```ts
identityRevealAt = max(guessCreatedAt všech fotek v postu) + 24h
```

Pravidla:

- pokud post obsahuje více fotek a některá není tipnutá, identita zůstává skrytá
- pokud jsou všechny fotky tipnuté, ale jedna má tip mladší než 24 hodin, identita zůstává skrytá
- identita se odhaluje podle nejpozdějšího tipu v postu
- admin / moderator / super_user vidí identitu hned

Produktový význam:

> Anonymita pomáhá získat upřímnější tipy, protože uživatel nejdřív nereaguje na známou identitu, ale na samotný dojem z fotky.

---

## 10. Odhalení obsahu

Obsah se odhaluje se zpožděním podle úrovně uživatele.

Úrovně:

- Nováček: 10 dní
- Objevitel: 8 dní
- Přispěvatel: 5 dní
- Tvůrce: 3 dny
- Lídr komunity: 1 den

Dokud levely nejsou plně zavedené:

> Všichni běžní uživatelé se chovají jako Nováček, tedy 10 dní.

Výpočet:

```ts
contentRevealAt(photo) = guessCreatedAt(photo) + delayDays(level)
```

Do odhalení se neukazuje:

- skutečný věk
- nadpis postu
- text postu
- název alba
- popisky fotek
- komentáře autora

Po odhalení:

- obsah se zobrazí tak, jak byl zadán

Post / album vs. jednotlivé fotky:

- album tip typicky odhalí vše společně
- u samostatných fotek se každá odhaluje podle svého `guessCreatedAt`

---

## 11. Viditelnost a soukromí

AgeWinners má tři úrovně viditelnosti:

```ts
everyone = všichni
contacts = pouze kontakty
private = pouze autor / vlastník
```

Viditelnost existuje pro:

- posty
- alba
- fotky

Sloupce:

```ts
posts.visibility
albums.visibility
images.visibility
```

### 11.1 Výchozí viditelnost

V profilu existují defaulty:

```ts
default_post_visibility
default_album_visibility
default_image_visibility
```

Tyto hodnoty platí jen pro nově vytvořený obsah.

### 11.2 Aktuální viditelnost má přednost

Při zobrazování obsahu se vždy používá aktuální hodnota:

```ts
posts.visibility
albums.visibility
images.visibility
```

Nikdy se nepoužívá historický snapshot defaultu z profilu.

### 11.3 Retroaktivní změny viditelnosti

AgeWinners používá pravidlo:

> Aktuální viditelnost obsahu má přednost i pro starší obsah.

To znamená:

- když autor zpětně přepne starý obsah na `private`, běžný cizí uživatel ho už nesmí vidět
- platí to i v případě, že ho uživatel v minulosti tipoval
- je to záměrná funkce, ne bug

---

## 12. Kontakty a sociální síť

Za kontakt se považuje pouze accepted connection.

Nestačí:

- follower
- pending request
- jednostranný vztah

Síť obsahuje:

- moje kontakty
- followers
- following
- žádosti o kontakt
- přijetí žádosti
- odmítnutí žádosti
- zrušení žádosti
- notifikace k žádostem

Visibility `contacts` znamená pouze accepted contacts.

---

## 13. Privilegovaný viewer

Privilegovaný viewer je uživatel, který splní alespoň jednu podmínku:

```ts
user_profiles.super_user = true
OR user_profiles.role = 'moderator'
OR user_profiles.role = 'admin'
```

Privilegovaný viewer je imunní vůči:

- `posts.visibility`
- `albums.visibility`
- `images.visibility`
- anonymitě autora
- content reveal delay
- comments access restriction

Jinými slovy:

> Privilegovaný viewer vidí vše okamžitě kvůli správě a bezpečnosti.

---

## 14. Efektivní přístup k obsahu

Přístup není řízen jen jedním sloupcem.

### 14.1 Přístup k postu

Viewer smí vidět post pouze tehdy, když současně platí:

1. má přístup k `posts.visibility`
2. pokud je post v albu, má přístup i k `albums.visibility`
3. pokud nejde o privilegovaného viewera, musí být splněna reveal logika

### 14.2 Přístup k fotce

Viewer smí vidět fotku pouze tehdy, když současně platí:

1. má přístup k `images.visibility`
2. má přístup k parent `posts.visibility`
3. pokud je post v albu, má přístup i k `albums.visibility`
4. pokud nejde o privilegovaného viewera, musí být splněna reveal logika konkrétní fotky

### 14.3 Nejrestriktivnější pravidlo vyhrává

Příklad:

```ts
post.visibility = 'everyone'
image.visibility = 'private'
```

Výsledek:

```ts
fotka je private
```

---

## 15. Komentáře

Komentáře nejsou samostatná privacy vrstva.

Komentář k postu se řídí efektivní viditelností postu.

Komentář k fotce se řídí efektivní viditelností fotky.

Viewer smí číst a psát komentáře jen tehdy, když:

- smí vidět cílový obsah
- není blokován reveal logikou cílového obsahu
- nebo je autor cílového obsahu
- nebo je privilegovaný viewer

Autor obsahu smí svoje komentáře:

- vidět
- psát
- spravovat

I tehdy, když je obsah private.

Privilegovaný viewer:

- vidí komentáře vždy
- může komentovat vždy

---

## 16. `/my-tips`

Sekce `/my-tips` je historie tipovací aktivity uživatele.

Zobrazuje typicky:

- fotky, které uživatel tipoval
- posty seskupené podle tipovaných fotek
- stav odhalení
- anonymitu autora
- reálný věk po odhalení
- AW věk po odhalení
- můj tip
- datum tipu
- ID fotky
- komentáře k fotce po odhalení
- filtry podle kategorií, stavu, viditelnosti a alb

Zásadní pravidlo:

> `/my-tips` není výjimka z privacy.

To znamená:

- pokud autor později změní starý obsah na `private`, běžný cizí viewer už ho nesmí na `/my-tips` vidět
- ani když ho v minulosti tipoval

Pořadí rozhodování na `/my-tips`:

1. content access
2. reveal
3. comments

---

## 17. Retroaktivní změny

V `/profile/privacy` jsou tři výchozí visibility:

- Posty
- Alba
- Fotky

Každá má:

- dropdown Všichni / Kontakty / Soukromé
- tlačítko Aplikovat zpětně
- tooltip s vysvětlením

Dropdown mění pouze default pro nový obsah.

Tlačítko „Aplikovat zpětně“ provede update existujícího obsahu:

```ts
Posty -> update posts.visibility
Alba -> update albums.visibility
Fotky -> update images.visibility
```

Po zpětné změně:

- změní se dostupnost obsahu pro ostatní uživatele
- změní se dostupnost komentářů
- změní se dostupnost identity autora
- může dojít ke změně AW skóre

Po retroaktivní změně viditelnosti musí dojít k přepočtu AW metrik tak, aby odpovídaly nové úrovni viditelnosti.

Pravidlo:

- při zvýšení viditelnosti může skóre vzrůst
- při snížení viditelnosti může skóre klesnout

---

## 18. Zpětné změny anonymních tipů

Akce:

> „Odtajnit všechny moje minulé tipy“

patří do stejné filozofie jako retroaktivní změny.

Je to zvláštní typ zpětné změny:

- netýká se content visibility
- týká se minulých guesses

Logicky patří do skupiny:

> zpětné změny historických dat

---

## 19. Statistiky jako retention driver

Sekce statistik je jeden z hlavních retention prvků.

Obsahuje:

- aktuální AW věk
- AW skóre
- power score
- průměrnou přesnost tipů
- historii metrik
- denní snapshoty
- graf AW věku v čase
- graf skutečný věk vs AW věk
- aktivitu za posledních 50 dnů
- detail fotky otevřený z grafu
- filtraci fotek podle tagů / experimentálních fotek

Graf AW věku:

- 50 dní
- 1 rok
- 10 let
- celý život
- skutečný věk jako referenční čára
- AW věk jako zelená čára
- interpretace: mladší dojem / zralejší dojem / přibližně na svůj věk

Graf real vs guessed:

- každý bod je fotka
- osa porovnává skutečný věk a AW věk
- klik na bod otevře detail fotky
- detail ukazuje skutečný věk, AW věk a AW skóre

---

## 20. Notifikace

Notifikace aktuálně pokrývají hlavně síťové události.

Typy:

- přijatá žádost o kontakt
- schválená žádost
- odmítnutá žádost

Notifikace mají:

- příjemce
- aktéra
- typ
- související entitu
- stav přečteno / nepřečteno
- čas vytvoření
- čas přečtení

Existuje stránka nastavení notifikací.

---

## 21. Zprávy

Projekt obsahuje messaging.

Funkce podle struktury:

- stránka zpráv
- message threads
- zprávy navázané na connection request
- zprávy při odmítnutí kontaktu
- reportování message threadů
- admin review reportů zpráv

Produktový význam:

> Zprávy posouvají AgeWinners od čistě tipovací aplikace k sociální síti.

---

## 22. Reportování a moderace

Uživatelé mohou nahlašovat:

- fotky
- posty
- komentáře
- message thready

Admin / moderátor může:

- procházet reporty
- potvrdit nebo odmítnout report
- změnit důvod reportu
- přidat admin poznámku
- mazat obsah
- ověřovat / odověřovat fotky
- spravovat uživatele
- měnit role
- měnit `super_user` flag
- resetovat nebo měnit heslo uživatele

Moderace je důležitá, protože aplikace pracuje s fotkami lidí, věkem a sociální zpětnou vazbou.

---

## 23. Technologická architektura

Frontend:

- React
- Next.js
- Tailwind CSS
- koncepčně shadcn/ui
- Context API
- případně Zustand

Backend:

- Supabase
- PostgreSQL
- RLS
- RPC funkce
- Supabase Storage
- admin API routes se service role

Zásadní princip:

> Privacy, access control, AW výpočty a citlivá logika nesmí být vynucené jen na frontendu. Frontend může stav interpretovat, ale skutečná pravidla musí být v DB / RPC / backendu.

---

## 24. Hlavní datové entity

Hlavní tabulky / koncepty:

- `user_profiles`
- `posts`
- `images`
- `albums`
- `post_images`
- `post_albums`
- `age_guesses`
- `comments`
- `connections`
- `notifications`
- `aw_user_stats_history`
- `app_runtime_settings`

Další oblasti podle migrací a API:

- messages
- reports
- image likes / reactions
- notification preferences
- comment reports
- post reports
- image reports
- message thread reports

---

## 25. Doporučená implementační filozofie

Business logika musí být v DB / RPC:

- content access
- comments access
- retroactive updates
- AW recompute
- transakční zápis tipu
- clamp věku
- kontrola privileged viewer
- kontrola kontaktů

Frontend:

- pouze interpretuje stav
- ukazuje správné hlášky
- nikdy nesmí být jediným místem vynucení privacy

Pořadí rozhodování:

1. existuje target?
2. viewer je privilegovaný?
3. viewer je autor / owner?
4. viewer smí vidět obsah?
5. reveal už nastal?
6. teprve potom comments / identity / detail content

---

## 26. Growth a marketing

Hlavní růstové kanály:

1. doporučení / referral systém
2. influenceři
3. placená reklama jako minoritní doplněk

### 26.1 Marketingové pilíře

Zvědavost:

> Na kolik let opravdu působíš?

Sebepoznání:

> Sleduj, jak se mění tvůj AW věk v čase.

Hra a komunita:

> Tipuj ostatní, sbírej přesnost a buduj reputaci.

Pozitivní aging:

> Věk není jen číslo. Důležitý je dojem, energie a styl.

Soukromí a kontrola:

> Sám rozhoduješ, kdo vidí tvoje fotky, alba a posty.

Férovost:

> Tipy se váží podle přesnosti tipujících, ne podle náhodné popularity.

Retence přes statistiky:

> Vracej se, sleduj grafy, porovnávej období a proměny.

### 26.2 Influencer strategie

Relevantní segmenty:

- lifestyle
- fitness
- beauty
- fashion
- wellness
- zdravé stárnutí
- skincare
- transformation journeys

Influencer mechaniky:

- „Guess my AW age“ výzvy
- tematické kampaně: fitness progress, skincare journey, fashion week, vacation look
- komunitní challenge
- referral kódy
- veřejné leaderboardy přesnosti
- influencer jako leader komunity

### 26.3 Referral mechaniky

Možné referral smyčky:

- pozvi 3 lidi a odemkni detailnější statistiky
- pozvi kontakt, aby tipnul tvoji fotku
- sdílej anonymní výsledek „komunita mi tipla X“
- challenge: „Tipni mě, já tipnu tebe“
- skupinové výzvy mezi přáteli

Důležité:

> Sdílení nesmí porušit privacy ani reveal logiku.

---

## 27. Monetizace

Hlavní modely:

- prémiové členství
- reklamní spolupráce se značkami
- citlivě cílená reklama

Relevantní značky:

- beauty
- fashion
- fitness
- wellness
- skincare
- healthy aging
- výživa
- estetická péče, ale bez medicínských slibů v komunikaci AW

Možné premium funkce:

- pokročilé statistiky
- delší historické grafy
- detailnější porovnání fotek
- soukromá alba
- více uploadů
- export osobních statistik
- detailnější filtry
- možnost vyřazovat experimentální fotky z globálního AW
- lepší přehled tipovací reputace

Riziko:

> Monetizace nesmí vytvořit dojem, že si uživatel kupuje lepší AW věk nebo lepší hodnocení.

---

## 28. UX / UI principy

Inspirace:

- LinkedIn: struktura, profil, profesionalita
- Facebook: sociální graf, kontakty, skupinový efekt
- Instagram: vizuální obsah
- Twitter/X: feed, rychlý engagement

Ale AgeWinners nesmí být kopie těchto sítí.

AW-specific UX musí zdůraznit:

- tipování jako primární akci
- AW statistiky jako retention jádro
- anonymitu před odhalením
- delayed reveal
- jasné privacy stavy
- srozumitelnou interpretaci AW věku a AW skóre

Doporučené UX texty:

- „Tipni věk podle dojmu z fotky.“
- „Autor se odhalí později, aby tipy zůstaly férové.“
- „Tahle fotka zatím čeká na odhalení detailů.“
- „Viditelnost může autor změnit i zpětně.“
- „AW věk je komunitní dojem, ne zdravotní ukazatel.“

---

## 29. Rizika produktu

Hlavní rizika:

1. age-shaming / negativní vnímání věku
2. body-shaming
3. privacy incidenty
4. špatná interpretace AW věku jako zdravotní metriky
5. manipulace tipů
6. příliš složitá reveal logika pro uživatele
7. nízká retence po prvním tipu
8. influencer kampaně bez dlouhodobé komunity
9. reklama působící necitlivě
10. nedostatečné backend vynucení pravidel

Protiopatření:

- pozitivní copywriting
- silná moderace
- jasné disclaimery
- backend-enforced privacy
- vážené tipy podle reputace
- delayed reveal
- jednoduché vysvětlení AW metrik
- onboarding zaměřený na první upload + první tipy + první statistiku

---

## 30. Instrukce pro AI asistenta v projektu

AI asistent pracující v Codexu by měl dodržovat tato pravidla:

### 30.1 Vždy respektuj AW logiku

- AW věk není biologický ani zdravotní údaj
- real age fotky se počítá k `taken_at`, ne k dnešku
- tipovaný věk je 16 až 116
- backend musí clampovat
- `weight_at_guess` je neměnný snapshot
- budoucí reputace nesmí změnit minulost
- aktuální AW věk profilu používá 5leté okno
- `include_in_global_aw` určuje započítání do globálního AW

### 30.2 Vždy respektuj privacy

- `everyone`, `contacts`, `private`
- accepted connection je jediný kontakt
- aktuální visibility platí i zpětně
- `/my-tips` není výjimka
- komentáře se řídí cílovým obsahem
- nejpřísnější pravidlo vyhrává
- admin / moderator / super_user vidí vše kvůli správě

### 30.3 Nepřesouvej citlivou logiku pouze na frontend

Frontend může:

- zobrazovat stav
- interpretovat hlášky
- skrývat prvky v UI

Ale nesmí být jediným místem pro:

- access control
- privacy
- reveal
- AW výpočty
- komentáře
- retroaktivní změny

### 30.4 Při návrhu funkcí mysli na produkt i business

Každá nová funkce má být posouzena podle:

- zvyšuje zvědavost?
- podporuje první upload?
- vede k více tipům?
- zvyšuje retenci přes statistiky?
- neporušuje privacy?
- neoslabuje férovost?
- je komunikovatelná pozitivně?
- má monetizační nebo growth potenciál?

### 30.5 Při psaní copy používej pozitivní jazyk

Preferuj:

- „mladší dojem“
- „zralejší dojem“
- „působí přibližně na svůj věk“
- „komunitní odhad“
- „vývoj v čase“
- „férové tipování“

Nepoužívej:

- „starý“ jako hodnocení osoby
- „vypadáš hůř“
- „biologický věk“
- „diagnostika“
- „zdravotní skóre“

---

## 31. Rychlý checklist před úpravou kódu

Před každou změnou si ověř:

- Je změna kompatibilní s RLS / backend access logikou?
- Neodhaluje UI něco, co backend nesmí povolit?
- Respektuje `private`, `contacts`, `everyone`?
- Funguje retroaktivní změna viditelnosti?
- Neobchází `/my-tips` privacy?
- Nezobrazuje komentáře dřív než cílový obsah?
- Zachovává `weight_at_guess` jako snapshot?
- Nepočítá real age podle dneška?
- Používá `post_albums`, ne legacy `posts.album_id`?
- Neinterpretuje AW věk jako medicínu?
- Je copy pozitivní?

---

## 32. Finální shrnutí

AgeWinners stojí na pěti pilířích:

1. zvědavost: „Na kolik let působím?“
2. hra: tipování a přesnost
3. férovost: vážené tipy podle reputace
4. statistiky: vývoj AW věku v čase
5. privacy: kontrola, anonymita a retroaktivní dopad

Nejdůležitější pravidla:

- AW věk je komunitní dojem, ne biologický ani zdravotní údaj
- fotka je hlavní jednotka AW systému
- skutečný věk se počítá k datu pořízení fotky
- tipy se váží podle přesnosti tipujícího
- `weight_at_guess` se nikdy nemění
- aktuální visibility platí i zpětně
- `/my-tips` není privacy výjimka
- komentáře závisí na cílovém obsahu
- alba jsou kolekce postů
- business logika patří do DB / RPC / backendu

Tento dokument je určen jako pracovní kontext pro Codex a další AI asistenty při vývoji, refaktoringu, návrhu funkcí, UX, marketingu a strategii AgeWinners.


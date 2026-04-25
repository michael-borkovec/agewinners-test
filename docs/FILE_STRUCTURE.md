app/

&#x20; layout.tsx — root layout aplikace



&#x20; users/[userId]/

&#x20;   page.tsx — veřejná profilová karta uživatele:

&#x20;     - načítá profil, síťové vazby, AW summary a výzvy

&#x20;     - při zobrazení cizího profilu zapisuje návštěvu přes recordProfileVisit()

&#x20;     - vlastní návštěvy se nezapisují



&#x20; admin/

&#x20;   page.tsx — administrace:

&#x20;     - přepínání tabs (Uživatelé / Fotky)

&#x20;     - user management

&#x20;     - super\_user toggle

&#x20;     - řazení sloupců v user tabulce

&#x20;     - image moderation / verification / report review



&#x20; my-posts/

&#x20;   page.tsx — moje posty:

&#x20;     - zobrazení vlastních postů uživatele

&#x20;     - renderuje posty přes PostCard

&#x20;     - návaznost na nový model alb:

&#x20;       - post může být v albu přes post\_albums

&#x20;     - používá owner-view logiku pro vlastní fotky

&#x20;     - při budoucích úpravách:

&#x20;       - zde se řeší seznam vlastních postů

&#x20;       - samotné fotky a jejich info box řeší hlavně PostCard



&#x20; my-tips/

&#x20;   page.tsx — historie tipů uživatele:

&#x20;     - layout postů a fotek

&#x20;     - reveal logika

&#x20;     - anonymita autora do odhalení

&#x20;     - image comments (read + write)

&#x20;     - privileged viewer bypass (super\_user / moderator / admin)

&#x20;     - používá loadMyTipPosts()

&#x20;     - filtrace:

&#x20;       - kategorie fotek

&#x20;       - stav tipů

&#x20;       - viditelnost

&#x20;       - pouze alba

&#x20;     - TipPhotoCard:

&#x20;       - náhled tipované fotky

&#x20;       - po odhalení ukazuje:

&#x20;         - Skutečný věk

&#x20;         - AW věk

&#x20;         - Můj tip

&#x20;       - komentáře k fotce po odhalení

&#x20;     - zoom modal:

&#x20;       - zvětšená fotka

&#x20;       - stejné info boxy

&#x20;       - datum tipu ve formátu DD. MM. RRRR

&#x20;       - ID fotky

&#x20;     - zde se řeší:

&#x20;       - kde se načítají moje tipy

&#x20;       - kde se řeší reveal tipů

&#x20;       - kde se řeší komentáře k tipovaným fotkám



&#x20; my-albums/

&#x20;   page.tsx — moje alba:

&#x20;     - stránka pro správu alb aktuálního uživatele

&#x20;     - album = kolekce postů

&#x20;     - načítá data přes getAlbumsWithPosts()

&#x20;     - zobrazuje alba a uvnitř jejich posty

&#x20;     - používá PostCard s hideAlbumBadge

&#x20;     - akce:

&#x20;       - smazat album

&#x20;       - editovat album

&#x20;     - editace alba:

&#x20;       - změna názvu

&#x20;       - změna popisu

&#x20;       - odebrání vybraných postů z alba

&#x20;     - mazání alba:

&#x20;       - pouze album

&#x20;       - album + všechny posty

&#x20;     - zde se řeší:

&#x20;       - kde se zobrazuje struktura album → posty

&#x20;       - kde se spouští editace alba

&#x20;       - kde se spouští mazání alba



&#x20; profile/

&#x20;   basic/

&#x20;     page.tsx — základní profil:

&#x20;       - načtení vlastního profilu

&#x20;       - editace jména, bio a avataru

&#x20;       - práce s getMyProfile / updateMyBasicProfile / uploadMyAvatar



&#x20;   personal/

&#x20;     page.tsx — personal data profil:

&#x20;       - rozšířená osobní data uživatele

&#x20;       - používá updateMyPersonalProfile



&#x20;   privacy/

&#x20;     page.tsx — soukromí \& personalizace:

&#x20;       - default visibility pro nové posty / alba / fotky

&#x20;       - allow\_age\_visible

&#x20;       - allow\_connection\_requests

&#x20;       - allow\_following

&#x20;       - anonymous\_guesses\_default

&#x20;       - reveal minulých tipů

&#x20;       - připravený koncept pro “Aplikovat zpětně”

&#x20;       - nový význam v kontextu alb:

&#x20;         - globální default pro alba

&#x20;         - konkrétní album může mít vlastní visibility override



&#x20;   stats/

&#x20;     page.tsx — hlavní stránka statistik:

&#x20;       - grafy

&#x20;       - tabulka aktivity

&#x20;       - napojení na stats API

&#x20;       - skládá hlavní widgets a grafy

&#x20;       - používá:

&#x20;         - RealVsGuessedScatter

&#x20;         - AwAgeTrajectoryChart

&#x20;       - zde se řeší stránková kompozice statistik



components/

&#x20; AuthShell.tsx — hlavní authenticated shell:

&#x20;   - načtení profilu pro session

&#x20;   - předávání dat do sidebaru

&#x20;   - layout s levým sidebar menu



&#x20; LeftSidebar.tsx — levý sidebar:

&#x20;   - avatar

&#x20;   - jméno

&#x20;   - bio

&#x20;   - menu profilu

&#x20;   - podpora snake\_case i camelCase profilových dat



&#x20; MyStatsSummary.tsx — sidebar widget:

&#x20;   - AW věk

&#x20;   - AW skóre

&#x20;   - power score



&#x20; SectionHeaderFilter.tsx — univerzální filtr:

&#x20;   - kategorie

&#x20;   - stav

&#x20;   - viditelnost

&#x20;   - používán např. v my-tips



&#x20; avatar.tsx — avatar komponenta / rendering avataru



&#x20; NewPostForm.tsx — vytvoření nového postu:

&#x20;   - formulář publikace postu

&#x20;   - nově umožňuje:

&#x20;     - přidat post do existujícího alba

&#x20;     - nebo vytvořit nové album pro tento post

&#x20;   - stará podmínka „stejný rok“ byla odstraněna

&#x20;   - zde se řeší:

&#x20;     - album výběr při publikaci

&#x20;     - album creation při publikaci



&#x20; PostCard.tsx — karta postu:

&#x20;   - hlavní render postu

&#x20;   - používá se ve feedu / moje posty / moje alba

&#x20;   - zobrazuje:

&#x20;     - autora

&#x20;     - title / text

&#x20;     - fotky

&#x20;   - pro owner-view:

&#x20;     - u fotek zobrazuje info box:

&#x20;       - Skutečný věk

&#x20;       - AW věk

&#x20;       - AW skóre

&#x20;     - stejné info ukazuje i při zoomu fotky

&#x20;   - album logika:

&#x20;     - čte album info z postu

&#x20;     - podporuje hideAlbumBadge

&#x20;     - umožňuje přidat post do alba

&#x20;     - umožňuje odebrat post z alba

&#x20;   - image akce:

&#x20;     - editace fotky

&#x20;     - smazání fotky

&#x20;     - report fotky

&#x20;   - post akce:

&#x20;     - smazat post

&#x20;     - uložit post

&#x20;     - skrýt post

&#x20;   - guessing logika:

&#x20;     - single image guess

&#x20;     - album guess

&#x20;     - reveal / anonymita / viewed state

&#x20;   - zde leží klíčová UI logika vlastních fotek i alb



&#x20; auth/

&#x20;   AuthContext.tsx — autentizace a user context:

&#x20;     - aktuální přihlášený uživatel

&#x20;     - auth loading stav

&#x20;     - poskytování userId do stránek



&#x20; stats/

&#x20;   AwAgeTrajectoryChart.tsx — trajectory graf AW věku:

&#x20;     - 50d

&#x20;     - 1y

&#x20;     - 10y

&#x20;     - life

&#x20;     - zobrazuje vývoj AW věku v čase

&#x20;     - varianty:

&#x20;       - 50 dní

&#x20;       - 1 rok

&#x20;       - 10 let

&#x20;       - celý život

&#x20;     - černá = skutečný věk

&#x20;     - zelená = AW věk



&#x20;   RealVsGuessedScatter.tsx — scatter graf:

&#x20;     - real age vs guessed age

&#x20;     - raw/byYear pohled

&#x20;     - klik na bod v raw režimu otevře detail fotky

&#x20;     - detail fotky ukazuje:

&#x20;       - Skutečný věk

&#x20;       - AW věk

&#x20;       - AW skóre

&#x20;     - datum pod fotkou ve formátu CZ

&#x20;     - zde se řeší:

&#x20;       - klikací detail fotky ve statistikách



lib/

&#x20; supabaseClient.ts — inicializace Supabase klienta na frontendu



&#x20; supabaseAdmin.ts — inicializace Supabase admin klienta / service role

&#x20;   - používáno v admin API routes



&#x20; api/

&#x20;   comments.ts — API pro komentáře:

&#x20;     - getImageComments

&#x20;     - getPostComments

&#x20;     - createImageComment

&#x20;     - createPostComment

&#x20;     - odvozená access logika z visibility obsahu

&#x20;     - podpora hierarchy:

&#x20;       album -> post -> image

&#x20;     - privileged viewer bypass

&#x20;     - contacts/private/everyone enforcement

&#x20;     - zde se řeší komentáře k fotkám v my-tips



&#x20;   myTips.ts — načítání tipů uživatele:

&#x20;     - loadMyTipPhotos

&#x20;     - loadMyTipPosts

&#x20;     - seskupení podle postů

&#x20;     - napojení na posts / images / albums

&#x20;     - effective visibility enforcement

&#x20;     - privileged viewer bypass

&#x20;     - vrací:

&#x20;       - realAgeYears

&#x20;       - awAgeYears

&#x20;       - guessedAge

&#x20;       - createdAt

&#x20;     - pravidlo visibility:

&#x20;       - post mimo album → post.visibility

&#x20;       - post v albu → album.visibility

&#x20;     - zde se řeší:

&#x20;       - kde se načítají moje tipy

&#x20;       - kde je effective visibility logika pro my-tips



&#x20;   network.ts — síť uživatele:

&#x20;     - listMyConnections

&#x20;     - listMyFollowers

&#x20;     - listMyFollowing

&#x20;     - requests

&#x20;     - accept / decline / cancel

&#x20;     - práce s connections tabulkou



&#x20;   posts.ts — post API + kategorie:

&#x20;     - PHOTO\_CATEGORY\_LABELS

&#x20;     - typy kategorií

&#x20;     - pomocné post/foto konstanty

&#x20;     - načítání postů s obrázky

&#x20;     - attach autorů

&#x20;     - attach album info přes post\_albums

&#x20;     - zde se řeší:

&#x20;       - kde se načítají posty

&#x20;       - kde se doplňuje album info do postů



&#x20;   stats.ts — statistické API:

&#x20;     - getMyStats

&#x20;     - getMyAwAgeCurrent

&#x20;     - getMyAwAgeTrajectory

&#x20;     - getMyActivity50Days

&#x20;     - power score

&#x20;     - getMyRealVsGuessedRows

&#x20;     - getMyRealVsGuessedByYear

&#x20;     - zde se řeší datová vrstva pro grafy statistik



&#x20;   userProfiles.ts — sjednocené profilové API:

&#x20;     - getMyProfile

&#x20;     - updateMyBasicProfile

&#x20;     - updateMyPersonalProfile

&#x20;     - updateMyPrivacySettings

&#x20;     - updateMyGuessPrivacySettings

&#x20;     - uploadMyAvatar

&#x20;     - removeMyAvatar

&#x20;     - revealMyGuesses

&#x20;     - updateMyDateOfBirthSuperUser

&#x20;     - applyMyPostVisibilityBackfill

&#x20;     - applyMyAlbumVisibilityBackfill

&#x20;     - applyMyImageVisibilityBackfill

&#x20;     - zpětná kompatibilita pro camelCase i snake\_case



&#x20;   albums.ts — API pro alba:

&#x20;     - createAlbum()

&#x20;     - getAlbumsByOwner()

&#x20;     - addPostToAlbum()

&#x20;     - removePostFromAlbum()

&#x20;     - removePostFromAnyAlbum()

&#x20;     - updateAlbumDetails()

&#x20;     - updateAlbumVisibility()

&#x20;     - deleteMyAlbum()

&#x20;     - getAlbumsWithPosts()

&#x20;     - hlavní odpovědnosti:

&#x20;       - album CRUD

&#x20;       - vazba post ↔ album přes post\_albums

&#x20;       - robustní načítání album → posts → images

&#x20;     - zde se řeší:

&#x20;       - kde je album logika

&#x20;       - kde se načítají alba s posty

&#x20;       - kde se maže album

&#x20;       - kde se edituje název a popis alba



&#x20;   ageGuesses.ts — tipování věku:

&#x20;     - createAlbumGuess()

&#x20;     - návazné helpers pro guess flow

&#x20;     - zde se řeší album guessing logika



&#x20;   images.ts — práce s fotkami:

&#x20;     - getMyImageForEdit()

&#x20;     - updateMyImageMetadata()

&#x20;     - deleteMyImageCompletely()

&#x20;     - zde se řeší:

&#x20;       - editace metadat fotky

&#x20;       - smazání vlastní fotky



app/api/

&#x20; admin/

&#x20;   me/

&#x20;     route.ts — vrací roli aktuálního uživatele pro admin shell



&#x20;   users/

&#x20;     route.ts — admin správa uživatelů:

&#x20;       - GET seznam uživatelů

&#x20;       - PATCH role

&#x20;       - PATCH super\_user

&#x20;       - DELETE uživatele

&#x20;       - čtení user\_profiles.super\_user



&#x20;   users/password/

&#x20;     route.ts — admin reset / změna hesla uživatele



&#x20;   images/

&#x20;     route.ts — admin práce s fotkami:

&#x20;       - list

&#x20;       - filtrování

&#x20;       - mazání

&#x20;       - report režim



&#x20;   images/verify/

&#x20;     route.ts — verifikace / odverifikace fotek



&#x20;   image-reports/

&#x20;     route.ts — review nahlášení fotek:

&#x20;       - confirm / reject

&#x20;       - změna report reason

&#x20;       - admin note

&#x20;       - otherCoef pro kategorii “Ostatní”



database (Supabase)

&#x20; tables:

&#x20;   user\_profiles — uživatelé:

&#x20;     - display\_name

&#x20;     - avatar\_url

&#x20;     - bio

&#x20;     - date\_of\_birth

&#x20;     - default\_post\_visibility

&#x20;     - default\_album\_visibility

&#x20;     - default\_image\_visibility

&#x20;     - allow\_age\_visible

&#x20;     - allow\_connection\_requests

&#x20;     - allow\_following

&#x20;     - anonymous\_guesses\_default

&#x20;     - super\_user

&#x20;     - role



&#x20;   posts — příspěvky:

&#x20;     - author\_user\_id

&#x20;     - title / text / body

&#x20;     - visibility


&#x20;     - created\_at



&#x20;   images — fotky:

&#x20;     - uploader\_user\_id

&#x20;     - public\_url

&#x20;     - public\_url\_thumb

&#x20;     - taken\_at

&#x20;     - real\_age\_years

&#x20;     - visibility

&#x20;     - include\_in\_global\_aw

&#x20;     - aw\_age\_image

&#x20;     - photo\_category

&#x20;     - comment



&#x20;   albums — alba:

&#x20;     - owner\_user\_id

&#x20;     - title

&#x20;     - description

&#x20;     - visibility

&#x20;     - aw\_age



&#x20;   age\_guesses — tipy:

&#x20;     - guessed age

&#x20;     - weight\_at\_guess

&#x20;     - accuracy agregace

&#x20;     - vazba na fotku a tipujícího



&#x20;   comments — komentáře:

&#x20;     - author\_user\_id

&#x20;     - post\_id

&#x20;     - image\_id

&#x20;     - parent\_comment\_id

&#x20;     - body

&#x20;     - target\_type

&#x20;     - is\_deleted

&#x20;     - is\_hidden\_by\_moderation

&#x20;     - author snapshot data



&#x20;   connections — kontakty:

&#x20;     - user\_id\_a

&#x20;     - user\_id\_b

&#x20;     - requested\_by

&#x20;     - status

&#x20;     - accepted connection = contact relationship



&#x20;   post\_images — vazba post <-> image



&#x20;   post\_albums — vazba post <-> album:

&#x20;     - post\_id

&#x20;     - album\_id

&#x20;     - sort\_order

&#x20;     - created\_at

&#x20;     - nový source of truth pro zařazení postu do alba



&#x20; key visibility logic:

&#x20;   - posts.visibility

&#x20;   - images.visibility

&#x20;   - albums.visibility

&#x20;   - effective access hierarchy:

&#x20;     image = image + post + optional album

&#x20;     post = post + optional album

&#x20;   - privileged viewer bypass:

&#x20;     super\_user = true

&#x20;     role = moderator

&#x20;     role = admin

&#x20;   - nový zjednodušený princip pro album režim:

&#x20;     - post mimo album → post.visibility

&#x20;     - post v albu → album.visibility



&#x20; RPC functions:

&#x20;   get\_my\_stats

&#x20;   get\_my\_stats\_filtered

&#x20;   get\_my\_power\_score

&#x20;   get\_my\_aw\_age\_current — aktuální AW věk (5 let window)

&#x20;   get\_my\_aw\_age\_trajectory — trajectory graf:

&#x20;     - 50d (days)

&#x20;     - 1y (weeks)

&#x20;     - 10y (months)

&#x20;     - life (years)

&#x20;   aw\_user\_activity\_50\_days — aktivita uživatele



docs/

&#x20; AW\_DATABASE\_STRUCTURE.md — databázová struktura

&#x20; AW\_file\_structure\_info.md — struktura projektu

&#x20; AW\_iteration\_history.md — historie iterací



Klíčová orientace pro příští session

&#x20; kde se načítá profil:

&#x20;   - profile route + user\_profiles přes API helpers

&#x20;   - auth stav přes AuthContext



&#x20; kde se řeší komentáře:

&#x20;   - lib/api/comments.ts

&#x20;   - UI hlavně app/my-tips/page.tsx



&#x20; kde je visibility logika:

&#x20;   - lib/api/myTips.ts

&#x20;   - návazně posts/albums model

&#x20;   - pravidlo album přepisuje post



&#x20; kde je admin / privileged logika:

&#x20;   - user\_profiles.super\_user / role

&#x20;   - kontrola v my-tips a dalších view-modech



&#x20; kde je my-tips logika:

&#x20;   - app/my-tips/page.tsx

&#x20;   - lib/api/myTips.ts



&#x20; kde jsou statistiky:

&#x20;   - app/stats/page.tsx

&#x20;   - app/profile/stats/page.tsx — legacy redirect na /stats

&#x20;   - components/stats/RealVsGuessedScatter.tsx

&#x20;   - components/stats/AwAgeTrajectoryChart.tsx

&#x20;   - lib/api/stats.ts



&#x20; kde je network:

&#x20;   - lib/api/network.ts

&#x20;   - network UI mimo aktuální změny



Důležité constraints

&#x20; - album už není svázané s jedním postem ani jedním rokem

&#x20; - album je kolekce postů

&#x20; - fotka dědí album kontext přes svůj post

&#x20; - u postu v albu se práva řídí podle alba

&#x20; - u vlastních fotek:

&#x20;   - moje posty / moje alba → Skutečný věk / AW věk / AW skóre

&#x20; - u my-tips:

&#x20;   - Skutečný věk / AW věk / Můj tip

&#x20; - stats detail:

&#x20;   - Skutečný věk / AW věk / AW skóre

Album model notes (current implementation)

&#x20; - `post_albums` = jedinÃ½ source of truth pro zaÅ™azenÃ­ postu do alba

&#x20; - `posts.album_id` = legacy, nepouÅ¾Ã­vat v aktivnÃ­ logice

&#x20; - `album_images` = nepouÅ¾Ã­vat v aktivnÃ­ logice

&#x20; - album mÅ¯Å¾e bÃ½t prÃ¡zdnÃ©

&#x20; - post bez fotek nenÃ­ validnÃ­ a mÃ¡ se odstranit

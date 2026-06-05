/**
 * File purpose
 * - Central catalog for contextual and global help content
 * Main responsibilities
 * - Keep modal help and global help in sync
 * - Provide labels, structured content, and navigation paths
 * Related APIs, components, or modules
 * - components/HelpIconButton.tsx
 * - components/help/StandardHelpContent.tsx
 * - app/help/page.tsx
 */

export type HelpCard = {
  title: string;
  text: string;
  kind?: "line" | "diagonal" | "solid" | "dashed";
};

export type HelpEntry = {
  key: string;
  sectionId: string;
  sectionTitle: string;
  groupTitle?: string;
  overviewTitle?: string;
  overviewText?: string;
  title: string;
  intro: string;
  cards: HelpCard[];
  tip?: string;
};

const statsOverviewIntro =
  "Můj vývoj je analytická část AW: místo, kde se jednotlivé fotky, tipy a zápisy skládají do delšího příběhu. Najdeš tu AW věk, AW skóre, aktivitu, návštěvnost, přesnost tipů, výzvy i dobrovolné wellbeing záznamy. Smyslem není jen vidět jedno číslo, ale pochopit trend — co se mění, co zůstává stabilní a kde má smysl podívat se hlouběji.";

export const helpCatalog: HelpEntry[] = [
  {
    key: "feed",
    sectionId: "feed",
    sectionTitle: "Feed",
    title: "Feed",
    intro:
      "Feed je živý proud fotek ostatních uživatelů, kde svými tipy pomáháš vytvářet jejich AW výsledek. Je určený hlavně k objevování a tipování: prohlížíš fotky, dáváš odhad věku a postupně tím zpřesňuješ obraz toho, jak lidé na AgeWinners působí. Když chceš výběr lépe přizpůsobit tomu, co tě zajímá, použij filtr; když chceš nový mix fotek, pomůže refresh.",
    cards: [
      { title: "Co se zobrazuje", text: "Vidíš fotky ostatních, které můžeš tipovat. Vlastní fotky ani běžně už tipované fotky se ti tu nezobrazují." },
      { title: "Filtr a refresh", text: "Ve filtru vybíráš, co chceš právě vidět, a můžeš se k němu kdykoliv vrátit. Výběr upravíš podle tagů a skrytých fotek; refresh pak načte nový výběr podle aktuálního nastavení." },
      { title: "Proč tipovat", text: "Každý tip pomáhá zpřesňovat AW výsledek ostatních a dává prostor i novým nebo méně tipovaným fotkám." },
    ],
    tip: "Když chceš pestřejší výběr, pracuj s filtrem a průběžně obnovuj nabídku.",
  },
  {
    key: "my-posts",
    sectionId: "my-posts",
    sectionTitle: "Moje posty",
    title: "Moje posty",
    intro:
      "Moje posty jsou tvoje pracovní plocha pro vlastní obsah. Tady nahráváš nové příspěvky, vracíš se k už publikovaným fotkám, upravuješ jejich popis i zařazení a hlídáš, jak je tvůj profil poskládaný. Čím pečlivěji tu obsah připravíš, tím snáz se později filtruje, používá ve výzvách a promítá do statistik.",
    cards: [
      { title: "Co tu děláš", text: "Nahráváš, upravuješ a kontroluješ vlastní příspěvky a fotky." },
      { title: "Filtr a refresh", text: "Filtr zúží zobrazení podle tagů fotek. Refresh načte aktuální stav po změnách obsahu." },
      { title: "Proč popisovat fotky", text: "Dobře popsané fotky se lépe filtrují, snáz se používají ve výzvách a později dávají přehlednější statistiky." },
    ],
    tip: "Když si dáš záležet na tagách hned při nahrání, později se ti bude celý profil ovládat lehčeji.",
  },
  {
    key: "my-tips",
    sectionId: "my-tips",
    sectionTitle: "Moje tipy",
    title: "Moje tipy",
    intro:
      "Moje tipy jsou tvoje osobní historie tipování. Vracíš se sem k postům a albům, které jsi už pomohl vyhodnotit, sleduješ jejich postupné odhalení a můžeš si znovu projít obsah, u kterého už znáš výsledek. Sekce je užitečná hlavně tehdy, když chceš pochopit, jak se tvoje tipování potkává se skutečnými fotkami a kdy se obsah po čekací době odemkne.",
    cards: [
      { title: "Co tu vidíš", text: "Posty a alba, u kterých jsi už tipoval všechny fotky." },
      { title: "Filtry", text: "Pracují s kategoriemi, stavem tipu, viditelností a typem obsahu." },
      { title: "Odhalení", text: "Obsah i autor se odhalují se zpožděním, aby tipování zůstalo nezávislé na jménu, profilu nebo sympatiích." },
    ],
    tip: "Refresh načte aktuální stav odhalení, pokud čekáš na nové výsledky.",
  },
  {
    key: "network",
    sectionId: "network",
    sectionTitle: "Moje síť",
    title: "Moje síť",
    intro:
      "Moje síť je místo pro správu vztahů v AW. Vidíš tu své kontakty, sledování, příchozí i odchozí žádosti a můžeš vyhledávat další lidi podle toho, koho chceš najít nebo s kým chceš zůstat ve spojení. Sekce pomáhá držet sociální část aplikace přehlednou: jiné je vzájemné spojení, jiné pouhé sledování a jinou roli mají žádosti, které teprve čekají na rozhodnutí.",
    cards: [
      { title: "Spojení", text: "Spojení jsou rovnocenná, sledování je jednostranné." },
      { title: "Hledání a refresh", text: "Filtr otevře pokročilé hledání lidí a refresh stáhne aktuální stav spojení, sledujících i žádostí." },
      { title: "Blokace", text: "Vychází z aktuálního seznamu blokovaných uživatelů a ovlivňuje, kdo se ti může zobrazovat." },
    ],
    tip: "Příchozí žádosti najdeš i v upozorněních, ale úplný přehled drží právě Moje síť.",
  },
  {
    key: "notifications",
    sectionId: "notifications",
    sectionTitle: "Upozornění",
    title: "Upozornění",
    intro:
      "Upozornění jsou tvoje vstupní brána k tomu, co se v AW právě stalo. Shromažďují nové žádosti, změny v síti i komentáře k tvým fotkám, takže nemusíš procházet každou sekci zvlášť. Používej je pro rychlou reakci na nové dění a nastavením si nech jen ty typy zpráv, které pro tebe mají skutečnou hodnotu.",
    cards: [
      { title: "Co shrnují", text: "Žádosti o spojení, změny v síti a komentáře k tvým fotkám." },
      { title: "Nastavení", text: "Ikona nastavení otevře výběr typů upozornění, které chceš dostávat." },
      { title: "Rychlé akce", text: "Příchozí žádosti můžeš vyřídit přímo z upozornění." },
    ],
    tip: "Refresh načte aktuální přehled, když čekáš na novou aktivitu.",
  },
  {
    key: "changes-overview",
    sectionId: "changes",
    sectionTitle: "Výzvy a změny",
    title: "Výzvy a změny",
    intro:
      "Výzvy a změny jsou dvě různé cesty, jak v AW zachytit proměnu v čase. Výzva míří dopředu: stanovíš si cíl a později porovnáváš výsledek se startem. Změna se naopak dívá zpět a skládá příběh z už existujících postů a fotek. Když chceš sledovat budoucí posun, použij výzvu; když chceš ukázat cestu, která už proběhla, použij změnu.",
    cards: [
      { title: "Výzvy", text: "Sledují budoucí posun AW skóre. Na začátku se uloží startovní hodnota a později se porovná s výsledkem." },
      { title: "Změny", text: "Jsou zpětné kolekce postů a fotek, které mohou popisovat proměnu uživatele v čase." },
      { title: "Důležité", text: "Výzva sama nemění výpočet AW skóre. Jen uchovává cíl, termín a rozsah fotek pro srovnání průběhu." },
    ],
    tip: "Výzvu použij pro budoucí cíl, změnu pro příběh, který už se stal.",
  },
  {
    key: "messages",
    sectionId: "messages",
    sectionTitle: "Zprávy",
    title: "Zprávy",
    intro:
      "Zprávy jsou soukromý prostor pro přímou komunikaci v AW. Slouží hlavně pro rozhovory mezi propojenými uživateli, ale aplikace sem umí bezpečně vést i zprávy související se žádostí o spojení nebo její odpovědí. V konverzacích můžeš navazovat na konkrétní zprávy, reagovat emoji a držet kontakt tam, kde veřejný komentář nestačí.",
    cards: [
      { title: "Kdo si může psát", text: "Ve spojení si uživatelé mohou psát bez omezení. Mimo spojení se zprávy objevují jen v souvislosti se žádostí o spojení nebo jejím zamítnutím." },
      { title: "Práce v konverzaci", text: "Můžeš odpovídat na konkrétní zprávy, používat rychlé reakce a sledovat stav přečtení." },
      { title: "Bezpečnost", text: "Konverzaci lze zablokovat nebo nahlásit, pokud komunikace přestane být v pořádku." },
    ],
    tip: "Novou soukromou konverzaci zakládej tam, kde má rozhovor smysl pokračovat mimo veřejný prostor.",
  },
  {
    key: "challenge-create",
    sectionId: "changes",
    sectionTitle: "Výzvy a změny",
    groupTitle: "Výzvy",
    title: "AW výzvy",
    intro: "Výzva porovnává start a cíl, ale nemění oficiální výpočet AW skóre.",
    cards: [
      { title: "Start", text: "Při vytvoření se uloží aktuální AW skóre jako startovní hodnota." },
      { title: "Konec", text: "Na konci výzvy se porovná s konečným AW skóre podle existujících pravidel." },
      { title: "Co už nezměníš", text: "Po spuštění nejde zpětně změnit startovní hodnotu, cíl, původní termín ani rozsah fotek." },
    ],
    tip: "Soukromý cíl můžeš později zveřejnit, ale základ výzvy si před spuštěním dobře rozmysli.",
  },
  {
    key: "challenge-list",
    sectionId: "changes",
    sectionTitle: "Výzvy a změny",
    groupTitle: "Výzvy",
    title: "Moje výzvy",
    intro: "Seznam uložených výzev a jejich aktuálního stavu.",
    cards: [
      { title: "Uložené hodnoty", text: "Startovní a cílové AW skóre jsou uložené hodnoty pro porovnání průběhu." },
      { title: "Co můžeš upravit", text: "U aktivní výzvy lze upravit bezpečná pole, prodloužit termín, vytvořit tag a sdílet odkaz." },
      { title: "Párování fotek", text: "Fotky se párují buď automaticky podle období, nebo přes tag výzvy." },
    ],
    tip: "Když chceš přesně řídit, které fotky do výzvy patří, použij tag výzvy.",
  },
  {
    key: "aw-age-time",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "AW věk",
    title: "AW věk v čase",
    intro: "Graf ukazuje vývoj tvého AW věku v čase.",
    cards: [
      { title: "Zelená čára", text: "Tvůj AW věk. Když je níž než šedá diagonála, fotky působí mladším dojmem.", kind: "line" },
      { title: "Šedá diagonála", text: "Referenční věk, vůči kterému graf porovnává vývoj.", kind: "diagonal" },
      { title: "Plná čára", text: "Období s dostupnými daty.", kind: "solid" },
      { title: "Přerušovaná čára", text: "Mezi body chybí fotky nebo nový výpočet.", kind: "dashed" },
    ],
    tip: "Přepínačem Pohled měníš časový rozsah. Kliknutím na zelený bod otevřeš detail roku a můžeš přejít na fotky z tohoto období.",
  },
  {
    key: "stats-aw-age",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "AW věk",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "AW věk ukazuje, jak mladě nebo starší dojmem působí tvoje fotky v různých obdobích. Pomáhá sledovat nejen celkový trend, ale i to, zda výsledek vytváří dlouhodobá změna, konkrétní skupina fotek nebo rozdílné vnímání různými generacemi tipujících.",
    cards: [
      { title: "AW věk v čase", text: "Dlouhodobý vývoj podle období, ve kterých máš dostupná data." },
      { title: "Po jednotlivých fotkách", text: "Detailní pohled na rozdíl mezi skutečným věkem a dojmem konkrétní fotky." },
      { title: "Podle generací", text: "Srovnání toho, jak tě v průměru vnímají různé věkové skupiny tipujících." },
    ],
    tip: "Začni trendem v čase a do detailu po fotkách jdi až ve chvíli, kdy chceš pochopit, co ho vytváří.",
  },
  {
    key: "stats-activity",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Aktivita",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Aktivita ukazuje, jak se tvoje zapojení v AW skládá den po dni. Na jednom místě propojuje publikování, tipování i reakce ostatních, takže snadno poznáš, kdy byl tvůj profil živější, kdy ses více zapojoval a zda má tvoje používání AW určitý rytmus.",
    cards: [
      { title: "Co sleduje", text: "Fotky, posty, komentáře, tipy a lajky." },
      { title: "Časový rozsah", text: "Přehled pracuje s posledními až 50 dny." },
    ],
    tip: "Hledej rytmus a pravidelnost, ne jen jeden mimořádně silný den.",
  },
  {
    key: "stats-posts",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Vývoj příspěvků",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Vývoj příspěvků pomáhá pochopit, které části tvého obsahu fungují nejlépe a jakým způsobem. Nejde jen o pořadí nejúspěšnějších postů, ale i o rozdíl mezi dosahem, reakcemi a komentářovou aktivitou — tedy o to, zda obsah lidé jen viděli, nebo je skutečně vtáhl.",
    cards: [
      { title: "Nejvýkonnější příspěvky", text: "Srovnání podle zobrazení, komentářů, reakcí a uložení." },
      { title: "Dosah", text: "Vývoj toho, kolik lidí příspěvek vidělo v čase." },
      { title: "Diskuze", text: "Komentářová aktivita a tempo růstu rozhovoru." },
    ],
    tip: "Nejlepší příspěvek není vždy ten s nejvíc lajky; záleží, jestli právě sleduješ dosah, reakce nebo diskuzi.",
  },
  {
    key: "stats-traffic",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Návštěvnost",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Návštěvnost ukazuje, jak se k tvému profilu dostává pozornost ostatních. Pomáhá sledovat, kdy lidé přicházejí na tvoji profilovou kartu, jak se zájem mění v čase a zda se návštěvy pojí s růstem sítě nebo s konkrétním obdobím tvé aktivity.",
    cards: [
      { title: "Návštěvy profilu", text: "Počet zobrazení profilové karty v čase." },
      { title: "Růst sítě", text: "Nové kontakty a sledující jako doprovodný signál zájmu." },
    ],
    tip: "Návštěvnost dává největší smysl ve spojení s tím, co jsi v daném období publikoval.",
  },
  {
    key: "stats-wellbeing",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Wellbeing / Lifestyle",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Wellbeing / Lifestyle spojuje dobrovolné osobní záznamy s dlouhodobým pohledem na každodenní rytmus. Umožňuje vedle obsahu a tipování sledovat i náladu, energii, spánek, pohyb nebo návyky — tedy jemnější vrstvu života, která může pomoci chápat vlastní vývoj v širším kontextu.",
    cards: [
      { title: "Denní stav", text: "Nálada, energie, spánek, pohyb, hydratace a strava." },
      { title: "Trend", text: "Dlouhodobé grafy pomáhají vidět, co se opakuje." },
      { title: "Plány", text: "Návyky a osobní výzvy převádějí záměr do konkrétního nastavení." },
    ],
    tip: "Ber wellbeing jako dobrovolný osobní kompas, ne jako zdravotní diagnózu.",
  },
  {
    key: "stats-challenges",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Výzvy",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Výzvy shrnují, jak si stojí tvoje cílené pokusy o posun v čase. Místo obecného trendu sledují konkrétní cestu se startem, cílem, termínem a vybraným rozsahem fotek, takže dobře ukazují, jak se vyvíjí záměr, který sis předem pojmenoval.",
    cards: [
      { title: "Start a cíl", text: "Pracují s uloženým startovním a cílovým AW skóre." },
      { title: "Rozsah fotek", text: "Výzva může sledovat období nebo speciální tag." },
      { title: "Sdílení", text: "Veřejný odkaz umožní ukázat kartu výzvy i mimo samotný přehled." },
    ],
    tip: "Výzva je dobrá tam, kde chceš sledovat konkrétní cestu, ne jen obecný trend.",
  },
  {
    key: "stats-accuracy",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Moje přesnost",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Moje přesnost ukazuje, jak se vyvíjí kvalita tvého tipování i jeho objem. Díky spojení přesnosti a počtu tipů vidíš nejen to, jestli odhaduješ lépe, ale také zda se výsledek opírá o pravidelnou zkušenost nebo jen o několik jednotlivých období.",
    cards: [
      { title: "Přesnost tipů", text: "Jak blízko jsou tvoje odhady skutečnému věku." },
      { title: "Počet tipů", text: "Kolik odhadů jsi provedl po dnech, měsících nebo letech." },
    ],
    tip: "Společně tyto dva grafy ukazují nejen kolik tipuješ, ale i jak se v tom zlepšuješ.",
  },
  {
    key: "stats-power-score",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "Power skóre",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "Power skóre spojuje aktivitu, přesnost a přínos do jednoho doplňkového ukazatele. Ukazuje, jak silně se v daném období zapojuješ do systému AW, aniž by měnilo samotný AW věk nebo váhu tipů; je to spíš měřítko účasti než hodnocení vzhledu.",
    cards: [
      { title: "Co ovlivňuje", text: "Roste s aktivitou a přesností." },
      { title: "Co neovlivňuje", text: "Nemění AW věk ani váhu tipů." },
      { title: "Bonusy", text: "Denní série a aktivní pozvánky mohou přidat další body." },
    ],
    tip: "Power skóre čti jako energii účasti v systému, ne jako náhradu AW skóre.",
  },
  {
    key: "stats-aw-invites",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "AW pozvánky",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "AW pozvánky ukazují, jak se noví lidé zapojili díky tvému odkazu a jak se jejich skutečná aktivita promítá do bonusu. Sekce odlišuje pouhé použití odkazu od opravdové aktivace, takže vidíš nejen kolik lidí přišlo, ale i kdo se do AW skutečně zapojil.",
    cards: [
      { title: "Aktivace", text: "Počítá se registrace, alespoň 1 fotka a 10 tipů." },
      { title: "Doba bonusu", text: "Bonus běží 30 dní od aktivace." },
      { title: "Limit", text: "Do bonusu se počítá nejvýše 10 aktivních pozvánek s nejvyšším Power skóre." },
    ],
    tip: "Nejde jen o počet pozvaných, ale o to, zda se skutečně zapojí.",
  },
  {
    key: "stats-aw-score",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    title: "AW skóre",
    overviewTitle: "Můj vývoj",
    overviewText: statsOverviewIntro,
    intro:
      "AW skóre spojuje trend, rozklad a nejsilnější vlivy do jednoho pohledu na výsledek. Pomáhá přejít od otázky „jaké skóre mám“ k užitečnější otázce „z čeho se skládá, jak se mění a které příspěvky s ním nejvíc hýbou“.",
    cards: [
      { title: "Trend", text: "Denní, týdenní a měsíční pohled na vývoj." },
      { title: "Rozklad", text: "Přehled toho, z čeho se skóre skládá." },
      { title: "Vlivné příspěvky", text: "Obsah, který měl na AW největší dopad." },
    ],
    tip: "Nejdřív se podívej na trend, potom teprve na to, co ho nejvíc tvoří.",
  },
  {
    key: "photo-scatter",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "AW věk",
    title: "Po jednotlivých fotkách",
    intro: "Graf porovnává skutečný věk na fotce s AW věkem.",
    cards: [
      { title: "Zelený bod", text: "Každý bod představuje jednu fotku." },
      { title: "Pod diagonálou", text: "Fotka působí mladším dojmem." },
      { title: "Nad diagonálou", text: "Fotka působí starším dojmem." },
    ],
    tip: "Kliknutím na zelený bod otevřeš zvětšenou fotku a její základní hodnoty.",
  },
  {
    key: "activity-days",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Aktivita",
    title: "Aktivita po dnech",
    intro: "Denní historie posledních až 50 dní.",
    cards: [
      { title: "Co sleduje", text: "Fotky, posty, komentáře, tipy a lajky." },
      { title: "Jak číst graf", text: "Každý den ukazuje, co se v daném období skutečně stalo." },
    ],
    tip: "Použij graf pro rychlé rozpoznání rytmu aktivity, ne jen jednotlivých špiček.",
  },
  {
    key: "top-posts",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Vývoj příspěvků",
    title: "Top 10 příspěvků",
    intro: "Tabulka ukazuje tvých 10 nejlepších příspěvků podle zvoleného sloupce.",
    cards: [
      { title: "Komentáře", text: "Zahrnují komentáře k příspěvku i k fotkám v příspěvku." },
      { title: "Lajky a tipy", text: "Lajky jsou zatím součtem lajků na fotkách; tipy součtem tipů na fotkách v příspěvku." },
      { title: "Zobrazení", text: "Metrika je připravená, ale zatím se nesbírá, proto bude nulová do přidání trackingu." },
    ],
    tip: "Řaď tabulku podle metriky, která odpovídá tomu, co právě chceš pochopit.",
  },
  {
    key: "profile-visits",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Návštěvnost",
    title: "Návštěvy profilu",
    intro: "Graf ukazuje počet zobrazení tvé profilové karty za posledních 30 dní.",
    cards: [
      { title: "Vlastní návštěvy", text: "Zobrazení vlastního profilu se nepočítá." },
      { title: "Ochrana proti duplicitám", text: "Stejné zobrazení ze stejného prohlížeče se zapíše nejvýše jednou za 30 minut." },
    ],
    tip: "Sleduj spíš trend než jednotlivé dny; ten ukáže, jestli profil dlouhodobě získává pozornost.",
  },
  {
    key: "recent-visits",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Návštěvnost",
    title: "Poslední návštěvy",
    intro: "Seznam ukazuje, kdo si zobrazil tvoji veřejnou profilovou kartu a kdy.",
    cards: [
      { title: "Soukromí", text: "Vidíš pouze návštěvy svého profilu." },
      { title: "Co nevidí ostatní", text: "Ostatní uživatelé tvoje návštěvy nevidí." },
    ],
    tip: "Tato tabulka je osobní přehled, ne veřejný žebříček.",
  },
  {
    key: "today-rhythm",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Wellbeing / Lifestyle",
    title: "Dnešní rytmus",
    intro: "Souhrn dnešního wellbeing zápisu a jeho ovládání.",
    cards: [
      { title: "Rychlý přehled", text: "Nahoře vidíš energii, spánek, pohyb a tekutiny." },
      { title: "Viditelnost", text: "Nastavuješ ji pro celý dnešní zápis: Všichni, Kontakty nebo Soukromé." },
      { title: "Uložení", text: "Tlačítko uloží všechny vyplněné položky najednou. Hodnota --- znamená, že položku dnes nechceš vyplnit." },
    ],
    tip: "Výchozí viditelnost se bere z nastavení profilu, ale pro konkrétní den ji můžeš změnit.",
  },
  {
    key: "plans-habits",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Wellbeing / Lifestyle",
    title: "Plány a návyky",
    intro: "Dopředné nastavení pro spánek, pohyb, tekutiny a stravu.",
    cards: [
      { title: "Budoucí dny", text: "Na rozdíl od historie je možné upravovat i budoucí dny." },
      { title: "Ukládání", text: "Změny se ukládají až tlačítkem Uložit změny, aby tabulka nereagovala pomalu po každé položce." },
      { title: "Porovnání s realitou", text: "Když plánovaný den nastane, jeho plán se v historických grafech ukáže světle vedle skutečného zápisu." },
    ],
    tip: "Plán ti ukazuje záměr; historie pak ukáže, jak se skutečně podařil.",
  },
  {
    key: "challenge-stats",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Výzvy",
    title: "Moje výzvy",
    intro: "Statistika výzev pracuje s uloženými hodnotami konkrétní výzvy.",
    cards: [
      { title: "Co používá", text: "Startovní AW skóre, cílové AW skóre, termín, viditelnost a rozsah fotek." },
      { title: "Co nedělá", text: "AW skóre se nepočítá jinak; výzva jen porovnává hodnotu na začátku a na konci." },
    ],
    tip: "Čti výzvu jako měření cesty, ne jako nový způsob výpočtu AW.",
  },
  {
    key: "accuracy-trend",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Moje přesnost",
    title: "Přesnost tipů",
    intro: "Graf ukazuje, jak se v čase vyvíjí tvoje průměrná přesnost tipů.",
    cards: [
      { title: "Význam", text: "Vyšší procento znamená přesnější odhady věku." },
      { title: "Zdroj dat", text: "Hodnoty vznikají z denních snapshotů, takže graf ukazuje trend, ne každé jednotlivé tipnutí." },
      { title: "Ukládání", text: "Snapshoty se ukládají automaticky, nezávisle na tom, jestli otevřeš stránku statistik." },
    ],
    tip: "Dropdownem nad grafem změníš časový rozsah.",
  },
  {
    key: "tip-count",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "Moje přesnost",
    title: "Počet provedených tipů",
    intro: "Graf ukazuje, kolik tipů věku jsi provedl v daném období.",
    cards: [
      { title: "30 dní", text: "Každý sloupec představuje jeden den." },
      { title: "Roční pohled", text: "Data jsou po měsících." },
      { title: "Celoživotní pohled", text: "Data jsou po letech." },
    ],
    tip: "Použij graf pro rychlou kontrolu, kdy jsi byl v tipování nejaktivnější.",
  },
  {
    key: "aw-score-trend",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "AW skóre",
    title: "AW skóre trend",
    intro: "Graf ukazuje trend AW skóre v denním, týdenním nebo měsíčním pohledu.",
    cards: [
      { title: "Denní pohled", text: "Ukazuje jednotlivé snapshoty." },
      { title: "Týdenní a měsíční pohled", text: "Průměrují dostupné hodnoty v daném období." },
    ],
    tip: "Použij ho pro sledování, jestli se tvůj AW výsledek dlouhodobě zlepšuje, zhoršuje nebo drží stabilně.",
  },
  {
    key: "aw-age-generations",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "AW věk",
    title: "AW věk podle generací",
    intro: "Tabulka ukazuje, na kolik let tě v průměru tipují jednotlivé generace.",
    cards: [
      { title: "Zdroj", text: "Počítá se z tipů na tvoje fotky podle data narození tipujícího." },
    ],
    tip: "Rozdíly mezi generacemi mohou ukázat, jak různé věkové skupiny čtou stejný obraz odlišně.",
  },
  {
    key: "top-aw-influence",
    sectionId: "stats",
    sectionTitle: "Můj vývoj",
    groupTitle: "AW skóre",
    title: "Příspěvky s největším vlivem na AW",
    intro: "Orientační výpis podle dostupných image metrik.",
    cards: [
      { title: "Jak vzniká", text: "Vychází z rozdílu průměrného AW věku a skutečného věku násobeného počtem tipů." },
      { title: "Důležité omezení", text: "Není to náhrada finálního oficiálního AW výpočtu." },
    ],
    tip: "Ber ho jako vodítko k interpretaci, ne jako konečný verdikt.",
  },
  {
    key: "image-report",
    sectionId: "safety",
    sectionTitle: "Bezpečnost",
    title: "Nahlášení fotky",
    intro: "Použij nahlášení, když fotka potřebuje kontrolu správcem.",
    cards: [
      { title: "Kdy hlásit", text: "Když je fotka nevhodná, porušuje pravidla nebo potřebuje posouzení." },
      { title: "Důvod", text: "Vyber nejbližší důvod a podle potřeby doplň komentář. U volby Ostatní je komentář povinný." },
      { title: "Co se stane potom", text: "Odesláním se fotka automaticky nemaže; nahlášení se předá ke kontrole správci." },
    ],
    tip: "Čím přesněji popíšeš problém, tím rychleji se dá správně posoudit.",
  },
  {
    key: "image-blur",
    sectionId: "my-posts",
    sectionTitle: "Moje posty",
    title: "Zakrytí částí fotky",
    intro: "Před nahráním můžeš rozmazat vybrané části fotky.",
    cards: [
      { title: "Jak označit oblast", text: "Tažením myši vyber část, kterou chceš rozmazat." },
      { title: "Kdy to použít", text: "Například pro zakrytí cizích obličejů nebo citlivých částí fotky." },
      { title: "Vrácení kroku", text: "Tlačítkem Krok zpět zrušíš poslední úpravu." },
    ],
    tip: "Rozmazání použij raději před nahráním než později složitě řešit soukromí hotového obsahu.",
  },
];

export function getHelpEntry(key?: string | null) {
  return helpCatalog.find((entry) => entry.key === key) ?? null;
}

export function getHelpEntriesForSection(sectionId: string) {
  return helpCatalog.filter((entry) => entry.sectionId === sectionId);
}

export function buildHelpHref(entry: HelpEntry) {
  const params = new URLSearchParams({ section: entry.sectionId, topic: entry.key });
  if (entry.groupTitle) params.set("group", entry.groupTitle);
  return `/help?${params.toString()}`;
}

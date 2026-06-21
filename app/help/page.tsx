"use client";

/**
 * File purpose
 * - Public help center for AgeWinners users.
 * Main responsibilities
 * - Explain the main product areas, contextual help, safety rules, and admin contact.
 * Related APIs, components, or modules
 * - components/HelpIconButton.tsx
 * - lib/api/adminContact.ts
 * - components/auth/AuthContext.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import StandardHelpContent from "@/components/help/StandardHelpContent";
import { sendAdminContactMessage } from "@/lib/api/adminContact";
import { getHelpEntriesForSection, getHelpEntry } from "@/lib/helpCatalog";

const quickLinks = [
  { href: "#start", label: "Začít" },
  { href: "#profile-card", label: "Profilová karta" },
  { href: "#feed", label: "Feed" },
  { href: "#my-posts", label: "Moje posty" },
  { href: "#my-tips", label: "Moje tipy" },
  { href: "#messages", label: "Zprávy" },
  { href: "#changes", label: "Výzvy a změny" },
  { href: "#stats", label: "Můj vývoj" },
  { href: "#network", label: "Moje síť" },
  { href: "#notifications", label: "Upozornění" },
  { href: "#safety", label: "Bezpečí a ochrana soukromí" },
] as const;

const startSteps = [
  {
    number: "1",
    title: "Postuj svoje fotky",
    iconPath: "/ui/Menu-moje-posty.ico",
  },
  {
    number: "2",
    title: "Tipuj věk ostatních",
    iconPath: "/ui/Menu-Moje-tipy.ico",
  },
  {
    number: "3",
    title: "Sleduj vývoj svého AW věku",
    iconPath: "/icons/nav/stats.svg",
  },
  {
    number: "4",
    title: "Vyhlašuj výzvy, prezentuj osobní změny",
    iconPath: "/ui/Menu-Moje-alba.ico",
  },
  {
    number: "5",
    title: "Zvyšuj svůj vlastní dosah, přidávej se do kruhů a buduj vlastní síť",
    iconPath: "/ui/Menu-Moje-sit.ico",
  },
] as const;

const helpSections = [
  {
    id: "profile-card",
    title: "Profilová karta",
    intro:
      "Profilová karta vytváří první dojem z tvého účtu. Profilová fotka má být přirozený portrét se snadno rozpoznatelným obličejem, celou hlavou v záběru a dostatkem místa pro kruhový ořez.",
    paragraphs: [
      "Nejlépe funguje fotografie podobná občanské nebo profesionální profilové fotografii, pořízená od pasu či hrudi výše. Obličej má být nezakrytý, dobře osvětlený a hlavním prvkem snímku.",
      "Nepoužívej vzdálenou celou postavu, fotografii zezadu, zakrytý obličej ani výřez s uříznutou hlavou nebo vlasy. Důležité části obličeje musí zůstat viditelné i v malém kruhovém náhledu.",
      "Bio nech krátké a výstižné. Podrobnější zájmy, aktivity a životní styl můžeš doplnit v části O mně.",
    ],
  },
  {
    id: "feed",
    title: "Feed",
    intro:
      "Feed pracuje v sadách po 8 fotkách ostatních uživatelů. Ukazatel průběhu ti říká, kolik fotek z aktuální osmičky už máš odtipováno; po osmém úspěšném tipu se automaticky načte další sada. Novou osmičku můžeš kdykoliv vyvolat také ručním refreshem.",
    paragraphs: [
      "Feed zobrazuje 8 fotek ostatních, které můžeš tipovat. Tvoje vlastní fotky ani fotky, které už jsi běžně tipoval, se ti tu nezobrazují.",
      "Po odtipování všech 8 fotek se automaticky načte nová sada. Filtr upraví výběr podle tagů a skrytých fotek; refresh načte novou sadu ručně podle aktuálního nastavení.",
      "Každý tip pomáhá zpřesňovat AW výsledek ostatních. Výběr se průběžně mění, aby se dostalo i na nové nebo méně tipované fotky.",
    ],
  },
  {
    id: "my-posts",
    title: "Moje posty",
    intro:
      "Moje posty jsou tvoje pracovní plocha pro vlastní obsah. Tady nahráváš nové příspěvky, vracíš se k už publikovaným fotkám, upravuješ jejich popis i zařazení a hlídáš, jak je tvůj profil poskládaný. Čím pečlivěji tu obsah připravíš, tím snáz se později filtruje, používá ve výzvách a promítá do statistik.",
    paragraphs: [
      "V Moje posty nahráváš, upravuješ a kontroluješ vlastní příspěvky a fotky.",
      "Filtr zúží zobrazení podle tagů fotek. Refresh načte aktuální stav po vytvoření, úpravách nebo smazání obsahu.",
      "Dobře popsané fotky se lépe filtrují, snáz se používají ve výzvách a později dávají přehlednější statistiky.",
    ],
  },
  {
    id: "my-tips",
    title: "Moje tipy",
    intro:
      "Moje tipy jsou tvoje osobní historie tipování. Vracíš se sem k postům a albům, které jsi už pomohl vyhodnotit, sleduješ jejich postupné odhalení a můžeš si znovu projít obsah, u kterého už znáš výsledek. Sekce je užitečná hlavně tehdy, když chceš pochopit, jak se tvoje tipování potkává se skutečnými fotkami a kdy se obsah po čekací době odemkne.",
    paragraphs: [
      "Moje tipy ukazují posty a alba, u kterých jsi už tipoval všechny fotky.",
      "Filtr pracuje s kategoriemi, stavem tipu, viditelností a typem obsahu. Refresh načte aktuální stav odhalení.",
      "Obsah i autor se odhalují se zpožděním, aby tipování zůstalo nezávislé na jménu, profilu nebo předchozích sympatiích.",
    ],
  },
  {
    id: "changes",
    title: "Výzvy a změny",
    intro:
      "Výzvy a změny jsou dvě různé cesty, jak v AW zachytit proměnu v čase. Výzva míří dopředu: stanovíš si cíl a později porovnáváš výsledek se startem. Změna se naopak dívá zpět a skládá příběh z už existujících postů a fotek. Když chceš sledovat budoucí posun, použij výzvu; když chceš ukázat cestu, která už proběhla, použij změnu.",
    paragraphs: [
      "Výzvy sledují budoucí posun AW skóre. Na začátku se uloží startovní hodnota a později se porovná s výsledkem.",
      "Změny jsou zpětné kolekce postů a fotek, které mohou popisovat proměnu uživatele v čase.",
      "Výzva sama nemění výpočet AW skóre. Jen uchovává cíl, termín a rozsah fotek pro srovnání průběhu.",
    ],
  },
  {
    id: "stats",
    title: "Můj vývoj",
    intro:
      "Můj vývoj je analytická část AW: místo, kde se jednotlivé fotky, tipy a zápisy skládají do delšího příběhu. Najdeš tu AW věk, AW skóre, aktivitu, návštěvnost, přesnost tipů, výzvy i dobrovolné wellbeing záznamy. Smyslem není jen vidět jedno číslo, ale pochopit trend — co se mění, co zůstává stabilní a kde má smysl podívat se hlouběji.",
    paragraphs: [
      "Můj vývoj spojuje AW věk, AW skóre, aktivitu, návštěvnost, výzvy, přesnost tipů, Power skóre i dobrovolné wellbeing záznamy.",
      "Jednotlivé části mají vlastní otazník, který vysvětluje konkrétní graf, tabulku nebo ovládání.",
      "Refresh načte nová data tam, kde se sekce průběžně mění. Filtry a časové pohledy pomáhají číst trend, ne jen jednotlivý den.",
    ],
  },
  {
    id: "network",
    title: "Moje síť",
    intro:
      "Moje síť je místo pro správu vztahů v AW. Vidíš tu své kontakty, sledování, příchozí i odchozí žádosti a můžeš vyhledávat další lidi podle toho, koho chceš najít nebo s kým chceš zůstat ve spojení. Sekce pomáhá držet sociální část aplikace přehlednou: jiné je vzájemné spojení, jiné pouhé sledování a jinou roli mají žádosti, které teprve čekají na rozhodnutí.",
    paragraphs: [
      "Spojení jsou rovnocenná, sledování je jednostranné. V síti také najdeš příchozí i odchozí žádosti.",
      "Filtr otevře pokročilé hledání lidí. Refresh stáhne aktuální stav spojení, sledujících i čekajících žádostí.",
      "Blokace vychází z aktuálního seznamu blokovaných uživatelů a ovlivňuje, kdo se ti může zobrazovat.",
    ],
  },
  {
    id: "notifications",
    title: "Upozornění",
    intro:
      "Upozornění jsou tvoje vstupní brána k tomu, co se v AW právě stalo. Shromažďují nové žádosti, změny v síti i komentáře k tvým fotkám, takže nemusíš procházet každou sekci zvlášť. Používej je pro rychlou reakci na nové dění a nastavením si nech jen ty typy zpráv, které pro tebe mají skutečnou hodnotu.",
    paragraphs: [
      "Upozornění shrnují žádosti o spojení, změny v síti i komentáře k tvým fotkám.",
      "Ikona nastavení otevře výběr typů upozornění, které chceš dostávat. Refresh načte aktuální přehled.",
      "Příchozí žádosti můžeš vyřídit přímo z upozornění; úplný přehled najdeš také v sekci Moje síť - nové žádosti.",
    ],
  },
  {
    id: "messages",
    title: "Zprávy",
    intro:
      "Zprávy jsou soukromý prostor pro přímou komunikaci v AW. Slouží hlavně pro rozhovory mezi propojenými uživateli, ale aplikace sem umí bezpečně vést i zprávy související se žádostí o spojení nebo její odpovědí. V konverzacích můžeš navazovat na konkrétní zprávy, reagovat emoji a držet kontakt tam, kde veřejný komentář nestačí.",
    paragraphs: [
      "Ve spojení si uživatelé mohou psát bez omezení. Mimo spojení se zprávy objeví jen u žádosti o spojení nebo jejího zamítnutí.",
      "V konverzaci můžeš odpovídat na konkrétní zprávy, používat rychlé reakce a sledovat stav přečtení.",
      "Když komunikace přestane být v pořádku, konverzaci lze zablokovat nebo nahlásit.",
    ],
  },
  {
    id: "safety",
    title: "Bezpečí a ochrana soukromí",
    intro:
      "AW má být pozitivní a bezpečné místo, kde lze sdílet fotky a tipovat bez zbytečného rizika. Bezpečí tu znamená nejen ochranu před nevhodným obsahem, jako je násilí, erotika, nenávist nebo rasismus, ale také respekt k soukromí druhých lidí. Fotografie může být problém i tehdy, když sama o sobě nepůsobí závadně, ale zachycuje třetí osobu bez souhlasu, odhaluje citlivé informace nebo narušuje soukromí člověka, který obsah nahlašuje.",
    paragraphs: [
      "Najdeš tu pravidla, princip hlášení i vysvětlení toho, co se děje, když obsah potřebuje kontrolu správcem.",
      "Hlášení není automatický trest. Je to předání konkrétního obsahu ke kontrole, aby AW mohlo chránit jak bezpečné prostředí, tak soukromí uživatelů i dalších osob.",
    ],
  },
] as const;

const statsDetailSections = [
  {
    title: "AW věk v čase",
    text: "Graf ukazuje vývoj tvého AW věku v čase.\n\nZelená čára je AW věk, šedá diagonála je referenční věk. Když je zelená níž než diagonála, fotky působí mladším dojmem.\n\nPlná zelená čára spojuje období s dostupnými daty. Přerušovaná zelená čára znamená, že mezi dvěma body chybí fotky nebo výpočet, takže graf jen naznačuje přechod a nedopočítává chybějící roky jako nulu.\n\nPřepínačem Pohled měníš časový rozsah. Kliknutím na zelený bod otevřeš detail daného roku a můžeš přejít na fotky z tohoto období.",
  },
  {
    title: "Aktivita",
    text: "Historie aktivity po dnech: fotky, posty, komentáře, tipy a lajky.",
  },
  {
    title: "Aktivita po dnech",
    text: "Historie po dnech za posledních až 50 dní: fotky, posty, komentáře, tipy a lajky.",
  },
  {
    title: "Vývoj příspěvků",
    text: "Výkon jednotlivých příspěvků, jejich dosah a komentářová aktivita.\n\nNejvýkonnější příspěvky: podle zobrazení, komentářů, reakcí a uložení.\n\nVývoj dosahu příspěvku: kolik lidí příspěvek vidělo v čase.\n\nKomentářová aktivita: počet komentářů a tempo růstu diskuze.",
  },
  {
    title: "Top 10 příspěvků",
    text: "Tabulka ukazuje tvých 10 nejlepších příspěvků podle zvoleného sloupce.\n\nKomentáře zahrnují komentáře k příspěvku i komentáře k fotkám v příspěvku. Lajky jsou zatím součtem lajků na fotkách v příspěvku. Tipy jsou součtem tipů na fotkách v příspěvku.\n\nZobrazení jsou připravená jako metrika, ale zatím se v databázi nesbírají, takže budou nulová, dokud nepřidáme tracking zobrazení.",
  },
  {
    title: "Návštěvnost",
    text: "Přehled návštěv profilu a růstu sociální sítě.\n\nNávštěvy profilu: počet zobrazení profilu v čase.\n\nNové kontakty / sledující: růst sociální sítě uživatele.",
  },
  {
    title: "Návštěvy profilu",
    text: "Graf ukazuje počet zobrazení tvé profilové karty za posledních 30 dní.\n\nVlastní zobrazení vlastního profilu se nepočítá. Kvůli ochraně proti opakovanému zápisu se stejné zobrazení ze stejného prohlížeče zapíše nejvýše jednou za 30 minut.",
  },
  {
    title: "Poslední návštěvy",
    text: "Seznam ukazuje, kdo si zobrazil tvoji veřejnou profilovou kartu a kdy.\n\nVidíš pouze návštěvy svého profilu. Ostatní uživatelé tvoje návštěvy nevidí.",
  },
  {
    title: "Wellbeing / Lifestyle",
    text: "Dobrovolné osobní záznamy nálady, energie, spánku, pohybu, stravy a pozitivních návyků.\n\nMood tracking: uživatel si může zvolit náladu dne.\n\nEnergy score: subjektivní energie 1-10.\n\nSleep / pohyb / hydratace: dobrovolné denní záznamy pohybu, spánku, stravy a příjmu tekutin.\n\nWellbeing trend: dlouhodobý graf nálady, energie a aktivity.\n\nPlány a návyky: dlouhodobé nastavení spánku, pohybu, tekutin a stravy.\n\nOsobní výzvy: např. 30 dní chůze, meditace nebo péče o pleť.",
  },
  {
    title: "Dnešní rytmus",
    text: "Tady je souhrn dnešního zápisu a jeho ovládání.\n\nNahoře vidíš rychlý přehled energie, spánku, pohybu a tekutin. Níže nastavuješ viditelnost celého dnešního zápisu: Všichni, Kontakty nebo Soukromé.\n\nVýchozí viditelnost se načítá z nastavení profilu. Tlačítko Uložit dnešní zápis uloží všechny vyplněné položky najednou. Hodnota --- znamená, že danou položku pro dnešek nechceš vyplnit.",
  },
  {
    title: "Plány a návyky",
    text: "Plány a návyky jsou dopředné nastavení pro spánek, pohyb, tekutiny a stravu.\n\nNa rozdíl od historie je možné upravovat i budoucí dny. Změny se ukládají až tlačítkem Uložit změny, aby tabulka nereagovala pomalu po každé položce.\n\nPokud plánovaný den už nastal, jeho plán se v historických grafech ukáže světle vedle skutečného zápisu.",
  },
  {
    title: "Výzvy",
    text: "Přehled AW výzev, jejich startů, cílů, termínů a rozsahu fotek.\n\nStartovní a cílové AW skóre podle uložených hodnot výzvy.\n\nRozsah fotek: období výzvy nebo speciální tag výzvy.\n\nVeřejný odkaz na kartu výzvy pro sdílení v postech.",
  },
  {
    title: "Moje výzvy",
    text: "Statistika výzev zatím používá uložené hodnoty výzvy: startovní AW skóre, cílové AW skóre, termín, viditelnost a rozsah fotek.\n\nAW skóre se nepočítá jinak. Výzva jen porovnává hodnotu na začátku a na konci podle existujících pravidel.",
  },
  {
    title: "Moje přesnost",
    text: "Vývoj přesnosti tipování a počty provedených tipů v čase.\n\nPřesnost tipů.\n\nPočet provedených tipů po dnech, měsících a letech.",
  },
  {
    title: "Přesnost tipů",
    text: "Graf ukazuje, jak se v čase vyvíjí tvoje průměrná přesnost tipů.\n\nVyšší procento znamená přesnější odhady věku. Hodnoty vznikají z denních snapshotů, takže graf ukazuje trend, ne každé jednotlivé tipnutí.\n\nSnapshoty se ukládají do databáze automaticky jako avg_accuracy_pct v tabulce aw_user_stats_history, takže nezávisí na tom, jestli otevřeš stránku statistik.\n\nDropdownem nad grafem změníš časový rozsah.",
  },
  {
    title: "Počet provedených tipů",
    text: "Graf ukazuje, kolik tipů věku jsi provedl v daném období.\n\nV pohledu 30 dní je každý sloupec jeden den. V ročním pohledu jsou data po měsících. V celoživotním pohledu jsou data po letech.\n\nPoužij ho pro rychlou kontrolu, kdy jsi byl v tipování nejaktivnější.",
  },
  {
    title: "Power skóre",
    text: "Aktivita, přesnost a přínos v AW v jednom přehledu. Nemění AW věk ani váhu tipů.\n\nPower skóre roste s tvou aktivitou a přesností.\n\nČím víc tipuješ ostatní, tím větší šanci dostanou tvoje fotky.\n\nDenní série pomáhá držet rytmus.\n\nPozvánky mohou přidat bonus, když se známí aktivně zapojí.",
  },
  {
    title: "AW pozvánky",
    text: "Přehled pozvánek, aktivace a bonusu do Power skóre.\n\nBonus běží 30 dní od aktivace pozvánky.\n\nAktivace znamená registraci, alespoň 1 fotku a 10 tipů.\n\nDo bonusu se počítá nejvýše 10 aktivních pozvánek s nejvyšším Power skóre.",
  },
  {
    title: "AW skóre",
    text: "Detailní trend, rozklad a největší vlivy na AW skóre.\n\nAW skóre trend: denní, týdenní a měsíční.\n\nRozklad AW skóre: z čeho se skóre skládá.\n\nPříspěvky s největším vlivem na AW.",
  },
  {
    title: "AW skóre trend",
    text: "Graf ukazuje trend AW skóre v denním, týdenním nebo měsíčním pohledu.\n\nDenní pohled ukazuje jednotlivé snapshoty. Týdenní a měsíční pohled průměruje dostupné hodnoty v daném období.\n\nPoužij ho pro sledování, jestli se tvůj AW výsledek dlouhodobě zlepšuje, zhoršuje nebo drží stabilně.",
  },
  {
    title: "AW věk podle generací",
    text: "Tabulka ukazuje, na kolik let tě v průměru tipují jednotlivé generace.\n\nPočítá se z tipů na tvoje fotky podle data narození tipujícího.",
  },
  {
    title: "Příspěvky s největším vlivem na AW",
    text: "Zatím jde o orientační výpis podle dostupných image metrik: rozdíl průměrného AW věku a skutečného věku násobený počtem tipů.\n\nNení to náhrada finálního oficiálního AW výpočtu.",
  },
] as const;

const statsGroups = [
  { title: "AW věk", topics: ["AW věk v čase", "Po jednotlivých fotkách", "AW věk podle generací"] },
  { title: "Aktivita", topics: ["Aktivita po dnech"] },
  { title: "Vývoj příspěvků", topics: ["Top 10 příspěvků"] },
  { title: "Návštěvnost", topics: ["Návštěvy profilu", "Poslední návštěvy"] },
  { title: "Wellbeing / Lifestyle", topics: ["Dnešní rytmus", "Plány a návyky"] },
  { title: "Výzvy", topics: ["Moje výzvy"] },
  { title: "Moje přesnost", topics: ["Přesnost tipů", "Počet provedených tipů"] },
  { title: "Power skóre", topics: [] },
  { title: "AW pozvánky", topics: [] },
  { title: "AW skóre", topics: ["AW skóre trend", "Příspěvky s největším vlivem na AW"] },
] as const;

const contentRules = [
  "Nesdílej urážlivý, ponižující nebo diskriminační obsah.",
  "Nepublikuj rasistické, nenávistné nebo jinak nevhodné fotografie.",
  "Vyhni se obsahu se sexuálním nebo explicitně erotickým motivem.",
  "Nenahrávej fotky jiných lidí bez jejich souhlasu.",
] as const;

const reportReasons = [
  "porušení pravidel obsahu",
  "nevhodný nebo urážlivý obsah",
  "fotografie, která znesnadňuje smysluplné tipování, například více osob nebo nejasná fotka",
] as const;

export default function HelpPage() {
  const { isLoggedIn } = useAuth();
  const searchParams = useSearchParams();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(searchParams.get("section"));
  const [activeStatsGroupTitle, setActiveStatsGroupTitle] = useState<string | null>(searchParams.get("group"));
  const [activeStatsTopicTitle, setActiveStatsTopicTitle] = useState<string | null>(searchParams.get("topic"));
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendAdminMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentMessage(null);
    setSendError(null);

    if (!message.trim()) {
      setSendError("Napiš prosím zprávu pro správce.");
      return;
    }

    setSending(true);
    try {
      await sendAdminContactMessage(message);
      setMessage("");
      setSentMessage("Zpráva byla doručena správcům.");
    } catch (error: unknown) {
      setSendError(error instanceof Error ? error.message : "Zprávu se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  const activeSection = helpSections.find((section) => section.id === activeSectionId) ?? null;
  const activeStatsGroup = statsGroups.find((item) => item.title === activeStatsGroupTitle) ?? null;
  const activeHelpEntry = getHelpEntry(activeStatsTopicTitle);
  const activeStatsTopic = activeHelpEntry ?? statsDetailSections.find((item) => item.title === activeStatsTopicTitle) ?? null;

  function goHome() {
    setActiveSectionId(null);
    setActiveStatsGroupTitle(null);
    setActiveStatsTopicTitle(null);
  }

  function openSection(sectionId: string) {
    setActiveSectionId(sectionId);
    setActiveStatsGroupTitle(null);
    setActiveStatsTopicTitle(null);
  }

  function openStatsGroup(title: string) {
    setActiveSectionId("stats");
    setActiveStatsGroupTitle(title);
    setActiveStatsTopicTitle(null);
  }

  function openStatsTopic(title: string) {
    setActiveSectionId("stats");
    const owningGroup = statsGroups.find((group) => group.topics.includes(title as never));
    setActiveStatsGroupTitle(owningGroup?.title ?? null);
    const matchingEntry = getHelpEntriesForSection("stats").find((entry) => entry.title === title && entry.groupTitle === owningGroup?.title);
    setActiveStatsTopicTitle(matchingEntry?.key ?? title);
  }

  function openHelpEntry(key: string) {
    const entry = getHelpEntry(key);
    if (!entry) return;
    setActiveSectionId(entry.sectionId);
    setActiveStatsGroupTitle(entry.groupTitle ?? null);
    setActiveStatsTopicTitle(entry.key);
  }

  function HelpBreadcrumb() {
    const isHome = !activeSection;
    const isSectionLevel = Boolean(activeSection && !activeStatsGroup && !activeStatsTopic);
    const isGroupLevel = Boolean(activeStatsGroup && !activeStatsTopic);

    return (
      <nav className="flex flex-wrap items-center gap-2 rounded-xl bg-gradient-to-r from-[#e8fbe8] via-white to-white px-3 py-2 text-sm text-slate-600 shadow-[0_10px_30px_rgba(50,205,50,0.10)]">
        <button
          type="button"
          onClick={goHome}
          className={isHome ? "font-semibold text-emerald-900 hover:underline" : "font-normal text-slate-500 hover:text-emerald-800 hover:underline"}
        >
          Nápověda
        </button>
        {activeSection ? (
          <>
            <span className="text-slate-400">&gt;</span>
            <button
              type="button"
              onClick={() => openSection(activeSection.id)}
              className={isSectionLevel ? "font-semibold text-emerald-900 hover:underline" : "font-normal text-slate-500 hover:text-emerald-800 hover:underline"}
            >
              {activeSection.title}
            </button>
          </>
        ) : null}
        {activeStatsGroup ? (
          <>
            <span className="text-slate-400">&gt;</span>
            {activeStatsTopic ? (
              <button
                type="button"
                onClick={() => openStatsGroup(activeStatsGroup.title)}
                className="font-normal text-slate-500 hover:text-emerald-800 hover:underline"
              >
                {activeStatsGroup.title}
              </button>
            ) : (
              <span className={isGroupLevel ? "font-semibold text-emerald-900" : "font-normal text-slate-500"}>{activeStatsGroup.title}</span>
            )}
          </>
        ) : null}
        {activeStatsTopic ? (
          <>
            <span className="text-slate-400">&gt;</span>
            <span className="font-semibold text-emerald-900">{activeStatsTopic.title}</span>
          </>
        ) : null}
      </nav>
    );
  }

  function HelpHome() {
    return (
      <>
        <section className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Jak se v AW rychle zorientovat</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            AgeWinners je sociální aplikace založená na fotkách, tipování věku a sledování toho, jak člověk působí na ostatní. AW věk je dojem z konkrétních fotek, ne zdravotní ani lékařský údaj.
          </p>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            Krátkou nápovědu najdeš přímo v aplikaci pod ikonou otazníku. Tato stránka je širší rozcestník: když víš, co chceš udělat, rychle tě pošle do správné části.
          </p>
        </section>

        <section id="start" className="scroll-mt-24 space-y-3">
          <h2 className="text-xl font-bold text-slate-950">5 kroků, jak používat AW</h2>
          <div className="rounded-3xl bg-slate-50 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-5 md:items-end">
              {startSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="flex min-h-[150px] flex-col rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(50,205,50,0.10)]"
                  style={{ minHeight: `${150 + index * 34}px` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-2xl font-black text-emerald-700">{step.number}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.iconPath}
                      alt=""
                      className="object-contain"
                      style={{ width: `${28 * (1 + index * 0.25)}px`, height: `${28 * (1 + index * 0.25)}px` }}
                    />
                  </div>
                  <p className="mt-auto text-sm font-semibold leading-6 text-slate-900">{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">Sekce AW</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {helpSections.map((section) => (
              <article
                key={section.id}
                className="rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-4 shadow-[0_12px_30px_rgba(50,205,50,0.10)]"
              >
                <button
                  type="button"
                  onClick={() => openSection(section.id)}
                  className="text-left text-lg font-bold text-slate-950 hover:text-emerald-800 hover:underline"
                >
                  {section.title}
                </button>
                <p className="mt-1 text-sm leading-6 text-slate-700">{section.intro}</p>
              </article>
            ))}
          </div>
        </section>

      </>
    );
  }

  function HelpSectionDetail() {
    if (!activeSection) return null;
    const contextualEntries = getHelpEntriesForSection(activeSection.id);
    const singleSameLevelEntry =
      contextualEntries.length === 1 && contextualEntries[0]?.title === activeSection.title ? contextualEntries[0] : null;

    return (
      <>
        <section className="space-y-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{activeSection.title}</h1>
            {!singleSameLevelEntry ? <p className="mt-1 text-sm leading-6 text-slate-700">{activeSection.intro}</p> : null}
          </div>
          {singleSameLevelEntry ? (
            <StandardHelpContent
              hideTitle
              entry={{
                ...singleSameLevelEntry,
                intro: activeSection.intro,
              }}
            />
          ) : (
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              {activeSection.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
        </section>

        {activeSection.id === "stats" ? (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-950">Části sekce Můj vývoj</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {statsGroups.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => openStatsGroup(item.title)}
                  className="rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                >
                  <div className="text-sm font-bold text-slate-950">{item.title}</div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeSection.id !== "stats" && contextualEntries.length > 0 && !singleSameLevelEntry ? (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-950">Nápovědy v této části</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {contextualEntries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => openHelpEntry(entry.key)}
                  className="rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                >
                  <div className="text-sm font-bold text-slate-950">{entry.title}</div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  function HelpStatsGroupDetail() {
    if (!activeStatsGroup) return null;
    const groupSummary = statsDetailSections.find((item) => item.title === activeStatsGroup.title);
    const groupHelpEntry =
      getHelpEntriesForSection("stats").find((entry) => entry.title === activeStatsGroup.title && !entry.groupTitle) ?? null;

    return (
      <>
        <section className="space-y-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{activeStatsGroup.title}</h1>
          </div>
          {groupHelpEntry ? (
            <StandardHelpContent entry={groupHelpEntry} />
          ) : groupSummary ? (
            <div className="whitespace-pre-line text-sm leading-6 text-slate-700">{groupSummary.text}</div>
          ) : null}
        </section>

        {activeStatsGroup.topics.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-950">Nápovědy v této části</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {activeStatsGroup.topics.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => openStatsTopic(title)}
                  className="rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                >
                  <div className="text-sm font-bold text-slate-950">{title}</div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  function HelpStatsTopicDetail() {
    if (!activeStatsTopic) return null;

    return (
      <section className="space-y-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{activeStatsTopic.title}</h1>
        </div>
        {activeHelpEntry ? (
          <StandardHelpContent entry={activeHelpEntry} />
        ) : "text" in activeStatsTopic ? (
          <div className="whitespace-pre-line text-sm leading-6 text-slate-700">{activeStatsTopic.text}</div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6">
      <div className="max-w-4xl space-y-8">
        <HelpBreadcrumb />

        {!activeSection ? <HelpHome /> : activeStatsTopic ? <HelpStatsTopicDetail /> : activeStatsGroup ? <HelpStatsGroupDetail /> : <HelpSectionDetail />}

        <HelpBreadcrumb />
      </div>

      {contactOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setContactOpen(false)} role="dialog" aria-modal="true" aria-labelledby="admin-contact-title">
          <form className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()} onSubmit={handleSendAdminMessage}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="admin-contact-title" className="text-base font-semibold text-slate-900">Zpráva správci</h2>
              <CloseButton onClick={() => setContactOpen(false)} label="Zavřít zprávu správci" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Napiš, s čím potřebuješ pomoci. Zpráva se odešle správcům.</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">Zpráva
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} maxLength={4000} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Popiš prosím, co potřebuješ vyřešit..." />
            </label>
            {sendError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{sendError}</p> : null}
            {sentMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{sentMessage}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AwButton variant="tertiary" onClick={() => setContactOpen(false)}>Zavřít</AwButton>
              <AwButton variant="primary" type="submit" disabled={sending}>{sending ? "Odesílám..." : "Odeslat správcům"}</AwButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}





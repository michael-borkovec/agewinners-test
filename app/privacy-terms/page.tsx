/**
 * File purpose
 * - Placeholder page for "Soukromí & podmínky"
 * - Renders privacy and terms content for the public info page
 * - Related to left sidebar info navigation
 */

export default function PrivacyTermsPage() {
  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Soukromí a podmínky používání služby AgeWinners</h1>
          <p className="text-sm text-slate-600">Účinnost od: [doplnit datum]</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">1. Úvod</h2>
          <p className="text-sm leading-7 text-slate-700">
            AgeWinners (&bdquo;AW&ldquo;) je online sociální platforma zaměřená na sdílení fotografií, vnímání věku,
            osobní prezentaci, komunitní interakci a sledování vývoje v čase. Platforma je určena zejména pro
            uživatele, kteří chtějí pracovat na svém vzhledu, energii, stylu a společenském dojmu.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Používáním služby souhlasíte s těmito podmínkami a se zpracováním osobních údajů v rozsahu uvedeném níže.
          </p>
          <p className="text-sm leading-7 text-slate-700">Provozovatel: [doplnit název / IČO / sídlo / kontakt]</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Jaké údaje může AgeWinners zpracovávat</h2>
          <p className="text-sm leading-7 text-slate-700">
            Provozovatel je oprávněn zpracovávat údaje, které uživatel vyplní, nahraje nebo jinak poskytne při
            používání služby, zejména:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>identifikační a kontaktní údaje (např. jméno, e-mail),</li>
            <li>profilové fotografie a další nahraný obsah,</li>
            <li>
              údaje o identitě a sebevyjádření, zejména povolání, vzdělání, rodný jazyk, další jazyky, vztahový
              status, motivační věta,
            </li>
            <li>
              údaje o osobním profilu a preferencích, zejména výška, váha, zájmy, rozšířené &bdquo;O mně&ldquo;,
              primární zájmy, životní cíle, sebepojetí, oblasti osobního rozvoje, mindset, tempo života,
            </li>
            <li>údaje o životním stylu, zejména pohyb/sport, stravovací preference, alkohol, kouření,</li>
            <li>další dobrovolně poskytnuté údaje v rámci profilu, příspěvků, komentářů a komunikace.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">Tyto údaje provozovatel zpracovává za účelem:</p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>poskytování a zabezpečení služby,</li>
            <li>zobrazování a správy uživatelského profilu,</li>
            <li>fungování komunitních, hodnoticích a doporučovacích funkcí,</li>
            <li>moderace obsahu, prevence zneužití a vymáhání pravidel,</li>
            <li>analytiky, vývoje a zlepšování služby.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            „Provozovatel může využívat uživatelské údaje, včetně dobrovolně poskytnutých profilových a vybraných
            citlivých údajů, pro účely personalizace služby, zobrazování relevantního obsahu a – na základě souhlasu
            uživatele – také pro cílení reklamy a komerční analýzy. Tyto činnosti mohou zahrnovat profilování
            uživatele za účelem zlepšení relevance služby a obchodních sdělení. Pro analytické, statistické a obchodní
            účely mohou být data dále využívána v agregované nebo anonymizované podobě, která neumožňuje identifikaci
            konkrétního uživatele. Provozovatel může v tomto rozsahu spolupracovat s třetími stranami, vždy v souladu
            s platnými právními předpisy.“
          </p>
          <p className="text-sm leading-7 text-slate-700">
            „Fotografie nahrané uživateli představují osobní údaje a mohou obsahovat biometrické prvky (např. podobu
            obličeje). Tyto fotografie jsou zpracovávány za účelem poskytování služby AgeWinners, zejména pro
            zobrazování ostatním uživatelům, komunitní interakci a hodnocení.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            V rámci služby dochází k automatizovanému vyhodnocování a profilování, zejména k odhadu vnímaného věku,
            výpočtu souvisejících metrik a zobrazování výsledků ostatním uživatelům. Tyto výstupy mají výhradně
            informativní charakter a nemají právní ani obdobně významné účinky.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Fotografie mohou být dále využívány pro personalizaci obsahu a – na základě souhlasu uživatele – i pro
            cílení reklamy a komerční analýzy. Pro analytické a statistické účely mohou být data využívána v
            agregované nebo anonymizované podobě.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Uživatel má právo kdykoli svou fotografii odstranit. Po odstranění již fotografie nebude nadále zobrazována
            ani využívána v rámci služby, s výjimkou případů, kdy je její uchování vyžadováno právními předpisy.“
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">3. Uživatelský obsah a odpovědnost</h2>
          <p className="text-sm leading-7 text-slate-700">
            Každý uživatel nese plnou odpovědnost za obsah, který na AgeWinners zveřejní.
          </p>
          <p className="text-sm leading-7 text-slate-700">Uživatel nesmí zveřejňovat obsah, který:</p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>odporuje právním předpisům České republiky nebo Evropské unie,</li>
            <li>je urážlivý, nenávistný, diskriminační nebo šikanózní,</li>
            <li>je antisemitský, rasistický nebo jinak extremistický,</li>
            <li>má sexuálně explicitní, obscénní nebo jinak nevhodný charakter,</li>
            <li>
              porušuje práva třetích osob, zejména osobnostní práva, autorská práva nebo právo na ochranu soukromí.
            </li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            „Uživatel bere na vědomí, že fotografie může být hodnocena ostatními uživateli a že výsledky tohoto
            hodnocení jsou součástí funkčnosti služby.“
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">4. Fotografie a prohlášení uživatele</h2>
          <p className="text-sm leading-7 text-slate-700">Nahráním fotografie uživatel prohlašuje, že:</p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>je oprávněn s fotografií nakládat,</li>
            <li>fotografie neporušuje práva třetích osob,</li>
            <li>na fotografii je pouze tento uživatel.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            Pokud je na fotografii zachycena i jiná osoba, uživatel prohlašuje, že znemožnil její rozpoznání, zejména
            zakrytím nebo úpravou obličeje, případně že má odpovídající právní oprávnění k použití takové fotografie.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">5. Licence k obsahu</h2>
          <p className="text-sm leading-7 text-slate-700">
            Uživatel zveřejněním fotografie, příspěvku nebo jiného obsahu poskytuje provozovateli AgeWinners
            nevýhradní, bezúplatnou, územně neomezenou licenci na dobu trvání majetkových práv, a v rozsahu právně
            přípustném také souhlas se zpracováním a užitím tohoto obsahu pro účely:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>provozu a technického zajištění služby,</li>
            <li>zveřejnění v rámci služby a jejích funkcí,</li>
            <li>propagace služby,</li>
            <li>úprav, zpracování, rozmnožování, spojování s jiným obsahem a zpřístupňování veřejnosti.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            Tato licence je poskytována v rozsahu nezbytném a přiměřeném fungování a rozvoji služby a nesmí být
            vykládána v rozporu s právem na ochranu osobních údajů, osobnosti a soukromí uživatele.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">6. Moderace a zásahy provozovatele</h2>
          <p className="text-sm leading-7 text-slate-700">Provozovatel si vyhrazuje právo bez předchozího upozornění:</p>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
            <li>odstranit nevhodné fotografie nebo jiný závadný obsah,</li>
            <li>omezit viditelnost obsahu,</li>
            <li>dočasně nebo trvale zablokovat účet uživatele.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            To zejména tehdy, pokud uživatel pravidla poruší opakovaně, hrubě nebo v rozporu se zákony České
            republiky.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">7. Práva uživatele</h2>
          <p className="text-sm leading-7 text-slate-700">
            Uživatel má právo na přístup ke svým osobním údajům, jejich opravu, výmaz, omezení zpracování,
            přenositelnost a vznesení námitky, a tam, kde je právním základem souhlas, také právo tento souhlas
            odvolat. Tato práva vyplývají z GDPR.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">8. Závěrečná ustanovení</h2>
          <p className="text-sm leading-7 text-slate-700">
            Tyto podmínky se řídí právem České republiky. Případné spory budou řešeny příslušnými soudy České
            republiky.
          </p>
        </section>
      </div>
    </div>
  );
}

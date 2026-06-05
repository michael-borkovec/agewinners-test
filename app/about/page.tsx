/**
 * File purpose
 * - Public "O nás" information page
 * - Presents the AgeWinners mission with supporting images
 * - Related to left sidebar info navigation
 */

import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="rounded-lg bg-white p-6">
      <div className="max-w-3xl space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">O nás</h1>

        <p className="text-sm leading-6 text-slate-700">
          AgeWinners je pozitivní sociální síť, kde lidé objevují, jak působí na ostatní - a jak se
          jejich dojem může měnit v čase.
        </p>

        <p className="text-sm leading-6 text-slate-700">
          Nejde o vrásky, šediny nebo dokonalý vzhled. Jde o to, jakou energii vyzařuješ a jaký
          dojem zanecháváš.
        </p>

        <p className="text-sm leading-6 text-slate-700">
          <Image
            src="/Onas-1.jpg"
            alt="AgeWinners komunita a pozitivní dojem"
            width={587}
            height={728}
            className="mb-3 h-[182px] w-auto rounded-lg object-cover sm:float-right sm:mb-2 sm:ml-4"
            priority
          />
          Nahraj fotku, nech komunitu tipnout tvůj věk a zjisti svůj AW věk - tedy na kolik let
          skutečně působíš. Získáš hravou, anonymní a férovou zpětnou vazbu, která ti pomůže lépe
          porozumět sobě i tomu, jak tě vnímají druzí.
        </p>

        <p className="text-sm leading-6 text-slate-700">
          Někdy stačí malá změna - jiný styl oblečení, brýle, účes, úsměv nebo makeup. Jindy tě
          inspirace od ostatních může dovést k větší změně - ve stravování, pohybu, myšlení nebo
          celkovém přístupu k životu.
        </p>

        <p className="text-sm leading-6 text-slate-700">
          <Image
            src="/Onas-2.jpg"
            alt="Inspirace pro zdravý životní styl a osobní rozvoj"
            width={699}
            height={689}
            className="mb-3 h-[172px] w-auto rounded-lg object-cover sm:float-left sm:mb-2 sm:mr-4"
          />
          Možná nemáš plně pod kontrolou, kolik času dostaneš. Ale máš velký vliv na to, jak ten čas
          prožiješ - jak se cítíš, jak působíš a jakou energii ze sebe vyzařuješ.
        </p>

        <p className="text-sm leading-6 text-slate-700">
          AgeWinners propojuje témata jako zdravý životní styl, krása, sport, wellbeing, vztahy a
          osobní rozvoj. Je to místo pro inspiraci, motivaci a autentické sdílení mezi lidmi od 16 do
          116 let - s důrazem na pozitivní přístup, respekt a radost ze života.
        </p>
      </div>
    </div>
  );
}


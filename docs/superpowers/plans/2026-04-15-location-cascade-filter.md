# Location Cascade Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cascading voivodeship → powiat → gmina filtering to the farmers page and marketplace, and replace free-text inputs in profile settings with the same cascade selects.

**Architecture:** Single reusable `LocationCascade` client component (two modes: `"form"` for react-hook-form, `"filter"` for URL params) backed by a static TERYT data file. All location data flows from the user profile; products inherit the farmer's stored location.

**Tech Stack:** Next.js 15 App Router, React 19, shadcn/ui Select, Zod, Drizzle ORM, Vitest

---

## File Map

| File | Action |
|------|--------|
| `src/domains/geo/teryt.ts` | Create — static TERYT data + `getPowiats` / `getGminas` helpers |
| `src/domains/geo/components/location-cascade.tsx` | Create — reusable cascade component |
| `src/domains/geo/index.ts` | Modify — export new symbols |
| `src/domains/marketplace/schemas/validation.ts` | Modify — add `county`/`commune` to listings schema; add `searchFarmersSchema` |
| `src/domains/marketplace/queries/get-farmers.ts` | Create — filterable farmer query |
| `src/domains/marketplace/queries/get-listings.ts` | Modify — add county/commune filter conditions |
| `src/domains/marketplace/components/search-filters.tsx` | Modify — swap voivodeship select for `LocationCascade` |
| `src/domains/auth/components/profile-form.tsx` | Modify — swap 3 location fields for `LocationCascade` |
| `src/app/[locale]/(main)/farmers/page.tsx` | Modify — add search params + filter UI |
| `tests/domains/geo/teryt.test.ts` | Create — unit tests for helpers |
| `tests/domains/marketplace/schemas/validation.test.ts` | Modify — add county/commune + farmers schema tests |

---

## Task 1: TERYT data file

**Files:**
- Create: `src/domains/geo/teryt.ts`
- Create: `tests/domains/geo/teryt.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/domains/geo/teryt.test.ts
import { describe, it, expect } from "vitest";
import { getPowiats, getGminas } from "@/domains/geo/teryt";

describe("getPowiats", () => {
  it("returns powiats for a valid voivodeship", () => {
    const powiats = getPowiats("dolnoslaskie");
    expect(powiats.length).toBeGreaterThan(0);
    expect(powiats).toContain("wrocławski");
  });

  it("returns empty array for unknown voivodeship", () => {
    expect(getPowiats("nieznane")).toEqual([]);
  });

  it("returns sorted list", () => {
    const powiats = getPowiats("malopolskie");
    const sorted = [...powiats].sort((a, b) => a.localeCompare(b, "pl"));
    expect(powiats).toEqual(sorted);
  });
});

describe("getGminas", () => {
  it("returns gminas for a valid voivodeship + powiat", () => {
    const gminas = getGminas("dolnoslaskie", "wrocławski");
    expect(gminas.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown powiat", () => {
    expect(getGminas("dolnoslaskie", "nieznany")).toEqual([]);
  });

  it("returns empty array for unknown voivodeship", () => {
    expect(getGminas("nieznane", "jakis")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/domains/geo/teryt.test.ts
```
Expected: FAIL — `Cannot find module '@/domains/geo/teryt'`

- [ ] **Step 3: Create TERYT data file**

```ts
// src/domains/geo/teryt.ts

// Hierarchia: województwo → powiat → gminy
// Nazwy powiatów: bez prefiksu "powiat" (np. "wrocławski" nie "powiat wrocławski")
// Nazwy miast na prawach powiatu: sama nazwa miasta (np. "Wrocław")
// Nazwy gmin: pełna nazwa (np. "Długołęka", "Czernica")
const TERYT: Record<string, Record<string, string[]>> = {
  dolnoslaskie: {
    bolesławiecki: ["Bolesławiec", "Gromadka", "Nowogrodziec", "Osiecznica", "Warta Bolesławiecka"],
    dzierżoniowski: ["Bielawa", "Braszowice", "Dzierżoniów", "Łagiewniki", "Niemcza", "Pieszyce", "Piława Górna"],
    głogowski: ["Głogów", "Jerzmanowa", "Pęcław", "Żukowice"],
    górowski: ["Góra", "Jemielno", "Niechlów", "Wąsosz"],
    jaworski: ["Bolków", "Jawor", "Mściwojów", "Paszowice", "Wądroże Wielkie"],
    jeleniogórski: ["Janowice Wielkie", "Jeżów Sudecki", "Mysłakowice", "Podgórzyn", "Stara Kamienica", "Szklarska Poręba"],
    kamiennogórski: ["Kamienna Góra", "Lubawka", "Marciszów"],
    karkonoski: ["Karpacz", "Kowary", "Podgórzyn", "Szklarska Poręba"],
    kłodzki: ["Bystrzyca Kłodzka", "Duszniki-Zdrój", "Kłodzko", "Kudowa-Zdrój", "Lądek-Zdrój", "Lewin Kłodzki", "Międzylesie", "Nowa Ruda", "Radków", "Stronie Śląskie", "Szczytna"],
    legnicki: ["Chojnów", "Krotoszyce", "Kunice", "Legnickie Pole", "Miłkowice", "Prochowice", "Ruja"],
    lubański: ["Leśna", "Lubań", "Olszyna", "Platerówka", "Siekierczyn"],
    lubiński: ["Lubin", "Rudna", "Ścinawa"],
    lwówecki: ["Gryfów Śląski", "Lwówek Śląski", "Mirsk", "Wleń"],
    milicki: ["Cieszków", "Krośnice", "Milicz"],
    oleśnicki: ["Bierutów", "Dobroszyce", "Dziadowa Kłoda", "Międzybórz", "Oleśnica", "Syców", "Twardogóra"],
    oławski: ["Domaniów", "Jelcz-Laskowice", "Oława"],
    polkowicki: ["Chocianów", "Gaworzyce", "Grębocice", "Polkowice", "Przemków", "Radwanice"],
    strzeliński: ["Kondratowice", "Przeworno", "Strzelin", "Wiązów"],
    średzki: ["Kostomłoty", "Malczyce", "Miękinia", "Środa Śląska", "Udanin"],
    świdnicki: ["Dobromierz", "Jaworzyna Śląska", "Marcinowice", "Strzegom", "Świdnica", "Świebodzice"],
    trzebnicki: ["Oborniki Śląskie", "Prusice", "Trzebnica", "Wisznia Mała", "Zawonia", "Żmigród"],
    wałbrzyski: ["Czarny Bór", "Głuszyca", "Mieroszów", "Stare Bogaczowice", "Szczawno-Zdrój", "Walim"],
    wołowski: ["Brzeg Dolny", "Wińsko", "Wołów"],
    wrocławski: ["Czernica", "Długołęka", "Jordanów Śląski", "Kąty Wrocławskie", "Kobierzyce", "Mietków", "Sobótka", "Siechnice", "Żórawina"],
    ząbkowicki: ["Bardo", "Ciepłowody", "Kamieniec Ząbkowicki", "Stoszowice", "Ząbkowice Śląskie", "Ziębice", "Złoty Stok"],
    złotoryjski: ["Pielgrzymka", "Świerzawa", "Wojcieszów", "Zagrodno", "Złotoryja"],
    "Jelenia Góra": ["Jelenia Góra"],
    Legnica: ["Legnica"],
    Wałbrzych: ["Wałbrzych"],
    Wrocław: ["Wrocław"],
  },
  "kujawsko-pomorskie": {
    aleksandrowski: ["Aleksandrów Kujawski", "Bądkowo", "Ciechocinek", "Koneck", "Nieszawa", "Raciążek", "Waganiec", "Zakrzewo"],
    brodnicki: ["Brodnica", "Bobrowo", "Brzozie", "Górzno", "Jabłonowo Pomorskie", "Osiek", "Świedziebnia", "Zbiczno"],
    bydgoski: ["Białe Błota", "Dąbrowa Chełmińska", "Dobrcz", "Koronowo", "Nowa Wieś Wielka", "Osielsko", "Sicienko", "Solec Kujawski"],
    chełmiński: ["Chełmno", "Lisewo", "Papowo Biskupie", "Stolno", "Unisław"],
    golubsko_dobrzyński: ["Ciechocin", "Golub-Dobrzyń", "Kowalewo Pomorskie", "Radomin", "Zbójno"],
    grudziądzki: ["Grudziądz", "Łasin", "Rogóźno", "Świecie nad Osą"],
    inowrocławski: ["Dąbrowa Biskupia", "Gniewkowo", "Inowrocław", "Janikowo", "Kruszwica", "Pakość", "Rojewo", "Złotniki Kujawskie"],
    lipnowski: ["Bobrowniki", "Chrostkowo", "Dobrzyń nad Wisłą", "Kikół", "Lipno", "Skępe", "Tłuchowo", "Wielgie"],
    mogileński: ["Dąbrowa", "Jeziora Wielkie", "Mogilno", "Strzelno"],
    nakielski: ["Kcynia", "Mrocza", "Nakło nad Notecią", "Sadki", "Szubin"],
    radziejowski: ["Bytoń", "Dobre", "Osięciny", "Piotrków Kujawski", "Radziejów", "Topólka"],
    rypiński: ["Brzuze", "Rogowo", "Rypin", "Skrwilno", "Wąpielsk"],
    sępoleński: ["Kamień Krajeński", "Sępólno Krajeńskie", "Sośno", "Więcbork"],
    świecki: ["Bukowiec", "Dragacz", "Drzycim", "Jeżewo", "Lniano", "Nowe", "Osie", "Pruszcz", "Świecie", "Świekatowo", "Warlubie"],
    toruński: ["Chełmża", "Czernikowo", "Lubicz", "Łubianka", "Obrowo", "Wielka Nieszawka", "Zławieś Wielka"],
    tucholski: ["Cekcyn", "Gostycyn", "Kęsowo", "Lubiewo", "Śliwice", "Tuchola"],
    wąbrzeski: ["Dębowa Łąka", "Książki", "Płużnica", "Ryńsk", "Wąbrzeźno"],
    włocławski: ["Baruchowo", "Boniewo", "Brześć Kujawski", "Chodecz", "Fabianki", "Izbica Kujawska", "Kowal", "Lubanie", "Lubraniec", "Włocławek"],
    żniński: ["Barcin", "Gąsawa", "Janowiec Wielkopolski", "Łabiszyn", "Rogowo", "Żnin"],
    Bydgoszcz: ["Bydgoszcz"],
    Grudziądz: ["Grudziądz"],
    Toruń: ["Toruń"],
    Włocławek: ["Włocławek"],
  },
  lubelskie: {
    bialski: ["Biała Podlaska", "Drelów", "Janów Podlaski", "Konstantynów", "Leśna Podlaska", "Łomazy", "Międzyrzec Podlaski", "Piszczac", "Rokitno", "Rossosz", "Sławatycze", "Sosnówka", "Terespol", "Tuczna", "Wisznice", "Zalesie"],
    biłgorajski: ["Aleksandrów", "Biłgoraj", "Frampol", "Goraj", "Józefów", "Księżpol", "Łukowa", "Obsza", "Potok Górny", "Tarnogród", "Tereszpol", "Turobin"],
    chełmski: ["Białopole", "Chełm", "Dorohusk", "Dubienka", "Kamień", "Leśniowice", "Ruda-Huta", "Sawin", "Siedliszcze", "Wojsławice", "Wola Uhruska", "Żmudź"],
    hrubieszowski: ["Dołhobyczów", "Horodło", "Hrubieszów", "Mircze", "Trzeszczany", "Uchanie", "Werbkowice"],
    janowski: ["Annopol", "Batorz", "Chrzanów", "Dzwola", "Godziszów", "Janów Lubelski", "Modliborzyce", "Potok Wielki"],
    krasnostawski: ["Fajsławice", "Gorzków", "Izbica", "Krasnystaw", "Kraśniczyn", "Leśniowice", "Rudnik", "Siennica Różana", "Żółkiewka"],
    kraśnicki: ["Annopol", "Dzierzkowice", "Gościeradów", "Kraśnik", "Szastarka", "Trzydnik Duży", "Urzędów", "Wilkołaz", "Zakrzówek"],
    lubartowski: ["Abramów", "Firlej", "Jeziorzany", "Kamionka", "Kock", "Lubartów", "Michów", "Niemce", "Ostrów Lubelski", "Ostrówek", "Serniki", "Uścimów"],
    lubelski: ["Bełżyce", "Borzechów", "Bychawa", "Garbów", "Głusk", "Jabłonna", "Jastków", "Konopnica", "Krzczonów", "Ludwin", "Łęczna", "Mełgiew", "Niemce", "Niedrzwica Duża", "Piaski", "Spiczyn", "Strzyżewice", "Wojciechów", "Wólka"],
    łęczyński: ["Cyców", "Łęczna", "Ludwin", "Milejów", "Puchaczów", "Spiczyn"],
    łukowski: ["Adamów", "Krzywda", "Łuków", "Serokomla", "Stanin", "Stoczek Łukowski", "Trzebieszów", "Wojcieszków", "Wola Mysłowska"],
    opolski: ["Chodel", "Józefów nad Wisłą", "Karczmiska", "Łaziska", "Opole Lubelskie", "Poniatowa", "Wilków"],
    parczewski: ["Dębowa Kłoda", "Jabłoń", "Milanów", "Parczew", "Podedwórze", "Siemień", "Sosnowica"],
    puławski: ["Baranów", "Janowiec", "Kazimierz Dolny", "Końskowola", "Kurów", "Markuszów", "Nałęczów", "Puławy", "Wąwolnica", "Żyrzyn"],
    radzyński: ["Borki", "Czemierniki", "Kąkolewnica", "Komarówka Podlaska", "Radzyń Podlaski", "Ulan-Majorat", "Wohyń"],
    rycki: ["Dęblin", "Kłoczew", "Nowodwór", "Ryki", "Stężyca", "Ułęż"],
    świdnicki: ["Piaski", "Rybczewice", "Trawniki", "Świdnik"],
    tomaszowski: ["Bełżec", "Jarczów", "Józefów", "Krynice", "Łaszczów", "Rachanie", "Susiec", "Telatyn", "Tomaszów Lubelski", "Tyszowce", "Ulhówek"],
    włodawski: ["Hanna", "Hańsk", "Stary Brus", "Urszulin", "Włodawa", "Wola Uhruska", "Wyryki"],
    zamojski: ["Grabowiec", "Komarów-Osada", "Krasnobród", "Łabunie", "Miączyn", "Nielisz", "Radecznica", "Sitno", "Skierbieszów", "Stary Zamość", "Sułów", "Szczebrzeszyn", "Zamość", "Zwierzyniec"],
    "Biała Podlaska": ["Biała Podlaska"],
    Chełm: ["Chełm"],
    Lublin: ["Lublin"],
    Zamość: ["Zamość"],
  },
  lubuskie: {
    gorzowski: ["Deszczno", "Kłodawa", "Kostrzyn nad Odrą", "Lubiszyn", "Santok", "Witnica"],
    krośnieński: ["Bobrowice", "Bytnica", "Dąbie", "Gubin", "Krosno Odrzańskie", "Maszewo"],
    międzyrzecki: ["Bledzew", "Międzyrzecz", "Przytoczna", "Pszczew", "Skwierzyna", "Trzciel"],
    nowosolski: ["Bytom Odrzański", "Kolsko", "Kożuchów", "Nowa Sól", "Nowe Miasteczko", "Otyń", "Siedlisko"],
    słubicki: ["Cybinka", "Górzyca", "Ośno Lubuskie", "Rzepin", "Słubice"],
    strzelecko_drezdenecki: ["Dobiegniew", "Drezdenko", "Stare Kurowo", "Strzelce Krajeńskie", "Zwierzyn"],
    sulęciński: ["Krzeszyce", "Lubniewice", "Słońsk", "Sulęcin", "Torzym"],
    świebodziński: ["Łagów", "Skąpe", "Szczaniec", "Świebodzin", "Zbąszynek"],
    wschowski: ["Szlichtyngowa", "Wschowa"],
    zielonogórski: ["Babimost", "Bojadła", "Czerwieńsk", "Kargowa", "Nowogród Bobrzański", "Sulechów", "Świdnica", "Trzebiechów", "Zabór", "Zielona Góra"],
    żagański: ["Brzeźnica", "Gozdnica", "Iłowa", "Małomice", "Niegosławice", "Szprotawa", "Węgliniec", "Wymiarki", "Żagań", "Żary"],
    żarski: ["Brody", "Jasień", "Lipinki Łużyckie", "Lubsko", "Łęknica", "Marciszów", "Przewóz", "Trzebiel", "Tuplice", "Żary"],
    "Gorzów Wielkopolski": ["Gorzów Wielkopolski"],
    "Zielona Góra": ["Zielona Góra"],
  },
  lodzkie: {
    bełchatowski: ["Bełchatów", "Drużbice", "Kluki", "Kleszczów", "Rusiec", "Szczerców", "Zelów"],
    brzeziński: ["Brzeziny", "Dmosin", "Jeżów", "Rogów"],
    kutnowski: ["Bedlno", "Dąbrowice", "Góra Świętej Małgorzaty", "Krośniewice", "Kutno", "Łanięta", "Nowe Ostrowy", "Oporów", "Strzelce", "Żychlin"],
    łaski: ["Buczek", "Łask", "Sędziejowice", "Widawa", "Wodzierady"],
    łęczycki: ["Góra Świętej Małgorzaty", "Grabów", "Góra Świętej Małgorzaty", "Łęczyca", "Piątek", "Witonia"],
    łowicki: ["Bielawy", "Chąśno", "Domaniewice", "Góra Świętej Małgorzaty", "Kiernozia", "Kocierzew Południowy", "Łowicz", "Nieborów", "Zduny"],
    łódź_wschodni: ["Andrespol", "Brójce", "Koluszki", "Nowosolna", "Rzgów", "Tuszyn"],
    opoczyński: ["Drzewica", "Mniszków", "Nowy Głębock", "Opoczno", "Paradyż", "Poświętne", "Sławno", "Żarnów"],
    pabianicki: ["Dobroń", "Ksawerów", "Lutomiersk", "Pabianice", "Parzęczew"],
    pajęczański: ["Działoszyn", "Kiełczygłów", "Nowa Brzeźnica", "Pajęczno", "Rząśnia", "Siemkowice", "Strzelce Wielkie", "Sulmierzyce"],
    piotrkowski: ["Aleksandrów", "Czarnocin", "Gorzkowice", "Grabica", "Łęki Szlacheckie", "Moszczenica", "Ręczno", "Rozprza", "Sulejów", "Wola Krzysztoporska", "Wolbórz"],
    poddębicki: ["Dalików", "Góra Świętej Małgorzaty", "Łęczyca", "Pęczniew", "Poddębice", "Uniejów", "Wartkowice", "Zadzim"],
    radomszczański: ["Dobryszyce", "Gomunice", "Kamieńsk", "Kobiele Wielkie", "Kodrąb", "Lgota Wielka", "Ładzice", "Masłowice", "Przedbórz", "Radomsko", "Wielgomłyny", "Żytno"],
    rawski: ["Biała Rawska", "Cielądz", "Rawa Mazowiecka", "Regnów", "Sadkowice"],
    sieradzki: ["Brzeźnio", "Burzenin", "Goszczanów", "Klonowa", "Sieradz", "Warta", "Wróblew", "Złoczew"],
    skierniewicki: ["Bolimów", "Głuchów", "Głowno", "Kowiesy", "Lipce Reymontowskie", "Maków", "Nowy Kawęczyn", "Skierniewice", "Słupia"],
    tomaszowski: ["Będków", "Budziszewice", "Czerniewice", "Inowłódz", "Lubochnia", "Rokiciny", "Rzeczyca", "Tomaszów Mazowiecki", "Ujazd", "Żelechlinek"],
    wieluński: ["Biała", "Czarnożyły", "Konopnica", "Mokrsko", "Ostrówek", "Pątnów", "Skomlin", "Wieluń", "Wierzchlas", "Złoczew"],
    wieruszowski: ["Bolesławiec", "Czastary", "Galewice", "Lututów", "Łubnice", "Sokolniki", "Wieruszów"],
    zduńskowolski: ["Szadek", "Zapolice", "Zduńska Wola"],
    zgierski: ["Aleksandrów Łódzki", "Głowno", "Ozorków", "Parzęczew", "Stryków", "Zgierz"],
    Łódź: ["Łódź"],
    "Piotrków Trybunalski": ["Piotrków Trybunalski"],
    Skierniewice: ["Skierniewice"],
  },
  malopolskie: {
    bocheński: ["Bochnia", "Drwinia", "Lipnica Murowana", "Łapanów", "Nowy Wiśnicz", "Rzezawa", "Trzciana", "Żegocina"],
    brzeski: ["Borzęcin", "Brzesko", "Czchów", "Dębno", "Gnojnik", "Iwkowa", "Szczurowa"],
    chrzanowski: ["Alwernia", "Babice", "Chrzanów", "Libiąż", "Trzebinia"],
    dąbrowski: ["Dąbrowa Tarnowska", "Gręboszów", "Mędrzechów", "Olesno", "Radgoszcz", "Szczucin"],
    gorlicki: ["Biecz", "Bobowa", "Gorlice", "Lipinki", "Łużna", "Moszczenica", "Ropa", "Sękowa", "Uście Gorlickie"],
    krakowski: ["Czernichów", "Igołomia-Wawrzeńczyce", "Iwanowice", "Jerzmanowice-Przeginia", "Kocmyrzów-Luborzyca", "Liszki", "Michałowice", "Mogilany", "Niepołomice", "Skała", "Skawina", "Słomniki", "Sułoszowa", "Świątniki Górne", "Wielka Wieś", "Zabierzów", "Zielonki"],
    limanowski: ["Dobra", "Jodłownik", "Kamienica", "Limanowa", "Laskowa", "Mszana Dolna", "Niedźwiedź", "Słopnice", "Tymbark"],
    miechowski: ["Charsznica", "Gołcza", "Kozłów", "Książ Wielki", "Miechów", "Racławice", "Słaboszów"],
    myślenicki: ["Dobczyce", "Lubień", "Myślenice", "Pcim", "Raciechowice", "Siepraw", "Sułkowice", "Tokarnia", "Wiśniowa"],
    nowosądecki: ["Chełmiec", "Gródek nad Dunajcem", "Grybów", "Kamionka Wielka", "Korzenna", "Łącko", "Łososina Dolna", "Nawojowa", "Piwniczna-Zdrój", "Podegrodzie", "Rytro", "Stary Sącz"],
    nowotarski: ["Czarny Dunajec", "Jabłonka", "Krościenko nad Dunajcem", "Lipnica Wielka", "Łapsze Niżne", "Nowy Targ", "Ochotnica Dolna", "Raba Wyżna", "Rabka-Zdrój", "Spytkowice", "Szaflary"],
    olkuski: ["Bolesław", "Bukowno", "Klucze", "Olkusz", "Trzyciąż"],
    oświęcimski: ["Brzeszcze", "Chełmek", "Kęty", "Oświęcim", "Polanka Wielka", "Przeciszów", "Zator"],
    proszowicki: ["Koniusza", "Koszyce", "Nowe Brzesko", "Proszowice", "Radziemice"],
    suski: ["Budzów", "Bystra-Sidzina", "Jordanów", "Maków Podhalański", "Stryszawa", "Sucha Beskidzka", "Zawoja", "Zembrzyce"],
    tarnowski: ["Ciężkowice", "Lisia Góra", "Pleśna", "Radłów", "Ryglice", "Rzepiennik Strzyżewski", "Skrzyszów", "Szerzyny", "Tarnów", "Tuchów", "Wietrzychowice", "Wojnicz", "Wróblowice", "Zakliczyn"],
    tatrzański: ["Biały Dunajec", "Bukowina Tatrzańska", "Kościelisko", "Poronin", "Zakopane"],
    wadowicki: ["Andrychów", "Brzeźnica", "Kalwaria Zebrzydowska", "Lanckorona", "Mucharz", "Spytkowice", "Stryszów", "Tomice", "Wadowice", "Wieprz"],
    wielicki: ["Biskupice", "Gdów", "Kłaj", "Niepołomice", "Wieliczka"],
    Kraków: ["Kraków"],
    "Nowy Sącz": ["Nowy Sącz"],
    Tarnów: ["Tarnów"],
  },
  mazowieckie: {
    białobrzeski: ["Białobrzegi", "Promna", "Radzanów", "Stara Błotnica", "Stromiec", "Wyśmierzyce"],
    ciechanowski: ["Ciechanów", "Glinojeck", "Gołymin-Ośrodek", "Ojrzeń", "Opinogóra Górna", "Sońsk"],
    garwoliński: ["Garwolin", "Górzno", "Łaskarzew", "Maciejowice", "Miastków Kościelny", "Parysów", "Pilawa", "Sobolew", "Trojanów", "Wilga", "Żelechów"],
    gostyniński: ["Gostynin", "Łąck", "Pacyna", "Sanniki", "Szczawin Kościelny"],
    grodziski: ["Baranów", "Grodzisk Mazowiecki", "Jaktorów", "Milanówek", "Podkowa Leśna"],
    grójecki: ["Belsk Duży", "Błędów", "Chynów", "Grójec", "Goszczyn", "Jasieniec", "Mogielnica", "Nowe Miasto nad Pilicą", "Pniewy", "Warka"],
    kozienicki: ["Gniewoszów", "Głowaczów", "Grabów nad Pilicą", "Kozienice", "Magnuszew", "Sieciechów"],
    legionowski: ["Jabłonna", "Legionowo", "Nieporęt", "Serock", "Wieliszew"],
    lipski: ["Ciepielów", "Chotcza", "Lipsko", "Rzeczniów", "Sienno", "Solec nad Wisłą"],
    łosicki: ["Huszlew", "Łosice", "Olszanka", "Platerów", "Sarnaki", "Stara Kornica"],
    makowski: ["Czerwonka", "Krasnosielc", "Maków Mazowiecki", "Młynarze", "Płoniawy-Bramura", "Pokrzywnica", "Rzewnie", "Szelków"],
    miński: ["Cegłów", "Dębe Wielkie", "Dobre", "Halinów", "Jakubów", "Kałuszyn", "Latowicz", "Mińsk Mazowiecki", "Mrozy", "Siennica", "Stanisławów"],
    mławski: ["Dzierzgowo", "Lipowiec Kościelny", "Mława", "Radzanów", "Strzegowo", "Stupsk", "Szreńsk", "Szydłowo", "Wiśniewo"],
    nowodworski: ["Czosnów", "Leoncin", "Nasielsk", "Nowy Dwór Mazowiecki", "Pomiechówek", "Zakroczym"],
    ostrołęcki: ["Baranowo", "Czarnia", "Czerwin", "Goworowo", "Kadzidło", "Lelis", "Łyse", "Myszyniec", "Olszewo-Borki", "Rzekuń", "Troszyn"],
    ostrowski: ["Andrzejewo", "Boguty-Pianki", "Brok", "Małkinia Górna", "Nur", "Ostrów Mazowiecka", "Stary Lubotyń", "Szulborze Wielkie", "Wąsewo", "Zaręby Kościelne"],
    otwocki: ["Celestynów", "Józefów", "Karczew", "Kołbiel", "Osieck", "Otwock", "Sobienie-Jeziory", "Wiązowna"],
    piaseczyński: ["Góra Kalwaria", "Konstancin-Jeziorna", "Lesznowola", "Piaseczno", "Prażmów", "Tarczyn"],
    płocki: ["Bielsk", "Bodzanów", "Brudzeń Duży", "Bulkowo", "Drobin", "Gąbin", "Łąck", "Mała Wieś", "Nowy Duninów", "Radzanowo", "Słupno", "Staroźreby", "Wyszogród"],
    płoński: ["Baboszewo", "Czerwińsk nad Wisłą", "Dzierzążnia", "Joniec", "Naruszewo", "Nowe Miasto nad Wisłą", "Płońsk", "Raciąż", "Sochocin", "Załuski"],
    pruszkowski: ["Brwinów", "Michałowice", "Nadarzyn", "Piastów", "Pruszków", "Raszyn"],
    przasnyski: ["Chorzele", "Jednorożec", "Krasne", "Krzynowłoga Mała", "Przasnysz", "Rozogi"],
    przysuski: ["Borkowice", "Gielniów", "Klwów", "Nowe Miasto nad Pilicą", "Odrzywół", "Potworów", "Przysucha", "Rusinów", "Wieniawa"],
    pułtuski: ["Długosiodło", "Obryte", "Pokrzywnica", "Pułtusk", "Świercze", "Winnica", "Zatory"],
    radomski: ["Gózd", "Iłża", "Jastrzębia", "Jedlińsk", "Jedlnia-Letnisko", "Kowala", "Pionki", "Przytyk", "Skaryszew", "Wierzbica", "Wolanów", "Zakrzew"],
    siedlecki: ["Domanice", "Korczew", "Kotuń", "Mokobody", "Mordy", "Paprotnia", "Przesmyki", "Siedlce", "Skórzec", "Suchożebry", "Wiśniew", "Wodynie", "Zbuczyn"],
    sierpecki: ["Gozdowo", "Mochowo", "Rościszewo", "Sierpc", "Szczutowo", "Zawidz"],
    sochaczewski: ["Brochów", "Iłów", "Młodzieszyn", "Nowa Sucha", "Rybno", "Sochaczew", "Teresin"],
    sokołowski: ["Bielany", "Ceranów", "Jabłonna Lacka", "Kosów Lacki", "Sabnie", "Sokołów Podlaski", "Sterdyń"],
    szydłowiecki: ["Chlewiska", "Jastrząb", "Mirów", "Nowe Miasto nad Pilicą", "Orońsko", "Szydłowiec"],
    warszawski_zachodni: ["Błonie", "Kampinos", "Leszno", "Łomianki", "Ożarów Mazowiecki", "Stare Babice"],
    węgrowski: ["Grębków", "Korytnica", "Liw", "Łochów", "Miedzna", "Sadowne", "Stoczek", "Węgrów", "Wierzbno"],
    wołomiński: ["Dąbrówka", "Jadów", "Klembów", "Kobyłka", "Marki", "Radzymin", "Strachówka", "Tłuszcz", "Wołomin", "Ząbki", "Zielonka"],
    wyszkowski: ["Brańszczyk", "Długosiodło", "Rząśnik", "Somianka", "Wyszków", "Zabrodzie"],
    zwoleński: ["Kazanów", "Policzna", "Przyłęk", "Tczów", "Zwoleń"],
    żuromiński: ["Bieżuń", "Kuczbork-Osada", "Lubowidz", "Lutocin", "Siemiątkowo", "Żuromin"],
    żyrardowski: ["Mszczonów", "Puszcza Mariańska", "Radziejowice", "Wiskitki", "Żyrardów"],
    Warszawa: ["Warszawa"],
    Radom: ["Radom"],
    "Płock": ["Płock"],
    "Siedlce": ["Siedlce"],
    "Ostrołęka": ["Ostrołęka"],
  },
  opolskie: {
    brzeski: ["Brzeg", "Grodków", "Lewin Brzeski", "Lubsza", "Olszanka", "Skarbimierz"],
    głubczycki: ["Baborów", "Branice", "Głubczyce", "Kietrz"],
    kędzierzyńsko_kozielski: ["Bierawa", "Cisek", "Kędzierzyn-Koźle", "Pawłowiczki", "Polska Cerekiew", "Reńska Wieś"],
    kluczborski: ["Byczyna", "Kluczbork", "Lasowice Wielkie", "Wołczyn"],
    krapkowicki: ["Gogolin", "Krapkowice", "Strzeleczki", "Walce", "Zdzieszowice"],
    namysłowski: ["Domaszowice", "Namysłów", "Pokój", "Świerczów", "Wilków"],
    nyski: ["Głuchołazy", "Kamiennik", "Korfantów", "Łambinowice", "Nysa", "Otmuchów", "Paczków", "Pakosławice", "Skoroszyce"],
    oleski: ["Dobrodzień", "Gorzów Śląski", "Kolonowskie", "Olesno", "Praszka", "Radłów", "Zębowice"],
    opolski: ["Chrząstowice", "Dąbrowa", "Dobrzeń Wielki", "Komprachcice", "Łubniany", "Murów", "Niemodlin", "Ozimek", "Popielów", "Prószków", "Tarnów Opolski", "Tułowice", "Turawa"],
    prudnicki: ["Biała", "Lubrza", "Ludźmierz", "Prudnik"],
    strzelecki: ["Izbicko", "Jemielnica", "Leśnica", "Strzelce Opolskie", "Ujazd", "Zawadzkie"],
    Opole: ["Opole"],
  },
  podkarpackie: {
    bieszczadzki: ["Czna", "Lesko", "Lutowiska", "Ustrzyki Dolne"],
    brzozowski: ["Brzozów", "Domaradz", "Dydnia", "Haczów", "Jasienica Rosielna", "Nozdrzec"],
    dębicki: ["Brzostek", "Czarna", "Dębica", "Jodłowa", "Pilzno", "Żyraków"],
    jarosławski: ["Chłopice", "Jarosław", "Laszki", "Pawłosiów", "Pruchnik", "Radymno", "Rokietnica", "Roźwienica", "Wiązownica"],
    jasielski: ["Brzyska", "Dębowiec", "Jasło", "Kołaczyce", "Krempna", "Nowy Żmigród", "Osiek Jasielski", "Skołyszyn", "Tarnowiec"],
    kolbuszowski: ["Cmolas", "Kolbuszowa", "Majdan Królewski", "Niwiska", "Raniżów", "Sokołów Małopolski"],
    krośnieński: ["Chorkówka", "Iwonicz-Zdrój", "Jedlicze", "Korczyna", "Krościenko Wyżne", "Krosno", "Miejsce Piastowe", "Rymanów", "Wojaszówka"],
    leski: ["Baligród", "Cisna", "Lesko", "Olszanica", "Solina"],
    leżajski: ["Kuryłówka", "Leżajsk", "Nowa Sarzyna", "Grodzisko Dolne"],
    lubaczowski: ["Cieszanów", "Horyniec-Zdrój", "Lubaczów", "Narol", "Oleszyce", "Stary Dzików", "Wielkie Oczy"],
    łańcucki: ["Białobrzegi", "Czarna", "Łańcut", "Markowa", "Rakszawa", "Żołynia"],
    mielecki: ["Borowa", "Czermin", "Gawłuszowice", "Mielec", "Padew Narodowa", "Przecław", "Radomyśl Wielki", "Tuszów Narodowy", "Wadowice Górne"],
    niżański: ["Harasiuki", "Jarocin", "Jeżowe", "Nisko", "Rudnik nad Sanem", "Ulanów"],
    przemyski: ["Bircza", "Dubiecko", "Fredropol", "Krasiczyn", "Krzywcza", "Medyka", "Orły", "Przemyśl", "Stubno", "Żurawica"],
    przeworski: ["Adamówka", "Gać", "Jawornik Polski", "Kańczuga", "Leżajsk", "Przeworsk", "Sieniawa", "Tryńcza", "Zarzecze"],
    ropczycko_sędziszowski: ["Iwierzyce", "Ostrów", "Ropczyce", "Sędziszów Małopolski", "Wielopole Skrzyńskie"],
    rzeszowski: ["Błażowa", "Boguchwała", "Chmielnik", "Głogów Małopolski", "Hyżne", "Krasne", "Lubenia", "Niebylec", "Świlcza", "Tyczyn"],
    sanocki: ["Besko", "Bukowsko", "Lesko", "Sanok", "Tyrawa Wołoska", "Zagórz", "Zarszyn"],
    stalowowolski: ["Bojanów", "Pysznica", "Radomyśl nad Sanem", "Stalowa Wola", "Zaklików", "Zaleszany"],
    strzyżowski: ["Frysztak", "Niebylec", "Strzyżów", "Wiśniowa"],
    tarnobrzeski: ["Baranów Sandomierski", "Gorzyce", "Grębów", "Nowa Dęba"],
    Krosno: ["Krosno"],
    Przemyśl: ["Przemyśl"],
    Rzeszów: ["Rzeszów"],
    "Tarnobrzeg": ["Tarnobrzeg"],
  },
  podlaskie: {
    augustowski: ["Augustów", "Bargłów Kościelny", "Lipsk", "Nowinka", "Płaska", "Sztabin"],
    białostocki: ["Choroszcz", "Czarna Białostocka", "Dobrzyniewo Duże", "Gródek", "Juchnowiec Kościelny", "Łapy", "Michałowo", "Poświętne", "Supraśl", "Turośń Kościelna", "Wasilków", "Zabłudów"],
    bielski: ["Bielsk Podlaski", "Boćki", "Brańsk", "Orla", "Rudka", "Wyszki"],
    grajewski: ["Grajewo", "Rajgród", "Radziłów", "Szczuczyn", "Wąsosz"],
    hajnowski: ["Białowieża", "Czeremcha", "Czyże", "Dubicze Cerkiewne", "Hajnówka", "Kleszczele", "Narew", "Narewka"],
    kolneński: ["Grabowo", "Kolno", "Mały Płock", "Turośl", "Stawiski"],
    łomżyński: ["Jedwabne", "Łomża", "Miastkowo", "Nowogród", "Piątnica", "Przytuły", "Śniadowo", "Wizna", "Zbójna"],
    moniecki: ["Goniądz", "Jasionówka", "Jaświły", "Knyszyn", "Krypno", "Mońki", "Trzcianne"],
    sejneński: ["Giby", "Krasnopol", "Puńsk", "Sejny"],
    siemiatycki: ["Drohiczyn", "Dziadkowice", "Grodzisk", "Mielnik", "Milejczyce", "Nurzec-Stacja", "Perlejewo", "Siemiatycze"],
    sokólski: ["Dąbrowa Białostocka", "Janów", "Korycin", "Krynki", "Kuźnica", "Nowy Dwór", "Sidra", "Sokółka", "Suchowola", "Szudziałowo"],
    suwalski: ["Bakałarzewo", "Filipów", "Jeleniewo", "Przerośl", "Raczki", "Rutka-Tartak", "Suwałki", "Szypliszki", "Wiżajny"],
    wysokomazowiecki: ["Ciechanowiec", "Czyżew", "Wysokie Mazowieckie", "Klukowo", "Kobylin-Borzymy", "Nowe Piekuty", "Sokoły", "Szepietowo"],
    zambrowski: ["Kołaki Kościelne", "Rutki", "Szumowo", "Zambrów", "Zawady"],
    Białystok: ["Białystok"],
    Łomża: ["Łomża"],
    Suwałki: ["Suwałki"],
  },
  pomorskie: {
    bytowski: ["Borzytuchom", "Bytów", "Czarna Dąbrówka", "Kołczygłowy", "Lipnica", "Miastko", "Parchowo", "Studzienice", "Trzebielino", "Tuchomie"],
    chojnicki: ["Brusy", "Chojnice", "Czersk", "Konarzyny"],
    człuchowski: ["Czarne", "Człuchów", "Debrzno", "Koczała", "Przechlewo", "Rzeczenica"],
    gdański: ["Cedry Wielkie", "Kolbudy", "Pruszcz Gdański", "Przywidz", "Pszczółki", "Suchy Dąb", "Trąbki Wielkie"],
    kartuski: ["Chmielno", "Kartuzy", "Przodkowo", "Sierakowice", "Somonino", "Stężyca", "Sulęczyno", "Żukowo"],
    kościerski: ["Dziemiany", "Karsin", "Kościerzyna", "Liniewo", "Lipusz", "Nowa Karczma", "Stara Kiszewa"],
    kwidzyński: ["Gardeja", "Kwidzyn", "Prabuty", "Ryjewo", "Sadlinki"],
    lęborski: ["Cewice", "Czarna Dąbrówka", "Lębork", "Nowa Wieś Lęborska", "Wicko"],
    malborski: ["Lichnowy", "Malbork", "Miłoradz", "Nowy Staw", "Stare Pole"],
    nowodworski: ["Nowy Dwór Gdański", "Ostaszewo", "Stegna", "Sztutowo"],
    pucki: ["Hel", "Jastarnia", "Kosakowo", "Krokowa", "Puck", "Władysławowo"],
    słupski: ["Damnica", "Dębnica Kaszubska", "Główczyce", "Kępice", "Kobylnica", "Potęgowo", "Smołdzino", "Słupsk"],
    starogardzki: ["Bobowo", "Czarna Woda", "Kaliska", "Lubichowo", "Osieczna", "Skarszewy", "Skórcz", "Smętowo Graniczne", "Starogard Gdański", "Zblewo"],
    sztumski: ["Dzierzgoń", "Mikołajki Pomorskie", "Stary Dzierzgoń", "Stary Targ", "Sztum"],
    tczewski: ["Gniew", "Morzeszczyn", "Pelplin", "Subkowy", "Tczew"],
    wejherowski: ["Gniewino", "Linia", "Luzino", "Łęczyce", "Reda", "Rumia", "Szemud", "Wejherowo"],
    Gdańsk: ["Gdańsk"],
    Gdynia: ["Gdynia"],
    Słupsk: ["Słupsk"],
    Sopot: ["Sopot"],
  },
  slaskie: {
    będziński: ["Będzin", "Bobrowniki", "Czeladź", "Mierzęcice", "Psary", "Siewierz", "Sławków", "Wojkowice"],
    bielski: ["Bestwina", "Buczkowice", "Czechowice-Dziedzice", "Jasienica", "Jaworze", "Kozy", "Porąbka", "Szczyrk", "Wilkowice"],
    cieszyński: ["Brenna", "Chybie", "Dębowiec", "Goleszów", "Hażlach", "Istebna", "Skoczów", "Strumień", "Ustroń", "Wisła", "Zebrzydowice"],
    częstochowski: ["Blachownia", "Dąbrowa Zielona", "Janów", "Kamienica Polska", "Kłomnice", "Konopiska", "Kruszyna", "Lelów", "Mstów", "Mykanów", "Olsztyn", "Poczesna", "Przyrów", "Rędziny", "Starcza"],
    gliwicki: ["Gierałtowice", "Knurów", "Pilchowice", "Rudziniec", "Sośnicowice", "Toszek", "Wielowieś"],
    górowski: ["Góra", "Jemielno", "Niechlów", "Wąsosz"],
    kłobucki: ["Kłobuck", "Lipie", "Miedźno", "Opatów", "Panki", "Popów", "Przystajń", "Wręczyca Wielka"],
    lubliniecki: ["Boronów", "Ciasna", "Herby", "Kochanowice", "Koszęcin", "Lubliniec", "Pawonków", "Woźniki"],
    mikołowski: ["Łaziska Górne", "Mikołów", "Orzesze", "Ornontowice", "Wyry"],
    myszkowski: ["Koziegłowy", "Myszków", "Niegowa", "Poraj"],
    pszczyński: ["Goczałkowice-Zdrój", "Kobiór", "Miedźna", "Pawłowice", "Pszczyna", "Suszec"],
    raciborski: ["Kornowac", "Krzanowice", "Krzyżanowice", "Kuźnia Raciborska", "Nędza", "Pietrowice Wielkie", "Racibórz"],
    rybnicki: ["Czerwionka-Leszczyny", "Gaszowice", "Jejkowice", "Lyski", "Świerklany"],
    tarnogórski: ["Kalety", "Krupski Młyn", "Miasteczko Śląskie", "Ożarowice", "Świerklaniec", "Tarnowskie Góry", "Tworóg", "Zbrosławice"],
    wodzisławski: ["Godów", "Gorzyce", "Lubomia", "Marklowice", "Mszana", "Pszów", "Radlin", "Rydułtowy", "Wodzisław Śląski"],
    zawierciański: ["Irządze", "Kroczyce", "Łazy", "Ogrodzieniec", "Pilica", "Poręba", "Szczekociny", "Włodowice", "Zawiercie", "Żarnowiec"],
    żywiecki: ["Czernichów", "Gilowice", "Jeleśnia", "Koszarawa", "Lipowa", "Łodygowice", "Milówka", "Radziechowy-Wieprz", "Rajcza", "Ślemień", "Świnna", "Ujsoły", "Węgierska Górka", "Żywiec"],
    Bielsko_Biała: ["Bielsko-Biała"],
    Bytom: ["Bytom"],
    Chorzów: ["Chorzów"],
    Częstochowa: ["Częstochowa"],
    Dąbrowa_Górnicza: ["Dąbrowa Górnicza"],
    Gliwice: ["Gliwice"],
    Jastrzębie_Zdrój: ["Jastrzębie-Zdrój"],
    Jaworzno: ["Jaworzno"],
    Katowice: ["Katowice"],
    Mysłowice: ["Mysłowice"],
    Piekary_Śląskie: ["Piekary Śląskie"],
    Ruda_Śląska: ["Ruda Śląska"],
    Rybnik: ["Rybnik"],
    Siemianowice_Śląskie: ["Siemianowice Śląskie"],
    Sosnowiec: ["Sosnowiec"],
    Świętochłowice: ["Świętochłowice"],
    Tychy: ["Tychy"],
    Zabrze: ["Zabrze"],
    Żory: ["Żory"],
  },
  swietokrzyskie: {
    buski: ["Busko-Zdrój", "Gnojno", "Nowy Korczyn", "Pacanów", "Solec-Zdrój", "Stopnica", "Tuczępy", "Wiślica"],
    jędrzejowski: ["Imielno", "Jędrzejów", "Małogoszcz", "Nagłowice", "Oksa", "Sędziszów", "Słupia", "Sobków", "Wodzisław"],
    kazimierski: ["Bejsce", "Czarnocin", "Kazimierza Wielka", "Opatowiec", "Skalbmierz"],
    kielecki: ["Bieliny", "Bodzentyn", "Chęciny", "Chmielnik", "Daleszyce", "Górno", "Łagów", "Łopuszno", "Masłów", "Miedziana Góra", "Mniów", "Morawica", "Nowa Słupia", "Raków", "Sitkówka-Nowiny", "Strawczyn", "Zagnańsk"],
    konecki: ["Fałków", "Gowarczów", "Końskie", "Radoszyce", "Ruda Maleniecka", "Słupia", "Smyków", "Stąporków"],
    opatowski: ["Baćkowice", "Iwaniska", "Lipnik", "Opatów", "Ożarów", "Sadowie", "Tarłów", "Wojciechowice"],
    ostrowiecki: ["Bałtów", "Bodzechów", "Ćmielów", "Kunów", "Ostrowiec Świętokrzyski", "Waśniów"],
    pińczowski: ["Działoszyce", "Kije", "Michałów", "Pińczów", "Złota"],
    sandomierski: ["Dwikozy", "Gorzyce", "Klimontów", "Koprzywnica", "Łoniów", "Obrazów", "Samborzec", "Sandomierz", "Wilczyce", "Zawichost"],
    skarżyski: ["Bliżyn", "Łączna", "Skarżysko-Kamienna", "Suchedniów"],
    starachowicki: ["Brody", "Mirzec", "Pawłów", "Starachowice", "Wąchock"],
    staszowski: ["Bogoria", "Czajków", "Łubnice", "Oleśnica", "Osiek", "Połaniec", "Rytwiany", "Staszów", "Szydłów", "Tuczępy"],
    włoszczowski: ["Kluczewsko", "Krasocin", "Moskorzew", "Secemin", "Włoszczowa"],
    Kielce: ["Kielce"],
  },
  "warminsko-mazurskie": {
    bartoszycki: ["Bartoszyce", "Bisztynek", "Górowo Iławeckie", "Sępopol"],
    braniewski: ["Braniewo", "Frombork", "Lelkowo", "Pieniężno", "Płoskinia", "Wilczęta"],
    działdowski: ["Działdowo", "Iłowo-Osada", "Lidzbark", "Płośnica", "Rybno"],
    elbląski: ["Elbląg", "Gronowo Elbląskie", "Markusy", "Milejewo", "Młynary", "Pasłęk", "Rychliki", "Tolkmicko"],
    ełcki: ["Ełk", "Kalinowo", "Prostki", "Stare Juchy"],
    giżycki: ["Giżycko", "Kruklanki", "Miłki", "Ryn", "Wydminy"],
    gołdapski: ["Banie Mazurskie", "Dubeninki", "Gołdap"],
    iławski: ["Iława", "Kisielice", "Lubawa", "Susz", "Zalewo"],
    kętrzyński: ["Barciany", "Kętrzyn", "Korsze", "Reszel", "Srokowo"],
    lidzbarski: ["Kiwity", "Lidzbark Warmiński", "Lubomino", "Orneta"],
    mrągowski: ["Mikołajki", "Mrągowo", "Piecki", "Sorkwity"],
    nidzicki: ["Janowiec Kościelny", "Janowo", "Kozłowo", "Nidzica"],
    nowomiejski: ["Biskupiec", "Grodziczno", "Kurzętnik", "Nowe Miasto Lubawskie"],
    olecki: ["Kowale Oleckie", "Olecko", "Świętajno", "Wieliczki"],
    olsztyński: ["Barczewo", "Biskupiec", "Dobre Miasto", "Dywity", "Gietrzwałd", "Jeziorany", "Jonkowo", "Kolno", "Lidzbark Warmiński", "Purda", "Stawiguda", "Świątki"],
    ostródzki: ["Dąbrówno", "Grunwald", "Łukta", "Małdyty", "Miłakowo", "Miłomłyn", "Morąg", "Ostróda"],
    piski: ["Biała Piska", "Pisz", "Ruciane-Nida", "Wądołki"],
    szczycieński: ["Dźwierzuty", "Jedwabno", "Pasym", "Rozogi", "Szczytno", "Świętajno", "Wielbark"],
    węgorzewski: ["Budry", "Pozezdrze", "Węgorzewo"],
    Elbląg: ["Elbląg"],
    Olsztyn: ["Olsztyn"],
  },
  wielkopolskie: {
    chodzieski: ["Chodzież", "Margonin", "Strzelce Krajeńskie", "Szamocin"],
    czarnkowsko_trzcianecki: ["Czarnków", "Drawsko", "Krzyż Wielkopolski", "Lubasz", "Połajewo", "Trzcianka", "Wieleń"],
    gnieźnieński: ["Cłowice", "Gniezno", "Kiszkowo", "Kłecko", "Łubowo", "Mieleszyn", "Niechanowo", "Trzemeszno", "Witkowo"],
    gostyński: ["Borek Wielkopolski", "Gostyń", "Krobia", "Pępowo", "Piaski", "Pogorzela", "Poniec"],
    grodziski: ["Granowo", "Grodzisk Wielkopolski", "Kamieniec", "Rakoniewice", "Wielichowo"],
    jarociński: ["Jaraczewo", "Jarocin", "Kotlin", "Żerków"],
    kaliski: ["Blizanów", "Brzeziny", "Ceków-Kolonia", "Godziesze Wielkie", "Koźminek", "Lisków", "Mycielin", "Opatówek", "Ręczno", "Stawiszyn", "Szczytniki", "Żelazków"],
    kępiński: ["Baranów", "Bralin", "Kępno", "Łęka Opatowska", "Perzów", "Rychtal", "Trzcinica"],
    kolski: ["Dąbie", "Grzegorzew", "Kłodawa", "Koło", "Kościelec", "Olszówka", "Osiek Mały", "Przedecz", "Babiak"],
    koniński: ["Golina", "Grodziec", "Kazimierz Biskupi", "Kleczew", "Kramsk", "Krzymów", "Rychwał", "Rzgów", "Skulsk", "Sompolno", "Stare Miasto", "Ślesin", "Wierzbinek", "Wilczyn"],
    kościański: ["Czempiń", "Kościan", "Krzywiń", "Śmigiel"],
    krotoszyński: ["Koźmin Wielkopolski", "Krotoszyn", "Rozdrażew", "Sulmierzyce", "Zduny"],
    leszczyński: ["Krzemieniewo", "Lipno", "Osieczna", "Rydzyna", "Święciechowa", "Wijewo", "Włoszakowice"],
    międzychodzki: ["Chrzypsko Wielkie", "Kwilcz", "Międzychód", "Sieraków"],
    nowotomyski: ["Kuślin", "Lwówek", "Nowy Tomyśl", "Opalenica", "Zbąszyń"],
    obornicki: ["Oborniki", "Rogoźno", "Ryczywół"],
    ostrowski: ["Nowe Skalmierzyce", "Ostrów Wielkopolski", "Przygodzice", "Raszków", "Sieroszewice", "Sośnie"],
    ostrzeszowski: ["Czajków", "Doruchów", "Grabów nad Prosną", "Kobyla Góra", "Kraszewice", "Mikstat", "Ostrzeszów"],
    pilski: ["Białośliwie", "Kaczory", "Łobżenica", "Miasteczko Krajeńskie", "Piła", "Szydłowo", "Ujście", "Wysoka"],
    pleszewski: ["Chocz", "Czermin", "Dobrzyca", "Gołuchów", "Pleszew"],
    poznański: ["Buk", "Czerwonak", "Dopiewo", "Kleszczewo", "Komorniki", "Kostrzyn", "Kórnik", "Luboń", "Mosina", "Murowana Goślina", "Pobiedziska", "Rokietnica", "Stęszew", "Suchy Las", "Swarzędz", "Szamotuły"],
    rawicki: ["Bojanowo", "Jutrosin", "Pakosław", "Rawicz", "Miejska Górka"],
    słupecki: ["Lądek", "Orchowo", "Ostrowite", "Powidz", "Słupca", "Strzałkowo"],
    szamotulski: ["Duszniki", "Kaźmierz", "Obrzycko", "Ostroróg", "Pniewy", "Szamotuły", "Wronki"],
    średzki: ["Dominowo", "Krzykosy", "Nowe Miasto nad Wartą", "Środa Wielkopolska", "Zaniemyśl"],
    śremski: ["Brodnica", "Dolsk", "Książ Wielkopolski", "Śrem"],
    turecki: ["Brudzew", "Dobra", "Kawęczyn", "Malanów", "Przykona", "Tuliszków", "Turek", "Władysławów"],
    wągrowiecki: ["Damasławek", "Gołańcz", "Mieścisko", "Skoki", "Wągrowiec"],
    wolsztyński: ["Przemęt", "Siedlec", "Wolsztyn"],
    wrzesiński: ["Kołaczkowo", "Miłosław", "Nekla", "Pyzdry", "Września"],
    złotowski: ["Jastrowie", "Krajenka", "Lipka", "Okonek", "Tarnówka", "Zakrzewo", "Złotów"],
    Kalisz: ["Kalisz"],
    Konin: ["Konin"],
    Leszno: ["Leszno"],
    Poznań: ["Poznań"],
  },
  zachodniopomorskie: {
    białogardzki: ["Białogard", "Karlino", "Tychowo"],
    choszczeński: ["Bierzwnik", "Choszczno", "Drawno", "Krzęcin", "Pełczyce", "Recz"],
    drawski: ["Czaplinek", "Drawsko Pomorskie", "Kalisz Pomorski", "Ostrowice", "Wierzchowo", "Złocieniec"],
    goleniowski: ["Goleniów", "Maszewo", "Nowogard", "Osina", "Stepnica"],
    gryficki: ["Brojce", "Gryfice", "Karnice", "Płoty", "Rewal", "Trzebiatów"],
    gryfiński: ["Banie", "Cedynia", "Chojna", "Gryfino", "Mieszkowice", "Moryń", "Stare Czarnowo", "Trzcińsko-Zdrój", "Widuchowa"],
    kamieński: ["Dziwnów", "Golczewo", "Kamień Pomorski", "Międzyzdroje", "Świerzno", "Wolin"],
    kołobrzeski: ["Dygowo", "Gościno", "Kołobrzeg", "Rymań", "Siemyśl", "Ustronie Morskie"],
    koszaliński: ["Będzino", "Biesiekierz", "Bobolice", "Manowo", "Mielno", "Polanów", "Sianów", "Świeszyno"],
    łobeski: ["Dobra", "Łobez", "Radowo Małe", "Resko", "Węgorzyno"],
    myśliborski: ["Barlinek", "Dębno", "Myślibórz", "Nowogródek Pomorski"],
    policki: ["Dobra", "Kołbaskowo", "Nowe Warpno", "Police"],
    pyrzycki: ["Bielice", "Kozielice", "Lipiany", "Przelewice", "Pyrzyce", "Warnice"],
    sławieński: ["Darłowo", "Malechowo", "Postomino", "Sławno", "Świeszyno"],
    stargardzki: ["Chociwel", "Dolice", "Ińsko", "Kobylanka", "Marianowo", "Stargard", "Stara Dąbrowa", "Suchań"],
    szczecinecki: ["Barwice", "Biały Bór", "Borne Sulinowo", "Grzmiąca", "Szczecinek"],
    świdwiński: ["Brzeżno", "Połczyn-Zdrój", "Rąbino", "Sławoborze", "Świdwin"],
    walecki: ["Człopa", "Mirosławiec", "Tuczno", "Wałcz"],
    Koszalin: ["Koszalin"],
    Szczecin: ["Szczecin"],
    "Świnoujście": ["Świnoujście"],
  },
};

export function getPowiats(voivodeship: string): string[] {
  const data = TERYT[voivodeship];
  if (!data) return [];
  return Object.keys(data).sort((a, b) => a.localeCompare(b, "pl"));
}

export function getGminas(voivodeship: string, powiat: string): string[] {
  const data = TERYT[voivodeship];
  if (!data) return [];
  return data[powiat] ?? [];
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run tests/domains/geo/teryt.test.ts
```
Expected: PASS (3 describe blocks, 6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/geo/teryt.ts tests/domains/geo/teryt.test.ts
git commit -m "feat(geo): add static TERYT data with getPowiats/getGminas helpers"
```

---

## Task 2: LocationCascade component

**Files:**
- Create: `src/domains/geo/components/location-cascade.tsx`
- Modify: `src/domains/geo/index.ts`

- [ ] **Step 1: Create the component**

```tsx
// src/domains/geo/components/location-cascade.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  FormItem,
  FormLabel,
} from "@/shared/ui/form";
import { VOIVODESHIPS } from "@/domains/geo/types";
import { getPowiats, getGminas } from "@/domains/geo/teryt";

export interface LocationValue {
  voivodeship: string | null;
  county: string | null;
  commune: string | null;
}

interface LocationCascadeProps {
  mode: "filter" | "form";
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  labels?: {
    voivodeship?: string;
    county?: string;
    commune?: string;
    allVoivodeships?: string;
    allCounties?: string;
    allCommunes?: string;
  };
}

export function LocationCascade({
  mode,
  value,
  onChange,
  labels = {},
}: LocationCascadeProps) {
  const {
    voivodeship: labelVoiv = "Województwo",
    county: labelCounty = "Powiat",
    commune: labelCommune = "Gmina",
    allVoivodeships = "Wszystkie województwa",
    allCounties = "Wszystkie powiaty",
    allCommunes = "Wszystkie gminy",
  } = labels;

  const powiats = value.voivodeship ? getPowiats(value.voivodeship) : [];
  const gminas =
    value.voivodeship && value.county
      ? getGminas(value.voivodeship, value.county)
      : [];

  function handleVoivodeshipChange(v: string) {
    onChange({
      voivodeship: v === "all" ? null : v,
      county: null,
      commune: null,
    });
  }

  function handleCountyChange(v: string) {
    onChange({
      ...value,
      county: v === "all" ? null : v,
      commune: null,
    });
  }

  function handleCommuneChange(v: string) {
    onChange({
      ...value,
      commune: v === "all" ? null : v,
    });
  }

  const voivodeshipSelect = (
    <Select
      value={value.voivodeship ?? "all"}
      onValueChange={handleVoivodeshipChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelVoiv} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allVoivodeships}</SelectItem>
        )}
        {VOIVODESHIPS.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const countySelect = (
    <Select
      value={value.county ?? "all"}
      onValueChange={handleCountyChange}
      disabled={powiats.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelCounty} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allCounties}</SelectItem>
        )}
        {powiats.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const communeSelect = (
    <Select
      value={value.commune ?? "all"}
      onValueChange={handleCommuneChange}
      disabled={gminas.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelCommune} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allCommunes}</SelectItem>
        )}
        {gminas.map((g) => (
          <SelectItem key={g} value={g}>
            {g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (mode === "filter") {
    return (
      <>
        {voivodeshipSelect}
        {countySelect}
        {communeSelect}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>{labelVoiv}</FormLabel>
        {voivodeshipSelect}
      </FormItem>
      <FormItem>
        <FormLabel>{labelCounty}</FormLabel>
        {countySelect}
      </FormItem>
      <FormItem>
        <FormLabel>{labelCommune}</FormLabel>
        {communeSelect}
      </FormItem>
    </div>
  );
}
```

- [ ] **Step 2: Export from geo index**

```ts
// src/domains/geo/index.ts
export { VOIVODESHIPS, type Voivodeship, type UserAddress } from "./types";
export { VOIVODESHIP_CENTERS } from "./voivodeship-centers";
export { geocodeLocation } from "./geocode";
export { getPowiats, getGminas } from "./teryt";
export { LocationCascade, type LocationValue } from "./components/location-cascade";
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/geo/components/location-cascade.tsx src/domains/geo/index.ts
git commit -m "feat(geo): add LocationCascade component with filter and form modes"
```

---

## Task 3: Schema updates

**Files:**
- Modify: `src/domains/marketplace/schemas/validation.ts`
- Modify: `tests/domains/marketplace/schemas/validation.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the existing `tests/domains/marketplace/schemas/validation.test.ts`:

```ts
import {
  createListingSchema,
  searchListingsSchema,
  searchFarmersSchema,
} from "@/domains/marketplace/schemas/validation";

// Add inside describe("searchListingsSchema"):
it("accepts county and commune filters", () => {
  const result = searchListingsSchema.safeParse({
    voivodeship: "malopolskie",
    county: "krakowski",
    commune: "Wieliczka",
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.county).toBe("krakowski");
    expect(result.data.commune).toBe("Wieliczka");
  }
});

// New describe block:
describe("searchFarmersSchema", () => {
  it("accepts empty input", () => {
    expect(searchFarmersSchema.safeParse({}).success).toBe(true);
  });

  it("accepts full location filters", () => {
    const result = searchFarmersSchema.safeParse({
      voivodeship: "mazowieckie",
      county: "warszawski_zachodni",
      commune: "Błonie",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify failures**

```bash
npx vitest run tests/domains/marketplace/schemas/validation.test.ts
```
Expected: FAIL — `searchFarmersSchema` not exported, `county` not in `searchListingsSchema`

- [ ] **Step 3: Update schemas**

```ts
// src/domains/marketplace/schemas/validation.ts
import { z } from "zod";

const deliveryOptionSchema = z.object({
  type: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
  address: z.string().optional(),
  radius: z.coerce.number().positive().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  hours: z.string().optional(),
});

export const createListingSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(255),
  description: z.string().max(5000).default(""),
  categoryId: z.string().min(1, "Kategoria jest wymagana"),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).default("CONVENTIONAL"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  price: z.coerce.number().positive("Cena musi byc wieksza od 0"),
  unit: z.enum(["KG", "PIECE", "LITER", "BUNCH"]),
  quantityAvailable: z.coerce.number().positive().optional(),
  availability: z
    .enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"])
    .default("AVAILABLE"),
  validUntil: z.string().optional(),
  deliveryOptions: z
    .array(deliveryOptionSchema)
    .min(1, "Dodaj przynajmniej jedna opcje dostawy"),
});

export const searchListingsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  voivodeship: z.string().optional(),
  county: z.string().optional(),
  commune: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "name"])
    .default("newest"),
  page: z.coerce.number().default(1),
});

export const searchFarmersSchema = z.object({
  voivodeship: z.string().optional(),
  county: z.string().optional(),
  commune: z.string().optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type DeliveryOptionInput = z.infer<typeof deliveryOptionSchema>;
export type SearchFarmersInput = z.infer<typeof searchFarmersSchema>;
```

- [ ] **Step 4: Run — verify pass**

```bash
npx vitest run tests/domains/marketplace/schemas/validation.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/marketplace/schemas/validation.ts tests/domains/marketplace/schemas/validation.test.ts
git commit -m "feat(marketplace): add county/commune to listings schema and add searchFarmersSchema"
```

---

## Task 4: Update get-listings query

**Files:**
- Modify: `src/domains/marketplace/queries/get-listings.ts`

- [ ] **Step 1: Add county and commune conditions**

```ts
// src/domains/marketplace/queries/get-listings.ts
import {
  eq,
  and,
  ilike,
  gte,
  lte,
  desc,
  asc,
  sql,
  ne,
} from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
} from "@/shared/db/schema";
import type { SearchListingsInput } from "../schemas/validation";

const ITEMS_PER_PAGE = 12;

export async function getListings(filters: SearchListingsInput) {
  const conditions = [ne(listings.availability, "OUT_OF_STOCK")];

  if (filters.q) {
    conditions.push(ilike(products.name, `%${filters.q}%`));
  }
  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.voivodeship) {
    conditions.push(eq(users.voivodeship, filters.voivodeship));
  }
  if (filters.county) {
    conditions.push(eq(users.county, filters.county));
  }
  if (filters.commune) {
    conditions.push(eq(users.commune, filters.commune));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(listings.price, String(filters.minPrice)));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(listings.price, String(filters.maxPrice)));
  }
  if (filters.method) {
    conditions.push(eq(products.method, filters.method));
  }

  const orderMap = {
    newest: desc(listings.createdAt),
    price_asc: asc(listings.price),
    price_desc: desc(listings.price),
    name: asc(products.name),
  } as const;

  const orderClause = orderMap[filters.sort ?? "newest"];
  const offset = ((filters.page ?? 1) - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        voivodeship: users.voivodeship,
      },
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderClause)
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions));

  return {
    results,
    total: count,
    page: filters.page ?? 1,
    totalPages: Math.ceil(count / ITEMS_PER_PAGE),
  };
}

export type ListingWithDetails = Awaited<
  ReturnType<typeof getListings>
>["results"][number];
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/queries/get-listings.ts
git commit -m "feat(marketplace): filter listings by county and commune"
```

---

## Task 5: Create get-farmers query

**Files:**
- Create: `src/domains/marketplace/queries/get-farmers.ts`

- [ ] **Step 1: Create the query**

```ts
// src/domains/marketplace/queries/get-farmers.ts
import { or, eq, and, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import type { SearchFarmersInput } from "../schemas/validation";

export async function getFarmers(filters: SearchFarmersInput = {}) {
  const conditions = [or(eq(users.role, "FARMER"), eq(users.role, "BOTH"))!];

  if (filters.voivodeship) {
    conditions.push(eq(users.voivodeship, filters.voivodeship));
  }
  if (filters.county) {
    conditions.push(eq(users.county, filters.county));
  }
  if (filters.commune) {
    conditions.push(eq(users.commune, filters.commune));
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      voivodeship: users.voivodeship,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt));
}

export type FarmerItem = Awaited<ReturnType<typeof getFarmers>>[number];
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/queries/get-farmers.ts
git commit -m "feat(marketplace): add filterable getFarmers query"
```

---

## Task 6: Update SearchFilters component

**Files:**
- Modify: `src/domains/marketplace/components/search-filters.tsx`

- [ ] **Step 1: Replace voivodeship select with LocationCascade**

```tsx
// src/domains/marketplace/components/search-filters.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { LocationCascade, type LocationValue } from "@/domains/geo";
import type { Category } from "@/shared/db/schema";

interface SearchFiltersProps {
  categories: Category[];
}

export function SearchFilters({ categories }: SearchFiltersProps) {
  const t = useTranslations("marketplace");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParams("q", formData.get("q") as string);
  }

  function clearFilters() {
    router.push(pathname);
  }

  function handleLocationChange(loc: LocationValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (loc.voivodeship) {
      params.set("voivodeship", loc.voivodeship);
    } else {
      params.delete("voivodeship");
    }
    if (loc.county) {
      params.set("county", loc.county);
    } else {
      params.delete("county");
    }
    if (loc.commune) {
      params.set("commune", loc.commune);
    } else {
      params.delete("commune");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          name="q"
          placeholder={t("search")}
          defaultValue={searchParams.get("q") ?? ""}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          {t("filters")}
        </Button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <LocationCascade
          mode="filter"
          value={{
            voivodeship: searchParams.get("voivodeship"),
            county: searchParams.get("county"),
            commune: searchParams.get("commune"),
          }}
          onChange={handleLocationChange}
        />

        <Select
          value={searchParams.get("method") ?? "all"}
          onValueChange={(v) => updateParams("method", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={tProduct("method")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tProduct("method")}</SelectItem>
            <SelectItem value="ECO">{tProduct("methodEco")}</SelectItem>
            <SelectItem value="CONVENTIONAL">
              {tProduct("methodConventional")}
            </SelectItem>
            <SelectItem value="OTHER">{tProduct("methodOther")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="name">{t("sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/components/search-filters.tsx
git commit -m "feat(marketplace): add county/commune cascade to product search filters"
```

---

## Task 7: Update profile form

**Files:**
- Modify: `src/domains/auth/components/profile-form.tsx`

- [ ] **Step 1: Replace three location fields with LocationCascade**

Replace the voivodeship `<FormField>`, county `<FormField>`, and commune `<FormField>` blocks (lines 154–210 of the original) with:

```tsx
// src/domains/auth/components/profile-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "../schemas/validation";
import { updateProfile } from "../actions/update-profile";
import { LocationCascade } from "@/domains/geo";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ImageUpload } from "@/shared/ui/image-upload";
import type { User } from "@/shared/db/schema";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      voivodeship: user.voivodeship as ProfileInput["voivodeship"],
      county: user.county,
      commune: user.commune,
      postalCode: user.postalCode,
    },
  });

  function onSubmit(data: ProfileInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) {
        setMessage(t("saved"));
      }
    });
  }

  function handleGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      form.setValue("latitude", String(pos.coords.latitude));
      form.setValue("longitude", String(pos.coords.longitude));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <ImageUpload
                  folder="avatars"
                  maxFiles={1}
                  value={field.value ? [field.value] : []}
                  onChange={(urls) => field.onChange(urls[0] ?? null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tAuth("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bio")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("bioPlaceholder")}
                  rows={3}
                  maxLength={500}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tAuth("role")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CONSUMER">{tAuth("roleConsumer")}</SelectItem>
                  <SelectItem value="FARMER">{tAuth("roleFarmer")}</SelectItem>
                  <SelectItem value="BOTH">{tAuth("roleBoth")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium">{t("location")}</h3>

        <LocationCascade
          mode="form"
          value={{
            voivodeship: form.watch("voivodeship") ?? null,
            county: form.watch("county") ?? null,
            commune: form.watch("commune") ?? null,
          }}
          onChange={({ voivodeship, county, commune }) => {
            form.setValue(
              "voivodeship",
              voivodeship as ProfileInput["voivodeship"]
            );
            form.setValue("county", county);
            form.setValue("commune", commune);
          }}
          labels={{
            voivodeship: t("voivodeship"),
            county: t("county"),
            commune: t("commune"),
          }}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("postalCode")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="XX-XXX"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="button" variant="outline" onClick={handleGps}>
          {t("useGps")}
        </Button>

        {message && <p className="text-sm text-primary">{message}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {t("editProfile")}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/auth/components/profile-form.tsx
git commit -m "feat(auth): replace location text inputs with LocationCascade in profile form"
```

---

## Task 8: Update farmers page

**Files:**
- Modify: `src/app/[locale]/(main)/farmers/page.tsx`

- [ ] **Step 1: Add filtering to farmers page**

```tsx
// src/app/[locale]/(main)/farmers/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { MapPin } from "lucide-react";
import { getFarmers } from "@/domains/marketplace/queries/get-farmers";
import { getFarmersForMap } from "@/domains/marketplace/queries/get-farmers-for-map";
import {
  getProxyFarmersForList,
  getProxyFarmersForMap,
} from "@/domains/marketplace/queries/get-proxy-farmer";
import { FarmersTabs } from "@/domains/marketplace/components/farmers-tabs";
import { geocodeFarmersWithoutCoords } from "@/domains/geo/actions/geocode-farmers";
import { searchFarmersSchema } from "@/domains/marketplace/schemas/validation";
import { FarmersFilter } from "@/domains/marketplace/components/farmers-filter";

export default async function FarmersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("farmer");
  const tProxy = await getTranslations("proxyFarmer");

  await geocodeFarmersWithoutCoords();

  const params = await searchParams;
  const parsed = searchFarmersSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : {};

  const [regularFarmers, proxyFarmers, farmersForMap, proxyForMap] =
    await Promise.all([
      getFarmers(filters),
      getProxyFarmersForList(),
      getFarmersForMap(),
      getProxyFarmersForMap(),
    ]);

  type FarmerItem = {
    id: string;
    name: string;
    avatar: string | null;
    voivodeship: string | null;
    createdAt: Date;
    isProxy: boolean;
  };

  const allFarmers: FarmerItem[] = [
    ...regularFarmers.map((f) => ({ ...f, isProxy: false })),
    ...proxyFarmers.map((f) => ({ ...f, isProxy: true })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const allForMap = [
    ...farmersForMap.map((f) => ({ ...f, isProxy: false })),
    ...proxyForMap,
  ];

  const listContent =
    allFarmers.length === 0 ? (
      <p className="text-center text-muted-foreground py-12">
        {t("noFarmers")}
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allFarmers.map((farmer) => (
          <Link
            key={`${farmer.isProxy ? "proxy-" : ""}${farmer.id}`}
            href={
              farmer.isProxy
                ? `/farmers/proxy/${farmer.id}`
                : `/farmers/${farmer.id}`
            }
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={farmer.avatar ?? undefined} />
                  <AvatarFallback>
                    {farmer.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium truncate">{farmer.name}</p>
                    {farmer.isProxy && (
                      <Badge
                        variant="outline"
                        className="text-[9px] shrink-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                      >
                        {tProxy("ambassadorBadge")}
                      </Badge>
                    )}
                  </div>
                  {farmer.voivodeship && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {farmer.voivodeship}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {t("memberSince")}{" "}
                    {new Date(farmer.createdAt).toLocaleDateString("pl-PL", {
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("allFarmers")}</h1>
      <Suspense>
        <FarmersFilter />
      </Suspense>
      <FarmersTabs farmers={allForMap} listContent={listContent} />
    </div>
  );
}
```

- [ ] **Step 2: Create FarmersFilter component**

```tsx
// src/domains/marketplace/components/farmers-filter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LocationCascade, type LocationValue } from "@/domains/geo";
import { Button } from "@/shared/ui/button";

export function FarmersFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleLocationChange(loc: LocationValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (loc.voivodeship) {
      params.set("voivodeship", loc.voivodeship);
    } else {
      params.delete("voivodeship");
    }
    if (loc.county) {
      params.set("county", loc.county);
    } else {
      params.delete("county");
    }
    if (loc.commune) {
      params.set("commune", loc.commune);
    } else {
      params.delete("commune");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <LocationCascade
          mode="filter"
          value={{
            voivodeship: searchParams.get("voivodeship"),
            county: searchParams.get("county"),
            commune: searchParams.get("commune"),
          }}
          onChange={handleLocationChange}
        />
      </div>
      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Wyczyść filtry
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(main)/farmers/page.tsx src/domains/marketplace/components/farmers-filter.tsx
git commit -m "feat(farmers): add location cascade filtering to farmers page"
```

---

## Task 9: Run full test suite and verify build

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit if any fixes needed, then push**

```bash
git push origin main
```

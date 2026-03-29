# Demo Data Manifest

Fikcyjne dane demonstracyjne. Wszystkie ID zaczynaja sie od `demo_`, nazwy userow od `[DEMO]`.

## Komendy

```bash
# Dodaj dane demo
npx tsx scripts/seed-demo.ts

# Usun dane demo
npx tsx scripts/seed-demo.ts --cleanup
```

## Konta demo

Haslo do wszystkich: `demo1234`

| Rola | Nazwa | Email | ID |
|------|-------|-------|----|
| FARMER | [DEMO] Jan Kowalski | jan.kowalski@demo.plonbli.pl | demo_farmer_kowalski |
| FARMER | [DEMO] Anna Nowak | anna.nowak@demo.plonbli.pl | demo_farmer_nowak |
| BOTH | [DEMO] Piotr Wisniewski | piotr.wisniewski@demo.plonbli.pl | demo_farmer_wisniewski |
| FARMER | [DEMO] Maria Zielinska | maria.zielinska@demo.plonbli.pl | demo_farmer_zielinska |
| CONSUMER | [DEMO] Tomek Lewandowski | tomek.lewandowski@demo.plonbli.pl | demo_consumer_lewandowski |
| CONSUMER | [DEMO] Ewa Kaminska | ewa.kaminska@demo.plonbli.pl | demo_consumer_kaminska |
| CONSUMER | [DEMO] Katarzyna Dabrowska | katarzyna.dabrowska@demo.plonbli.pl | demo_consumer_dabrowska |

## Kategorie (8)

Warzywa, Owoce, Nabial, Mieso, Pieczywo, Przetwory, Miod i produkty pszczele, Ziola i przyprawy

## Produkty + Oferty (9)

| Produkt | Rolnik | Cena | Kategoria |
|---------|--------|------|-----------|
| Pomidory malinowe | Kowalski | 12 zl/kg | Warzywa |
| Ogorki gruntowe | Kowalski | 8 zl/kg | Warzywa |
| Jablka Szampion | Kowalski | 5.50 zl/kg | Owoce |
| Ser gorski bundzowy | Nowak | 45 zl/kg | Nabial |
| Dzem sliwkowy | Nowak | 18 zl/szt | Przetwory |
| Miod wielokwiatowy | Wisniewski | 55 zl/szt | Miod |
| Mieszanka ziol | Wisniewski | 12 zl/szt | Ziola |
| Jaja z wolnego wybiegu | Zielinska | 1.50 zl/szt | Nabial |
| Chleb na zakwasie | Zielinska | 14 zl/szt | Pieczywo |

## Grupy (3)

| Grupa | Typ | Woj. | Admin |
|-------|-----|------|-------|
| Grupa zakupowa Warszawa-Mokotow | BUYING_GROUP | mazowieckie | Lewandowski |
| Eko Krakow — swiezo z pola | COMMUNITY | malopolskie | Kaminska |
| Kooperatywa spozywcza Lublin | BUYING_GROUP | lubelskie | Dabrowska |

## Wydarzenia (3)

| Wydarzenie | Typ | Kiedy |
|------------|-----|-------|
| Targ rolniczy w Garwolinie | MARKET | +3 dni (cykliczny) |
| Dzien otwarty — serowarnia Nowak | OPEN_DAY | +7 dni |
| Spotkanie grupy — planowanie sezonu | MEETUP | +5 dni |

## Posty (5), Komentarze (3), Reakcje (8)

Posty publiczne i grupowe. Komentarze pod postem o pomidorach i serze.

## Opinie (3)

3 opinie z ocenami 4-5 gwiazdek, z hash chain.

## Dziennik upraw (3)

Sadzenie, uprawa, zbior — pomidory Kowalskiego, z hash chain.

## Zbiorki (2)

| Zbiorka | Grupa | Cel | Status |
|---------|-------|-----|--------|
| Pomidory malinowe — lipiec | Warszawa | 80 kg | COLLECTING |
| Miod wielokwiatowy | Lublin | 20 szt | COLLECTING |

## Punkty odbioru (2)

Garwolin (gospodarstwo) i Lublin (centrum).

## Followsy (7)

Konsumenci sledzacy rolnikow.

---

**Jak usunac:** `npx tsx scripts/seed-demo.ts --cleanup` — usunie wszystko co ma ID zaczynajace sie od `demo_`.

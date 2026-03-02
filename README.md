# Intersection Simulator

Deterministyczny symulator inteligentnego skrzyzowania z algorytmem adaptacyjnego sterowania swiatlem drogowym. Projekt zbudowany w TypeScript z architektura Domain-Driven Design.

## Opis

Symulator modeluje klasyczne skrzyzowanie czterowylotowe (4-way intersection) z dwoma pasami ruchu na kazda droge:

- **Pas lewy** (left) przeznaczony dla pojazdow skrecajacych w lewo
- **Pas prosto/prawo** (straight_right) dla pojazdow jadacych prosto lub skrecajacych w prawo

Ruch odbywa sie zgodnie z zasadami ruchu prawostronnego. Kazdy pojazd jest automatycznie kierowany na odpowiedni pas na podstawie swojej trasy wjazdowej i wyjazdowej.

## Algorytm sterowania

Algorytm adaptacyjnego sterowania swiatlem drogowym wybiera w kazdym kroku najlepsza faze na podstawie obliczonego cisnienia (pressure) dla kazdej fazy. Cisnienie uwzglednia trzy skladniki:

```
pressure = vehicle_count + waitTimeWeight * total_wait_time + emergencyWeight * emergency_count
```

### Fazy

Skrzyzowanie pracuje w 4 fazach:

| Faza | Aktywne pasy | Opis |
|---|---|---|
| NS_MAIN | N i S straight_right | Polnoc/Poludnie prosto i w prawo |
| NS_LEFT | N i S left | Polnoc/Poludnie lewoskrety |
| EW_MAIN | E i W straight_right | Wschod/Zachod prosto i w prawo |
| EW_LEFT | E i W left | Wschod/Zachod lewoskrety |

### Mechanizmy priorytetyzacji

Algorytm stosuje cztery mechanizmy decyzyjne, wykonywane w podanej kolejnosci:

1. **Starvation protection** sprawdza czy jakikolwiek pojazd czeka dluzej niz `maxStarvationTime` krokow. Jesli tak, wymusza zmiane na faze obslugujaca ten kierunek. Zapobiega to sytuacji, w ktorej mniej obciazone drogi sa calkowicie ignorowane.

2. **Emergency override** jesli pojazd uprzywilejowany (karetka) oczekuje na jakimkolwiek pasie, algorytm natychmiast przelacza na faze obslugujaca ten pas, ignorujac ograniczenie `minGreenDuration`. Zapewnia to minimalne opoznienie dla pojazdow ratunkowych.

3. **Minimum green duration** zapewnia, ze raz aktywowana faza trwa co najmniej `minGreenDuration` krokow (o ile ma jeszcze pojazdy do obslugi). Zapobiega to zbyt czestemu przelaczaniu swiatla, ktore w praktyce powodowaloby straty czasu na zmiane faz.

4. **Pressure-based selection** jesli zaden z powyzszych mechanizmow nie wymusil decyzji, algorytm wybiera faze o najwyzszym ciSnieniu. Fazy z zerowym cisnieniem (puste pasy) sa pomijane.

### Dobor parametrow

Wartosci domyslne zostaly dobrane na podstawie testow porownawczych (benchmark), ktore symulowaly rozne scenariusze ruchu:

| Parametr | Wartosc | Uzasadnienie |
|---|---|---|
| `maxStarvationTime` | 5 | Benchmark z ciaglym ruchem na jednym kierunku wykazal, ze wartosc 5 daje najnizszy sredni czas oczekiwania (8.06) w porownaniu do wartosci 3 (8.61, zbyt czeste przelaczanie) i 10+ (8.33, za dlugie glodzenie) |
| `minGreenDuration` | 3 | Testy z karetka przybywajaca w trakcie zablokowanej fazy pokazaly, ze wartosc 3 opoznia karetke o 2 kroki, co jest akceptowalne. Wartosci 5+ opozniaja ja o 4+ kroki |
| `emergencyWeight` | 100 | Zapewnia dominacje pojazdow uprzywilejowanych w kalkulacji cisnienia. Pojedyncza karetka generuje cisnienie rowne 100 zwyklym pojazdom |
| `emergencyOverrideMinGreen` | true | Benchmark wykazal, ze wlaczenie override redukuje czas oczekiwania karetki z 6 do 2 krokow przy minGreen=5 |
| `waitTimeWeight` | 0.5 | Umiarkowana waga czasu oczekiwania. Przy symetrycznym ruchu nie ma wplywu, ale przy asymetrycznym faworyzuje dluzej czekajace pojazdy |

## Testy porownawcze (benchmark)

Projekt zawiera zestaw testow porownawczych, ktore analizuja wplyw kazdego parametru na wydajnosc symulacji:

### Scenariusz 1: minGreenDuration a czas reakcji na karetke

6 aut na drodze N, po kroku 1 przybywa karetka na drodze E. Testuje jak dlugo karetka czeka w zaleznosci od minGreenDuration i emergency override.

| Konfiguracja | Czas wyjazdu karetki |
|---|---|
| minG=0 | 2 kroki |
| minG=3 bez override | 4 kroki |
| minG=5 bez override | 6 krokow |
| minG=5 z override | 2 kroki |

### Scenariusz 2: maxStarvationTime a sprawiedliwosc

Ciagly ruch na N (nowe auta co 2 kroki), E/W maja po 2 auta. Testuje balans miedzy przepustowoscia a sprawiedliwoscia.

| maxStarvationTime | Sredni czas oczekiwania |
|---|---|
| 3 | 8.61 |
| 5 | 8.06 |
| 8 | 8.22 |
| 15 | 8.33 |

### Scenariusz 3: waitTimeWeight

Jeden pojazd na E czekal 10 krokow, 5 swiezych aut na N. Przy waitTimeWeight >= 2.0 pojazd z E zostaje obsluzony pierwszy.

### Scenariusz 4: Przełączanie faz przy mieszanym ruchu

3 auta prosto + 3 lewoskrety na N/S, 4 auta prosto na E/W. Testuje koszt przelaczania miedzy fazami NS_MAIN i NS_LEFT.

## Format danych

### Wejscie (input JSON)

```json
{
  "commands": [
    {
      "type": "addVehicle",
      "vehicleId": "vehicle1",
      "startRoad": "south",
      "endRoad": "north"
    },
    {
      "type": "addVehicle",
      "vehicleId": "vehicle2",
      "startRoad": "north",
      "endRoad": "south"
    },
    {
      "type": "step"
    }
  ]
}
```

Komenda `addVehicle` dodaje pojazd na wskazanej drodze poczatkowej z celem dojazdu do drogi koncowej. Pole `isEmergency: true` oznacza pojazd uprzywilejowany.

Komenda `step` wykonuje jeden krok symulacji.

### Wyjscie (output JSON)

```json
{
  "stepStatuses": [
    {
      "leftVehicles": ["vehicle1", "vehicle2"]
    }
  ]
}
```

`stepStatuses` zawiera liste statusow dla kazdego kroku. `leftVehicles` to lista identyfikatorow pojazdow, ktore opuscily skrzyzowanie w danym kroku.

## Uruchomienie

### Wymagania

- Node.js >= 18
- npm

### Instalacja

```bash
npm install
cd frontend && npm install && cd ..
```

### CLI

```bash
npm start -- input.json output.json
```

Przetwarza plik wejsciowy z komendami i zapisuje wynik do pliku wyjsciowego.

### Frontend

```bash
cd frontend
npm run dev
```

Otwiera interfejs graficzny pod adresem `http://localhost:3000`. Interfejs umozliwia:

- Reczne dodawanie pojazdow (wybor drogi wjazdowej, wyjazdowej, typ pojazdu)
- Dodawanie losowych pojazdow (pojedynczo lub w partiach po 5)
- Krokowe lub automatyczne wykonywanie symulacji
- Wczytywanie scenariuszy z pliku JSON (Load JSON)
- Eksport wynikow symulacji do pliku JSON (Export JSON)
- Podglad kolejek na poszczegolnych pasach
- Dziennik krokow z informacja o pojazdach opuszczajacych skrzyzowanie

### Testy

```bash
npm test
```

Uruchamia pelny zestaw 135 testow:

- Testy jednostkowe wszystkich komponentow domenowych (Direction, TurnType, Lane, Road, Vehicle, TrafficLight, Intersection, CollisionDetector, TrafficLightController, PriorityCalculator, SimulationService)
- Testy walidacji schematow (Schemas)
- Testy integracyjne (pelny przebieg symulacji z pliku JSON)
- Testy porownawcze (benchmark) z 4 scenariuszami i wieloma konfiguracjami

## Architektura

```
src/
  core/
    domain/
      entities/          Lane, Road, Vehicle, Intersection, TrafficLight
      value-objects/      Direction, TurnType, LaneType, SimulationConfig, VehicleId
      rules/              CollisionDetector (fazy), TrafficLightController
    services/             SimulationService, PriorityCalculator
  infrastructure/
    file/                 JsonReader, JsonWriter
    validation/           Zod schemas
    websocket/            WebSocketServer (tryb live)
  cli/                    Punkt wejscia CLI
frontend/
  src/
    components/           IntersectionCanvas (wizualizacja canvas)
    hooks/                useSimulation (logika symulacji po stronie klienta)
    types.ts              Typy wspoldzielone
```

Projekt stosuje architekture warstwowa z wyraznym oddzieleniem domeny (algorytm, reguly) od infrastruktury (I/O, walidacja). Frontend zawiera niezalezna implementacje algorytmu sterowania, zsynchronizowana z backendem pod wzgledem logiki i parametrow.

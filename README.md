# ArchiSfera

Strona pracowni architektonicznej Kamili Chęcielewskiej. Docelowy adres:
https://www.archisfera.net/. Hosting: GitHub Pages na koncie `archsifera`.

## Praca lokalna

Node.js 20 lub nowszy; bez instalowania zależności.

```sh
npm run dev
```

Podgląd lokalny: http://127.0.0.1:4173. Należy używać serwera HTTP.

```sh
npm run seo:prepare
npm run build
npm run check:seo
```

Produkcja powstaje w `dist/`; wersja repozytorium i `npm run build:preview`
służą do podglądu i mają wyłączone indeksowanie. Szczegóły domeny, przekierowań,
SEO i publikacji: [DEPLOYMENT.md](DEPLOYMENT.md).

## Bieżąca wersja

Cztery strony: główna, projekty, oferta i kontakt. Portfolio zawiera 10 projektów
oraz 36 zdjęć i wizualizacji przekazanych przez pracownię. Strona główna zachowuje
cztery pionowe panele wybranych projektów na komputerze, a na telefonie pojedynczy
slajd zmieniany co pięć sekund (pętla, strzałki i pauza). Zachowuje galerię wszystkich ujęć i automatyczne
hero z dziewięcioma slajdami zmienianymi co trzy sekundy. Podstrony mają wspólny
baner. Mobilne hero zajmuje cały mały viewport, a dobór rozdzielczości uwzględnia
kadrowanie zdjęcia. Rozwijane menu mobilne zawiera telefon, e-mail i przycisk
kontaktu; blokuje tło i przy zamknięciu przywraca pozycję przewijania.
Na telefonach wyłączono animacje wejścia, pasek postępu przewijania i rozmycie tła
galerii. Wysokość sekcji jest zapamiętywana do zmiany szerokości/orientacji, żeby
pasek przeglądarki i klawiatura nie przesuwały treści. Niewidoczne hero wstrzymuje
autoplay i pobieranie kolejnych ujęć; mobilne slajdy są przełączane bez warstw
przenikania dużych zdjęć. Zdjęcie architekt pochodzi z przesłanych materiałów.

Białe tła, akcent koralowy #F54329 i lokalny Manrope z licencją OFL. Animacje
uwzględniają ograniczenie ruchu w systemie. Galerie, menu i formularz obsługują
klawiaturę. Formularz przekazuje zapytania przez FormSubmit na biuro@archisfera.net. Zachowuje
walidację, ochronę antyspamową usługi oraz opcję kopiowania wiadomości. Przed
odbiorem zapytań klientka musi potwierdzić aktywację w swojej skrzynce.

Dane portfolio: `portfolio.js`. Metadane i adres domeny: `site.config.mjs`.
Wspólny wygląd i interakcje: `styles.css`, `subpages.css`, `motion.css`, `app.js`,
`motion.js`, `theme.js`. `content.json` i `content.js` zachowują pobrane wcześniej
materiały źródłowe. Historyczne koncepcje w assets nie trafiają do paczki produkcyjnej,
jeśli nie są używane. Ilustracyjny baner podstron nie jest elementem portfolio.

Test SEO sprawdza metadane, canonical, dane strukturalne, sitemapę, zdjęcia,
przekierowania, dostępność plików oraz rozdzielenie indeksowania produkcji i podglądu.
Wdrożenie pod domenę wymaga jeszcze konfiguracji hostingu/DNS i sprawdzenia po publikacji.

## Repozytorium klientki i publikacja

Repozytorium: https://github.com/archsifera/ArchiSfera. Każdy push na `main`
uruchamia `.github/workflows/pages.yml`: test produkcyjnego SEO, build i wdrożenie
do GitHub Pages. Build publikuje wyłącznie `dist/`, nie pliki narzędzi i dokumentacji.

Do podłączenia domeny podgląd jest wyłączony z indeksowania i działa pod
prefiksem `/ArchiSfera/`. Po przygotowaniu DNS i konfiguracji domeny w GitHub Pages
dodanie pliku `CNAME` o treści `www.archisfera.net` włącza build produkcyjny
z indeksowaniem, czystymi ścieżkami i canonical dla domeny klientki.
Nie należy dodawać CNAME przed gotowością domeny i DNS.

## Podłączenie domeny — 24.11.2026

Plik `CNAME` i ustawienie GitHub Pages wskazują `www.archisfera.net`. DNS w Wix
zapisano jako cztery adresy A GitHub Pages oraz CNAME www → archsifera.github.io.
Rekordy Google Workspace MX i TXT pozostawiono bez zmian. Przy zmianie domeny
należy sprawdzić wystawienie certyfikatu i włączyć HTTPS w ustawieniach Pages.

## Sposób publikacji

`main` przechowuje źródła. Workflow buduje i sprawdza wersję produkcyjną,
kopiuje wynik do gałęzi `gh-pages` i zleca GitHubowi publikację. GitHub Pages
ma źródło `gh-pages` / root. Plik `.nojekyll` wyłącza przetwarzanie gotowego HTML.
Ten sposób nie zależy od wyszukiwania paczek w usłudze artefaktów Actions.

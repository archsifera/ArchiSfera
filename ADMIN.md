# Panel realizacji ArchiSfera

Wejście: https://www.archisfera.net/admin/ (działa też /panel/).
Panel: https://app.pagescms.org/archsifera/ArchiSfera/main

## Pierwsze podłączenie

Właściciel konta GitHub `archsifera` loguje się do Pages CMS i zatwierdza
aplikację GitHub **wyłącznie dla repozytorium ArchiSfera**. Jest to osobna
zgoda na dostęp zewnętrznej aplikacji; nie należy instalować jej dla wszystkich
repozytoriów. Bez tego kroku panel nie ma możliwości zapisywania zmian.
Nie przekazujemy panelowi haseł GitHuba ani tokenu CLI.

Status: konfiguracja repozytorium przygotowana; instalacja aplikacji oraz
rzeczywisty zapis z interfejsu wymagają osobnego potwierdzenia.

## Obsługa

1. Otwórz Realizacje. Dodaj nową lub wybierz istniejącą realizację.
2. Wypełnij nazwę, miejscowość, powierzchnię, status i opis.
3. Dodaj zdjęcia do galerii. Ustaw zdjęcie główne lub zostaw pierwsze zdjęcie galerii.
4. Liczba w Kolejności określa pozycję (mniejsza = wcześniej).
5. Pokaż w Wybranych projektach wybiera realizacje na stronie głównej.
   Pokazywane są pierwsze cztery oznaczone pozycje.
6. Opublikowany wyłącza/włącza widoczność. Zapis uruchamia automatyczną publikację.
7. Po zakończeniu publikacji odśwież stronę. Błąd walidacji zachowuje poprzednią
   opublikowaną stronę, a szczegóły są w GitHub Actions.

Usuwanie wpisu nie usuwa zdjęć ze wspólnej biblioteki. Nie kasuj zdjęć używanych
w innych miejscach. Nowe pliki mają losowe nazwy, żeby uniknąć nadpisania.
Obsługiwane są JPG, PNG, WebP i AVIF, maksymalnie 20 MB i 50 mln pikseli
na plik. JPG/PNG/AVIF są automatycznie konwertowane do WebP o szerokości do 2200 px.

## Dla wykonawcy

Źródłem danych jest `content/projects/*.json`; nie edytować wygenerowanego portfolio.js.
Build odczytuje wpisy, waliduje, generuje portfolio.js, listę projektów, cztery
karty strony głównej, dane strukturalne i sitemapę. Identyfikatory starych
projektów i ich linki pozostają bez zmian. Nowe mają stabilny identyfikator
wyliczany z nazwy pliku, dlatego zmiana tytułu nie zmienia linku.

Testy: `npm ci`, `npm test`, `npm run build`, `npm run check:seo`.
Pliki robocze CMS ani wpisy nie są publikowane do katalogu produkcyjnego.
Panel jest wyłączony z indeksowania; autoryzację zapisu egzekwuje GitHub.

Dokumentacja: https://pagescms.org/docs/quick-start/

Wykonaj commit z plikami znajdującymi się w staged area. Postępuj zgodnie z poniższymi krokami:
1. Najpierw sprawdź jakie pliki są w staged area używając komendy: `git diff --cached --name-only`
2. Następnie pobierz szczegółowy diff dla wszystkich staged plików używając: `git diff --cached`
3. Na podstawie diff i listy plików, wygeneruj commit message w języku angielskim, który:
  - W pierwszej linii zawiera krótkie podsumowanie zmian (max 50-72 znaki)
  - W kolejnych liniach (po pustej linii) zawiera:
    * Listę wszystkich plików które będą w commit (jako \"Files changed:\")
    * Szczegółowy opis zmian jakie zostały wprowadzone w każdym pliku lub grupie plików
    * Opis powinien być konkretny i techniczny, bazujący na rzeczywistych zmianach w diff
4. Wykonaj commit używając wygenerowanego commit message: `git commit -m \"<commit message>\"`

Pamiętaj:
Commit message powinien być w języku angielskim
- Opisz konkretnie co się zmieniło, nie używaj ogólników
- Jeśli są różne typy zmian (np. nowe funkcje, poprawki błędów, refaktoryzacja), pogrupuj je logicznie
- Użyj narzędzi konsolowych (git commands) do wykonania wszystkich operacji

Przykładowa struktura commit message:
```
Short summary of changes (50-72 chars)

Files changed:
- path/to/file1.ts
- path/to/file2.tsx
- path/to/file3.ts

Changes:
- Added new function X in file1.ts that handles Y
- Fixed bug in file2.tsx where Z was not working correctly
- Refactored file3.ts to improve type safety and error handling
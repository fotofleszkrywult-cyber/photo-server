    # Photo Order Project (frontend + backend)

    Instrukcja uruchomienia lokalnie.

    ## Backend
    1. Przejdź do katalogu `backend`:
   ```
    cd backend
    ```
    2. Zainstaluj zależności:
   ```
    npm install
    ```
    3. Uruchom serwer:
   ```
    npm start
    ```
    Serwer będzie dostępny pod: http://localhost:5000

    ## Frontend
    1. Przejdź do katalogu `frontend`:
   ```
    cd frontend
    ```
    2. Zainstaluj zależności:
   ```
    npm install
    ```
    3. Uruchom aplikację:
   ```
    npm start
    ```
    Aplikacja otworzy się pod: http://localhost:3000

    ## Działanie
    - Po przygotowaniu kadru i dodaniu do zamówień kliknij **Realizuj zamówienie**, wpisz dane klienta i **Wyślij zamówienie**.
    - Frontend wyśle wykadrowane pliki + dane zamówienia do endpointu `/api/order`.
    - Backend zapisze pliki w katalogu `backend/uploads/<Imie_Nazwisko_Phone>/<format>_<paper>/...`

    ## Uwaga bezpieczeństwa
- Ten projekt jest przykładowy. Nie używaj go w produkcji bez dodatkowego zabezpieczenia (autoryzacja, walidacja, limity rozmiaru plików, skanowanie wirusów itp.).
- Jeśli używasz Gmail do powiadomień e-mail, skonfiguruj hasła aplikacji.

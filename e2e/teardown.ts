/* eslint-disable no-console */
import { chromium, type Browser, type Page } from "@playwright/test";
import { loginAsTestUser } from "./fixtures/auth-helpers";
import { TEST_USERS } from "./fixtures/test-data";

/**
 * Teardown function dla testów E2E
 *
 * UWAGA: Ta funkcja uruchamia się AUTOMATYCZNIE po zakończeniu wszystkich testów,
 * niezależnie od tego, czy testy zakończyły się sukcesem czy błędem.
 *
 * Po zakończeniu wszystkich testów:
 * 1. Loguje się danymi testowymi
 * 2. Pobiera listę wszystkich planów
 * 3. Usuwa wszystkie plany
 *
 * Wszystkie błędy są obsługiwane i logowane, ale nie przerywają procesu testowego.
 */
async function globalTeardown() {
  const baseURL = process.env.BASE_URL;
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log("🧹 Rozpoczynam teardown - czyszczenie planów po testach...");

    // Uruchom przeglądarkę
    try {
      browser = await chromium.launch();
      const context = await browser.newContext({
        baseURL,
      });
      page = await context.newPage();
    } catch (error) {
      console.error("❌ Nie udało się uruchomić przeglądarki:", error instanceof Error ? error.message : String(error));
      return; // Bez przeglądarki nie możemy kontynuować
    }

    // 1. Zaloguj się danymi testowymi
    try {
      console.log(`🔐 Logowanie jako ${TEST_USERS.valid.email}...`);
      const loginSuccess = await loginAsTestUser(page, TEST_USERS.valid.email, TEST_USERS.valid.password, false);

      if (!loginSuccess) {
        console.warn("⚠️  Nie udało się zalogować podczas teardown. Pomijam czyszczenie planów.");
        return; // Bez logowania nie możemy kontynuować
      }

      console.log("✅ Zalogowano pomyślnie");

      // Upewnij się, że cookies są zapisane - nawiguj do strony planów
      await page.goto("/plans").catch(() => {
        // Ignoruj błędy nawigacji
      });
      await page.waitForLoadState("networkidle").catch(() => {
        // Ignoruj błędy oczekiwania
      });
    } catch (error) {
      console.error("❌ Błąd podczas logowania:", error instanceof Error ? error.message : String(error));
      return; // Bez logowania nie możemy kontynuować
    }

    // 2. Pobierz wszystkie plany (z obsługą paginacji)
    // Używamy page.evaluate() z fetch() aby automatycznie użyć cookies z kontekstu przeglądarki
    const allPlans: { id: string; name: string }[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let fetchError = false;

    console.log("📋 Pobieranie listy planów...");

    while (hasMore && !fetchError) {
      try {
        // Buduj URL z parametrami paginacji
        const url = cursor ? `/api/plans?limit=100&cursor=${encodeURIComponent(cursor)}` : `/api/plans?limit=100`;

        // Pobierz plany używając fetch w kontekście przeglądarki (automatycznie używa cookies)
        const data = (await page.evaluate(async (fetchUrl: string) => {
          const response = await fetch(fetchUrl, {
            method: "GET",
            credentials: "include", // Ważne: dołącz cookies
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json() as Promise<{
            data: { id: string; name: string }[];
            pagination: { next_cursor: string | null };
          }>;
        }, url)) as { data: { id: string; name: string }[]; pagination: { next_cursor: string | null } };

        const plans = data.data || [];
        allPlans.push(...plans);

        // Sprawdź czy są więcej planów
        cursor = data.pagination?.next_cursor || null;
        hasMore = !!cursor;

        console.log(`   Pobrano ${plans.length} planów (łącznie: ${allPlans.length})`);
      } catch (error) {
        console.warn(
          `⚠️  Nie udało się pobrać planów: ${error instanceof Error ? error.message : String(error)}. Kontynuuję z już pobranymi planami.`
        );
        fetchError = true; // Przerwij pętlę, ale kontynuuj z już pobranymi planami
      }
    }

    if (allPlans.length === 0) {
      console.log("✅ Brak planów do usunięcia");
      return; // To jest OK - brak planów to sukces
    }

    // 3. Usuń wszystkie plany
    console.log(`🗑️  Usuwanie ${allPlans.length} planów...`);

    let deletedCount = 0;
    let failedCount = 0;

    for (const plan of allPlans) {
      try {
        // Używamy page.evaluate() z fetch() aby automatycznie użyć cookies z kontekstu przeglądarki
        const status = await page.evaluate(async (planId: string) => {
          const response = await fetch(`/api/plans/${planId}`, {
            method: "DELETE",
            credentials: "include", // Ważne: dołącz cookies
          });
          return response.status;
        }, plan.id);

        if (status === 200 || status === 204) {
          deletedCount++;
          console.log(`   ✓ Usunięto plan: ${plan.name} (${plan.id})`);
        } else {
          failedCount++;
          console.warn(`   ✗ Nie udało się usunąć planu: ${plan.name} (status: ${status})`);
        }
      } catch (error) {
        failedCount++;
        console.warn(
          `   ✗ Błąd przy usuwaniu planu ${plan.name}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(
      `✅ Teardown zakończony: usunięto ${deletedCount} planów${failedCount > 0 ? `, ${failedCount} błędów` : ""}`
    );
  } catch (error) {
    // Obsługa nieoczekiwanych błędów - logujemy, ale nie przerywamy procesu
    console.error("❌ Nieoczekiwany błąd podczas teardown:", error instanceof Error ? error.message : String(error));
    // Nie rzucamy błędu, aby nie przerywać procesu testowego
    // Teardown powinien zawsze się zakończyć, nawet jeśli wystąpią błędy
  } finally {
    // Zamknij przeglądarkę
    if (page) {
      await page.close().catch(() => {
        // Ignoruj błędy przy zamykaniu
      });
    }
    if (browser) {
      await browser.close().catch(() => {
        // Ignoruj błędy przy zamykaniu
      });
    }
  }
}

export default globalTeardown;

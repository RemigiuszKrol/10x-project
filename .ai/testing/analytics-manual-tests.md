# Testy manualne: POST /api/analytics/events

## Przygotowanie środowiska testowego

Przed wykonaniem testów upewnij się, że:

1. Jesteś zalogowany do aplikacji
2. Masz dostęp do konsoli przeglądarki (F12 → Console)
3. Masz utworzony przynajmniej jeden plan działki (opcjonalnie, dla testów z plan_id)

## Pobieranie ID planu testowego (opcjonalne)

```javascript
// Pobierz listę swoich planów
const plansResponse = await fetch("/api/plans", {
  credentials: "include",
});
const plansData = await plansResponse.json();
console.log("Twoje plany:", plansData);

// Zapisz ID pierwszego planu do zmiennej
const testPlanId = plansData.data[0]?.id;
console.log("ID planu testowego:", testPlanId);
```

---

## Test 1: Sukces - Zdarzenie plan_created bez plan_id

**Cel:** Weryfikacja poprawnego utworzenia zdarzenia analitycznego typu `plan_created` bez powiązania z konkretnym planem.

**Warunki wstępne:** Użytkownik jest zalogowany.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "plan_created",
    plan_id: null,
    attributes: {
      source: "manual_test",
      timestamp: new Date().toISOString(),
    },
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 201
// Struktura: {
//   data: {
//     id: "uuid",
//     user_id: "uuid",
//     plan_id: null,
//     event_type: "plan_created",
//     attributes: { source: "manual_test", timestamp: "..." },
//     created_at: "iso-datetime"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 201 Created
- ✅ Zwrócony `event_type` to `"plan_created"`
- ✅ `plan_id` to `null`
- ✅ `attributes` zawiera przekazane dane
- ✅ `id`, `user_id`, `created_at` są ustawione
- ✅ `user_id` zgadza się z ID zalogowanego użytkownika

---

## Test 2: Sukces - Zdarzenie grid_saved z plan_id

**Cel:** Weryfikacja utworzenia zdarzenia powiązanego z konkretnym planem.

**Warunki wstępne:** Użytkownik posiada przynajmniej jeden plan.

```javascript
// Użyj ID planu z poprzedniego kroku
const planId = testPlanId || "YOUR_PLAN_ID";

const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "grid_saved",
    plan_id: planId,
    attributes: {
      cells_modified: 25,
      action: "bulk_update",
      test: true,
    },
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 201
// Struktura: {
//   data: {
//     id: "uuid",
//     user_id: "uuid",
//     plan_id: "uuid_planu",
//     event_type: "grid_saved",
//     attributes: { cells_modified: 25, action: "bulk_update", test: true },
//     created_at: "iso-datetime"
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 201 Created
- ✅ `event_type` to `"grid_saved"`
- ✅ `plan_id` zgadza się z przekazanym ID
- ✅ `attributes` zawiera przekazane dane z zagnieżdżoną strukturą

---

## Test 3: Sukces - Zdarzenie area_typed z pustymi attributes

**Cel:** Weryfikacja, że endpoint akceptuje puste attributes i ustawia domyślnie pusty obiekt.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "area_typed",
    plan_id: testPlanId || null,
  }),
  // attributes nie przekazujemy
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", data);

// Oczekiwany wynik:
// Status: 201
// data.attributes: {} (pusty obiekt)
```

**Weryfikacja:**

- ✅ Status HTTP: 201 Created
- ✅ `attributes` to pusty obiekt `{}`

---

## Test 4: Sukces - Zdarzenie plant_confirmed ze złożonymi attributes

**Cel:** Weryfikacja obsługi zagnieżdżonych struktur JSON w attributes.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "plant_confirmed",
    plan_id: testPlanId || null,
    attributes: {
      plant_name: "Tomato",
      position: { x: 5, y: 10 },
      scores: {
        sunlight: 0.9,
        humidity: 0.8,
        overall: 0.85,
      },
      metadata: {
        source: "ai_suggestion",
        confidence: "high",
        alternatives: ["Pepper", "Eggplant"],
      },
    },
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Dane:", JSON.stringify(data, null, 2));

// Oczekiwany wynik:
// Status: 201
// attributes zawiera całą zagnieżdżoną strukturę
```

**Weryfikacja:**

- ✅ Status HTTP: 201 Created
- ✅ `attributes` zachowuje pełną zagnieżdżoną strukturę JSON
- ✅ Tablice w `attributes` są poprawnie zapisane

---

## Test 5: Błąd 401 - Brak autoryzacji

**Cel:** Weryfikacja, że niezalogowany użytkownik nie może utworzyć zdarzenia.

**Warunki wstępne:** Użytkownik jest wylogowany lub brak ciasteczek sesji.

```javascript
// Wyloguj się z aplikacji przed wykonaniem tego testu
// lub użyj incognito/private window

const response = await fetch("/api/analytics/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "plan_created",
    attributes: {},
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 401
// { error: { code: "Unauthorized", message: "Authentication required." } }
```

**Weryfikacja:**

- ✅ Status HTTP: 401 Unauthorized
- ✅ Kod błędu: `"Unauthorized"`
- ✅ Komunikat: `"Authentication required."`

---

## Test 6: Błąd 400 - Nieprawidłowy JSON

**Cel:** Weryfikacja obsługi nieprawidłowego formatu JSON w body.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: "invalid json {{",
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// { error: { code: "ValidationError", message: "Invalid JSON body." } }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: `"ValidationError"`
- ✅ Komunikat: `"Invalid JSON body."`

---

## Test 7: Błąd 400 - Brak wymaganego pola event_type

**Cel:** Weryfikacja walidacji wymaganego pola `event_type`.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    plan_id: null,
    attributes: {},
  }),
  // event_type brakuje
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// {
//   error: {
//     code: "ValidationError",
//     message: "...",
//     details: {
//       field_errors: {
//         event_type: "..."
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: `"ValidationError"`
- ✅ `details.field_errors.event_type` zawiera komunikat o błędzie

---

## Test 8: Błąd 400 - Nieprawidłowa wartość event_type

**Cel:** Weryfikacja, że tylko dozwolone wartości enum są akceptowane.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "invalid_event_type",
    plan_id: null,
    attributes: {},
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// {
//   error: {
//     code: "ValidationError",
//     message: "Event type must be one of: plan_created, grid_saved, area_typed, plant_confirmed",
//     details: {
//       field_errors: {
//         event_type: "Event type must be one of: plan_created, grid_saved, area_typed, plant_confirmed"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: `"ValidationError"`
- ✅ Komunikat wymienia dozwolone wartości
- ✅ `field_errors.event_type` zawiera szczegóły

---

## Test 9: Błąd 400 - Nieprawidłowy format plan_id

**Cel:** Weryfikacja walidacji UUID dla plan_id.

```javascript
const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "grid_saved",
    plan_id: "not-a-uuid",
    attributes: {},
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 400
// {
//   error: {
//     code: "ValidationError",
//     message: "...",
//     details: {
//       field_errors: {
//         plan_id: "Plan ID must be a valid UUID"
//       }
//     }
//   }
// }
```

**Weryfikacja:**

- ✅ Status HTTP: 400 Bad Request
- ✅ Kod błędu: `"ValidationError"`
- ✅ `field_errors.plan_id` wskazuje na błąd UUID

---

## Test 10: Błąd 404 - Plan nie istnieje

**Cel:** Weryfikacja, że nie można utworzyć zdarzenia dla nieistniejącego planu.

```javascript
const nonExistentPlanId = "00000000-0000-0000-0000-000000000000";

const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "grid_saved",
    plan_id: nonExistentPlanId,
    attributes: {},
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 404
// { error: { code: "NotFound", message: "Plan not found." } }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found
- ✅ Kod błędu: `"NotFound"`
- ✅ Komunikat: `"Plan not found."`

---

## Test 11: Błąd 403 - Plan należy do innego użytkownika

**Cel:** Weryfikacja, że RLS chroni przed dostępem do planów innych użytkowników.

**Warunki wstępne:** Potrzebujesz UUID planu należącego do innego użytkownika (trudne do przetestowania ręcznie).

```javascript
// Ten test wymaga znajomości UUID planu innego użytkownika
// W rzeczywistości RLS Supabase powinien blokować dostęp
const otherUserPlanId = "UUID_PLANU_INNEGO_UZYTKOWNIKA";

const response = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event_type: "grid_saved",
    plan_id: otherUserPlanId,
    attributes: {},
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Błąd:", data);

// Oczekiwany wynik:
// Status: 404 lub 403
// { error: { code: "NotFound" | "Forbidden", message: "..." } }
```

**Weryfikacja:**

- ✅ Status HTTP: 404 Not Found lub 403 Forbidden
- ✅ Użytkownik nie może utworzyć zdarzenia dla cudzego planu

---

## Test 12: Test wydajnościowy - Wiele zdarzeń

**Cel:** Weryfikacja, że endpoint radzi sobie z szybkim zapisem wielu zdarzeń.

```javascript
// Utwórz 10 zdarzeń analitycznych sekwencyjnie
const events = [];
for (let i = 0; i < 10; i++) {
  const response = await fetch("/api/analytics/events", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: "plan_created",
      plan_id: null,
      attributes: {
        test_index: i,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  const data = await response.json();
  events.push(data.data);
  console.log(`Zdarzenie ${i + 1}/10 utworzone:`, data.data.id);
}

console.log("Wszystkie zdarzenia:", events);
console.log("Utworzono łącznie:", events.length, "zdarzeń");

// Oczekiwany wynik:
// Wszystkie 10 zdarzeń utworzone z kodem 201
// Każde ma unikalny ID i poprawny timestamp
```

**Weryfikacja:**

- ✅ Wszystkie żądania zwracają status 201
- ✅ Każde zdarzenie ma unikalny `id`
- ✅ `attributes.test_index` są zachowane poprawnie (0-9)

---

## Test 13: Szczegółowa weryfikacja wszystkich event_type

**Cel:** Przetestowanie wszystkich czterech dozwolonych typów zdarzeń.

```javascript
const eventTypes = ["plan_created", "grid_saved", "area_typed", "plant_confirmed"];
const results = [];

for (const eventType of eventTypes) {
  const response = await fetch("/api/analytics/events", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: eventType,
      plan_id: testPlanId || null,
      attributes: {
        test: true,
        event_type_test: eventType,
      },
    }),
  });

  const data = await response.json();
  results.push({
    eventType,
    status: response.status,
    success: response.status === 201,
    id: data.data?.id,
  });

  console.log(`${eventType}:`, response.status === 201 ? "✅ OK" : "❌ FAILED");
}

console.table(results);

// Oczekiwany wynik:
// Wszystkie 4 typy zwracają 201 Created
```

**Weryfikacja:**

- ✅ `plan_created`: status 201
- ✅ `grid_saved`: status 201
- ✅ `area_typed`: status 201
- ✅ `plant_confirmed`: status 201

---

## Test 14: Weryfikacja zachowania null vs undefined vs brak pola

**Cel:** Sprawdzenie różnych sposobów przekazywania opcjonalnych pól.

```javascript
// Test 1: plan_id = null
const test1 = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type: "plan_created",
    plan_id: null,
    attributes: {},
  }),
});
console.log("Test 1 (plan_id: null):", test1.status, await test1.json());

// Test 2: plan_id nie przekazane (undefined)
const test2 = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type: "plan_created",
    attributes: {},
  }),
});
console.log("Test 2 (plan_id: undefined):", test2.status, await test2.json());

// Test 3: attributes = null
const test3 = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type: "plan_created",
    plan_id: null,
    attributes: null,
  }),
});
console.log("Test 3 (attributes: null):", test3.status, await test3.json());

// Test 4: attributes nie przekazane
const test4 = await fetch("/api/analytics/events", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type: "plan_created",
    plan_id: null,
  }),
});
console.log("Test 4 (attributes: undefined):", test4.status, await test4.json());

// Oczekiwany wynik:
// Wszystkie testy: status 201
// plan_id jest null w bazie
// attributes jest {} (pusty obiekt) w bazie
```

**Weryfikacja:**

- ✅ Wszystkie 4 testy zwracają 201
- ✅ `plan_id` zawsze to `null` (gdy nie podany lub null)
- ✅ `attributes` zawsze to `{}` (gdy nie podany lub null)

---

## Podsumowanie testów

### Lista kontrolna testów

- [ ] Test 1: Zdarzenie plan_created bez plan_id (201)
- [ ] Test 2: Zdarzenie grid_saved z plan_id (201)
- [ ] Test 3: Zdarzenie area_typed z pustymi attributes (201)
- [ ] Test 4: Zdarzenie plant_confirmed ze złożonymi attributes (201)
- [ ] Test 5: Brak autoryzacji (401)
- [ ] Test 6: Nieprawidłowy JSON (400)
- [ ] Test 7: Brak event_type (400)
- [ ] Test 8: Nieprawidłowy event_type (400)
- [ ] Test 9: Nieprawidłowy format plan_id (400)
- [ ] Test 10: Plan nie istnieje (404)
- [ ] Test 11: Plan należy do innego użytkownika (403/404)
- [ ] Test 12: Wydajność - wiele zdarzeń (201 x10)
- [ ] Test 13: Wszystkie event_type (201 x4)
- [ ] Test 14: null vs undefined (201 x4)

### Skrypt kompleksowy - uruchom wszystkie testy naraz

```javascript
async function runAllTests() {
  console.log("🚀 Rozpoczynam kompleksowe testy endpointa POST /api/analytics/events\n");

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Sukces - plan_created
  try {
    const r = await fetch("/api/analytics/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "plan_created",
        plan_id: null,
        attributes: { test: "test1" },
      }),
    });
    const success = r.status === 201;
    results.tests.push({ name: "Test 1: plan_created", status: r.status, success });
    success ? results.passed++ : results.failed++;
  } catch (e) {
    results.tests.push({ name: "Test 1: plan_created", status: "ERROR", success: false });
    results.failed++;
  }

  // Test 2: Błąd - nieprawidłowy event_type
  try {
    const r = await fetch("/api/analytics/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "invalid",
        plan_id: null,
        attributes: {},
      }),
    });
    const success = r.status === 400;
    results.tests.push({ name: "Test 2: Invalid event_type", status: r.status, success });
    success ? results.passed++ : results.failed++;
  } catch (e) {
    results.tests.push({ name: "Test 2: Invalid event_type", status: "ERROR", success: false });
    results.failed++;
  }

  // Test 3: Błąd - nieprawidłowy JSON
  try {
    const r = await fetch("/api/analytics/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });
    const success = r.status === 400;
    results.tests.push({ name: "Test 3: Invalid JSON", status: r.status, success });
    success ? results.passed++ : results.failed++;
  } catch (e) {
    results.tests.push({ name: "Test 3: Invalid JSON", status: "ERROR", success: false });
    results.failed++;
  }

  // Test 4: Błąd - nieistniejący plan
  try {
    const r = await fetch("/api/analytics/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "grid_saved",
        plan_id: "00000000-0000-0000-0000-000000000000",
        attributes: {},
      }),
    });
    const success = r.status === 404;
    results.tests.push({ name: "Test 4: Non-existent plan", status: r.status, success });
    success ? results.passed++ : results.failed++;
  } catch (e) {
    results.tests.push({ name: "Test 4: Non-existent plan", status: "ERROR", success: false });
    results.failed++;
  }

  // Wyniki
  console.log("\n📊 WYNIKI TESTÓW:\n");
  console.table(results.tests);
  console.log(`\n✅ Zaliczone: ${results.passed}`);
  console.log(`❌ Niezaliczone: ${results.failed}`);
  console.log(`📈 Procent sukcesu: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  return results;
}

// Uruchom testy
runAllTests();
```

---

## Uwagi końcowe

1. **Bezpieczeństwo:** Endpoint wymaga autoryzacji - testuj zawsze jako zalogowany użytkownik
2. **RLS:** Supabase RLS chroni przed dostępem do cudzych planów
3. **Walidacja:** Zod zapewnia silną walidację typów i wartości
4. **Attributes:** Mogą zawierać dowolną strukturę JSON (obiekty, tablice, prymitywy)
5. **Plan_id:** Jest opcjonalny - można rejestrować zdarzenia niezwiązane z konkretnym planem
6. **Wydajność:** Endpoint jest lekki i szybki, nadaje się do zapisywania wielu zdarzeń

### Najczęstsze problemy

- **401 Unauthorized:** Upewnij się, że jesteś zalogowany (`credentials: 'include'`)
- **404 Not Found:** Sprawdź czy `plan_id` jest prawidłowy i należy do Ciebie
- **400 ValidationError:** Sprawdź czy `event_type` jest jedną z 4 dozwolonych wartości
- **400 Invalid JSON:** Upewnij się, że body jest poprawnym JSON

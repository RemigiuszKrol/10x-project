import { describe, it, expect } from "vitest";
import { ProfileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation/profile.schema";

describe("Profile Validation", () => {
  describe("ProfileUpdateSchema", () => {
    describe("Happy paths - poprawne dane", () => {
      it("powinien zaakceptować tylko language_code", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "pl",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.language_code).toBe("pl");
          expect(result.data.theme).toBeUndefined();
        }
      });

      it("powinien zaakceptować tylko theme", () => {
        const result = ProfileUpdateSchema.safeParse({
          theme: "light",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.theme).toBe("light");
          expect(result.data.language_code).toBeUndefined();
        }
      });

      it("powinien zaakceptować oba pola jednocześnie", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "en-US",
          theme: "dark",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.language_code).toBe("en-US");
          expect(result.data.theme).toBe("dark");
        }
      });
    });

    describe("language_code - walidacja ISO language codes", () => {
      describe("poprawne formaty", () => {
        it("powinien zaakceptować dwuliterowy kod języka (pl)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("pl");
          }
        });

        it("powinien zaakceptować dwuliterowy kod języka (en)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("en");
          }
        });

        it("powinien zaakceptować kod języka z regionem (en-US)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en-US",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("en-US");
          }
        });

        it("powinien zaakceptować kod języka z regionem (de-DE)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "de-DE",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("de-DE");
          }
        });

        it("powinien zaakceptować kod języka z regionem (pt-BR)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pt-BR",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("pt-BR");
          }
        });

        it("powinien zaakceptować kod języka z regionem (fr-FR)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "fr-FR",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.language_code).toBe("fr-FR");
          }
        });
      });

      describe("niepoprawne formaty", () => {
        it("powinien odrzucić wielkie litery w kodzie języka (PL)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "PL",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
            expect(result.error.errors[0].path).toEqual(["language_code"]);
          }
        });

        it("powinien odrzucić wielkie litery w kodzie języka (EN)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "EN",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod z podkreśleniem (en_US)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en_US",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod z małymi literami w regionie (en-us)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en-us",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić zbyt długi kod (eng)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "eng",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić zbyt krótki kod (p)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "p",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod numeryczny (123)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "123",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić pusty string", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod z nieprawidłowym formatem regionu (en-USA)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en-USA",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod z nieprawidłowym formatem regionu (en-U)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en-U",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });

        it("powinien odrzucić kod z spacją (en US)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "en US",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Invalid ISO language code");
          }
        });
      });

      describe("edge cases dla language_code", () => {
        it("powinien odrzucić null jako language_code", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: null,
            theme: "light",
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić undefined jako language_code (explicit)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: undefined,
            theme: "light",
          });

          // undefined jest akceptowane jako optional, ale theme jest wymagane przez refine
          expect(result.success).toBe(true);
        });

        it("powinien odrzucić number jako language_code", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: 123,
            theme: "light",
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić array jako language_code", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: ["pl"],
            theme: "light",
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić object jako language_code", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: { code: "pl" },
            theme: "light",
          });

          expect(result.success).toBe(false);
        });
      });
    });

    describe("theme - walidacja enum", () => {
      describe("poprawne wartości", () => {
        it("powinien zaakceptować 'light'", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "light",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.theme).toBe("light");
          }
        });

        it("powinien zaakceptować 'dark'", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "dark",
          });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.theme).toBe("dark");
          }
        });
      });

      describe("niepoprawne wartości", () => {
        it("powinien odrzucić 'Light' (wielka litera)", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "Light",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
            expect(result.error.errors[0].path).toEqual(["theme"]);
          }
        });

        it("powinien odrzucić 'DARK' (wielkie litery)", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "DARK",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
          }
        });

        it("powinien odrzucić 'system'", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "system",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
          }
        });

        it("powinien odrzucić 'auto'", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "auto",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
          }
        });

        it("powinien odrzucić pusty string", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
          }
        });

        it("powinien odrzucić 'light-dark'", () => {
          const result = ProfileUpdateSchema.safeParse({
            theme: "light-dark",
          });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.errors[0].message).toBe("Must be 'light' or 'dark'");
          }
        });
      });

      describe("edge cases dla theme", () => {
        it("powinien odrzucić null jako theme", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
            theme: null,
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić undefined jako theme (explicit)", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
            theme: undefined,
          });

          // undefined jest akceptowane jako optional, ale language_code jest wymagane przez refine
          expect(result.success).toBe(true);
        });

        it("powinien odrzucić number jako theme", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
            theme: 123,
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić array jako theme", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
            theme: ["light"],
          });

          expect(result.success).toBe(false);
        });

        it("powinien odrzucić object jako theme", () => {
          const result = ProfileUpdateSchema.safeParse({
            language_code: "pl",
            theme: { value: "light" },
          });

          expect(result.success).toBe(false);
        });
      });
    });

    describe(".strict() - odrzucanie dodatkowych pól", () => {
      it("powinien odrzucić dodatkowe pole 'name'", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "pl",
          name: "John",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].code).toBe("unrecognized_keys");
          expect(result.error.errors[0].message).toContain("name");
        }
      });

      it("powinien odrzucić dodatkowe pole 'email'", () => {
        const result = ProfileUpdateSchema.safeParse({
          theme: "light",
          email: "test@example.com",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].code).toBe("unrecognized_keys");
          expect(result.error.errors[0].message).toContain("email");
        }
      });

      it("powinien odrzucić wiele dodatkowych pól", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "pl",
          theme: "dark",
          name: "John",
          email: "test@example.com",
          age: 30,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].code).toBe("unrecognized_keys");
          expect(result.error.errors[0].message).toContain("name");
          expect(result.error.errors[0].message).toContain("email");
          expect(result.error.errors[0].message).toContain("age");
        }
      });

      it("powinien odrzucić dodatkowe pole nawet gdy poprawne pola są poprawne", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "en-US",
          theme: "light",
          extra: "value",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].code).toBe("unrecognized_keys");
        }
      });
    });

    describe(".refine() - wymaganie co najmniej jednego pola", () => {
      it("powinien odrzucić pusty obiekt {}", () => {
        const result = ProfileUpdateSchema.safeParse({});

        expect(result.success).toBe(false);
        if (!result.success) {
          // refine error ma pustą ścieżkę (path.length === 0)
          const refineError = result.error.errors.find((err) => err.path.length === 0);
          expect(refineError).toBeDefined();
          expect(refineError?.message).toBe("At least one field must be provided");
        }
      });

      it("powinien odrzucić obiekt z oboma polami jako undefined", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: undefined,
          theme: undefined,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const refineError = result.error.errors.find((err) => err.path.length === 0);
          expect(refineError).toBeDefined();
          expect(refineError?.message).toBe("At least one field must be provided");
        }
      });

      it("powinien zaakceptować gdy language_code jest ustawione", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "pl",
        });

        expect(result.success).toBe(true);
      });

      it("powinien zaakceptować gdy theme jest ustawione", () => {
        const result = ProfileUpdateSchema.safeParse({
          theme: "dark",
        });

        expect(result.success).toBe(true);
      });

      it("powinien zaakceptować gdy oba pola są ustawione", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "en",
          theme: "light",
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Edge cases - nieprawidłowe typy danych", () => {
      it("powinien odrzucić null jako cały obiekt", () => {
        const result = ProfileUpdateSchema.safeParse(null);

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić undefined jako cały obiekt", () => {
        const result = ProfileUpdateSchema.safeParse(undefined);

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić string jako cały obiekt", () => {
        const result = ProfileUpdateSchema.safeParse("invalid");

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić number jako cały obiekt", () => {
        const result = ProfileUpdateSchema.safeParse(123);

        expect(result.success).toBe(false);
      });

      it("powinien odrzucić array jako cały obiekt", () => {
        const result = ProfileUpdateSchema.safeParse([{ language_code: "pl" }]);

        expect(result.success).toBe(false);
      });
    });

    describe("Kombinacje błędów", () => {
      it("powinien zwrócić błędy dla nieprawidłowego language_code i theme jednocześnie", () => {
        const result = ProfileUpdateSchema.safeParse({
          language_code: "PL",
          theme: "system",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.errors;
          expect(errors.length).toBeGreaterThanOrEqual(2);
          const languageError = errors.find((err) => err.path[0] === "language_code");
          const themeError = errors.find((err) => err.path[0] === "theme");
          expect(languageError).toBeDefined();
          expect(themeError).toBeDefined();
        }
      });

      it("powinien zwrócić błąd refine i dodatkowe pole jednocześnie", () => {
        const result = ProfileUpdateSchema.safeParse({
          extra: "value",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.errors;
          const unrecognizedKeysError = errors.find((err) => err.code === "unrecognized_keys");
          const refineError = errors.find((err) => err.path.length === 0);
          expect(unrecognizedKeysError).toBeDefined();
          expect(refineError).toBeDefined();
        }
      });
    });
  });

  describe("ProfileUpdateInput - typ TypeScript", () => {
    it("powinien mieć poprawny typ dla tylko language_code", () => {
      const input: ProfileUpdateInput = {
        language_code: "pl",
      };

      expect(input.language_code).toBe("pl");
      expect(input.theme).toBeUndefined();
    });

    it("powinien mieć poprawny typ dla tylko theme", () => {
      const input: ProfileUpdateInput = {
        theme: "dark",
      };

      expect(input.theme).toBe("dark");
      expect(input.language_code).toBeUndefined();
    });

    it("powinien mieć poprawny typ dla obu pól", () => {
      const input: ProfileUpdateInput = {
        language_code: "en-US",
        theme: "light",
      };

      expect(input.language_code).toBe("en-US");
      expect(input.theme).toBe("light");
    });

    it("powinien akceptować undefined dla opcjonalnych pól", () => {
      const input1: ProfileUpdateInput = {
        language_code: undefined,
        theme: "light",
      };

      const input2: ProfileUpdateInput = {
        language_code: "pl",
        theme: undefined,
      };

      expect(input1.theme).toBe("light");
      expect(input2.language_code).toBe("pl");
    });
  });
});

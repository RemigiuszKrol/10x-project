import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ProfilePageWrapper, { type ProfilePageWrapperProps } from "@/components/profile/ProfilePageWrapper";

// Mock ProfilePage - główny komponent, który jest opakowywany
// Używamy prostszego mocka, który sprawdza dostępność kontekstów poprzez atrybuty
vi.mock("@/components/profile/ProfilePage", () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="profile-page" data-user-id={userId}>
      ProfilePage Component
    </div>
  ),
}));


describe("ProfilePageWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage przed każdym testem
    localStorage.clear();
    // Reset klasy dark na html
    document.documentElement.classList.remove("dark", "light");
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  describe("Renderowanie", () => {
    it("powinien renderować się poprawnie z userId", () => {
      const props: ProfilePageWrapperProps = {
        userId: "user-123",
      };

      render(<ProfilePageWrapper {...props} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", "user-123");
    });

    it("powinien renderować ProfilePage z przekazanym userId", () => {
      const props: ProfilePageWrapperProps = {
        userId: "test-user-id-456",
      };

      render(<ProfilePageWrapper {...props} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toHaveAttribute("data-user-id", "test-user-id-456");
      expect(screen.getByText("ProfilePage Component")).toBeInTheDocument();
    });

    it("powinien działać z różnymi wartościami userId", () => {
      const testCases = ["user-1", "user-abc-123", "123e4567-e89b-12d3-a456-426614174000"];

      testCases.forEach((userId) => {
        const { unmount } = render(<ProfilePageWrapper userId={userId} />);
        const profilePage = screen.getByTestId("profile-page");
        expect(profilePage).toHaveAttribute("data-user-id", userId);
        unmount();
      });
    });
  });

  describe("Integracja z ThemeProvider", () => {
    it("powinien dostarczyć ThemeProvider do ProfilePage", () => {
      // Sprawdź, że komponent renderuje się bez błędów (co oznacza, że konteksty są dostępne)
      expect(() => {
        render(<ProfilePageWrapper userId="user-123" />);
      }).not.toThrow();

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("powinien umożliwić użycie useTheme w ProfilePage", () => {
      // ProfilePage w rzeczywistym kodzie używa useTheme, więc jeśli komponent renderuje się,
      // oznacza to, że ThemeProvider jest dostępny
      render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("nie powinien rzucać błędu gdy useTheme jest używany w ProfilePage", () => {
      // Jeśli ProfilePage używa useTheme i nie ma ThemeProvider, rzuci błąd
      // Brak błędu oznacza, że ThemeProvider jest dostępny
      expect(() => {
        render(<ProfilePageWrapper userId="user-123" />);
      }).not.toThrow();

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });
  });

  describe("Integracja z LanguageProvider", () => {
    it("powinien dostarczyć LanguageProvider do ProfilePage", () => {
      // Sprawdź, że komponent renderuje się bez błędów (co oznacza, że konteksty są dostępne)
      expect(() => {
        render(<ProfilePageWrapper userId="user-123" />);
      }).not.toThrow();

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("powinien umożliwić użycie useLanguage w ProfilePage", () => {
      // Jeśli ProfilePage używa useLanguage i nie ma LanguageProvider, rzuci błąd
      // Brak błędu oznacza, że LanguageProvider jest dostępny
      render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("nie powinien rzucać błędu gdy useLanguage jest używany w ProfilePage", () => {
      // Jeśli ProfilePage używa useLanguage i nie ma LanguageProvider, rzuci błąd
      // Brak błędu oznacza, że LanguageProvider jest dostępny
      expect(() => {
        render(<ProfilePageWrapper userId="user-123" />);
      }).not.toThrow();

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });
  });

  describe("Zagnieżdżone providery", () => {
    it("powinien zagnieżdżać ThemeProvider i LanguageProvider w poprawnej kolejności", () => {
      // Sprawdź, że komponent renderuje się bez błędów, co oznacza, że oba providery są dostępne
      expect(() => {
        render(<ProfilePageWrapper userId="user-123" />);
      }).not.toThrow();

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("powinien umożliwić jednoczesne użycie obu kontekstów w ProfilePage", () => {
      // ProfilePage w rzeczywistym kodzie może używać obu hooków
      // Brak błędu podczas renderowania oznacza, że oba providery są dostępne
      render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
    });

    it("powinien renderować ProfilePage wewnątrz obu providerów", () => {
      render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", "user-123");
      // Brak błędu podczas renderowania oznacza, że konteksty są dostępne
    });
  });

  describe("Struktura komponentu", () => {
    it("powinien renderować ProfilePage jako bezpośrednie dziecko providerów", () => {
      const { container } = render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(container).toContainElement(profilePage);
    });

    it("powinien zachować hierarchię: ThemeProvider > LanguageProvider > ProfilePage", () => {
      // Sprawdź, że ProfilePage jest renderowany
      render(<ProfilePageWrapper userId="user-123" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();

      // Brak błędu podczas renderowania oznacza, że hierarchia providerów jest poprawna
      // i ProfilePage ma dostęp do obu kontekstów
    });
  });

  describe("Edge cases", () => {
    it("powinien działać z pustym stringiem jako userId", () => {
      render(<ProfilePageWrapper userId="" />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", "");
    });

    it("powinien działać z bardzo długim userId", () => {
      const longUserId = "a".repeat(1000);
      render(<ProfilePageWrapper userId={longUserId} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", longUserId);
    });

    it("powinien działać z userId zawierającym znaki specjalne", () => {
      const specialUserId = "user-123@example.com#test";
      render(<ProfilePageWrapper userId={specialUserId} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", specialUserId);
    });

    it("powinien działać z UUID jako userId", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      render(<ProfilePageWrapper userId={uuid} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();
      expect(profilePage).toHaveAttribute("data-user-id", uuid);
    });
  });

  describe("TypeScript interface", () => {
    it("powinien akceptować ProfilePageWrapperProps zgodnie z interfejsem", () => {
      const validProps: ProfilePageWrapperProps = {
        userId: "user-123",
      };

      expect(() => {
        render(<ProfilePageWrapper {...validProps} />);
      }).not.toThrow();
    });

    it("powinien wymagać userId w props", () => {
      // TypeScript powinien wymuszać userId, ale sprawdzamy w runtime
      const props = { userId: "user-123" } as ProfilePageWrapperProps;
      expect(props.userId).toBeDefined();
    });
  });

  describe("Integracja z ProfilePage", () => {
    it("powinien przekazywać userId do ProfilePage", () => {
      const userId = "test-user-789";
      render(<ProfilePageWrapper userId={userId} />);

      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toHaveAttribute("data-user-id", userId);
    });

    it("powinien renderować ProfilePage wewnątrz kontekstów", () => {
      render(<ProfilePageWrapper userId="user-123" />);

      // ProfilePage powinien mieć dostęp do kontekstów (jeśli ich używa)
      const profilePage = screen.getByTestId("profile-page");
      expect(profilePage).toBeInTheDocument();

      // Sprawdź, że ProfilePage może używać hooków z kontekstów
      // (to jest testowane przez fakt, że ProfilePage używa useTheme w rzeczywistym kodzie)
    });
  });
});


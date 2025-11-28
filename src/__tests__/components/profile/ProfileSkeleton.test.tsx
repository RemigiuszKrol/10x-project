import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

describe("ProfileSkeleton", () => {
  beforeEach(() => {
    // Setup przed każdym testem
  });

  afterEach(() => {
    // Cleanup po każdym teście
  });

  describe("Renderowanie struktury", () => {
    it("powinien renderować główny kontener z odpowiednimi klasami", () => {
      const { container } = render(<ProfileSkeleton />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass("space-y-6");
    });

    it("powinien renderować header skeleton", () => {
      const { container } = render(<ProfileSkeleton />);

      // Header skeleton jest w kontenerze z klasą text-center space-y-2
      const headerContainer = container.querySelector(".text-center.space-y-2");
      expect(headerContainer).toBeInTheDocument();
    });

    it("powinien renderować form skeleton z odpowiednimi klasami", () => {
      const { container } = render(<ProfileSkeleton />);

      // Form skeleton ma klasy: rounded-2xl shadow-xl border border-green-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8
      const formContainer = container.querySelector(
        ".rounded-2xl.shadow-xl.border.bg-white.dark\\:bg-gray-800.p-8"
      );
      expect(formContainer).toBeInTheDocument();
    });

    it("powinien renderować summary skeleton z odpowiednimi klasami", () => {
      const { container } = render(<ProfileSkeleton />);

      // Summary skeleton ma klasy: rounded-2xl shadow-lg border border-green-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6
      const summaryContainer = container.querySelector(
        ".rounded-2xl.shadow-lg.border.bg-white.dark\\:bg-gray-800.p-6"
      );
      expect(summaryContainer).toBeInTheDocument();
    });
  });

  describe("Renderowanie elementów Skeleton", () => {
    it("powinien renderować wszystkie elementy Skeleton", () => {
      const { container } = render(<ProfileSkeleton />);

      // Wszystkie elementy Skeleton mają atrybut data-slot="skeleton"
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      
      // ProfileSkeleton powinien renderować:
      // - 1 header skeleton (h-9 w-64)
      // - 2 skeleton dla language selector (label + description)
      // - 1 skeleton dla language selector input (h-10 w-full)
      // - 2 skeleton dla theme selector (label + description)
      // - 2 skeleton dla theme buttons (h-10 w-24)
      // - 2 skeleton dla theme preview (label + preview box)
      // - 2 skeleton dla actions buttons (h-10 w-24)
      // - 1 skeleton dla summary title (h-5 w-48)
      // - 3 skeleton dla summary content (h-4)
      // Razem: 1 + 2 + 1 + 2 + 2 + 2 + 2 + 1 + 3 = 16
      expect(skeletons.length).toBe(16);
    });

    it("powinien renderować header skeleton z odpowiednimi wymiarami", () => {
      const { container } = render(<ProfileSkeleton />);

      const headerSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-9.w-64.mx-auto'
      );
      expect(headerSkeleton).toBeInTheDocument();
    });

    it("powinien renderować skeleton dla language selector", () => {
      const { container } = render(<ProfileSkeleton />);

      // Language selector ma 3 skeletony: label, description, input
      const languageSection = container.querySelector(".space-y-3");
      expect(languageSection).toBeInTheDocument();
      
      // Label skeleton (h-5 w-32)
      const labelSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-5.w-32'
      );
      expect(labelSkeleton).toBeInTheDocument();

      // Description skeleton (h-4 w-64)
      const descriptionSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-4.w-64'
      );
      expect(descriptionSkeleton).toBeInTheDocument();

      // Input skeleton (h-10 w-full)
      const inputSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-10.w-full'
      );
      expect(inputSkeleton).toBeInTheDocument();
    });

    it("powinien renderować skeleton dla theme selector", () => {
      const { container } = render(<ProfileSkeleton />);

      // Theme selector ma 4 skeletony: label, description, 2 buttons
      // Label skeleton (h-5 w-24)
      const themeLabelSkeleton = container.querySelectorAll(
        '[data-slot="skeleton"].h-5.w-24'
      );
      expect(themeLabelSkeleton.length).toBeGreaterThanOrEqual(1);

      // Description skeleton (h-4 w-72)
      const themeDescriptionSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-4.w-72'
      );
      expect(themeDescriptionSkeleton).toBeInTheDocument();

      // Button skeletons (h-10 w-24) - powinny być 2
      const buttonSkeletons = container.querySelectorAll(
        '[data-slot="skeleton"].h-10.w-24'
      );
      expect(buttonSkeletons.length).toBeGreaterThanOrEqual(2);
    });

    it("powinien renderować skeleton dla theme preview", () => {
      const { container } = render(<ProfileSkeleton />);

      // Theme preview ma 2 skeletony: label i preview box
      // Label skeleton (h-5 w-40)
      const previewLabelSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-5.w-40'
      );
      expect(previewLabelSkeleton).toBeInTheDocument();

      // Preview box skeleton (h-32 w-full rounded-md)
      const previewBoxSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-32.w-full.rounded-md'
      );
      expect(previewBoxSkeleton).toBeInTheDocument();
    });

    it("powinien renderować skeleton dla actions buttons", () => {
      const { container } = render(<ProfileSkeleton />);

      // Actions section ma kontener z flex gap-3
      const actionsContainer = container.querySelector(".flex.gap-3");
      expect(actionsContainer).toBeInTheDocument();

      // Powinny być 2 button skeletons (h-10 w-24)
      const actionButtons = actionsContainer?.querySelectorAll(
        '[data-slot="skeleton"].h-10.w-24'
      );
      expect(actionButtons?.length).toBeGreaterThanOrEqual(2);
    });

    it("powinien renderować skeleton dla summary section", () => {
      const { container } = render(<ProfileSkeleton />);

      // Summary section ma title skeleton (h-5 w-48)
      const summaryTitleSkeleton = container.querySelector(
        '[data-slot="skeleton"].h-5.w-48'
      );
      expect(summaryTitleSkeleton).toBeInTheDocument();

      // Summary content ma 3 skeletony (h-4)
      const summaryContentSkeletons = container.querySelectorAll(
        '[data-slot="skeleton"].h-4'
      );
      // Powinno być co najmniej 3 (w summary) + inne h-4 w innych sekcjach
      expect(summaryContentSkeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Struktura DOM", () => {
    it("powinien mieć poprawną hierarchię elementów", () => {
      const { container } = render(<ProfileSkeleton />);

      // Główny kontener
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toBeInTheDocument();

      // Header powinien być pierwszym dzieckiem
      const header = mainContainer.querySelector(".text-center.space-y-2");
      expect(header).toBeInTheDocument();

      // Form powinien być w głównym kontenerze
      const form = mainContainer.querySelector(
        ".rounded-2xl.shadow-xl.border.bg-white"
      );
      expect(form).toBeInTheDocument();

      // Summary powinien być w głównym kontenerze
      const summary = mainContainer.querySelector(
        ".rounded-2xl.shadow-lg.border.bg-white"
      );
      expect(summary).toBeInTheDocument();
    });

    it("powinien renderować wszystkie sekcje w odpowiedniej kolejności", () => {
      const { container } = render(<ProfileSkeleton />);

      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      // Pierwszy element to header
      expect(children[0]).toHaveClass("text-center", "space-y-2");

      // Drugi element to form
      expect(children[1]).toHaveClass("rounded-2xl", "shadow-xl", "p-8");

      // Trzeci element to summary
      expect(children[2]).toHaveClass("rounded-2xl", "shadow-lg", "p-6");
    });
  });

  describe("Klasy CSS i style", () => {
    it("powinien mieć odpowiednie klasy dla dark mode", () => {
      const { container } = render(<ProfileSkeleton />);

      // Form powinien mieć klasy dark mode
      const form = container.querySelector(
        ".dark\\:border-gray-700.dark\\:bg-gray-800"
      );
      expect(form).toBeInTheDocument();

      // Summary powinien mieć klasy dark mode
      const summary = container.querySelector(
        ".dark\\:border-gray-700.dark\\:bg-gray-800"
      );
      expect(summary).toBeInTheDocument();
    });

    it("powinien mieć odpowiednie klasy dla border i shadow", () => {
      const { container } = render(<ProfileSkeleton />);

      // Form ma shadow-xl i border-green-100
      const form = container.querySelector(".shadow-xl.border.border-green-100");
      expect(form).toBeInTheDocument();

      // Summary ma shadow-lg i border-green-100
      const summary = container.querySelector(".shadow-lg.border.border-green-100");
      expect(summary).toBeInTheDocument();
    });

    it("powinien mieć odpowiednie padding dla form i summary", () => {
      const { container } = render(<ProfileSkeleton />);

      // Form ma p-8
      const form = container.querySelector(".p-8");
      expect(form).toBeInTheDocument();

      // Summary ma p-6
      const summary = container.querySelector(".p-6");
      expect(summary).toBeInTheDocument();
    });
  });

  describe("Komponenty bez props", () => {
    it("powinien renderować się bez żadnych props", () => {
      expect(() => render(<ProfileSkeleton />)).not.toThrow();
    });

    it("powinien być komponentem funkcjonalnym", () => {
      const { container } = render(<ProfileSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("powinien renderować elementy bez błędów dostępności", () => {
      const { container } = render(<ProfileSkeleton />);
      
      // Skeleton nie powinien mieć błędów dostępności - to placeholder
      // Sprawdzamy czy struktura jest poprawna
      expect(container.firstChild).toBeInTheDocument();
    });

    it("powinien mieć semantyczną strukturę HTML", () => {
      const { container } = render(<ProfileSkeleton />);

      // Główny kontener powinien być div
      const mainContainer = container.firstChild;
      expect(mainContainer?.nodeName).toBe("DIV");
    });
  });
});


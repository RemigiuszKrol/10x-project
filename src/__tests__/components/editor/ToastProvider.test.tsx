import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/editor/ToastProvider";

// Mock komponentu Toaster - funkcja musi być zdefiniowana bezpośrednio w factory
vi.mock("@/components/ui/sonner", () => ({
  Toaster: vi.fn(({ children, ...props }) => (
    <div data-testid="toaster" data-props={JSON.stringify(props)}>
      {children}
    </div>
  )),
}));

// Import mocka po zdefiniowaniu
import { Toaster } from "@/components/ui/sonner";
const mockToaster = vi.mocked(Toaster);

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować children", () => {
      render(
        <ToastProvider>
          <div data-testid="test-child">Test Content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("powinien renderować Toaster komponent", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("powinien renderować zarówno children jak i Toaster", () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child Content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });
  });

  describe("Konfiguracja Toaster", () => {
    it("powinien przekazać position='top-right' do Toaster", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      const toasterElement = screen.getByTestId("toaster");
      const props = JSON.parse(toasterElement.getAttribute("data-props") || "{}");

      expect(props.position).toBe("top-right");
    });

    it("powinien przekazać closeButton={true} do Toaster", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      const toasterElement = screen.getByTestId("toaster");
      const props = JSON.parse(toasterElement.getAttribute("data-props") || "{}");

      expect(props.closeButton).toBe(true);
    });

    it("powinien przekazać richColors={true} do Toaster", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      const toasterElement = screen.getByTestId("toaster");
      const props = JSON.parse(toasterElement.getAttribute("data-props") || "{}");

      expect(props.richColors).toBe(true);
    });

    it("powinien przekazać toastOptions z classNames do Toaster", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      const toasterElement = screen.getByTestId("toaster");
      const props = JSON.parse(toasterElement.getAttribute("data-props") || "{}");

      expect(props.toastOptions).toBeDefined();
      expect(props.toastOptions.classNames).toBeDefined();
      expect(props.toastOptions.classNames.toast).toBe("group");
      expect(props.toastOptions.classNames.title).toBe("font-semibold");
      expect(props.toastOptions.classNames.description).toBe("text-sm opacity-90");
      expect(props.toastOptions.classNames.actionButton).toBe("bg-primary text-primary-foreground");
      expect(props.toastOptions.classNames.cancelButton).toBe("bg-muted text-muted-foreground");
    });
  });

  describe("Kompletna konfiguracja", () => {
    it("powinien przekazać wszystkie wymagane props do Toaster jednocześnie", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      const toasterElement = screen.getByTestId("toaster");
      const props = JSON.parse(toasterElement.getAttribute("data-props") || "{}");

      // Weryfikacja wszystkich props jednocześnie
      expect(props.position).toBe("top-right");
      expect(props.closeButton).toBe(true);
      expect(props.richColors).toBe(true);
      expect(props.toastOptions).toBeDefined();
      expect(props.toastOptions.classNames).toBeDefined();
    });

    it("powinien wywołać Toaster z poprawnymi argumentami", () => {
      render(
        <ToastProvider>
          <div>Test</div>
        </ToastProvider>
      );

      expect(mockToaster).toHaveBeenCalledTimes(1);
      const callArgs = mockToaster.mock.calls[0][0];

      expect(callArgs.position).toBe("top-right");
      expect(callArgs.closeButton).toBe(true);
      expect(callArgs.richColors).toBe(true);
      expect(callArgs.toastOptions).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("powinien renderować się z pustym children (null)", () => {
      render(<ToastProvider>{null}</ToastProvider>);

      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("powinien renderować się z wieloma children", () => {
      render(
        <ToastProvider>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
          <div data-testid="child3">Child 3</div>
        </ToastProvider>
      );

      expect(screen.getByTestId("child1")).toBeInTheDocument();
      expect(screen.getByTestId("child2")).toBeInTheDocument();
      expect(screen.getByTestId("child3")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("powinien renderować się z zagnieżdżonymi komponentami", () => {
      render(
        <ToastProvider>
          <div>
            <span>Nested Content</span>
          </div>
        </ToastProvider>
      );

      expect(screen.getByText("Nested Content")).toBeInTheDocument();
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });
  });
});


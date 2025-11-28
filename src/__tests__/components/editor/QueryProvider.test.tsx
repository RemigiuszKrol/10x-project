import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryProvider } from "@/components/editor/QueryProvider";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

// Komponent testowy do sprawdzania konfiguracji QueryClient
function TestComponent({ onQueryClientReady }: { onQueryClientReady: (client: ReturnType<typeof useQueryClient>) => void }) {
  const queryClient = useQueryClient();
  onQueryClientReady(queryClient);
  return <div data-testid="test-content">Test Content</div>;
}

describe("QueryProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Renderowanie", () => {
    it("powinien renderować się poprawnie", () => {
      const { container } = render(
        <QueryProvider>
          <div>Test Children</div>
        </QueryProvider>
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText("Test Children")).toBeInTheDocument();
    });

    it("powinien renderować children", () => {
      render(
        <QueryProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </QueryProvider>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    it("powinien działać z pustym children", () => {
      const { container } = render(<QueryProvider>{null}</QueryProvider>);

      expect(container).toBeInTheDocument();
    });

    it("powinien działać z różnymi typami children", () => {
      render(
        <QueryProvider>
          <span>Text</span>
          {123}
          {true && <div>Conditional</div>}
        </QueryProvider>
      );

      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(screen.getByText("123")).toBeInTheDocument();
      expect(screen.getByText("Conditional")).toBeInTheDocument();
    });
  });

  describe("Konfiguracja QueryClient", () => {
    it("powinien utworzyć QueryClient z właściwą konfiguracją queries", () => {
      let capturedClient: ReturnType<typeof useQueryClient> | null = null;

      render(
        <QueryProvider>
          <TestComponent
            onQueryClientReady={(client) => {
              capturedClient = client;
            }}
          />
        </QueryProvider>
      );

      expect(capturedClient).not.toBeNull();
      if (capturedClient) {
        const defaultOptions = (capturedClient as QueryClient).getDefaultOptions();
        expect(defaultOptions.queries).toBeDefined();
        expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minut
        expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minut
        expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
        expect(defaultOptions.queries?.retry).toBe(1);
      }
    });

    it("powinien utworzyć QueryClient z właściwą konfiguracją mutations", () => {
      let capturedClient: ReturnType<typeof useQueryClient> | null = null;

      render(
        <QueryProvider>
          <TestComponent
            onQueryClientReady={(client) => {
              capturedClient = client;
            }}
          />
        </QueryProvider>
      );

      expect(capturedClient).not.toBeNull();
      if (capturedClient) {
        const defaultOptions = (capturedClient as QueryClient).getDefaultOptions();
        expect(defaultOptions.mutations).toBeDefined();
        expect(defaultOptions.mutations?.retry).toBe(1);
      }
    });
  });

  describe("Singleton Pattern - QueryClient nie jest odtwarzany", () => {
    it("powinien utworzyć QueryClient tylko raz przy pierwszym renderze", () => {
      const queryClientInstances: ReturnType<typeof useQueryClient>[] = [];

      const TestComponentWithMultipleRenders = ({ renderCount }: { renderCount: number }) => {
        const queryClient = useQueryClient();
        queryClientInstances.push(queryClient);
        return <div data-testid={`render-${renderCount}`}>Render {renderCount}</div>;
      };

      const { rerender } = render(
        <QueryProvider>
          <TestComponentWithMultipleRenders renderCount={1} />
        </QueryProvider>
      );

      const firstInstance = queryClientInstances[0];

      // Re-render komponentu
      rerender(
        <QueryProvider>
          <TestComponentWithMultipleRenders renderCount={2} />
        </QueryProvider>
      );

      // QueryClient powinien być tą samą instancją
      expect(queryClientInstances.length).toBeGreaterThan(1);
      queryClientInstances.forEach((instance) => {
        expect(instance).toBe(firstInstance);
      });
    });

    it("powinien zachować tę samą instancję QueryClient przy wielu re-renderach", () => {
      const instances = new Set<ReturnType<typeof useQueryClient>>();

      const TestComponent = () => {
        const queryClient = useQueryClient();
        instances.add(queryClient);
        return <div>Test</div>;
      };

      const { rerender } = render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      // Wykonaj kilka re-renderów
      for (let i = 0; i < 5; i++) {
        rerender(
          <QueryProvider>
            <TestComponent />
          </QueryProvider>
        );
      }

      // Powinna być tylko jedna unikalna instancja QueryClient
      expect(instances.size).toBe(1);
    });
  });

  describe("Integracja z QueryClientProvider", () => {
    it("powinien dostarczyć QueryClient do komponentów potomnych", () => {
      let capturedClient: ReturnType<typeof useQueryClient> | null = null;

      render(
        <QueryProvider>
          <TestComponent
            onQueryClientReady={(client) => {
              capturedClient = client;
            }}
          />
        </QueryProvider>
      );

      expect(capturedClient).not.toBeNull();
      expect(capturedClient).toBeInstanceOf(Object);
      // Sprawdź, że QueryClient ma metody charakterystyczne dla QueryClient
      expect(capturedClient).toHaveProperty("getQueryCache");
      expect(capturedClient).toHaveProperty("getMutationCache");
      expect(capturedClient).toHaveProperty("getDefaultOptions");
    });

    it("powinien umożliwić użycie useQueryClient w komponentach potomnych", () => {
      let queryClientAvailable = false;

      const TestComponent = () => {
        try {
          const client = useQueryClient();
          queryClientAvailable = client !== null && client !== undefined;
          return <div>QueryClient dostępny: {queryClientAvailable ? "tak" : "nie"}</div>;
        } catch (error) {
          queryClientAvailable = false;
          return <div>Błąd: {String(error)}</div>;
        }
      };

      render(
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      );

      expect(queryClientAvailable).toBe(true);
      expect(screen.getByText(/QueryClient dostępny: tak/i)).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("powinien działać z bardzo długim tekstem jako children", () => {
      const longText = "A".repeat(10000);

      render(
        <QueryProvider>
          <div>{longText}</div>
        </QueryProvider>
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("powinien działać z komponentami React używającymi hooks", () => {
      const ComponentWithState = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <span>Count: {count}</span>
          </div>
        );
      };

      render(
        <QueryProvider>
          <ComponentWithState />
        </QueryProvider>
      );

      expect(screen.getByText(/Count: 0/i)).toBeInTheDocument();
    });
  });
});


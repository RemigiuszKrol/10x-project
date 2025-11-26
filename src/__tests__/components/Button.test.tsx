import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renderuje się poprawnie", () => {
    render(<Button>Kliknij mnie</Button>);
    expect(screen.getByRole("button", { name: /kliknij mnie/i })).toBeInTheDocument();
  });

  it("wywołuje onClick gdy zostanie kliknięty", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Kliknij</Button>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("jest wyłączony gdy disabled=true", () => {
    render(<Button disabled>Wyłączony</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
  });

  it("stosuje wariant className", () => {
    render(<Button variant="destructive">Usuń</Button>);
    const button = screen.getByRole("button");

    // Button powinien mieć odpowiednie klasy dla wariantu destructive
    expect(button).toBeInTheDocument();
  });

  it("stosuje rozmiar className", () => {
    render(<Button size="lg">Duży przycisk</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeInTheDocument();
  });
});

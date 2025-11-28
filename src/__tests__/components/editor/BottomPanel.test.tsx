import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomPanel, type BottomPanelProps } from '@/components/editor/BottomPanel';
import type { OperationLogEntry } from '@/types';

describe('BottomPanel', () => {
  const createMockOperation = (
    id: string,
    type: OperationLogEntry['type'],
    message: string,
    timestamp?: string
  ): OperationLogEntry => ({
    id,
    type,
    message,
    timestamp: timestamp || new Date().toISOString(),
  });

  const defaultProps: BottomPanelProps = {
    operations: [],
    plantsCount: 0,
    selectedCellsCount: 0,
    aiStatus: 'idle',
    weatherStatus: 'idle',
  };

  beforeEach(() => {
    // Reset przed każdym testem
  });

  afterEach(() => {
    // Cleanup jest wykonywany automatycznie przez vitest.setup.ts
  });

  describe('Renderowanie', () => {
    it('powinien renderować się poprawnie z domyślnymi props', () => {
      render(<BottomPanel {...defaultProps} />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText(/Rośliny:/)).toBeInTheDocument();
      expect(screen.getByText(/Zaznaczonych:/)).toBeInTheDocument();
      expect(screen.getByText(/AI:/)).toBeInTheDocument();
      expect(screen.getByText(/Pogoda:/)).toBeInTheDocument();
    });

    it('powinien renderować footer z odpowiednimi klasami CSS', () => {
      const { container } = render(<BottomPanel {...defaultProps} />);

      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('border-t', 'bg-background');
    });

    it('powinien renderować przycisk do przełączania logu operacji', () => {
      render(<BottomPanel {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'operation-log');
    });

    it('powinien ukrywać log operacji domyślnie', () => {
      render(<BottomPanel {...defaultProps} />);

      const logSection = screen.queryByRole('log');
      expect(logSection).not.toBeInTheDocument();
    });
  });

  describe('Status bar - Liczniki', () => {
    it('powinien wyświetlać liczbę roślin', () => {
      render(<BottomPanel {...defaultProps} plantsCount={5} />);

      expect(screen.getByText(/Rośliny: 5/)).toBeInTheDocument();
    });

    it('powinien wyświetlać 0 roślin', () => {
      render(<BottomPanel {...defaultProps} plantsCount={0} />);

      expect(screen.getByText(/Rośliny: 0/)).toBeInTheDocument();
    });

    it('powinien wyświetlać liczbę zaznaczonych komórek', () => {
      render(<BottomPanel {...defaultProps} selectedCellsCount={10} />);

      expect(screen.getByText(/Zaznaczonych: 10/)).toBeInTheDocument();
    });

    it('powinien wyświetlać "-" gdy brak zaznaczonych komórek', () => {
      render(<BottomPanel {...defaultProps} selectedCellsCount={0} />);

      expect(screen.getByText(/Zaznaczonych: -/)).toBeInTheDocument();
    });

    it('powinien wyświetlać tooltip dla liczby roślin', () => {
      render(<BottomPanel {...defaultProps} plantsCount={3} />);

      const plantsSpan = screen.getByTitle('Liczba roślin w planie');
      expect(plantsSpan).toBeInTheDocument();
      expect(plantsSpan).toHaveTextContent(/Rośliny: 3/);
    });

    it('powinien wyświetlać tooltip dla liczby zaznaczonych komórek', () => {
      render(<BottomPanel {...defaultProps} selectedCellsCount={7} />);

      const selectedSpan = screen.getByTitle('Liczba zaznaczonych komórek');
      expect(selectedSpan).toBeInTheDocument();
      expect(selectedSpan).toHaveTextContent(/Zaznaczonych: 7/);
    });
  });

  describe('Status bar - Status AI', () => {
    it('powinien wyświetlać status AI: idle', () => {
      render(<BottomPanel {...defaultProps} aiStatus="idle" />);

      const aiStatus = screen.getByTitle('Bezczynne');
      expect(aiStatus).toBeInTheDocument();
      expect(aiStatus).toHaveTextContent(/AI: Bezczynne/);
    });

    it('powinien wyświetlać status AI: searching', () => {
      render(<BottomPanel {...defaultProps} aiStatus="searching" />);

      const aiStatus = screen.getByTitle('Wyszukiwanie...');
      expect(aiStatus).toBeInTheDocument();
      expect(aiStatus).toHaveTextContent(/AI: Wyszukiwanie\.\.\./);
    });

    it('powinien wyświetlać status AI: fitting', () => {
      render(<BottomPanel {...defaultProps} aiStatus="fitting" />);

      const aiStatus = screen.getByTitle('Ocena...');
      expect(aiStatus).toBeInTheDocument();
      expect(aiStatus).toHaveTextContent(/AI: Ocena\.\.\./);
    });

    it('powinien wyświetlać status AI: error', () => {
      render(<BottomPanel {...defaultProps} aiStatus="error" />);

      const aiStatus = screen.getByTitle('Błąd');
      expect(aiStatus).toBeInTheDocument();
      expect(aiStatus).toHaveTextContent(/AI: Błąd/);
    });
  });

  describe('Status bar - Status pogody', () => {
    it('powinien wyświetlać status pogody: idle', () => {
      render(<BottomPanel {...defaultProps} weatherStatus="idle" />);

      const weatherStatus = screen.getByTitle('Aktualna');
      expect(weatherStatus).toBeInTheDocument();
      expect(weatherStatus).toHaveTextContent(/Pogoda: Aktualna/);
    });

    it('powinien wyświetlać status pogody: loading', () => {
      render(<BottomPanel {...defaultProps} weatherStatus="loading" />);

      const weatherStatus = screen.getByTitle('Ładowanie...');
      expect(weatherStatus).toBeInTheDocument();
      expect(weatherStatus).toHaveTextContent(/Pogoda: Ładowanie\.\.\./);
    });

    it('powinien wyświetlać status pogody: error', () => {
      render(<BottomPanel {...defaultProps} weatherStatus="error" />);

      const weatherStatus = screen.getByTitle('Błąd');
      expect(weatherStatus).toBeInTheDocument();
      expect(weatherStatus).toHaveTextContent(/Pogoda: Błąd/);
    });

    it('powinien wyświetlać status pogody: stale', () => {
      render(<BottomPanel {...defaultProps} weatherStatus="stale" />);

      const weatherStatus = screen.getByTitle('Nieaktualne');
      expect(weatherStatus).toBeInTheDocument();
      expect(weatherStatus).toHaveTextContent(/Pogoda: Nieaktualne/);
    });
  });

  describe('Log operacji - Przełączanie widoczności', () => {
    it('powinien pokazać log operacji po kliknięciu przycisku', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'success', 'Operacja zakończona pomyślnie'),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('log')).toBeInTheDocument();
      expect(screen.getByText(/Ukryj ostatnie zmiany/)).toBeInTheDocument();
    });

    it('powinien ukryć log operacji po ponownym kliknięciu przycisku', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'success', 'Operacja zakończona pomyślnie'),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      
      // Otwórz log
      await user.click(toggleButton);
      expect(screen.getByRole('log')).toBeInTheDocument();

      // Zamknij log
      await user.click(toggleButton);
      expect(screen.queryByRole('log')).not.toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByText(/Pokaż ostatnie zmiany/)).toBeInTheDocument();
    });

    it('powinien aktualizować aria-expanded przy przełączaniu', async () => {
      const user = userEvent.setup();
      render(<BottomPanel {...defaultProps} operations={[]} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Log operacji - Wyświetlanie operacji', () => {
    it('powinien wyświetlać komunikat gdy brak operacji', async () => {
      const user = userEvent.setup();
      render(<BottomPanel {...defaultProps} operations={[]} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      expect(screen.getByText('Brak ostatnich operacji')).toBeInTheDocument();
    });

    it('powinien wyświetlać pojedynczą operację', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'success', 'Roślina dodana pomyślnie'),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      expect(screen.getByText('Roślina dodana pomyślnie')).toBeInTheDocument();
    });

    it('powinien wyświetlać ostatnie 5 operacji', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', 'Operacja 1'),
        createMockOperation('2', 'info', 'Operacja 2'),
        createMockOperation('3', 'info', 'Operacja 3'),
        createMockOperation('4', 'info', 'Operacja 4'),
        createMockOperation('5', 'info', 'Operacja 5'),
        createMockOperation('6', 'info', 'Operacja 6'), // Ta nie powinna być widoczna
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      expect(screen.getByText('Operacja 2')).toBeInTheDocument();
      expect(screen.getByText('Operacja 3')).toBeInTheDocument();
      expect(screen.getByText('Operacja 4')).toBeInTheDocument();
      expect(screen.getByText('Operacja 5')).toBeInTheDocument();
      expect(screen.getByText('Operacja 6')).toBeInTheDocument();
      expect(screen.queryByText('Operacja 1')).not.toBeInTheDocument();
    });

    it('powinien wyświetlać operacje w odwrotnej kolejności (najnowsza na górze)', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', 'Operacja 1'),
        createMockOperation('2', 'info', 'Operacja 2'),
        createMockOperation('3', 'info', 'Operacja 3'),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const logEntries = screen.getAllByText(/Operacja \d/);
      expect(logEntries[0]).toHaveTextContent('Operacja 3');
      expect(logEntries[1]).toHaveTextContent('Operacja 2');
      expect(logEntries[2]).toHaveTextContent('Operacja 1');
    });

    it('powinien wyświetlać timestamp operacji', async () => {
      const user = userEvent.setup();
      const timestamp = new Date('2024-01-15T14:30:00Z').toISOString();
      const operations = [
        createMockOperation('1', 'info', 'Test operacji', timestamp),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      // Sprawdzamy czy timestamp jest wyświetlony (format zależy od locale)
      const timestampElement = screen.getByText(new RegExp('\\d{1,2}:\\d{2}:\\d{2}'));
      expect(timestampElement).toBeInTheDocument();
    });
  });

  describe('Log operacji - Typy operacji i kolory', () => {
    it('powinien wyświetlać operację typu success z zielonym kolorem', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'success', 'Sukces'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const successIcon = container.querySelector('.text-green-500');
      expect(successIcon).toBeInTheDocument();
      expect(successIcon).toHaveTextContent('✓');
    });

    it('powinien wyświetlać operację typu error z czerwonym kolorem', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'error', 'Błąd'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const errorIcon = container.querySelector('.text-red-500');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveTextContent('✗');
      
      const errorMessage = screen.getByText('Błąd');
      expect(errorMessage).toHaveClass('text-destructive');
    });

    it('powinien wyświetlać operację typu warning z żółtym kolorem', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'warning', 'Ostrzeżenie'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const warningIcon = container.querySelector('.text-yellow-500');
      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveTextContent('⚠');
    });

    it('powinien wyświetlać operację typu info z domyślnym kolorem', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', 'Informacja'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      // Szukamy ikony info - jest w elemencie z klasą text-muted-foreground, ale nie w timestampie
      const logSection = container.querySelector('#operation-log');
      const allMutedElements = logSection?.querySelectorAll('.text-muted-foreground') || [];
      const infoIcon = Array.from(allMutedElements).find(el => el.textContent?.trim() === 'ℹ');
      expect(infoIcon).toBeDefined();
    });

    it('powinien wyświetlać różne typy operacji z odpowiednimi ikonami', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'success', 'Sukces'),
        createMockOperation('2', 'error', 'Błąd'),
        createMockOperation('3', 'warning', 'Ostrzeżenie'),
        createMockOperation('4', 'info', 'Informacja'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      // Sprawdzamy czy ikony są obecne w logu
      const logSection = container.querySelector('#operation-log');
      expect(logSection?.querySelector('.text-green-500')).toHaveTextContent('✓');
      expect(logSection?.querySelector('.text-red-500')).toHaveTextContent('✗');
      expect(logSection?.querySelector('.text-yellow-500')).toHaveTextContent('⚠');
      // Dla info szukamy ikony w logu (jest w elemencie z text-muted-foreground, ale nie w timestampie)
      const allMutedElements = logSection?.querySelectorAll('.text-muted-foreground') || [];
      const hasInfoIcon = Array.from(allMutedElements).some(el => el.textContent?.trim() === 'ℹ');
      expect(hasInfoIcon).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('powinien mieć role="log" dla sekcji logu operacji', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', 'Test'),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const logSection = screen.getByRole('log');
      expect(logSection).toBeInTheDocument();
      expect(logSection).toHaveAttribute('id', 'operation-log');
      expect(logSection).toHaveAttribute('aria-live', 'polite');
      expect(logSection).toHaveAttribute('aria-atomic', 'false');
    });

    it('powinien mieć aria-controls wskazujące na operation-log', () => {
      render(<BottomPanel {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      expect(toggleButton).toHaveAttribute('aria-controls', 'operation-log');
    });

    it('powinien mieć aria-expanded dla przycisku przełączania', () => {
      render(<BottomPanel {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      expect(toggleButton).toHaveAttribute('aria-expanded');
    });

    it('powinien mieć footer z role="contentinfo"', () => {
      render(<BottomPanel {...defaultProps} />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Layout i struktura', () => {
    it('powinien mieć status bar z odpowiednimi klasami CSS', () => {
      const { container } = render(<BottomPanel {...defaultProps} />);

      const statusBar = container.querySelector('.flex.items-center.justify-between');
      expect(statusBar).toBeInTheDocument();
    });

    it('powinien mieć sekcję logu z odpowiednimi klasami CSS', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', 'Test'),
      ];

      const { container } = render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const logSection = container.querySelector('#operation-log');
      expect(logSection).toHaveClass('border-b', 'px-4', 'py-2');
    });

    it('powinien mieć przycisk z odpowiednimi klasami CSS', () => {
      render(<BottomPanel {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      expect(toggleButton).toHaveClass('text-xs', 'h-7');
    });
  });

  describe('Edge cases', () => {
    it('powinien obsługiwać dużą liczbę operacji (tylko ostatnie 5)', async () => {
      const user = userEvent.setup();
      const operations = Array.from({ length: 20 }, (_, i) =>
        createMockOperation(`op-${i}`, 'info', `Operacja ${i}`)
      );

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      // Powinno być tylko 5 ostatnich operacji
      const logEntries = screen.getAllByText(/Operacja \d+/);
      expect(logEntries.length).toBeLessThanOrEqual(5);
      
      // Najnowsze operacje powinny być widoczne
      expect(screen.getByText('Operacja 19')).toBeInTheDocument();
      expect(screen.getByText('Operacja 18')).toBeInTheDocument();
    });

    it('powinien obsługiwać bardzo długie komunikaty operacji', async () => {
      const user = userEvent.setup();
      const longMessage = 'A'.repeat(200);
      const operations = [
        createMockOperation('1', 'info', longMessage),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('powinien obsługiwać operacje z pustym komunikatem', async () => {
      const user = userEvent.setup();
      const operations = [
        createMockOperation('1', 'info', ''),
      ];

      render(<BottomPanel {...defaultProps} operations={operations} />);

      const toggleButton = screen.getByRole('button', { name: /pokaż ostatnie zmiany/i });
      await user.click(toggleButton);

      const logSection = screen.getByRole('log');
      expect(logSection).toBeInTheDocument();
    });

    it('powinien obsługiwać bardzo duże liczby roślin', () => {
      render(<BottomPanel {...defaultProps} plantsCount={9999} />);

      expect(screen.getByText(/Rośliny: 9999/)).toBeInTheDocument();
    });

    it('powinien obsługiwać bardzo duże liczby zaznaczonych komórek', () => {
      render(<BottomPanel {...defaultProps} selectedCellsCount={5000} />);

      expect(screen.getByText(/Zaznaczonych: 5000/)).toBeInTheDocument();
    });

    it('powinien obsługiwać wszystkie kombinacje statusów jednocześnie', () => {
      render(
        <BottomPanel
          {...defaultProps}
          aiStatus="searching"
          weatherStatus="loading"
          plantsCount={10}
          selectedCellsCount={5}
        />
      );

      expect(screen.getByTitle('Wyszukiwanie...')).toBeInTheDocument();
      expect(screen.getByTitle('Ładowanie...')).toBeInTheDocument();
      expect(screen.getByText(/Rośliny: 10/)).toBeInTheDocument();
      expect(screen.getByText(/Zaznaczonych: 5/)).toBeInTheDocument();
    });
  });

  describe('Integracja z innymi komponentami', () => {
    it('powinien renderować się poprawnie z różnymi kombinacjami props', () => {
      const operations = [
        createMockOperation('1', 'success', 'Test'),
      ];

      const { rerender } = render(
        <BottomPanel
          {...defaultProps}
          operations={operations}
          plantsCount={1}
          selectedCellsCount={1}
          aiStatus="idle"
          weatherStatus="idle"
        />
      );

      expect(screen.getByText(/Rośliny: 1/)).toBeInTheDocument();

      rerender(
        <BottomPanel
          {...defaultProps}
          operations={operations}
          plantsCount={2}
          selectedCellsCount={2}
          aiStatus="searching"
          weatherStatus="loading"
        />
      );

      expect(screen.getByText(/Rośliny: 2/)).toBeInTheDocument();
      expect(screen.getByTitle('Wyszukiwanie...')).toBeInTheDocument();
      expect(screen.getByTitle('Ładowanie...')).toBeInTheDocument();
    });
  });
});


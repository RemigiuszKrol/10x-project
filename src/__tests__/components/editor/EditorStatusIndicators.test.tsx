import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorStatusIndicators, type EditorStatusIndicatorsProps } from '../../../components/editor/EditorStatusIndicators';

describe('EditorStatusIndicators', () => {
  const defaultProps: EditorStatusIndicatorsProps = {
    aiStatus: 'idle',
    weatherStatus: 'idle',
    sessionStatus: 'active',
  };

  describe('Rendering', () => {
    it('should render all three status indicators', () => {
      render(<EditorStatusIndicators {...defaultProps} />);

      // Sprawdź czy wszystkie trzy wskaźniki są renderowane
      const indicators = screen.getAllByRole('generic').filter(
        (el) => el.getAttribute('title') !== null
      );
      expect(indicators).toHaveLength(3);
    });

    it('should render with all idle/active statuses', () => {
      const { container } = render(<EditorStatusIndicators {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render with all error/expired statuses', () => {
      const { container } = render(
        <EditorStatusIndicators
          aiStatus="error"
          weatherStatus="error"
          sessionStatus="expired"
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('AI Status Indicator', () => {
    it('should display idle status with correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} aiStatus="idle" />);
      
      const aiIndicator = screen.getAllByTitle(/AI:/)[0];
      expect(aiIndicator).toHaveAttribute('title', 'AI: Bezczynne');
    });

    it('should display searching status with spinner and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} aiStatus="searching" />);
      
      const aiIndicator = screen.getAllByTitle(/AI:/)[0];
      expect(aiIndicator).toHaveAttribute('title', 'AI: Wyszukiwanie roślin...');
      
      // Sprawdź czy spinner jest widoczny
      const spinner = aiIndicator.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display fitting status with spinner and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} aiStatus="fitting" />);
      
      const aiIndicator = screen.getAllByTitle(/AI:/)[0];
      expect(aiIndicator).toHaveAttribute('title', 'AI: Sprawdzanie dopasowania...');
      
      // Sprawdź czy spinner jest widoczny
      const spinner = aiIndicator.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display error status with correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} aiStatus="error" />);
      
      const aiIndicator = screen.getAllByTitle(/AI:/)[0];
      expect(aiIndicator).toHaveAttribute('title', 'AI: Błąd - spróbuj ponownie');
      
      // Sprawdź czy spinner NIE jest widoczny dla error
      const spinner = aiIndicator.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should apply correct color classes for AI status', () => {
      const { container, rerender } = render(
        <EditorStatusIndicators {...defaultProps} aiStatus="idle" />
      );
      
      // Sprawdź kolor dla idle
      let leafIcon = container.querySelector('svg');
      expect(leafIcon?.classList.contains('text-muted-foreground')).toBe(true);

      // Sprawdź kolor dla searching
      rerender(<EditorStatusIndicators {...defaultProps} aiStatus="searching" />);
      leafIcon = container.querySelector('svg');
      expect(leafIcon?.classList.contains('text-blue-500')).toBe(true);

      // Sprawdź kolor dla error
      rerender(<EditorStatusIndicators {...defaultProps} aiStatus="error" />);
      leafIcon = container.querySelector('svg');
      expect(leafIcon?.classList.contains('text-red-500')).toBe(true);
    });
  });

  describe('Weather Status Indicator', () => {
    it('should display idle status with correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} weatherStatus="idle" />);
      
      const weatherIndicator = screen.getAllByTitle(/Pogoda:/)[0];
      expect(weatherIndicator).toHaveAttribute('title', 'Pogoda: Aktualna');
    });

    it('should display loading status with spinner and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} weatherStatus="loading" />);
      
      const weatherIndicator = screen.getAllByTitle(/Pogoda:/)[0];
      expect(weatherIndicator).toHaveAttribute('title', 'Pogoda: Odświeżanie...');
      
      // Sprawdź czy spinner jest widoczny
      const spinner = weatherIndicator.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display error status with correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} weatherStatus="error" />);
      
      const weatherIndicator = screen.getAllByTitle(/Pogoda:/)[0];
      expect(weatherIndicator).toHaveAttribute('title', 'Pogoda: Błąd pobierania danych');
      
      // Sprawdź czy spinner NIE jest widoczny dla error
      const spinner = weatherIndicator.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should display stale status with correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} weatherStatus="stale" />);
      
      const weatherIndicator = screen.getAllByTitle(/Pogoda:/)[0];
      expect(weatherIndicator).toHaveAttribute('title', 'Pogoda: Dane nieaktualne - odśwież');
      
      // Sprawdź czy spinner NIE jest widoczny dla stale
      const spinner = weatherIndicator.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should apply correct color classes for weather status', () => {
      const { container, rerender } = render(
        <EditorStatusIndicators {...defaultProps} weatherStatus="idle" />
      );
      
      // Sprawdź kolor dla idle
      const cloudIcons = container.querySelectorAll('svg');
      const cloudIcon = Array.from(cloudIcons).find((icon) => 
        icon.classList.contains('text-muted-foreground')
      );
      expect(cloudIcon).toBeDefined();

      // Sprawdź kolor dla loading
      rerender(<EditorStatusIndicators {...defaultProps} weatherStatus="loading" />);
      const cloudIconsLoading = container.querySelectorAll('svg');
      const cloudIconLoading = Array.from(cloudIconsLoading).find((icon) => 
        icon.classList.contains('text-blue-500')
      );
      expect(cloudIconLoading).toBeDefined();

      // Sprawdź kolor dla error
      rerender(<EditorStatusIndicators {...defaultProps} weatherStatus="error" />);
      const cloudIconsError = container.querySelectorAll('svg');
      const cloudIconError = Array.from(cloudIconsError).find((icon) => 
        icon.classList.contains('text-red-500')
      );
      expect(cloudIconError).toBeDefined();

      // Sprawdź kolor dla stale
      rerender(<EditorStatusIndicators {...defaultProps} weatherStatus="stale" />);
      const cloudIconsStale = container.querySelectorAll('svg');
      const cloudIconStale = Array.from(cloudIconsStale).find((icon) => 
        icon.classList.contains('text-yellow-500')
      );
      expect(cloudIconStale).toBeDefined();
    });
  });

  describe('Session Status Indicator', () => {
    it('should display active status with CheckCircle icon and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} sessionStatus="active" />);
      
      const sessionIndicator = screen.getAllByTitle(/Sesja:/)[0];
      expect(sessionIndicator).toHaveAttribute('title', 'Sesja: Aktywna');
      
      // Sprawdź czy CheckCircle jest renderowany
      const { container } = render(<EditorStatusIndicators {...defaultProps} sessionStatus="active" />);
      const checkCircle = container.querySelector('.text-green-500');
      expect(checkCircle).toBeInTheDocument();
    });

    it('should display expiring status with Activity icon and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} sessionStatus="expiring" />);
      
      const sessionIndicator = screen.getAllByTitle(/Sesja:/)[0];
      expect(sessionIndicator).toHaveAttribute('title', 'Sesja: Wygasa wkrótce');
      
      // Sprawdź czy Activity jest renderowany
      const { container } = render(<EditorStatusIndicators {...defaultProps} sessionStatus="expiring" />);
      const activity = container.querySelector('.text-yellow-500');
      expect(activity).toBeInTheDocument();
    });

    it('should display expired status with AlertCircle icon and correct tooltip', () => {
      render(<EditorStatusIndicators {...defaultProps} sessionStatus="expired" />);
      
      const sessionIndicator = screen.getAllByTitle(/Sesja:/)[0];
      expect(sessionIndicator).toHaveAttribute('title', 'Sesja: Wygasła - zaloguj się ponownie');
      
      // Sprawdź czy AlertCircle jest renderowany
      const { container } = render(<EditorStatusIndicators {...defaultProps} sessionStatus="expired" />);
      const alertCircle = container.querySelector('.text-red-500');
      expect(alertCircle).toBeInTheDocument();
    });

    it('should render correct icon for each session status', () => {
      const { container, rerender } = render(
        <EditorStatusIndicators {...defaultProps} sessionStatus="active" />
      );
      
      // Sprawdź CheckCircle dla active
      let icon = container.querySelector('.text-green-500');
      expect(icon).toBeInTheDocument();

      // Sprawdź Activity dla expiring
      rerender(<EditorStatusIndicators {...defaultProps} sessionStatus="expiring" />);
      icon = container.querySelector('.text-yellow-500');
      expect(icon).toBeInTheDocument();

      // Sprawdź AlertCircle dla expired
      rerender(<EditorStatusIndicators {...defaultProps} sessionStatus="expired" />);
      icon = container.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Combined Status Scenarios', () => {
    it('should handle all statuses in loading/active state', () => {
      render(
        <EditorStatusIndicators
          aiStatus="searching"
          weatherStatus="loading"
          sessionStatus="active"
        />
      );

      // Sprawdź czy wszystkie tooltips są poprawne
      expect(screen.getByTitle('AI: Wyszukiwanie roślin...')).toBeInTheDocument();
      expect(screen.getByTitle('Pogoda: Odświeżanie...')).toBeInTheDocument();
      expect(screen.getByTitle('Sesja: Aktywna')).toBeInTheDocument();
    });

    it('should handle all statuses in error/expired state', () => {
      render(
        <EditorStatusIndicators
          aiStatus="error"
          weatherStatus="error"
          sessionStatus="expired"
        />
      );

      // Sprawdź czy wszystkie tooltips są poprawne
      expect(screen.getByTitle('AI: Błąd - spróbuj ponownie')).toBeInTheDocument();
      expect(screen.getByTitle('Pogoda: Błąd pobierania danych')).toBeInTheDocument();
      expect(screen.getByTitle('Sesja: Wygasła - zaloguj się ponownie')).toBeInTheDocument();
    });

    it('should handle mixed statuses correctly', () => {
      render(
        <EditorStatusIndicators
          aiStatus="fitting"
          weatherStatus="stale"
          sessionStatus="expiring"
        />
      );

      // Sprawdź czy wszystkie tooltips są poprawne
      expect(screen.getByTitle('AI: Sprawdzanie dopasowania...')).toBeInTheDocument();
      expect(screen.getByTitle('Pogoda: Dane nieaktualne - odśwież')).toBeInTheDocument();
      expect(screen.getByTitle('Sesja: Wygasa wkrótce')).toBeInTheDocument();
    });
  });

  describe('Spinner Animation', () => {
    it('should show spinner only for AI searching status', () => {
      const { container } = render(
        <EditorStatusIndicators {...defaultProps} aiStatus="searching" />
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should show spinner only for AI fitting status', () => {
      const { container } = render(
        <EditorStatusIndicators {...defaultProps} aiStatus="fitting" />
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should show spinner only for weather loading status', () => {
      const { container } = render(
        <EditorStatusIndicators {...defaultProps} weatherStatus="loading" />
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should not show spinner for idle AI status', () => {
      const { container } = render(
        <EditorStatusIndicators {...defaultProps} aiStatus="idle" weatherStatus="idle" />
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners).toHaveLength(0);
    });

    it('should show multiple spinners when both AI and weather are loading', () => {
      const { container } = render(
        <EditorStatusIndicators
          aiStatus="searching"
          weatherStatus="loading"
          sessionStatus="active"
        />
      );
      
      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Layout and Styling', () => {
    it('should have correct flex layout classes', () => {
      const { container } = render(<EditorStatusIndicators {...defaultProps} />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('should have correct gap between indicators', () => {
      const { container } = render(<EditorStatusIndicators {...defaultProps} />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('gap-3');
    });

    it('should render icons with correct size classes', () => {
      const { container } = render(<EditorStatusIndicators {...defaultProps} />);
      
      const icons = container.querySelectorAll('svg.h-4.w-4');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render spinner with correct size classes', () => {
      const { container } = render(
        <EditorStatusIndicators {...defaultProps} aiStatus="searching" />
      );
      
      const spinner = container.querySelector('svg.h-3.w-3.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have title attributes for all indicators', () => {
      render(<EditorStatusIndicators {...defaultProps} />);
      
      const indicatorsWithTitle = screen.getAllByRole('generic').filter(
        (el) => el.getAttribute('title') !== null
      );
      expect(indicatorsWithTitle).toHaveLength(3);
    });

    it('should have descriptive tooltips for all statuses', () => {
      render(
        <EditorStatusIndicators
          aiStatus="searching"
          weatherStatus="loading"
          sessionStatus="expiring"
        />
      );
      
      // Sprawdź czy wszystkie tooltips są dostępne
      expect(screen.getByTitle('AI: Wyszukiwanie roślin...')).toBeInTheDocument();
      expect(screen.getByTitle('Pogoda: Odświeżanie...')).toBeInTheDocument();
      expect(screen.getByTitle('Sesja: Wygasa wkrótce')).toBeInTheDocument();
    });
  });
});


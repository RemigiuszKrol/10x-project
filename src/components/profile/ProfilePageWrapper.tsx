import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import ProfilePage from "./ProfilePage";

export interface ProfilePageWrapperProps {
  userId: string;
}

/**
 * Wrapper dla ProfilePage z providerami kontekstów
 * Używany w profile.astro dla client-side hydration
 *
 * ThemeProvider jest potrzebny tutaj, ponieważ komponenty React z client:only
 * w Astro nie dziedziczą kontekstu z layoutów. ThemeWrapper w layoutach
 * aplikuje klasę do <html> (działa globalnie dla CSS), a ThemeProvider tutaj
 * zapewnia dostęp do useTheme() hook dla komponentów React.
 */
export default function ProfilePageWrapper({ userId }: ProfilePageWrapperProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ProfilePage userId={userId} />
      </LanguageProvider>
    </ThemeProvider>
  );
}

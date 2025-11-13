import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import ProfilePage from "./ProfilePage";

export interface ProfilePageWrapperProps {
  userId: string;
}

/**
 * Wrapper dla ProfilePage z providerami kontekstów
 * Używany w profile.astro dla client-side hydration
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

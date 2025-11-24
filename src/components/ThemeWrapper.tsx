import { Fragment } from "react";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

/**
 * Globalny wrapper dla ThemeProvider
 * Używany w layoutach Astro do zapewnienia dostępu do motywu w całej aplikacji
 *
 * ThemeProvider aplikuje klasę 'light' lub 'dark' do elementu <html>,
 * więc działa globalnie nawet bez opakowywania children.
 * Komponenty React w slocie Astro mogą używać useTheme() hook,
 * ponieważ ThemeProvider jest w drzewie React.
 */
export default function ThemeWrapper() {
  return (
    <ThemeProvider>
      <Fragment />
    </ThemeProvider>
  );
}

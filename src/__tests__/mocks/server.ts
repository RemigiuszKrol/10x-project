import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Mock Service Worker server dla testów Node.js
 * Używany w testach jednostkowych do mockowania API requests
 */
export const server = setupServer(...handlers);

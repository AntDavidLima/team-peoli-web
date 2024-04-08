import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ThemeProvider } from "./components/theme-provider";

export interface APIError {
  error: Error | string;
  message: string;
  statusCode: number;
}

interface Error {
  name: string;
  details: Detail[];
}

interface Detail {
  code: string;
  expected: string;
  received: string;
  path: string[];
  message: string;
}

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

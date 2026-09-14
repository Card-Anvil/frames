import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { ColorModeProvider } from "./components/ui/color-mode.js";

const host = document.getElementById("root");
if (!host) {
  throw new Error("no #root element");
}

createRoot(host).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      {/* Dark by default: the studio sits next to frame art, and a bright
          surround changes how that art reads. The toggle is in the toolbar. */}
      <ColorModeProvider defaultTheme="dark">
        <App />
      </ColorModeProvider>
    </ChakraProvider>
  </StrictMode>,
);

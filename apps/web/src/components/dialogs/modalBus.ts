// src/lib/dialogs/modalBus.ts

import { useEffect } from "react";

export function closeAllModals() {
  window.dispatchEvent(new CustomEvent("app:close-modals"));
}

export function useCloseAllModals(onClose: () => void) {
  useEffect(() => {
    const fn = () => onClose();
    window.addEventListener("app:close-modals", fn);
    return () => window.removeEventListener("app:close-modals", fn);
  }, [onClose]);
}

import { useEffect, useRef } from "react";

/**
 * Mobile back-button support for modals.
 * Pushes a history entry when the modal opens so pressing "back"
 * closes the modal instead of navigating away from the page.
 */
export function useBackClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const stateId = `modal-${Date.now()}`;
    window.history.pushState({ stateId }, "");

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If closed via UI (X button / overlay), pop the history entry we pushed
      if (window.history.state?.stateId === stateId) {
        window.history.back();
      }
    };
  }, [isOpen]);
}

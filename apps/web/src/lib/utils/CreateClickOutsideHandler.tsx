type ClickOutsideHandlerProps = {
  dialogOpenRef: React.RefObject<boolean>;
  getSelectedIds: () => number[];
  clearSelection: () => void;
  selector: string;
  attr: string;
};

export function createClickOutsideHandler({
  dialogOpenRef,
  getSelectedIds,
  clearSelection,
  selector,
  attr,
}: ClickOutsideHandlerProps) {
  return function (e: MouseEvent) {
    if (dialogOpenRef.current) return;

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    const el = (e.target as HTMLElement).closest(selector);
    if (el) {
      const id = Number(el.getAttribute(attr));
      if (selectedIds.includes(id)) return;
    }

    clearSelection();
  };
}

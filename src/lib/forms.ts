/**
 * Form helpers shared by the client forms.
 */

/**
 * Moves keyboard focus to the first field the browser considers invalid.
 *
 * Called after a failed submit so a keyboard or screen-reader user is taken
 * straight to the problem instead of hunting for it (Design.md §9, §14).
 * Runs on the next frame because `aria-invalid` is only applied after React
 * re-renders with the new errors.
 */
export function focusFirstInvalidField(form: HTMLFormElement | null): void {
  if (!form) return;
  requestAnimationFrame(() => {
    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalid?.focus();
    invalid?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  });
}

/**
 * Copies the ids of invalid fields into a comma-separated string for an error
 * summary's `aria-describedby`, so the summary is announced with the count.
 */
export function invalidFieldIds(form: HTMLFormElement | null): string[] {
  if (!form) return [];
  return Array.from(form.querySelectorAll<HTMLElement>('[aria-invalid="true"]')).map(
    (element) => element.id
  );
}

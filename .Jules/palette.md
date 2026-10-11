## 2026-10-11 - Add htmlFor and id to form labels
**Learning:** In the customizer components, `<label>` elements were lacking `htmlFor` attributes connecting to their corresponding inputs/selects/textareas. Proper labelling is critical for a11y as it increases the hit area and enables screen readers to correctly announce the purpose of the input.
**Action:** Always ensure `<label>` elements are properly tied to form controls using `htmlFor` (pointing to the control's `id`), especially in heavily interactive components like customizers.

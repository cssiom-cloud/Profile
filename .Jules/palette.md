## 2026-10-11 - Add htmlFor and id to form labels
**Learning:** In the customizer components, `<label>` elements were lacking `htmlFor` attributes connecting to their corresponding inputs/selects/textareas. Proper labelling is critical for a11y as it increases the hit area and enables screen readers to correctly announce the purpose of the input.
**Action:** Always ensure `<label>` elements are properly tied to form controls using `htmlFor` (pointing to the control's `id`), especially in heavily interactive components like customizers.
## 2026-10-11 - Fix mobile Safari viewport height issue (100dvh)
**Learning:** The use of `min-h-screen` (which resolves to `100vh`) causes scroll jumping and hidden UI elements at the bottom on mobile browsers (like iOS Safari) because `100vh` includes the browser UI bars which retract dynamically on scroll.
**Action:** Use `min-h-[100dvh]` instead of `min-h-screen` for the root app container to ensure it correctly fills the dynamic viewport height without overflow or hidden bottom edges.

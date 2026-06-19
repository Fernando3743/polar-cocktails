// Static image import types (StaticImageData for `import img from "*.png"`).
//
// Next normally adds this reference to the auto-generated `next-env.d.ts`, but
// that file is gitignored and only gains the reference after `next dev`/`next build`
// has run. A fresh checkout or a CI step that runs `tsc --noEmit` before the build
// would otherwise fail with TS2307 on the Hero's `.png` imports. Referencing the
// same Next-provided declarations here (committed) makes them always available;
// it is idempotent with the copy in `next-env.d.ts`.
/// <reference types="next/image-types/global" />

# public/images/projects

Web-ready project assets used by the site.

## Naming rules

- Use one folder per project slug.
- Use `cover-photo.*` for the primary full-size still used in project cards and modal galleries.
- Use `cover.webp` for the optimized card thumbnail when present.
- Use `cover.svg` only for decorative vector covers or shells.
- Use `gallery-01.*`, `gallery-02.*`, ... for additional still images in display order.
- Use `demo-01.*`, `demo-02.*`, ... for videos in display order.
- Use `legacy/` for retired files that should stay out of active references.

## Management flow

1. Stage and sort originals in `raw_images/<project-slug>/`.
2. Keep the selected hero first:
   - `raw_images`: `cover.*`
   - `public/images/projects`: `cover-photo.*`
3. Copy the rest into `gallery-*` order.
4. Update `src/data/projects.ts` and `public/images/projects/asset-map.json` together.
5. Move replaced files into `legacy/` instead of mixing old and new names in the active folder.

## Beavar example

- `cover-photo.png`: Qualcomm PPT first page
- `gallery-01.png`: extensive application domain
- `gallery-02.jpeg`: presentation still
- `gallery-03.jpeg`: event photo

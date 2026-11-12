# Image sources

- `chhath.jpg`: https://www.bittiyapost.com/news/2025/10/27/19760
- `boudhanath.jpg`: https://nepaltraveller.com/sidetrack/7-little-known-facts-about-buddhist-prayer-flags
- `holi.jpg`: retained from the original site’s festival artwork, The Himalayan Times.
- `indra-jatra.jpg`: retained from the original site’s festival artwork, https://abovethehimalaya.com/wp-content/uploads/2019/09/indra-Jatra.jpg

The site’s About the calendar dialog also includes photo credits. Check the original publishers’ licensing terms before redistributing their photographs.

## Landscape artwork

The SVGs in `landscape/` are original vector illustrations created for Utsav. Seven artwork layers and two mobile variants depict an imagined north-facing Kathmandu Valley composition: a pale blue sky, white Himalayan faces with cool blue shadows, two green forest ridges, dense neighborhoods of grey concrete, brick, and painted houses, Newar-style pagodas with tiled roofs and timber struts, a white stupa with a gold spire, prayer flags, and foreground trees.

The editable source is `tools/render-landscape.mjs`. Run `npm run artwork:render` to regenerate the SVGs. A fixed seed preserves the building and forest details between renders. Each city row includes opaque terrain extending beneath its facades, so sky cannot show through below the buildings during parallax. No Firewatch artwork is used.

Visual reference for the landscape proportions and city density: [Kathmandu Post panorama](https://kathmandupost.com/visual-stories/2021/04/23/a-refreshing-view-of-majestic-mountains-from-kathmandu-on-friday). The scene is an illustration, not a mapped view or a depiction of a specific peak.

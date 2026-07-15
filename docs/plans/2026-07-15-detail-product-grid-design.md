# Detail Product Grid Design

## Goal

Refine the product section above comments on `pages/detail` to match the supplied store-product reference while keeping the page a non-purchasable frontend demo.

## Chosen Layout

- Show the four existing demo products in a two-column, two-row grid for video posts.
- Keep the grid between the existing "use same card" action and the statistics/comments section.
- Each card contains a large remote image, product title, short description, red demo price, and simulated sales count.
- Keep the current light green page background and white card styling. Do not copy the reference store header, follow/customer-service controls, product showcase button, or tabs.

## Data And Interaction

- Reuse `getRelatedProducts(productSeed, 4)` so the first product remains consistent with the video result and publish pages.
- Store the list as `demoProducts`; do not introduce new product data or local image assets.
- Every product card calls the existing `showDemoProduct` handler and only displays an informational Toast.
- Non-post detail pages keep their existing card and comment behavior and do not show the product grid.

## Testing

- Verify that detail loading selects four related products without breaking comments.
- Verify that the grid is rendered only for post details and is positioned before statistics/comments.
- Verify two-column layout, large images, title, description, price, and sales fields.
- Keep existing navigation, favorite-count, comment, Toast-only interaction, remote-image, and publish-payload tests passing.

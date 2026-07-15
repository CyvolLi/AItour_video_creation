# Video Product Overlay Bottom Alignment Design

## Goal

Move the demo product banner visibly closer to the bottom of the landscape video while reducing the amount of video content it covers.

## Layout

- Keep the banner inside `video-card` as a `cover-view` overlay.
- Lower its bottom offset from `104rpx` to approximately `72rpx`.
- Reduce its height from `72rpx` to approximately `64rpx` and increase the right inset so the strip stays short.
- Keep a translucent solid-white backing around 82% to 86% opacity, without gradients or shadows.
- Keep the image, title, price, and short CTA readable within the compact strip.

## Behavior And Boundaries

- Show the banner only while the video is playing; hide it on pause and ended.
- Keep native video controls enabled and leave a lower safe offset rather than attaching the banner directly to the video edge.
- Do not change product selection, Toast interaction, save, publish, or regenerate handlers.
- Do not add local images, purchase controls, navigation, or commerce APIs.

## Testing

- Require the overlay to remain inside `video-card` and retain play/pause/ended visibility behavior.
- Require a lower bottom offset than the previous `104rpx`, a smaller height, a short width, and a translucent solid-white background.
- Keep action-panel, Toast-only interaction, remote-image, and full regression tests passing.

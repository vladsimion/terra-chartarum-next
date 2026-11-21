---
title: Keyboard and accessibility
description: Using the Atlas without a mouse, without WebGL, or with reduced motion.
order: 5
draft: false
anchors: [keyboard, no-webgl, reduced-motion]
---

<h2 id="keyboard">Keyboard</h2>

The Atlas can be operated using a keyboard, without requiring a mouse or touchscreen. All interactive controls are standard buttons, links or form fields and can be reached using Tab. Use Enter or Space, where appropriate, to activate the focused control.

When the map has focus, the arrow keys pan the view, while the + and - keys zoom in and out. Press Tab to move focus from the map to the next available control.

The Atlas does not rely on overlays or modal dialogues that require Escape to dismiss. On narrow screens, the "Catalogue", "Active layers" and "Inspector" buttons open their respective panels.

<h2 id="no-webgl">Without WebGL</h2>

If your browser cannot render the interactive map using WebGL, the Atlas provides an alternative called "Layers as text".

This view presents every active layer as a table of its features, including their names, dates and provenance. The displayed features reflect the currently selected year, preserving the chronological context of the map in a text-based format.

When browsing a collection with its default layers active, an overview image appears before the feature tables. It uses the same line patterns and visual conventions as the interactive map, showing those default layers.

The catalogue remains accessible even when JavaScript is unavailable: the page still lists all available layers, although interactive mapping and other JavaScript-dependent features are not available.

<h2 id="reduced-motion">Reduced motion</h2>

The Atlas respects your system's reduced-motion preference. When reduced motion is enabled, map transitions happen immediately rather than being animated. Moving to a searched location or zooming to a layer therefore changes the view without a sliding or gliding transition.

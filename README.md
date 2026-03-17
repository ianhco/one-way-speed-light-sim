# Einstein's Synchrony Convention: The One-Way Speed of Light

An interactive, physics-based web simulation exploring the epistemological limits of measuring the one-way speed of light, built with HTML, CSS, and [P5.js](https://p5js.org/).

Simulator online at: [https://owslsim.ianhco.dev/](https://owslsim.ianhco.dev/)

## Overview

The core problem in modern physics is that we have never actually measured the speed of light in a single direction; we have only ever measured the "round-trip" speed ($c$). To measure light from A to B, we need two synchronized clocks. However, synchronizing them requires sending a signal, which assumes we already know the speed of that signal—creating a circular logic loop known as the **Einstein Synchrony Convention**.

Because of this, it is theoretically possible that light travels at different speeds depending on its direction (anisotropy) without violating any known laws of physics.

This digital experiment visualizes the "Relativity of Simultaneity." Users can manually adjust a "directional bias" slider for light speed, demonstrating that as the one-way speed changes, the clocks in the system must "de-sync" to maintain the observed round-trip constant. It effectively shows that the universe appears identical to an observer regardless of whether light is isotropic or anisotropic.

## Features

- **Omniscient Frame (Absolute State)**: Displays the absolute position of the light pulse and the precise clock offsets masking the one-way speed difference.
- **Empirical Frame (Observation Signals)**: Shows how signal lag and observational photons behave when collected by a hypothetical high-speed camera from a distance.
- **Reconstructed Frame (Measured State)**: Demonstrates the final, observed illusion where perfectly staggered delays cancel out the underlying anisotropy, generating a constant measured $1.0c$ each way.
- **Interactive Controls**: A directional bias slider allowing you to manipulate the underlying physics in real-time, observing how the mathematics adapt to the coordinate change without breaking.

## Running Locally

1. Clone this repository.
2. Serve the directory using a local web server to avoid CORS issues with scripts. For example, using Python 3:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

## Technologies Used

- pure HTML and vanilla CSS for layout and dark glassmorphism styling
- [P5.js](https://p5js.org/) for rendering the interactive canvas and canvas-embedded mathematical text
- [MathJax](https://www.mathjax.org/) for displaying LaTeX mathematical equations in the HTML UI

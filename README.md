# Interactive 3D Particle System

A real-time interactive 3D particle system built with **Three.js** and **MediaPipe** hand tracking. This project creates a stunning visual experience where particles react to your hand gestures, forming trails and dynamic text shapes.

## Features

- **Real-time Hand Tracking**: Uses MediaPipe to track hand movements and gestures via webcam.
- **Dynamic Particle Trails**: Particles follow your hand movement like a fluid cloud or trail.
- **Shape Morphing**: Pinch your fingers to morph particles into 3D text shapes (**Xurshidbek**, **SysMasters**, **KUAF**).
- **Interactive Physics**: Particles react to movement interactively.
- **3D Rotation**: Rotate the text shapes in 3D space by moving your hand while pinching.

## Tech Stack

- **Three.js**: For 3D rendering and particle management.
- **MediaPipe Tasks Vision**: For robust and fast hand tracking.
- **Vite**: For fast development and building.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/xurshidbekxasanboyev1990/3danimatsiya.git
   cd 3danimatsiya
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3030` (or the port shown in terminal).

## Usage

1. **Allow Camera Access**: The app needs webcam access to track your hand.
2. **Move Hand**: Move your hand in front of the camera to lead the particle cloud.
3. **Pinch Gesture** (Index finger + Thumb):
   - Pinch to transform particles into text.
   - Hold the pinch to keep the shape.
   - Move your hand while pinching to rotate the shape.
   - Release to disperse particles back to the cloud.

## License

MIT

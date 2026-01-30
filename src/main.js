import * as THREE from 'three';
import { HandTracker } from './HandTracker.js';
import { ParticleSystem } from './ParticleSystem.js';

async function main() {
    // 1. Setup Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 2. Setup Components
    const particleSystem = new ParticleSystem(scene);
    const handTracker = new HandTracker();

    // 3. Init Hand Tracker
    try {
        await handTracker.init();
        document.getElementById('loading').style.display = 'none';
        console.log("Hand tracking initialized");
    } catch (e) {
        console.error("Failed to init hand tracking", e);
        document.getElementById('loading').textContent = "Error loading tracking model. Check console.";
    }

    // 4. Animation Loop
    let lastTime = 0;
    // let shapes = ['sphere', 'heart', 'saturn', 'flower']; 
    // Manual control now

    particleSystem.setShape('trail'); // Start with trail mode

    let wasPinching = false;
    let shapeIndex = 0;
    const availableShapes = ['Xurshidbek', 'SysMasters', 'KUAF'];

    function animate(time) {
        requestAnimationFrame(animate);

        const delta = time - lastTime;
        lastTime = time;

        // Detect hand
        handTracker.detect(); 
        const gesture = handTracker.getGesture();

        // Logic: 
        // 1. If hand is moving (Open), particles follow as a trail/cloud.
        // 2. If pinching, particles form a shape AT the hand position.
        // 3. Detect "new pinch" to switch shape.
        
        const isPinching = gesture.type === 'pinch';
        
        if (isPinching && !wasPinching) {
            // New pinch detected - switch to next shape
            const shape = availableShapes[shapeIndex];
            particleSystem.setShape(shape);
            shapeIndex = (shapeIndex + 1) % availableShapes.length;
        } else if (!isPinching && wasPinching) {
            // Released pinch - go back to trail
            particleSystem.setShape('trail');
        }
        
        wasPinching = isPinching;        // Update particles
        particleSystem.update(gesture);

        renderer.render(scene, camera);
    } animate(0);
}

main();
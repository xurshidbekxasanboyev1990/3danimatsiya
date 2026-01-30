import * as THREE from 'three';
import { HandTracker } from './HandTracker.js';
import { ParticleSystem } from './ParticleSystem.js';

async function main() {
    // 1. Setup Three.js with performance optimizations
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false, // Performance: disable for better FPS
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.setClearColor(0x000000, 1);
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

    // FPS Counter
    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fps-display';
    fpsDisplay.innerHTML = 'FPS: --';
    document.body.appendChild(fpsDisplay);

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;

    // UI elementlarini yaratish
    const gestureDisplay = document.createElement('div');
    gestureDisplay.id = 'gesture-display';
    gestureDisplay.innerHTML = `
        <div class="gesture-info">
            <span class="gesture-icon">👋</span>
            <span class="gesture-name">Qo'lingizni ko'rsating</span>
        </div>
    `;
    document.body.appendChild(gestureDisplay);

    // Stil qo'shish
    const style = document.createElement('style');
    style.textContent = `
        #fps-display {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.6);
            color: #0f0;
            padding: 8px 15px;
            border-radius: 20px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            border: 1px solid rgba(0, 255, 0, 0.3);
        }
        #fps-display.warning { color: #ff0; border-color: rgba(255, 255, 0, 0.3); }
        #fps-display.critical { color: #f00; border-color: rgba(255, 0, 0, 0.3); }
        #gesture-display {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            padding: 15px 30px;
            border-radius: 50px;
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            z-index: 1000;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
        }
        #gesture-display:hover {
            transform: translateX(-50%) scale(1.05);
        }
        .gesture-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .gesture-icon {
            font-size: 28px;
            filter: drop-shadow(0 0 10px currentColor);
        }
        .gesture-name {
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 0.5px;
        }
        .shape-name {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 4px;
        }
        #instructions {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 320px;
        }
        #instructions h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #ff6b6b;
        }
        #instructions p {
            margin: 5px 0;
            font-size: 12px;
            line-height: 1.5;
        }
        #video-preview {
            border-radius: 10px;
            border: 2px solid rgba(255, 100, 100, 0.5);
            box-shadow: 0 0 20px rgba(255, 100, 100, 0.3);
        }
    `;
    document.head.appendChild(style);

    // Gesture icon va nomlarini mapping
    const gestureInfo = {
        'none': { icon: '👋', name: 'Qo\'lingizni ko\'rsating', shape: '' },
        'open': { icon: '🖐️', name: 'Ochiq qo\'l - Suyuqlik', shape: 'Trail' },
        'pinch': { icon: '🤏', name: 'Qisish - Matn shakli', shape: '' },
        'fist': { icon: '✊', name: 'Musht - Portlash', shape: 'Firework' },
        'peace': { icon: '✌️', name: 'Tinchlik - To\'lqin', shape: 'Peace' },
        'thumbs_up': { icon: '👍', name: 'Yaxshi - Yurak', shape: 'Heart' },
        'point': { icon: '👆', name: 'Ko\'rsatish - Yulduz', shape: 'Star' },
        'rock': { icon: '🤘', name: 'Rock - Galaktika', shape: 'Galaxy' },
        'three': { icon: '🤟', name: 'Uchta - Spiral', shape: 'Spiral' },
        'four': { icon: '🖖', name: 'To\'rtta - Kapalak', shape: 'Butterfly' },
        'unknown': { icon: '❓', name: 'Noma\'lum', shape: '' }
    };

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
    particleSystem.setShape('trail'); // Start with trail mode

    let previousGesture = 'none';
    let textShapeIndex = 0;
    const textShapes = ['Xurshidbek', 'SysMasters', 'KUAF'];
    let lastShapeChange = 0;
    const shapeChangeCooldown = 500; // ms

    function updateGestureUI(gesture) {
        const info = gestureInfo[gesture] || gestureInfo['unknown'];
        gestureDisplay.innerHTML = `
            <div class="gesture-info">
                <span class="gesture-icon">${info.icon}</span>
                <div>
                    <span class="gesture-name">${info.name}</span>
                    ${info.shape ? `<div class="shape-name">🎨 ${info.shape}</div>` : ''}
                </div>
            </div>
        `;

        // Rang effekti
        switch (gesture) {
            case 'pinch': gestureDisplay.style.borderColor = 'rgba(255, 0, 0, 0.5)'; break;
            case 'fist': gestureDisplay.style.borderColor = 'rgba(255, 85, 0, 0.5)'; break;
            case 'peace': gestureDisplay.style.borderColor = 'rgba(0, 255, 0, 0.5)'; break;
            case 'thumbs_up': gestureDisplay.style.borderColor = 'rgba(255, 0, 255, 0.5)'; break;
            case 'point': gestureDisplay.style.borderColor = 'rgba(255, 255, 0, 0.5)'; break;
            case 'rock': gestureDisplay.style.borderColor = 'rgba(148, 0, 211, 0.5)'; break;
            default: gestureDisplay.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    }

    function animate(time) {
        requestAnimationFrame(animate);

        // FPS calculation
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate >= 500) { // Update every 500ms
            currentFps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
            frameCount = 0;
            lastFpsUpdate = now;

            fpsDisplay.textContent = `FPS: ${currentFps}`;
            fpsDisplay.className = currentFps >= 50 ? '' : (currentFps >= 30 ? 'warning' : 'critical');
        }

        const delta = time - lastTime;
        lastTime = time;

        // Detect hand
        handTracker.detect();
        const gesture = handTracker.getGesture();
        const currentGesture = gesture.type;
        const nowMs = Date.now();

        // Gesture o'zgarganini tekshirish
        if (currentGesture !== previousGesture && nowMs - lastShapeChange > shapeChangeCooldown) {
            updateGestureUI(currentGesture);

            // Gestga qarab shakl o'zgartirish
            switch (currentGesture) {
                case 'pinch':
                    // Matn shakllari o'rtasida aylanish
                    const textShape = textShapes[textShapeIndex];
                    particleSystem.setShape(textShape);
                    gestureInfo['pinch'].shape = textShape;
                    updateGestureUI('pinch');
                    textShapeIndex = (textShapeIndex + 1) % textShapes.length;
                    break;

                case 'fist':
                    particleSystem.setShape('firework');
                    particleSystem.triggerExplosion();
                    break;

                case 'peace':
                    particleSystem.setShape('peace');
                    break;

                case 'thumbs_up':
                    particleSystem.setShape('heart');
                    break;

                case 'point':
                    particleSystem.setShape('star');
                    break;

                case 'rock':
                    particleSystem.setShape('galaxy');
                    break;

                case 'three':
                    particleSystem.setShape('spiral');
                    break;

                case 'four':
                    particleSystem.setShape('butterfly');
                    break;

                case 'open':
                    particleSystem.setShape('trail');
                    break;

                case 'none':
                    particleSystem.setShape('trail');
                    break;
            }

            previousGesture = currentGesture;
            lastShapeChange = nowMs;
        }

        // Update particles
        particleSystem.update(gesture);

        renderer.render(scene, camera);
    }

    animate(0);
}

main();
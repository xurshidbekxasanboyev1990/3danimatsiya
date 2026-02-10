import * as THREE from 'three';
import { HandTracker } from './HandTracker.js';
import { ParticleSystem } from './ParticleSystem.js';

async function main() {
    // === THREE.JS SETUP ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050510, 1);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // === COMPONENTS ===
    const particleSystem = new ParticleSystem(scene);
    const handTracker = new HandTracker();

    // === INPUT FIELD ===
    const inputField = document.getElementById('text-input');
    const inputHint = document.getElementById('input-hint');

    // Input field focus - klaviatura gestni buzmasin
    inputField.addEventListener('focus', () => {
        inputHint.textContent = '✌️ Peace belgisi ko\'rsating → matn paydo bo\'ladi!';
        inputHint.style.color = '#00ff88';
    });
    inputField.addEventListener('blur', () => {
        if (!inputField.value.trim()) {
            inputHint.textContent = 'Matn yozing va ✌️ ko\'rsating';
            inputHint.style.color = 'rgba(255,255,255,0.5)';
        }
    });
    inputField.addEventListener('input', () => {
        const text = inputField.value.trim();
        if (text) {
            particleSystem.setCustomText(text);
            inputHint.textContent = `"${text}" - ✌️ Peace ko'rsating!`;
            inputHint.style.color = '#ffdd00';
        }
    });

    // === STATUS ===
    const statusEl = document.getElementById('status-text');
    handTracker.onStatusChange = (state, msg) => {
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.className = 'status-' + state;
        }
    };

    // === FPS ===
    const fpsEl = document.getElementById('fps-counter');
    let frameCount = 0;
    let lastFpsTime = performance.now();

    // === GESTURE UI ===
    const gestureEl = document.getElementById('gesture-display');
    const gestureInfo = {
        'none': { icon: '👋', name: 'Qo\'lingizni ko\'rsating' },
        'open': { icon: '🖐️', name: 'Ochiq qo\'l → Suyuqlik', color: '#ffffff' },
        'pinch': { icon: '🤏', name: 'Qisish → Matn shapki', color: '#ff2244' },
        'fist': { icon: '✊', name: 'Musht → Portlash!', color: '#ff6600' },
        'peace': { icon: '✌️', name: 'Tinchlik → Matn / To\'lqin', color: '#22ff88' },
        'thumbs_up': { icon: '👍', name: 'Super → Yurak ❤️', color: '#ff44ff' },
        'point': { icon: '☝️', name: 'Ko\'rsatish → Yulduz ⭐', color: '#ffdd00' },
        'rock': { icon: '🤘', name: 'Rock → Galaktika 🌀', color: '#aa00ff' },
        'three': { icon: '🤟', name: 'Uchta → Spiral', color: '#00ddff' },
        'four': { icon: '🖖', name: 'To\'rtta → Kapalak 🦋', color: '#44ff44' },
        'unknown': { icon: '❓', name: 'Noma\'lum', color: '#888' }
    };

    function updateGestureUI(gesture) {
        const info = gestureInfo[gesture] || gestureInfo['unknown'];
        if (gestureEl) {
            gestureEl.innerHTML = `<span class="g-icon">${info.icon}</span><span class="g-name">${info.name}</span>`;
            gestureEl.style.borderColor = info.color || 'rgba(255,255,255,0.2)';
            gestureEl.style.boxShadow = `0 0 30px ${info.color || 'transparent'}33`;
        }
    }

    // === INIT HAND TRACKER ===
    try {
        await handTracker.init();
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
    } catch (e) {
        console.error("Hand tracking init failed", e);
    }

    // === ANIMATION LOOP ===
    let previousGesture = 'none';
    let textShapeIndex = 0;
    const textShapes = ['Xurshidbek', 'SysMasters', 'KUAF'];
    let lastShapeChange = 0;
    const shapeChangeCooldown = 600;
    let customTextShown = false;

    function animate() {
        requestAnimationFrame(animate);

        // FPS
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 500) {
            const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
            frameCount = 0;
            lastFpsTime = now;
            if (fpsEl) {
                fpsEl.textContent = fps;
                fpsEl.style.color = fps >= 50 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00';
            }
        }

        // Detect
        handTracker.detect();
        const gesture = handTracker.getGesture();
        const currentGesture = gesture.type;
        const nowMs = Date.now();

        // Gesture o'zgardi
        if (currentGesture !== previousGesture && nowMs - lastShapeChange > shapeChangeCooldown) {
            updateGestureUI(currentGesture);

            switch (currentGesture) {
                case 'peace': {
                    // ✌️ Peace = custom text input matnini ko'rsatish!
                    const inputText = inputField.value.trim();
                    if (inputText) {
                        particleSystem.setCustomText(inputText);
                        particleSystem.showCustomText();
                        customTextShown = true;
                        inputHint.textContent = `✨ "${inputText}" ko'rsatilmoqda!`;
                        inputHint.style.color = '#00ff88';
                    } else {
                        // Inputda matn yo'q - default peace shakli
                        particleSystem.setShape('peace');
                        customTextShown = false;
                    }
                    break;
                }
                case 'pinch': {
                    const textShape = textShapes[textShapeIndex];
                    particleSystem.setShape(textShape);
                    textShapeIndex = (textShapeIndex + 1) % textShapes.length;
                    customTextShown = false;
                    break;
                }
                case 'fist':
                    particleSystem.setShape('firework');
                    particleSystem.triggerExplosion();
                    customTextShown = false;
                    break;
                case 'thumbs_up':
                    particleSystem.setShape('heart');
                    customTextShown = false;
                    break;
                case 'point':
                    particleSystem.setShape('star');
                    customTextShown = false;
                    break;
                case 'rock':
                    particleSystem.setShape('galaxy');
                    customTextShown = false;
                    break;
                case 'three':
                    particleSystem.setShape('spiral');
                    customTextShown = false;
                    break;
                case 'four':
                    particleSystem.setShape('butterfly');
                    customTextShown = false;
                    break;
                case 'open':
                case 'none':
                    particleSystem.setShape('trail');
                    customTextShown = false;
                    break;
            }

            previousGesture = currentGesture;
            lastShapeChange = nowMs;
        }

        particleSystem.update(gesture);
        renderer.render(scene, camera);
    }

    animate();
}

main();
import * as THREE from 'three';
import { ColorPalettes, ShapeColorMap, ShapeGenerator } from './ShapeGenerator.js';

export class ParticleSystem {
    constructor(scene, count = 18000) { // Optimized: 18k particles for smooth 60fps
        this.scene = scene;
        this.count = count;
        this.particles = null;
        this.geometry = null;
        this.material = null;

        // Data storage - Float32Array is optimal for WebGL
        this.positions = new Float32Array(count * 3);
        this.colors = new Float32Array(count * 3);
        this.targetPositions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);
        this.sizes = new Float32Array(count);

        // Pre-computed constants for performance
        this.PI2 = Math.PI * 2;
        this.invCount = 1 / count;

        // State
        this.currentShape = 'trail';
        this.currentPalette = 'fire';
        this.lastTargetPos = { x: 0, y: 0, z: 0 };

        // Effects
        this.time = 0;
        this.explosionPhase = 0;
        this.isExploding = false;
        this.pulsePhase = 0;
        this.rainbowOffset = 0;

        // Text shapes cache
        this.textShapes = {
            'Xurshidbek': null,
            'SysMasters': null,
            'KUAF': null
        };
        this.currentTextIndex = 0;
        this.textList = ['Xurshidbek', 'SysMasters', 'KUAF'];

        this.init();
        this.setShape('trail');
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        // Optimized: 32x32 texture is enough for particles
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');

        // Optimized gradient with fewer stops
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.generateMipmaps = false; // Performance: disable mipmaps
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        const sprite = this.createTexture();

        this.material = new THREE.PointsMaterial({
            size: 0.22,
            vertexColors: true,
            map: sprite,
            alphaTest: 0.01,
            transparent: true,
            opacity: 0.85,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        // Guide mesh (qo'l ko'rsatkichi)
        const guideGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const guideMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        this.guideInfo = new THREE.Mesh(guideGeo, guideMat);
        this.scene.add(this.guideInfo);
        this.guideInfo.visible = false;

        // Ikkinchi qo'l uchun guide
        this.guideInfo2 = new THREE.Mesh(guideGeo.clone(), guideMat.clone());
        this.scene.add(this.guideInfo2);
        this.guideInfo2.visible = false;

        // Init velocities
        for (let i = 0; i < this.count * 3; i++) {
            this.velocities[i] = 0;
        }

        // Precompute text shapes
        for (const text of this.textList) {
            this.textShapes[text] = ShapeGenerator.text(text);
        }
    }

    // Keyingi matn shaklini olish
    getNextText() {
        const text = this.textList[this.currentTextIndex];
        this.currentTextIndex = (this.currentTextIndex + 1) % this.textList.length;
        return text;
    }

    triggerExplosion() {
        this.isExploding = true;
        this.explosionPhase = 0;
    }

    setShape(shape) {
        this.currentShape = shape;

        // Rang palitrasini tanlash
        let palette = ColorPalettes.fire;
        if (ShapeColorMap[shape]) {
            palette = ColorPalettes[ShapeColorMap[shape]];
        }
        this.currentPalette = palette;

        // Shakl nuqtalarini olish
        let shapePoints = null;

        // Text shapes uchun
        if (this.textShapes[shape]) {
            shapePoints = this.textShapes[shape];
        }

        for (let i = 0; i < this.count; i++) {
            let p;

            // Shakl generatori
            if (shapePoints && shapePoints.length > 0) {
                const target = shapePoints[i % shapePoints.length];
                p = {
                    x: target.x,
                    y: target.y,
                    z: target.z + (Math.random() - 0.5) * 1.5
                };
            } else {
                // ShapeGenerator dan olish
                switch (shape) {
                    case 'heart': p = ShapeGenerator.heart(); break;
                    case 'doubleheart': p = ShapeGenerator.doubleheart(); break;
                    case 'star': p = ShapeGenerator.star(); break;
                    case 'galaxy': p = ShapeGenerator.galaxy(); break;
                    case 'saturn': p = ShapeGenerator.saturn(); break;
                    case 'moon': p = ShapeGenerator.moon(); break;
                    case 'flower': p = ShapeGenerator.flower(); break;
                    case 'butterfly': p = ShapeGenerator.butterfly(); break;
                    case 'firework': p = ShapeGenerator.firework(); break;
                    case 'spiral': p = ShapeGenerator.spiral(); break;
                    case 'dna': p = ShapeGenerator.dna(); break;
                    case 'wave': p = ShapeGenerator.wave(); break;
                    case 'tornado': p = ShapeGenerator.tornado(); break;
                    case 'rain': p = ShapeGenerator.rain(); break;
                    case 'snow': p = ShapeGenerator.snow(); break;
                    case 'smiley': p = ShapeGenerator.smiley(); break;
                    case 'infinity': p = ShapeGenerator.infinity(); break;
                    case 'peace': p = ShapeGenerator.peace(); break;
                    case 'vortex': p = ShapeGenerator.vortex(); break;
                    case 'cube': p = ShapeGenerator.cube(); break;
                    case 'pyramid': p = ShapeGenerator.pyramid(); break;
                    case 'sphere': p = ShapeGenerator.sphere(); break;
                    case 'trail':
                    default:
                        p = ShapeGenerator.trail();
                        break;
                }
            }

            this.targetPositions[i * 3] = p.x;
            this.targetPositions[i * 3 + 1] = p.y;
            this.targetPositions[i * 3 + 2] = p.z;

            // Rang
            const color = palette[Math.floor(Math.random() * palette.length)];
            this.colors[i * 3] = color.r;
            this.colors[i * 3 + 1] = color.g;
            this.colors[i * 3 + 2] = color.b;
        }

        this.geometry.attributes.color.needsUpdate = true;
    }

    updateColors(palette, animate = false) {
        for (let i = 0; i < this.count; i++) {
            let color;

            if (animate) {
                // Rainbow effekt
                const hue = (this.rainbowOffset + i / this.count) % 1;
                color = new THREE.Color().setHSL(hue, 1, 0.5);
            } else {
                color = palette[Math.floor(Math.random() * palette.length)];
            }

            this.colors[i * 3] = color.r;
            this.colors[i * 3 + 1] = color.g;
            this.colors[i * 3 + 2] = color.b;
        }
        this.geometry.attributes.color.needsUpdate = true;
    }

    update(interactionData) {
        // Performance: use delta time for consistent animation
        // SLOWER: reduced time increments for smoother, slower animations
        this.time += 0.008;  // Was 0.016 - now 2x slower
        this.pulsePhase += 0.02;  // Was 0.05 - now 2.5x slower
        this.rainbowOffset += 0.001;  // Was 0.002 - now 2x slower

        // Cache array references
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const velocities = this.velocities;
        const targetPositions = this.targetPositions;
        const count = this.count;

        let targetX = this.lastTargetPos.x;
        let targetY = this.lastTargetPos.y;
        let targetZ = this.lastTargetPos.z;

        let handVx = 0, handVy = 0;
        let isHandPresent = false;
        let currentGesture = 'none';
        let handSize = 0.1;
        let handAngle = 0;
        let openFingers = 0;

        // Birinchi qo'l
        if (interactionData && interactionData.type !== 'none') {
            isHandPresent = true;
            targetX = (0.5 - interactionData.position.x) * 22;
            targetY = (0.5 - interactionData.position.y) * 16;
            targetZ = 0;

            currentGesture = interactionData.type;
            handSize = interactionData.handSize || 0.1;
            handAngle = interactionData.handAngle || 0;
            openFingers = interactionData.openFingers || 0;

            // Guide ko'rsatish
            this.guideInfo.visible = true;
            this.guideInfo.position.set(targetX, targetY, targetZ);

            // Gestga qarab guide rangi
            switch (currentGesture) {
                case 'pinch': this.guideInfo.material.color.set(0xff0000); break;
                case 'fist': this.guideInfo.material.color.set(0xff5500); break;
                case 'peace': this.guideInfo.material.color.set(0x00ff00); break;
                case 'thumbs_up': this.guideInfo.material.color.set(0xff00ff); break;
                case 'point': this.guideInfo.material.color.set(0xffff00); break;
                case 'rock': this.guideInfo.material.color.set(0x9400d3); break;
                default: this.guideInfo.material.color.set(0xffffff);
            }

            // Hajmni gestga qarab o'zgartirish
            const scale = 0.8 + openFingers * 0.15;
            this.guideInfo.scale.set(scale, scale, scale);

            this.lastTargetPos = { x: targetX, y: targetY, z: targetZ };

            if (interactionData.velocity) {
                // SLOWER: reduced velocity multiplier for smoother movement
                handVx = -interactionData.velocity.x * 25;  // Was 50
                handVy = -interactionData.velocity.y * 20;  // Was 40
            }

            // Ikkinchi qo'l
            if (interactionData.secondHand) {
                const sh = interactionData.secondHand;
                const sx = (0.5 - sh.position.x) * 22;
                const sy = (0.5 - sh.position.y) * 16;
                this.guideInfo2.visible = true;
                this.guideInfo2.position.set(sx, sy, 0);
            } else {
                this.guideInfo2.visible = false;
            }
        } else {
            this.guideInfo.visible = false;
            this.guideInfo2.visible = false;
        }

        // Portlash effekti - SLOWER
        if (this.isExploding) {
            this.explosionPhase += 0.012;  // Was 0.02
            if (this.explosionPhase > 1) {
                this.isExploding = false;
                this.explosionPhase = 0;
            }
        }

        // Dinamik qaytish tezligi - SLOWER for smoother transitions
        const speed = Math.sqrt(handVx * handVx + handVy * handVy);
        let dynamicReturn = isHandPresent ? 0.025 : 0.005;  // Was 0.04 : 0.008
        if (isHandPresent && speed > 2.0) {
            dynamicReturn = 0.005;  // Was 0.008
        }

        // Fist gestida kuchli tortilish
        if (currentGesture === 'fist') {
            dynamicReturn = 0.08;  // Was 0.12
        }

        // Pre-compute friction and rainbow mode - HIGHER friction = slower
        const friction = currentGesture === 'fist' ? 0.95 : 0.92;  // Was 0.92 : 0.88
        const isRainbowMode = currentGesture === 'rock' || currentGesture === 'peace';

        // Pre-compute values outside loop - SLOWER animation timing
        const sinTable = Math.sin(this.time * 0.25);  // Was 0.5
        const cosTable = Math.cos(this.time * 0.15);  // Was 0.3
        const sinTable2 = Math.sin(this.time * 0.1);  // Was 0.2
        const timeWave = this.time * 2.5;  // Was 5
        const invCount = this.invCount;

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const iy = ix + 1;
            const iz = ix + 2;

            let px = positions[ix];
            let py = positions[iy];
            let pz = positions[iz];

            let tx = targetPositions[ix];
            let ty = targetPositions[iy];
            let tz = targetPositions[iz];

            let targetBaseX = targetX;
            let targetBaseY = targetY;
            let targetBaseZ = targetZ;

            // Gestga qarab 3D transformatsiya
            if (isHandPresent && currentGesture !== 'open' && currentGesture !== 'none') {
                // Qo'l pozitsiyasiga qarab rotation
                const rotY = targetX * 0.12;
                const rotX = -targetY * 0.12;

                const cosY = Math.cos(rotY);
                const sinY = Math.sin(rotY);
                const cosX = Math.cos(rotX);
                const sinX = Math.sin(rotX);

                // Rotation Y
                let rtx = tx * cosY - tz * sinY;
                let rtz = tx * sinY + tz * cosY;
                let rty = ty;

                // Rotation X
                let rty2 = rty * cosX - rtz * sinX;
                let rtz2 = rty * sinX + rtz * cosX;

                tx = rtx;
                ty = rty2;
                tz = rtz2;
            }

            // Qo'l yo'qligida tarqalish - Optimized with pre-computed values
            if (!isHandPresent && this.currentShape === 'trail') {
                const iSeed = i * 12.9898;
                const iSeed2 = i * 78.233;
                const iSeed3 = i * 0.5;
                tx = Math.sin(iSeed) * sinTable * 30 + Math.cos(iSeed) * 15;
                ty = Math.cos(iSeed2) * cosTable * 20 + Math.sin(iSeed2) * 10;
                tz = Math.sin(iSeed3) * sinTable2 * 12;
                targetBaseX = 0;
                targetBaseY = 0;
                targetBaseZ = 0;
            }

            // Portlash effekti
            if (this.isExploding) {
                const angle = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                tx = 20 * this.explosionPhase * Math.sin(phi) * Math.cos(angle);
                ty = 20 * this.explosionPhase * Math.sin(phi) * Math.sin(angle);
                tz = 20 * this.explosionPhase * Math.cos(phi);
            }

            // Kuchlar
            let fx = (tx + targetBaseX - px) * dynamicReturn;
            let fy = (ty + targetBaseY - py) * dynamicReturn;
            let fz = (tz + targetBaseZ - pz) * dynamicReturn;

            // Qo'l interaksiyasi
            if (isHandPresent) {
                const dx = px - targetBaseX;
                const dy = py - targetBaseY;
                const dz = pz - targetBaseZ;
                const distSq = dx * dx + dy * dy + dz * dz;
                const dist = Math.sqrt(distSq);

                // Gestga qarab turli xil ta'sir
                switch (currentGesture) {
                    case 'fist':
                        // Kuchli tortilish markazga
                        if (dist > 0.5) {
                            const attract = 0.15;
                            fx -= dx * attract;
                            fy -= dy * attract;
                            fz -= dz * attract;
                        }
                        break;

                    case 'open':
                        // Ochiq qo'l - suyuqlik harakati
                        const radius = 15.0;
                        if (dist < radius) {
                            const influence = (1.0 - dist / radius);
                            fx += handVx * influence * 3.5;
                            fy += handVy * influence * 3.5;

                            // Yengil itarish
                            if (dist < 5.0) {
                                const repulse = (5.0 - dist) * 0.08;
                                fx += dx * repulse;
                                fy += dy * repulse;
                                fz += dz * repulse;
                            }
                        }
                        break;

                    case 'point':
                        // Laser effekti - bir yo'nalishda harakatlanish
                        const laserDir = { x: Math.cos(handAngle), y: Math.sin(handAngle) };
                        if (dist < 12) {
                            fx += laserDir.x * 0.3;
                            fy += laserDir.y * 0.3;
                        }
                        break;

                    case 'peace':
                        // Tinch to'lqin - yumshoq tarqalish (SLOWER)
                        if (dist < 10) {
                            const wave = Math.sin(dist * 1.5 - this.time * 2) * 0.08;  // Was dist*2-time*5, 0.1
                            fx += dx * wave;
                            fy += dy * wave;
                        }
                        break;

                    case 'rock':
                        // Spiral harakat - SLOWER
                        if (dist < 12) {
                            const spiralForce = 0.06;  // Was 0.1
                            fx += -dy * spiralForce;
                            fy += dx * spiralForce;
                        }
                        break;

                    case 'thumbs_up':
                        // Yuqoriga ko'tarish
                        if (dist < 15) {
                            fy += 0.15 * (1 - dist / 15);
                        }
                        break;
                }
            }

            // Tezlikni qo'llash - use cached reference
            velocities[ix] += fx;
            velocities[iy] += fy;
            velocities[iz] += fz;

            // Pozitsiyani yangilash
            positions[ix] += velocities[ix];
            positions[iy] += velocities[iy];
            positions[iz] += velocities[iz];

            // Ishqalanish - pre-computed outside loop would be ideal
            velocities[ix] *= friction;
            velocities[iy] *= friction;
            velocities[iz] *= friction;

            // Rang animatsiyasi (pulse effekt) - Optimized HSL conversion
            if (isRainbowMode) {
                const hue = (this.rainbowOffset + i * invCount) % 1;
                // Optimized HSL to RGB conversion (inline)
                const h6 = hue * 6;
                const hi = Math.floor(h6) % 6;
                const f = h6 - Math.floor(h6);
                const q = 1 - f;
                let r, g, b;
                switch (hi) {
                    case 0: r = 1; g = f; b = 0; break;
                    case 1: r = q; g = 1; b = 0; break;
                    case 2: r = 0; g = 1; b = f; break;
                    case 3: r = 0; g = q; b = 1; break;
                    case 4: r = f; g = 0; b = 1; break;
                    default: r = 1; g = 0; b = q;
                }
                colors[ix] = r;
                colors[iy] = g;
                colors[iz] = b;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;

        // Rainbow gestlari uchun rang yangilash
        if (currentGesture === 'rock' || currentGesture === 'peace') {
            this.geometry.attributes.color.needsUpdate = true;
        }
    }
}
import * as THREE from 'three';
import { ColorPalettes, ShapeColorMap, ShapeGenerator } from './ShapeGenerator.js';

export class ParticleSystem {
    constructor(scene, count = 20000) {
        this.scene = scene;
        this.count = count;
        this.particles = null;
        this.geometry = null;
        this.material = null;

        // Float32 arrays - GPU optimal
        this.positions = new Float32Array(count * 3);
        this.colors = new Float32Array(count * 3);
        this.alphas = new Float32Array(count);
        this.targetPositions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);
        this.particleLife = new Float32Array(count); // Har bir zarracha "hayoti"
        this.particleDelay = new Float32Array(count); // Shakl o'zgarishida delay

        // Pre-computed
        this.PI2 = Math.PI * 2;
        this.invCount = 1 / count;

        // State
        this.currentShape = 'trail';
        this.currentPalette = ColorPalettes.fire;
        this.lastTargetPos = { x: 0, y: 0, z: 0 };
        this.transitionProgress = 1.0; // 0 = transitioning, 1 = complete

        // Effects
        this.time = 0;
        this.explosionPhase = 0;
        this.isExploding = false;
        this.pulsePhase = 0;
        this.rainbowOffset = 0;
        this.breathe = 0; // Breathing animation for shapes
        this.sparkleTime = 0;

        // Text shapes cache
        this.textShapes = {};
        this.defaultTexts = ['Xurshidbek', 'SysMasters', 'KUAF'];
        this.currentTextIndex = 0;

        // Cached custom text
        this.customText = '';
        this.customTextPoints = null;

        this.init();
        this.setShape('trail');
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Yaxshi glow effekti
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
        gradient.addColorStop(0.1, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(0.35, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(0.55, 'rgba(255,255,255,0.15)');
        gradient.addColorStop(0.8, 'rgba(255,255,255,0.03)');
        gradient.addColorStop(1.0, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        const sprite = this.createTexture();

        this.material = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            map: sprite,
            alphaTest: 0.01,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        // Guide mesh - glowing sphere
        const guideGeo = new THREE.SphereGeometry(0.25, 32, 32);
        const guideMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });
        this.guideInfo = new THREE.Mesh(guideGeo, guideMat);
        this.scene.add(this.guideInfo);
        this.guideInfo.visible = false;

        // Guide ring (halo effekt)
        const ringGeo = new THREE.RingGeometry(0.4, 0.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.guideRing = new THREE.Mesh(ringGeo, ringMat);
        this.scene.add(this.guideRing);
        this.guideRing.visible = false;

        // Init particles with random delay
        for (let i = 0; i < this.count; i++) {
            this.velocities[i * 3] = 0;
            this.velocities[i * 3 + 1] = 0;
            this.velocities[i * 3 + 2] = 0;
            this.particleLife[i] = Math.random();
            this.particleDelay[i] = Math.random() * 0.5; // 0-0.5 soniya delay
        }

        // Precompute text shapes
        for (const text of this.defaultTexts) {
            this.textShapes[text] = ShapeGenerator.text(text);
        }
    }

    // Custom matn uchun nuqtalarni yaratish
    setCustomText(text) {
        if (!text || text.trim() === '') return;
        this.customText = text.trim();
        if (!this.textShapes[this.customText]) {
            this.textShapes[this.customText] = ShapeGenerator.text(this.customText);
        }
        this.customTextPoints = this.textShapes[this.customText];
    }

    getNextText() {
        const text = this.defaultTexts[this.currentTextIndex];
        this.currentTextIndex = (this.currentTextIndex + 1) % this.defaultTexts.length;
        return text;
    }

    triggerExplosion() {
        this.isExploding = true;
        this.explosionPhase = 0;
    }

    setShape(shape) {
        this.currentShape = shape;
        this.transitionProgress = 0;

        // Rang palitrasini tanlash
        let palette = ColorPalettes.fire;
        if (ShapeColorMap[shape]) {
            palette = ColorPalettes[ShapeColorMap[shape]];
        }
        this.currentPalette = palette;

        // Shakl nuqtalarini olish
        let shapePoints = null;
        if (this.textShapes[shape]) {
            shapePoints = this.textShapes[shape];
        }

        for (let i = 0; i < this.count; i++) {
            let p;

            if (shapePoints && shapePoints.length > 0) {
                const target = shapePoints[i % shapePoints.length];
                p = {
                    x: target.x,
                    y: target.y,
                    z: target.z + (Math.random() - 0.5) * 1.2
                };
            } else {
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

            // Delay - har bir zarracha turli vaqtda o'z joyiga boradi
            this.particleDelay[i] = Math.random() * 0.6;

            // Rang - gradient effekt
            const colorIdx = Math.floor(Math.random() * palette.length);
            const nextIdx = (colorIdx + 1) % palette.length;
            const t = Math.random();
            const color = palette[colorIdx].clone().lerp(palette[nextIdx], t);
            this.colors[i * 3] = color.r;
            this.colors[i * 3 + 1] = color.g;
            this.colors[i * 3 + 2] = color.b;
        }

        this.geometry.attributes.color.needsUpdate = true;
    }

    // Custom text shaklini ko'rsatish (2 barmoq = peace gesture bilan)
    showCustomText() {
        if (this.customTextPoints && this.customTextPoints.length > 0) {
            this.currentShape = '_customText';
            this.transitionProgress = 0;
            const palette = ColorPalettes.neon;
            this.currentPalette = palette;

            for (let i = 0; i < this.count; i++) {
                const target = this.customTextPoints[i % this.customTextPoints.length];
                this.targetPositions[i * 3] = target.x;
                this.targetPositions[i * 3 + 1] = target.y;
                this.targetPositions[i * 3 + 2] = target.z + (Math.random() - 0.5) * 0.3;

                this.particleDelay[i] = Math.random() * 0.4;

                const colorIdx = Math.floor(Math.random() * palette.length);
                const nextIdx = (colorIdx + 1) % palette.length;
                const t = Math.random();
                const color = palette[colorIdx].clone().lerp(palette[nextIdx], t);
                this.colors[i * 3] = color.r;
                this.colors[i * 3 + 1] = color.g;
                this.colors[i * 3 + 2] = color.b;
            }
            this.geometry.attributes.color.needsUpdate = true;
        }
    }

    update(interactionData) {
        const dt = 0.012;
        this.time += dt;
        this.pulsePhase += 0.025;
        this.rainbowOffset += 0.0008;
        this.breathe = Math.sin(this.time * 1.5) * 0.02;
        this.sparkleTime += 0.03;

        // Transition progress
        if (this.transitionProgress < 1.0) {
            this.transitionProgress = Math.min(1.0, this.transitionProgress + dt * 1.8);
        }

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

        if (interactionData && interactionData.type !== 'none') {
            isHandPresent = true;
            targetX = (0.5 - interactionData.position.x) * 24;
            targetY = (0.5 - interactionData.position.y) * 18;
            targetZ = 0;

            currentGesture = interactionData.type;
            handSize = interactionData.handSize || 0.1;
            handAngle = interactionData.handAngle || 0;
            openFingers = interactionData.openFingers || 0;

            // Guide sphere
            this.guideInfo.visible = true;
            this.guideInfo.position.set(targetX, targetY, 0.5);

            // Pulsing guide
            const pulseScale = 0.6 + Math.sin(this.time * 4) * 0.15 + openFingers * 0.1;
            this.guideInfo.scale.set(pulseScale, pulseScale, pulseScale);

            // Guide ring
            this.guideRing.visible = true;
            this.guideRing.position.set(targetX, targetY, 0.3);
            const ringScale = 1.5 + Math.sin(this.time * 3) * 0.3;
            this.guideRing.scale.set(ringScale, ringScale, ringScale);
            this.guideRing.rotation.z = this.time * 0.5;

            // Gestga qarab guide rangi
            const guideColors = {
                'pinch': 0xff2244, 'fist': 0xff6600, 'peace': 0x22ff88,
                'thumbs_up': 0xff44ff, 'point': 0xffdd00, 'rock': 0xaa00ff,
                'three': 0x00ddff, 'four': 0x44ff44, 'open': 0xffffff
            };
            const gc = guideColors[currentGesture] || 0xffffff;
            this.guideInfo.material.color.set(gc);
            this.guideRing.material.color.set(gc);
            this.guideInfo.material.opacity = 0.4 + Math.sin(this.time * 5) * 0.2;

            this.lastTargetPos = { x: targetX, y: targetY, z: targetZ };

            if (interactionData.velocity) {
                handVx = -interactionData.velocity.x * 30;
                handVy = -interactionData.velocity.y * 25;
            }
        } else {
            this.guideInfo.visible = false;
            this.guideRing.visible = false;
        }

        // Portlash
        if (this.isExploding) {
            this.explosionPhase += 0.015;
            if (this.explosionPhase > 1) {
                this.isExploding = false;
                this.explosionPhase = 0;
            }
        }

        // Return speed - gesture based
        const speed = Math.sqrt(handVx * handVx + handVy * handVy);
        let returnForce = isHandPresent ? 0.03 : 0.006;
        if (isHandPresent && speed > 1.5) returnForce = 0.008;
        if (currentGesture === 'fist') returnForce = 0.1;
        // Custom text uchun kuchli return force - matn aniq ko'rinishi kerak
        if (this.currentShape === '_customText') returnForce = 0.06;

        // Friction - gesture based
        let friction = currentGesture === 'fist' ? 0.94 : 0.91;
        // Custom text uchun yuqori friction - zarrachalar tez to'xtaydi
        if (this.currentShape === '_customText') friction = 0.85;
        const isRainbowMode = currentGesture === 'rock' || currentGesture === 'peace';

        // Pre-computed wave values
        const waveA = Math.sin(this.time * 0.3);
        const waveB = Math.cos(this.time * 0.2);
        const waveC = Math.sin(this.time * 0.15);
        const invCount = this.invCount;

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const iy = ix + 1;
            const iz = ix + 2;

            // Transition delay per particle
            const delay = this.particleDelay[i];
            const localProgress = Math.max(0, Math.min(1, (this.transitionProgress - delay) / (1 - delay)));
            const easeProgress = localProgress * localProgress * (3 - 2 * localProgress); // smoothstep

            let px = positions[ix];
            let py = positions[iy];
            let pz = positions[iz];

            let tx = targetPositions[ix];
            let ty = targetPositions[iy];
            let tz = targetPositions[iz];

            let targetBaseX = targetX;
            let targetBaseY = targetY;
            let targetBaseZ = targetZ;

            // Custom text uchun - ekran markazida ko'rsatish, qo'l pozitsiyasiga bog'lamaslik
            if (this.currentShape === '_customText') {
                targetBaseX = 0;
                targetBaseY = 0;
                targetBaseZ = 0;
            }

            // Breathing animation - shape-ga hayot berish (custom text uchun emas)
            if (this.currentShape !== 'trail' && this.currentShape !== '_customText' && isHandPresent) {
                tx *= (1 + this.breathe);
                ty *= (1 + this.breathe);
            }

            // 3D rotation based on gesture - custom text uchun O'CHIRISH (matn tekis bo'lishi kerak)
            if (isHandPresent && currentGesture !== 'open' && currentGesture !== 'none' && this.currentShape !== '_customText') {
                const rotY = targetX * 0.08;
                const rotX = -targetY * 0.08;

                const cosY = Math.cos(rotY);
                const sinY = Math.sin(rotY);
                const cosX = Math.cos(rotX);
                const sinX = Math.sin(rotX);

                const rtx = tx * cosY - tz * sinY;
                const rtz = tx * sinY + tz * cosY;
                const rty = ty * cosX - rtz * sinX;
                const rtz2 = ty * sinX + rtz * cosX;

                tx = rtx;
                ty = rty;
                tz = rtz2;
            }

            // Qo'l yo'q - ambient tarqalish
            if (!isHandPresent && this.currentShape === 'trail') {
                const seed1 = i * 12.9898;
                const seed2 = i * 78.233;
                const seed3 = i * 0.5;
                tx = Math.sin(seed1) * waveA * 25 + Math.cos(seed1) * 12;
                ty = Math.cos(seed2) * waveB * 18 + Math.sin(seed2) * 8;
                tz = Math.sin(seed3) * waveC * 10;
                targetBaseX = 0;
                targetBaseY = 0;
                targetBaseZ = 0;
            }

            // Portlash
            if (this.isExploding) {
                const angle = Math.random() * this.PI2;
                const phi = Math.acos(2 * Math.random() - 1);
                const ep = this.explosionPhase;
                tx = 18 * ep * Math.sin(phi) * Math.cos(angle);
                ty = 18 * ep * Math.sin(phi) * Math.sin(angle);
                tz = 18 * ep * Math.cos(phi);
            }

            // Effective return force with easeProgress
            const effectiveReturn = returnForce * (0.3 + easeProgress * 0.7);

            let fx = (tx + targetBaseX - px) * effectiveReturn;
            let fy = (ty + targetBaseY - py) * effectiveReturn;
            let fz = (tz + targetBaseZ - pz) * effectiveReturn;

            // Qo'l bilan interaksiya
            if (isHandPresent) {
                const dx = px - targetBaseX;
                const dy = py - targetBaseY;
                const dz = pz - targetBaseZ;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;

                switch (currentGesture) {
                    case 'fist': {
                        if (dist > 0.3) {
                            const attract = 0.12;
                            fx -= dx * attract;
                            fy -= dy * attract;
                            fz -= dz * attract;
                        }
                        break;
                    }
                    case 'open': {
                        const radius = 14.0;
                        if (dist < radius) {
                            const influence = 1.0 - dist / radius;
                            const infl2 = influence * influence; // Quadratic falloff
                            fx += handVx * infl2 * 4.0;
                            fy += handVy * infl2 * 4.0;

                            if (dist < 4.0) {
                                const repulse = (4.0 - dist) * 0.06;
                                fx += dx / dist * repulse;
                                fy += dy / dist * repulse;
                                fz += dz / dist * repulse;
                            }
                        }
                        break;
                    }
                    case 'point': {
                        if (dist < 12) {
                            const laserStr = 0.2 * (1 - dist / 12);
                            fx += Math.cos(handAngle) * laserStr;
                            fy += Math.sin(handAngle) * laserStr;
                        }
                        break;
                    }
                    case 'peace': {
                        // Custom text ko'rsatilayotganda wave effektini O'CHIRISH
                        if (this.currentShape !== '_customText' && dist < 10) {
                            const wave = Math.sin(dist * 1.2 - this.time * 2.5) * 0.06;
                            fx += dx / dist * wave;
                            fy += dy / dist * wave;
                        }
                        break;
                    }
                    case 'rock': {
                        if (dist < 12) {
                            const sf = 0.05 * (1 - dist / 12);
                            fx += -dy / dist * sf * dist;
                            fy += dx / dist * sf * dist;
                        }
                        break;
                    }
                    case 'thumbs_up': {
                        if (dist < 15) {
                            fy += 0.12 * (1 - dist / 15);
                            // Yonlarga yoyilish
                            const spread = 0.03 * (1 - dist / 15);
                            fx += (Math.random() - 0.5) * spread;
                        }
                        break;
                    }
                }
            }

            // Apply forces
            velocities[ix] += fx;
            velocities[iy] += fy;
            velocities[iz] += fz;

            positions[ix] += velocities[ix];
            positions[iy] += velocities[iy];
            positions[iz] += velocities[iz];

            velocities[ix] *= friction;
            velocities[iy] *= friction;
            velocities[iz] *= friction;

            // Rainbow rang
            if (isRainbowMode) {
                const hue = (this.rainbowOffset + i * invCount) % 1;
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

            // Sparkle effekt - tasodifiy zarrachalar yonib-o'chishi
            if (Math.random() < 0.002) {
                colors[ix] = 1;
                colors[iy] = 1;
                colors[iz] = 1;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        if (isRainbowMode || Math.random() < 0.05) {
            this.geometry.attributes.color.needsUpdate = true;
        }
    }
}
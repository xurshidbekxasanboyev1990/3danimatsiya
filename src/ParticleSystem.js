import * as THREE from 'three';
import { ShapeGenerator, ColorPalettes, GestureShapeMap, ShapeColorMap } from './ShapeGenerator.js';

export class ParticleSystem {
    constructor(scene, count = 25000) {
        this.scene = scene;
        this.count = count;
        this.particles = null;
        this.geometry = null;
        this.material = null;

        // Data storage
        this.positions = new Float32Array(count * 3);
        this.colors = new Float32Array(count * 3);
        this.targetPositions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);
        this.sizes = new Float32Array(count);

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
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Multi-layer glow
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.15, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
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
                switch(shape) {
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
        this.time += 0.016; // ~60fps
        this.pulsePhase += 0.05;
        this.rainbowOffset += 0.002;
        
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;

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
            switch(currentGesture) {
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
                handVx = -interactionData.velocity.x * 50;
                handVy = -interactionData.velocity.y * 40;
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

        // Portlash effekti
        if (this.isExploding) {
            this.explosionPhase += 0.02;
            if (this.explosionPhase > 1) {
                this.isExploding = false;
                this.explosionPhase = 0;
            }
        }

        // Dinamik qaytish tezligi
        const speed = Math.sqrt(handVx * handVx + handVy * handVy);
        let dynamicReturn = isHandPresent ? 0.04 : 0.008;
        if (isHandPresent && speed > 2.0) {
            dynamicReturn = 0.008;
        }

        // Fist gestida kuchli tortilish
        if (currentGesture === 'fist') {
            dynamicReturn = 0.12;
        }

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3;
            const iy = ix + 1;
            const iz = ix + 2;

            let px = positions[ix];
            let py = positions[iy];
            let pz = positions[iz];

            let tx = this.targetPositions[ix];
            let ty = this.targetPositions[iy];
            let tz = this.targetPositions[iz];

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

            // Qo'l yo'qligida tarqalish
            if (!isHandPresent && this.currentShape === 'trail') {
                tx = Math.sin(i * 12.9898 + this.time * 0.5) * 30;
                ty = Math.cos(i * 78.233 + this.time * 0.3) * 20;
                tz = Math.sin(i * 0.5 + this.time * 0.2) * 12;
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
                switch(currentGesture) {
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
                        // Tinch to'lqin - yumshoq tarqalish
                        if (dist < 10) {
                            const wave = Math.sin(dist * 2 - this.time * 5) * 0.1;
                            fx += dx * wave;
                            fy += dy * wave;
                        }
                        break;
                        
                    case 'rock':
                        // Spiral harakat
                        if (dist < 12) {
                            const spiralForce = 0.1;
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

            // Tezlikni qo'llash
            this.velocities[ix] += fx;
            this.velocities[iy] += fy;
            this.velocities[iz] += fz;

            // Pozitsiyani yangilash
            positions[ix] += this.velocities[ix];
            positions[iy] += this.velocities[iy];
            positions[iz] += this.velocities[iz];

            // Ishqalanish
            const friction = currentGesture === 'fist' ? 0.92 : 0.88;
            this.velocities[ix] *= friction;
            this.velocities[iy] *= friction;
            this.velocities[iz] *= friction;

            // Rang animatsiyasi (pulse effekt)
            if (currentGesture === 'rock' || currentGesture === 'peace') {
                const hue = (this.rainbowOffset + i / this.count) % 1;
                const color = new THREE.Color().setHSL(hue, 1, 0.5);
                colors[ix] = color.r;
                colors[iy] = color.g;
                colors[iz] = color.b;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        
        // Rainbow gestlari uchun rang yangilash
        if (currentGesture === 'rock' || currentGesture === 'peace') {
            this.geometry.attributes.color.needsUpdate = true;
        }
    }
}
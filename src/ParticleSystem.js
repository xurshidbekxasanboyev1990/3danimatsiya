import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, count = 20000) {
        this.scene = scene;
        this.count = count;
        this.particles = null;
        this.geometry = null;
        this.material = null;

        // Data storage
        this.positions = new Float32Array(count * 3);
        this.colors = new Float32Array(count * 3);
        this.targetPositions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3); // x, y, z

        this.currentShape = 'sphere';
        this.colorPalette = [new THREE.Color(0xff0000), new THREE.Color(0x00ff00), new THREE.Color(0x0000ff)];

        this.mouseInteraction = new THREE.Vector3(0, 0, 0);
        this.isInteracting = false;

        this.init();
        this.setShape('sphere');
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
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
            size: 0.2, // Smaller particles
            vertexColors: true,
            map: sprite,
            alphaTest: 0.01,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);

        // Guide light for hand
        const guideGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const guideMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        this.guideInfo = new THREE.Mesh(guideGeo, guideMat);
        this.scene.add(this.guideInfo);
        this.guideInfo.visible = false;

        // Init velocities
        for (let i = 0; i < this.count * 3; i++) {
            this.velocities[i] = 0;
        }
    }

    // --- Shape Generators ---

    getPointInSphere() {
        // More spread out sphere
        const r = 6 * Math.cbrt(Math.random()); 
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }
    
    getPointInTrail() {
        // Much larger, softer cloud for trail
        const r = 5.0 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
         const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    generateTextPositions(text) {
        // Create canvas offscreen
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 400; // Increased resolution
        const height = 100; 
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = 'white';
        // Much larger font size
        const fontSize = text.length > 5 ? 60 : 80; 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width/2, height/2);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const points = [];
        
        // Scan for white pixels with skip to reduce density/grid effect
        const step = 2; 
        for(let y = 0; y < height; y += step) {
            for(let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                if(data[i] > 128) {
                    points.push({
                        x: (x - width/2) * 0.15, // Spread out scale
                        y: -(y - height/2) * 0.15, 
                        z: 0
                    });
                }
            }
        }
        return points;
    }

    // --- Control ---

    setShape(shape) {
        this.currentShape = shape;
        let color1, color2;
        let textPoints = null;

        // Reddish theme for all
        if (shape === 'trail') {
             color1 = new THREE.Color(0xff3300); // Red-Orange
             color2 = new THREE.Color(0xffaaaa); // Light Red/Pink
        } else {
             // Assume text
             textPoints = this.generateTextPositions(shape);
             if (shape.includes('Xurshidbek')) {
                 color1 = new THREE.Color(0xff0000); // Pure Red
                 color2 = new THREE.Color(0xff5500); // Orange Red
             } else if (shape.includes('SysMasters')) {
                 color1 = new THREE.Color(0xff0044); // Pinkish Red
                 color2 = new THREE.Color(0xaa0000); // Dark Red
             } else if (shape.includes('KUAF')) {
                 color1 = new THREE.Color(0xffaa00); // Gold/Orange
                 color2 = new THREE.Color(0xffffff); // White
             } else {
                 color1 = new THREE.Color(0xff1111);
                 color2 = new THREE.Color(0xff8888);
             }
        }

        for (let i = 0; i < this.count; i++) {
            let p;
            
            if (shape === 'trail') {
                p = this.getPointInTrail();
            } else if (textPoints && textPoints.length > 0) {
                 // Map particle to a text point
                 // Reuse points if particles > points
                 const target = textPoints[i % textPoints.length];
                 // Add some scatter to z so it's not perfectly flat
                 p = {
                     x: target.x,
                     y: target.y,
                     z: (Math.random() - 0.5) * 1.0 
                 };
            } else {
                p = this.getPointInSphere();
            }

            this.targetPositions[i * 3] = p.x;
            this.targetPositions[i * 3 + 1] = p.y;
            this.targetPositions[i * 3 + 2] = p.z;

            // Interpolate colors mainly, or random mix
            const c = Math.random() > 0.5 ? color1 : color2;
            this.colors[i * 3] = c.r;
            this.colors[i * 3 + 1] = c.g;
            this.colors[i * 3 + 2] = c.b;
        }

        this.geometry.attributes.color.needsUpdate = true;
    }

    update(interactionData) {
        const positions = this.geometry.attributes.position.array;
        
        // Initialize lastTargetPos if not exists
        if (!this.lastTargetPos) this.lastTargetPos = {x: 0, y: 0, z: 0};

        let targetX = this.lastTargetPos.x; 
        let targetY = this.lastTargetPos.y; 
        let targetZ = this.lastTargetPos.z;

        let handVx = 0, handVy = 0;
        let isHandPresent = false;
        let isAttracting = false;

        if (interactionData && interactionData.type !== 'none') {
            isHandPresent = true;
            targetX = (0.5 - interactionData.position.x) * 20; 
            targetY = (0.5 - interactionData.position.y) * 15; 
            targetZ = 0;
            
            // Show guide
            this.guideInfo.visible = true;
            this.guideInfo.position.set(targetX, targetY, targetZ);
            
            // Update last known position
            this.lastTargetPos = {x: targetX, y: targetY, z: targetZ};

            if (interactionData.type === 'pinch') {
                isAttracting = true;
                this.guideInfo.scale.set(1.5, 1.5, 1.5); // Pulse when pinching
                this.guideInfo.material.color.set(0xff0000);
            } else {
                this.guideInfo.scale.set(1, 1, 1);
                this.guideInfo.material.color.set(0xffffff);
            }
            
            if (interactionData.velocity) {
                // Increase velocity influence heavily to make particles "fly" with hand
                handVx = -interactionData.velocity.x * 40; 
                handVy = -interactionData.velocity.y * 30; 
            }
        } else {
            this.guideInfo.visible = false;
        }
        
        // Return speed: If hand is moving fast, reduce return speed to let them trail behind
        // If hand is still, return speed can be normal
        const speed = Math.sqrt(handVx*handVx + handVy*handVy);
        let dynamicReturn = isHandPresent ? 0.03 : 0.005;
        if (isHandPresent && speed > 1.0) {
            dynamicReturn = 0.005; // Very loose when moving fast
        }
        
        for(let i = 0; i < this.count; i++) {
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
            
            // Add some noise to target base for "Trail" mode so it's not a single point
            if (this.currentShape === 'trail' && isHandPresent) {
                 // No change to targetBase, but tx/ty/tz are from getPointInTrail which is a cloud.
            }

            // 3D Rotation based on hand position relative to center when pinching
            // This allows seeing "other sides" of the animation
            if (isAttracting) {
                 // Calculate rotation angles
                 // Map targetX (-10..10) to rotation
                 const rotY = targetX * 0.15; // Rotate around Y based on X position
                 const rotX = -targetY * 0.15; // Rotate around X based on Y position

                 const cosY = Math.cos(rotY);
                 const sinY = Math.sin(rotY);
                 const cosX = Math.cos(rotX);
                 const sinX = Math.sin(rotX);

                 // Apply Rotation Y
                 let rtx = tx * cosY - tz * sinY;
                 let rtz = tx * sinY + tz * cosY;
                 let rty = ty;

                 // Apply Rotation X
                 let rty2 = rty * cosX - rtz * sinX;
                 let rtz2 = rty * sinX + rtz * cosX;
                 
                 tx = rtx;
                 ty = rty2;
                 tz = rtz2;
            }

            // SPECIAL HANDLING: If no hand and in 'trail' mode, 
            // override targets to disperse them into a large ambient field
            // so they don't clump in the middle or at the last hand position.
            if (!isHandPresent && this.currentShape === 'trail') {
                // Generate a pseudo-random large target based on index
                // We use sine waves to make it deterministic but "scattered"
                tx = Math.sin(i * 12.9898) * 35; // Increased spread
                ty = Math.cos(i * 78.233) * 25;
                tz = Math.sin(i * 0.5) * 15;
                targetBaseX = 0; // Center the dispersion field on screen
                targetBaseY = 0;
                targetBaseZ = 0;
            }

            let fx = (tx + targetBaseX - px) * dynamicReturn;
            let fy = (ty + targetBaseY - py) * dynamicReturn;
            let fz = (tz + targetBaseZ - pz) * dynamicReturn;

            // 2. Interaction
            if (isHandPresent) {
                const dx = px - targetBaseX;
                const dy = py - targetBaseY;
                const dz = pz - targetBaseZ;
                const distSq = dx*dx + dy*dy + dz*dz;
                const dist = Math.sqrt(distSq);
                
                if (isAttracting) {
                     // Strong pinch attraction if needed, but shape handles most of it
                } else {
                    // Open Hand: Fluid Interaction
                    const radius = 12.0; // Even Larger influence radius
                    if (dist < radius) {
                        const influence = (1.0 - dist / radius);
                        
                        // Drag with hand movement - Stronger
                        fx += handVx * influence * 3.0; 
                        fy += handVy * influence * 3.0;
                        
                        // Mild repulsion to give volume to hand
                        if (dist < 4.0) {
                            const repulse = (4.0 - dist) * 0.1; // Stronger repulsion near center to prevent clumping
                            fx += dx * repulse;
                            fy += dy * repulse;
                            fz += dz * repulse;
                        }
                    }
                }
            }
            
             // Apply force to velocity
            this.velocities[ix] += fx;
            this.velocities[iy] += fy;
            this.velocities[iz] += fz;
            
            // Apply velocity to position
            positions[ix] += this.velocities[ix];
            positions[iy] += this.velocities[iy];
            positions[iz] += this.velocities[iz];
            
            // Increased Friction / Damping for slower movement
            this.velocities[ix] *= 0.85;
            this.velocities[iy] *= 0.85;
            this.velocities[iz] *= 0.85;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
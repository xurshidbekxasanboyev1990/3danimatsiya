import * as THREE from 'three';

/**
 * ShapeGenerator - Turli xil 3D shakllar va effektlar yaratish
 */
export class ShapeGenerator {
    
    // ============== ASOSIY SHAKLLAR ==============
    
    static sphere(radius = 5) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    static trail(radius = 5) {
        const r = radius * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        };
    }

    // ============== ROMANTIK SHAKLLAR ==============

    static heart(scale = 0.4) {
        const t = Math.random() * 2 * Math.PI;
        const x = scale * 16 * Math.pow(Math.sin(t), 3);
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const z = (Math.random() - 0.5) * 6;
        return { x, y, z };
    }

    static doubleheart(scale = 0.35) {
        // Ikki yurak yonma-yon
        const t = Math.random() * 2 * Math.PI;
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = scale * 16 * Math.pow(Math.sin(t), 3) + side * 8;
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const z = (Math.random() - 0.5) * 4;
        return { x, y, z };
    }

    // ============== KOSMIK SHAKLLAR ==============

    static star(points = 5, innerRadius = 3, outerRadius = 8) {
        const angle = Math.random() * 2 * Math.PI;
        const pointIndex = Math.floor(Math.random() * points * 2);
        const isOuter = pointIndex % 2 === 0;
        const radius = isOuter ? outerRadius : innerRadius;
        const baseAngle = (pointIndex / (points * 2)) * 2 * Math.PI;
        
        // Interpolate along star edge
        const nextIndex = (pointIndex + 1) % (points * 2);
        const nextOuter = nextIndex % 2 === 0;
        const nextRadius = nextOuter ? outerRadius : innerRadius;
        const nextAngle = (nextIndex / (points * 2)) * 2 * Math.PI;
        
        const t = Math.random();
        const r = radius + t * (nextRadius - radius);
        const a = baseAngle + t * (nextAngle - baseAngle);
        
        return {
            x: r * Math.cos(a),
            y: r * Math.sin(a),
            z: (Math.random() - 0.5) * 3
        };
    }

    static galaxy(arms = 4, spread = 12) {
        const arm = Math.floor(Math.random() * arms);
        const armAngle = (arm / arms) * 2 * Math.PI;
        
        const distance = Math.random() * spread;
        const spiralFactor = distance * 0.5;
        const angle = armAngle + spiralFactor + (Math.random() - 0.5) * 0.5;
        
        const x = distance * Math.cos(angle);
        const y = distance * Math.sin(angle);
        const z = (Math.random() - 0.5) * (1 + distance * 0.1);
        
        return { x, y, z };
    }

    static saturn() {
        const isRing = Math.random() > 0.5;
        if (isRing) {
            const innerR = 7;
            const outerR = 12;
            const r = innerR + Math.random() * (outerR - innerR);
            const theta = Math.random() * 2 * Math.PI;
            // Tilted ring
            const tilt = 0.3;
            return {
                x: r * Math.cos(theta),
                y: r * Math.sin(theta) * Math.sin(tilt),
                z: r * Math.sin(theta) * Math.cos(tilt)
            };
        } else {
            return this.sphere(4);
        }
    }

    static moon() {
        // Yarim oy shakli
        const theta = (Math.random() - 0.5) * Math.PI;
        const phi = Math.random() * 2 * Math.PI;
        const r = 5;
        
        let x = r * Math.cos(theta) * Math.cos(phi);
        const y = r * Math.sin(theta);
        const z = r * Math.cos(theta) * Math.sin(phi);
        
        // Faqat bir tomonini olish
        if (x < 2) x = x + 4;
        
        return { x: x - 5, y, z };
    }

    // ============== TABIAT SHAKLLARI ==============

    static flower(petals = 6, size = 8) {
        const theta = Math.random() * 2 * Math.PI;
        const r = size * Math.cos(petals * theta) * Math.random();
        return {
            x: r * Math.cos(theta),
            y: r * Math.sin(theta),
            z: (Math.random() - 0.5) * 3
        };
    }

    static tree() {
        const isTrunk = Math.random() > 0.7;
        if (isTrunk) {
            // Tana
            return {
                x: (Math.random() - 0.5) * 2,
                y: -5 + Math.random() * 4,
                z: (Math.random() - 0.5) * 2
            };
        } else {
            // Barg (konus shakli)
            const height = Math.random() * 8;
            const radius = (8 - height) * 0.5;
            const angle = Math.random() * 2 * Math.PI;
            return {
                x: radius * Math.cos(angle),
                y: height - 2,
                z: radius * Math.sin(angle)
            };
        }
    }

    static butterfly(wingSpan = 10) {
        const t = Math.random() * 2 * Math.PI;
        const side = Math.random() > 0.5 ? 1 : -1;
        
        // Butterfly curve: r = e^sin(t) - 2cos(4t) + sin^5((2t-π)/24)
        const r = Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2*t - Math.PI)/24), 5);
        const scale = wingSpan / 5;
        
        return {
            x: scale * r * Math.cos(t) * side,
            y: scale * r * Math.sin(t),
            z: (Math.random() - 0.5) * 2
        };
    }

    // ============== EFFEKT SHAKLLARI ==============

    static firework(centerX = 0, centerY = 0, radius = 10) {
        // Portlash effekti - markazdan tashqariga
        const angle = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.random();
        
        return {
            x: centerX + r * Math.sin(phi) * Math.cos(angle),
            y: centerY + r * Math.sin(phi) * Math.sin(angle),
            z: r * Math.cos(phi)
        };
    }

    static spiral(turns = 3, height = 15, radius = 6) {
        const t = Math.random();
        const angle = t * turns * 2 * Math.PI;
        const y = (t - 0.5) * height;
        const r = radius * (1 - t * 0.3); // Tepaga qarab torayadi
        
        return {
            x: r * Math.cos(angle),
            y: y,
            z: r * Math.sin(angle)
        };
    }

    static dna(turns = 4, height = 15, radius = 4) {
        const t = Math.random();
        const angle = t * turns * 2 * Math.PI;
        const y = (t - 0.5) * height;
        const strand = Math.random() > 0.5 ? 0 : Math.PI;
        
        return {
            x: radius * Math.cos(angle + strand),
            y: y,
            z: radius * Math.sin(angle + strand)
        };
    }

    static wave(wavelength = 3, amplitude = 4, width = 20) {
        const x = (Math.random() - 0.5) * width;
        const z = (Math.random() - 0.5) * 10;
        const y = amplitude * Math.sin(x / wavelength * Math.PI);
        
        return { x, y, z };
    }

    static tornado(height = 15, baseRadius = 8) {
        const t = Math.random();
        const y = (t - 0.5) * height;
        const radius = baseRadius * (1 - t * 0.8);
        const angle = t * 6 * Math.PI + Math.random() * 0.5;
        
        return {
            x: radius * Math.cos(angle),
            y: y,
            z: radius * Math.sin(angle)
        };
    }

    static rain(width = 25, height = 20, depth = 10) {
        return {
            x: (Math.random() - 0.5) * width,
            y: (Math.random() - 0.5) * height,
            z: (Math.random() - 0.5) * depth
        };
    }

    static snow(width = 25, height = 15, depth = 10) {
        // Qor uchun bir xil
        return this.rain(width, height, depth);
    }

    // ============== HARFLAR VA RAQAMLAR ==============

    static text(text, fontSize = 80) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 500;
        const height = 150;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'white';
        const size = text.length > 8 ? 50 : (text.length > 5 ? 65 : fontSize);
        ctx.font = `bold ${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const points = [];

        const step = 2;
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                if (data[i] > 128) {
                    points.push({
                        x: (x - width / 2) * 0.12,
                        y: -(y - height / 2) * 0.12,
                        z: 0
                    });
                }
            }
        }
        return points;
    }

    // ============== EMOJI VA MAXSUS ==============

    static smiley(radius = 8) {
        const r = Math.random();
        
        if (r < 0.7) {
            // Yuz doirasi
            const angle = Math.random() * 2 * Math.PI;
            const dist = radius * 0.9 + Math.random() * radius * 0.2;
            return {
                x: dist * Math.cos(angle),
                y: dist * Math.sin(angle),
                z: (Math.random() - 0.5) * 2
            };
        } else if (r < 0.8) {
            // Chap ko'z
            return {
                x: -radius * 0.35 + (Math.random() - 0.5) * radius * 0.15,
                y: radius * 0.25 + (Math.random() - 0.5) * radius * 0.15,
                z: (Math.random() - 0.5) * 1
            };
        } else if (r < 0.9) {
            // O'ng ko'z
            return {
                x: radius * 0.35 + (Math.random() - 0.5) * radius * 0.15,
                y: radius * 0.25 + (Math.random() - 0.5) * radius * 0.15,
                z: (Math.random() - 0.5) * 1
            };
        } else {
            // Tabassum (yarim doira)
            const angle = Math.PI + Math.random() * Math.PI;
            return {
                x: radius * 0.5 * Math.cos(angle),
                y: radius * 0.5 * Math.sin(angle) - radius * 0.1,
                z: (Math.random() - 0.5) * 1
            };
        }
    }

    static infinity(scale = 6) {
        const t = Math.random() * 2 * Math.PI;
        const x = scale * Math.cos(t) / (1 + Math.pow(Math.sin(t), 2));
        const y = scale * Math.sin(t) * Math.cos(t) / (1 + Math.pow(Math.sin(t), 2));
        return {
            x: x,
            y: y,
            z: (Math.random() - 0.5) * 2
        };
    }

    static peace(radius = 8) {
        const r = Math.random();
        const angle = Math.random() * 2 * Math.PI;
        
        if (r < 0.6) {
            // Tashqi doira
            return {
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle),
                z: (Math.random() - 0.5) * 2
            };
        } else if (r < 0.75) {
            // Vertikal chiziq
            return {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * radius * 2,
                z: (Math.random() - 0.5) * 1
            };
        } else {
            // Diagonal chiziqlar
            const side = Math.random() > 0.5 ? 1 : -1;
            const t = Math.random();
            return {
                x: side * t * radius * 0.7,
                y: -t * radius,
                z: (Math.random() - 0.5) * 1
            };
        }
    }

    // ============== YANGI EFFEKTLAR ==============

    static vortex(radius = 10, depth = 8) {
        const angle = Math.random() * 4 * Math.PI;
        const t = Math.random();
        const r = radius * t;
        
        return {
            x: r * Math.cos(angle),
            y: r * Math.sin(angle),
            z: -depth * t * t // Vortex depth
        };
    }

    static explosion(phase = 0) {
        // Phase: 0-1 portlash bosqichi
        const angle = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 15 * phase * Math.random();
        
        return {
            x: r * Math.sin(phi) * Math.cos(angle),
            y: r * Math.sin(phi) * Math.sin(angle),
            z: r * Math.cos(phi)
        };
    }

    static cube(size = 8) {
        const face = Math.floor(Math.random() * 6);
        const half = size / 2;
        let x, y, z;
        
        switch(face) {
            case 0: x = half; y = (Math.random() - 0.5) * size; z = (Math.random() - 0.5) * size; break;
            case 1: x = -half; y = (Math.random() - 0.5) * size; z = (Math.random() - 0.5) * size; break;
            case 2: y = half; x = (Math.random() - 0.5) * size; z = (Math.random() - 0.5) * size; break;
            case 3: y = -half; x = (Math.random() - 0.5) * size; z = (Math.random() - 0.5) * size; break;
            case 4: z = half; x = (Math.random() - 0.5) * size; y = (Math.random() - 0.5) * size; break;
            case 5: z = -half; x = (Math.random() - 0.5) * size; y = (Math.random() - 0.5) * size; break;
        }
        
        return { x, y, z };
    }

    static pyramid(size = 10) {
        const face = Math.floor(Math.random() * 5);
        const half = size / 2;
        
        if (face === 0) {
            // Base
            return {
                x: (Math.random() - 0.5) * size,
                y: -half,
                z: (Math.random() - 0.5) * size
            };
        } else {
            // Triangular sides
            const t = Math.random();
            const s = Math.random();
            const angle = ((face - 1) / 4) * 2 * Math.PI;
            
            return {
                x: half * (1 - t) * Math.cos(angle) * s,
                y: -half + t * size,
                z: half * (1 - t) * Math.sin(angle) * s
            };
        }
    }
}

// ============== RANG PALITRALARI ==============

export const ColorPalettes = {
    fire: [
        new THREE.Color(0xff0000),
        new THREE.Color(0xff5500),
        new THREE.Color(0xffaa00),
        new THREE.Color(0xffff00)
    ],
    ice: [
        new THREE.Color(0x00ffff),
        new THREE.Color(0x0088ff),
        new THREE.Color(0xffffff),
        new THREE.Color(0x88ddff)
    ],
    rainbow: [
        new THREE.Color(0xff0000),
        new THREE.Color(0xff7f00),
        new THREE.Color(0xffff00),
        new THREE.Color(0x00ff00),
        new THREE.Color(0x0000ff),
        new THREE.Color(0x4b0082),
        new THREE.Color(0x9400d3)
    ],
    nature: [
        new THREE.Color(0x00ff00),
        new THREE.Color(0x88ff00),
        new THREE.Color(0x00aa00),
        new THREE.Color(0x228b22)
    ],
    love: [
        new THREE.Color(0xff0055),
        new THREE.Color(0xff66aa),
        new THREE.Color(0xffaacc),
        new THREE.Color(0xff0000)
    ],
    cosmic: [
        new THREE.Color(0x9400d3),
        new THREE.Color(0x4b0082),
        new THREE.Color(0x0000ff),
        new THREE.Color(0xff00ff)
    ],
    gold: [
        new THREE.Color(0xffd700),
        new THREE.Color(0xffcc00),
        new THREE.Color(0xffaa00),
        new THREE.Color(0xffffff)
    ],
    ocean: [
        new THREE.Color(0x006994),
        new THREE.Color(0x40e0d0),
        new THREE.Color(0x00ced1),
        new THREE.Color(0x20b2aa)
    ],
    sunset: [
        new THREE.Color(0xff4500),
        new THREE.Color(0xff6347),
        new THREE.Color(0xff7f50),
        new THREE.Color(0xffa07a)
    ],
    neon: [
        new THREE.Color(0x00ff00),
        new THREE.Color(0xff00ff),
        new THREE.Color(0x00ffff),
        new THREE.Color(0xffff00)
    ]
};

// Gest -> Shakl xaritasi
export const GestureShapeMap = {
    'pinch': 'text',        // Matn
    'fist': 'firework',     // Portlash
    'peace': 'peace',       // Tinchlik belgisi
    'thumbs_up': 'heart',   // Yurak
    'point': 'star',        // Yulduz
    'rock': 'galaxy',       // Galaktika
    'three': 'spiral',      // Spiral
    'four': 'butterfly',    // Kapalak
    'open': 'trail',        // Trail
    'unknown': 'sphere'     // Sfera
};

// Shakl -> Rang palitra xaritasi
export const ShapeColorMap = {
    'heart': 'love',
    'doubleheart': 'love',
    'star': 'gold',
    'galaxy': 'cosmic',
    'spiral': 'rainbow',
    'firework': 'fire',
    'butterfly': 'nature',
    'peace': 'rainbow',
    'wave': 'ocean',
    'tornado': 'ice',
    'smiley': 'gold',
    'infinity': 'cosmic',
    'vortex': 'neon',
    'trail': 'fire',
    'text': 'neon'
};

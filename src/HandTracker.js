import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTracker {
    constructor() {
        this.handLandmarker = undefined;
        this.video = document.getElementById('video-input');
        this.lastVideoTime = -1;
        this.results = undefined;
        this.isLoaded = false;
        this.previousPosition = null;
        this.smoothedPosition = null;
        this.gestureHistory = [];
        this.lastGesture = 'none';
        this.gestureStartTime = 0;
        this.handCount = 0;
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        this.isLoaded = true;
        this.startWebcam();
    }

    startWebcam() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    width: 320,
                    height: 240,
                    frameRate: { ideal: 30 }
                }
            }).then((stream) => {
                this.video.srcObject = stream;
                this.video.addEventListener("loadeddata", () => {
                    this.video.play();
                    this.isLoaded = true; // Ensure logic knows video is ready
                    console.log("Webcam started");
                });
            }).catch((err) => {
                console.error("Webcam error:", err);
                alert("Camera access denied or missing. Please allow camera access.");
            });
        } else {
            console.error("getUserMedia not supported");
        }
    }

    detect() {
        // More robust check
        if (!this.handLandmarker || !this.video || !this.video.videoWidth) return null;

        let startTimeMs = performance.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            try {
                this.results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
            } catch (e) {
                // Ignore occasional detection errors
            }
        }

        return this.results;
    }

    // Barmoq bukilganligini tekshirish
    isFingerExtended(landmarks, fingerTips, fingerPips) {
        const tip = landmarks[fingerTips];
        const pip = landmarks[fingerPips];
        const mcp = landmarks[fingerPips - 1];
        return tip.y < pip.y && tip.y < mcp.y;
    }

    // Bosh barmoq tekshirish (alohida logika)
    isThumbExtended(landmarks) {
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const thumbMcp = landmarks[2];
        // Thumb extends sideways
        return Math.abs(thumbTip.x - thumbMcp.x) > Math.abs(thumbIp.x - thumbMcp.x) * 1.2;
    }

    // Qo'l ochiqlik darajasi (0-5)
    getOpenFingerCount(landmarks) {
        let count = 0;
        if (this.isThumbExtended(landmarks)) count++;
        if (this.isFingerExtended(landmarks, 8, 6)) count++;  // Index
        if (this.isFingerExtended(landmarks, 12, 10)) count++; // Middle
        if (this.isFingerExtended(landmarks, 16, 14)) count++; // Ring
        if (this.isFingerExtended(landmarks, 20, 18)) count++; // Pinky
        return count;
    }

    // Gestni aniqlash
    detectGestureType(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];
        const palmCenter = landmarks[9];

        // Barmoqlar soni
        const openFingers = this.getOpenFingerCount(landmarks);

        // Pinch - Bosh barmoq va ko'rsatkich barmoq yaqin
        const pinchDist = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
        );
        if (pinchDist < 0.05) return 'pinch';

        // Fist - Barcha barmoqlar yopiq
        if (openFingers === 0) return 'fist';

        // Thumbs Up - Faqat bosh barmoq ochiq va yuqorida
        if (this.isThumbExtended(landmarks) && openFingers === 1 && thumbTip.y < wrist.y) {
            return 'thumbs_up';
        }

        // Peace Sign - Faqat ko'rsatkich va o'rta barmoq ochiq
        const indexExt = this.isFingerExtended(landmarks, 8, 6);
        const middleExt = this.isFingerExtended(landmarks, 12, 10);
        const ringExt = this.isFingerExtended(landmarks, 16, 14);
        const pinkyExt = this.isFingerExtended(landmarks, 20, 18);

        if (indexExt && middleExt && !ringExt && !pinkyExt) {
            return 'peace';
        }

        // Point - Faqat ko'rsatkich barmoq ochiq
        if (indexExt && !middleExt && !ringExt && !pinkyExt) {
            return 'point';
        }

        // Rock - Ko'rsatkich va pinky ochiq, qolganlari yopiq
        if (indexExt && pinkyExt && !middleExt && !ringExt) {
            return 'rock';
        }

        // Three - 3 barmoq ochiq
        if (openFingers === 3) return 'three';

        // Four - 4 barmoq ochiq (bosh barmoqsiz)
        if (openFingers === 4 && !this.isThumbExtended(landmarks)) {
            return 'four';
        }

        // Open Palm - Hammasi ochiq
        if (openFingers >= 4) return 'open';

        return 'unknown';
    }

    getGesture() {
        if (!this.results || this.results.landmarks.length === 0) {
            this.handCount = 0;
            return { type: 'none', position: null, velocity: null, handCount: 0 };
        }

        this.handCount = this.results.landmarks.length;
        const landmarks = this.results.landmarks[0];

        // Qo'l markazi
        let centerX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
        let centerY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

        // Smoothing
        if (this.smoothedPosition) {
            const alpha = 0.25;
            centerX = this.smoothedPosition.x + (centerX - this.smoothedPosition.x) * alpha;
            centerY = this.smoothedPosition.y + (centerY - this.smoothedPosition.y) * alpha;
        }
        this.smoothedPosition = { x: centerX, y: centerY };

        // Velocity
        let velocity = { x: 0, y: 0 };
        if (this.previousPosition) {
            velocity = {
                x: centerX - this.previousPosition.x,
                y: centerY - this.previousPosition.y
            };
        }
        this.previousPosition = { x: centerX, y: centerY };

        // Gest aniqlash
        const gestureType = this.detectGestureType(landmarks);

        // Gest barqarorligi uchun tarix
        this.gestureHistory.push(gestureType);
        if (this.gestureHistory.length > 5) this.gestureHistory.shift();

        // Eng ko'p takrorlangan gest
        const stableGesture = this.getMostFrequent(this.gestureHistory);

        // Ikkala qo'l uchun ma'lumot
        let secondHand = null;
        if (this.results.landmarks.length > 1) {
            const lm2 = this.results.landmarks[1];
            secondHand = {
                position: {
                    x: (lm2[0].x + lm2[5].x + lm2[17].x) / 3,
                    y: (lm2[0].y + lm2[5].y + lm2[17].y) / 3
                },
                gesture: this.detectGestureType(lm2)
            };
        }

        // Qo'l hajmi (masshtab uchun)
        const handSize = Math.sqrt(
            Math.pow(landmarks[0].x - landmarks[9].x, 2) +
            Math.pow(landmarks[0].y - landmarks[9].y, 2)
        );

        // Qo'l burchagi (rotation uchun)
        const handAngle = Math.atan2(
            landmarks[12].y - landmarks[0].y,
            landmarks[12].x - landmarks[0].x
        );

        return {
            type: stableGesture,
            position: { x: centerX, y: centerY },
            velocity: velocity,
            handCount: this.handCount,
            secondHand: secondHand,
            handSize: handSize,
            handAngle: handAngle,
            openFingers: this.getOpenFingerCount(landmarks),
            raw: landmarks
        };
    }

    getMostFrequent(arr) {
        const counts = {};
        let maxCount = 0;
        let maxItem = arr[0];
        for (const item of arr) {
            counts[item] = (counts[item] || 0) + 1;
            if (counts[item] > maxCount) {
                maxCount = counts[item];
                maxItem = item;
            }
        }
        return maxItem;
    }
}
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

        // Velocity smoothing
        this.smoothedVelocity = { x: 0, y: 0 };
        this.velocityAlpha = 0.4;

        // Status callback
        this.onStatusChange = null;
    }

    async init() {
        try {
            if (this.onStatusChange) this.onStatusChange('loading', 'AI model yuklanmoqda...');

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
            if (this.onStatusChange) this.onStatusChange('loaded', 'AI model tayyor!');
            this.startWebcam();
        } catch (err) {
            console.error("HandTracker init error:", err);
            if (this.onStatusChange) this.onStatusChange('error', 'AI model yuklanmadi');
        }
    }

    startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia not supported");
            if (this.onStatusChange) this.onStatusChange('error', 'Camera qo\'llab-quvvatlanmaydi');
            return;
        }

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
                this.isLoaded = true;
                if (this.onStatusChange) this.onStatusChange('ready', 'Camera tayyor! ✌️');
                console.log("Webcam started");
            });
        }).catch((err) => {
            console.error("Webcam error:", err);
            if (this.onStatusChange) this.onStatusChange('error', 'Camera ruxsati yo\'q');
        });
    }

    detect() {
        if (!this.handLandmarker || !this.video || !this.video.videoWidth) return null;

        const startTimeMs = performance.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            try {
                this.results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
            } catch (e) {
                // Skip frame
            }
        }

        return this.results;
    }

    isFingerExtended(landmarks, fingerTip, fingerPip) {
        const tip = landmarks[fingerTip];
        const pip = landmarks[fingerPip];
        const mcp = landmarks[fingerPip - 1];
        return tip.y < pip.y && tip.y < mcp.y;
    }

    isThumbExtended(landmarks) {
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const thumbMcp = landmarks[2];
        return Math.abs(thumbTip.x - thumbMcp.x) > Math.abs(thumbIp.x - thumbMcp.x) * 1.2;
    }

    getOpenFingerCount(landmarks) {
        let count = 0;
        if (this.isThumbExtended(landmarks)) count++;
        if (this.isFingerExtended(landmarks, 8, 6)) count++;
        if (this.isFingerExtended(landmarks, 12, 10)) count++;
        if (this.isFingerExtended(landmarks, 16, 14)) count++;
        if (this.isFingerExtended(landmarks, 20, 18)) count++;
        return count;
    }

    detectGestureType(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const wrist = landmarks[0];

        const openFingers = this.getOpenFingerCount(landmarks);

        // Pinch
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        if (pinchDist < 0.05) return 'pinch';

        // Fist
        if (openFingers === 0) return 'fist';

        // Thumbs Up
        if (this.isThumbExtended(landmarks) && openFingers === 1 && thumbTip.y < wrist.y) {
            return 'thumbs_up';
        }

        const indexExt = this.isFingerExtended(landmarks, 8, 6);
        const middleExt = this.isFingerExtended(landmarks, 12, 10);
        const ringExt = this.isFingerExtended(landmarks, 16, 14);
        const pinkyExt = this.isFingerExtended(landmarks, 20, 18);

        // Peace Sign ✌️ - 2 barmoq!
        if (indexExt && middleExt && !ringExt && !pinkyExt) {
            return 'peace';
        }

        // Point
        if (indexExt && !middleExt && !ringExt && !pinkyExt) {
            return 'point';
        }

        // Rock
        if (indexExt && pinkyExt && !middleExt && !ringExt) {
            return 'rock';
        }

        // Three
        if (openFingers === 3) return 'three';

        // Four
        if (openFingers === 4 && !this.isThumbExtended(landmarks)) {
            return 'four';
        }

        // Open Palm
        if (openFingers >= 4) return 'open';

        return 'unknown';
    }

    getGesture() {
        if (!this.results || this.results.landmarks.length === 0) {
            this.handCount = 0;
            // Smoothed velocity decay
            this.smoothedVelocity.x *= 0.8;
            this.smoothedVelocity.y *= 0.8;
            return { type: 'none', position: null, velocity: null, handCount: 0 };
        }

        this.handCount = this.results.landmarks.length;
        const landmarks = this.results.landmarks[0];

        // Qo'l markazi - 3 nuqta o'rtachasi
        let centerX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
        let centerY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

        // Smoothing
        if (this.smoothedPosition) {
            const alpha = 0.35;
            centerX = this.smoothedPosition.x + (centerX - this.smoothedPosition.x) * alpha;
            centerY = this.smoothedPosition.y + (centerY - this.smoothedPosition.y) * alpha;
        }
        this.smoothedPosition = { x: centerX, y: centerY };

        // Velocity with smoothing
        let velocity = { x: 0, y: 0 };
        if (this.previousPosition) {
            const rawVx = centerX - this.previousPosition.x;
            const rawVy = centerY - this.previousPosition.y;
            this.smoothedVelocity.x += (rawVx - this.smoothedVelocity.x) * this.velocityAlpha;
            this.smoothedVelocity.y += (rawVy - this.smoothedVelocity.y) * this.velocityAlpha;
            velocity = { ...this.smoothedVelocity };
        }
        this.previousPosition = { x: centerX, y: centerY };

        // Gest
        const gestureType = this.detectGestureType(landmarks);

        // Gest barqarorligi
        this.gestureHistory.push(gestureType);
        if (this.gestureHistory.length > 10) this.gestureHistory.shift();

        const stableGesture = this.getMostFrequent(this.gestureHistory);

        // 2-qo'l
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

        const handSize = Math.hypot(
            landmarks[0].x - landmarks[9].x,
            landmarks[0].y - landmarks[9].y
        );

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
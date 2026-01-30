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
    }    getGesture() {
        if (!this.results || this.results.landmarks.length === 0) return { type: 'none', position: null };

        // Simple gesture logic: Use the first detected hand
        const landmarks = this.results.landmarks[0];

        // Calculate center of palm (approximate using average of 0, 5, 17)
        // 0: wrist, 5: index_finger_mcp, 17: pinky_mcp
        let centerX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
        let centerY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

        // Smoothing (Linear Interpolation) to reduce jitter
        if (this.smoothedPosition) {
            const alpha = 0.3; // Smoothing factor
            centerX = this.smoothedPosition.x + (centerX - this.smoothedPosition.x) * alpha;
            centerY = this.smoothedPosition.y + (centerY - this.smoothedPosition.y) * alpha;
        }
        this.smoothedPosition = { x: centerX, y: centerY };

        // Check for pinch (Thumb tip 4 and Index tip 8 close together)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
        );

        // Calculate velocity based on SMOOTHED position
        let velocity = { x: 0, y: 0 };
        if (this.previousPosition) {
            velocity = {
                x: centerX - this.previousPosition.x,
                y: centerY - this.previousPosition.y
            };
        }
        this.previousPosition = { x: centerX, y: centerY };

        return {
            type: distance < 0.05 ? 'pinch' : 'open',
            position: { x: centerX, y: centerY },
            velocity: velocity,
            raw: landmarks
        };
    }
}
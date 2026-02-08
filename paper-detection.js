// Paper Detection Module für AR Zeichen-Hilfe
// Erkennt weißes Papier/Blatt und berechnet Perspektive

class PaperDetector {
    constructor() {
        this.detectionCanvas = document.createElement('canvas');
        this.detectionCtx = this.detectionCanvas.getContext('2d');
        this.enabled = true;
        this.detectedCorners = null;
        this.confidenceThreshold = 0.6;
    }

    detectPaper(videoElement) {
        if (!this.enabled || !videoElement.videoWidth) {
            return null;
        }

        try {
            // Resize canvas für Performance
            const scale = 0.25; // 25% der Originalgröße für Detektion
            this.detectionCanvas.width = videoElement.videoWidth * scale;
            this.detectionCanvas.height = videoElement.videoHeight * scale;

            // Draw current video frame
            this.detectionCtx.drawImage(
                videoElement,
                0, 0,
                this.detectionCanvas.width,
                this.detectionCanvas.height
            );

            // Get image data
            const imageData = this.detectionCtx.getImageData(
                0, 0,
                this.detectionCanvas.width,
                this.detectionCanvas.height
            );

            // Detect white paper
            const corners = this.findPaperCorners(imageData);

            if (corners && corners.confidence > this.confidenceThreshold) {
                // Scale corners back to full resolution
                this.detectedCorners = {
                    topLeft: {
                        x: corners.topLeft.x / scale,
                        y: corners.topLeft.y / scale
                    },
                    topRight: {
                        x: corners.topRight.x / scale,
                        y: corners.topRight.y / scale
                    },
                    bottomLeft: {
                        x: corners.bottomLeft.x / scale,
                        y: corners.bottomLeft.y / scale
                    },
                    bottomRight: {
                        x: corners.bottomRight.x / scale,
                        y: corners.bottomRight.y / scale
                    },
                    confidence: corners.confidence
                };

                return this.detectedCorners;
            }

            return null;
        } catch (error) {
            console.error('Paper detection error:', error);
            return null;
        }
    }

    findPaperCorners(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Find bright regions (white paper)
        const brightPixels = [];
        const threshold = 180; // Brightness threshold for white paper

        for (let y = 0; y < height; y += 4) { // Skip pixels for performance
            for (let x = 0; x < width; x += 4) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Check if pixel is bright (whitish)
                const brightness = (r + g + b) / 3;
                const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                
                if (brightness > threshold && saturation < 30) {
                    brightPixels.push({ x, y, brightness });
                }
            }
        }

        if (brightPixels.length < 100) {
            return null; // Not enough bright pixels
        }

        // Find bounding box of bright region
        let minX = width, minY = height, maxX = 0, maxY = 0;
        
        brightPixels.forEach(pixel => {
            minX = Math.min(minX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxX = Math.max(maxX, pixel.x);
            maxY = Math.max(maxY, pixel.y);
        });

        // Check if region is large enough to be paper
        const regionWidth = maxX - minX;
        const regionHeight = maxY - minY;
        const regionArea = regionWidth * regionHeight;
        const imageArea = width * height;
        
        if (regionArea < imageArea * 0.1 || regionArea > imageArea * 0.8) {
            return null; // Too small or too large
        }

        // Calculate aspect ratio confidence
        const aspectRatio = regionWidth / regionHeight;
        const expectedRatios = [1.414, 0.707]; // A4 portrait/landscape
        let aspectConfidence = 0;
        
        expectedRatios.forEach(expected => {
            const diff = Math.abs(aspectRatio - expected) / expected;
            const confidence = Math.max(0, 1 - diff);
            aspectConfidence = Math.max(aspectConfidence, confidence);
        });

        // Refine corners using edge detection
        const corners = this.refineCorners(
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: minX, y: maxY },
            { x: maxX, y: maxY },
            brightPixels,
            width,
            height
        );

        return {
            topLeft: corners.topLeft,
            topRight: corners.topRight,
            bottomLeft: corners.bottomLeft,
            bottomRight: corners.bottomRight,
            confidence: aspectConfidence * 0.7 + 0.3 // Weighted confidence
        };
    }

    refineCorners(tl, tr, bl, br, brightPixels, width, height) {
        // Find actual corners by searching in corner regions
        const cornerRadius = 20;
        
        const findClosestBrightPixel = (target, pixels) => {
            let closest = target;
            let minDist = Infinity;
            
            pixels.forEach(pixel => {
                const dx = pixel.x - target.x;
                const dy = pixel.y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < cornerRadius && dist < minDist) {
                    closest = pixel;
                    minDist = dist;
                }
            });
            
            return closest;
        };

        return {
            topLeft: findClosestBrightPixel(tl, brightPixels),
            topRight: findClosestBrightPixel(tr, brightPixels),
            bottomLeft: findClosestBrightPixel(bl, brightPixels),
            bottomRight: findClosestBrightPixel(br, brightPixels)
        };
    }

    calculatePerspectiveTransform(corners, canvasWidth, canvasHeight) {
        if (!corners) return null;

        // Calculate center and dimensions of detected paper
        const centerX = (corners.topLeft.x + corners.topRight.x + 
                        corners.bottomLeft.x + corners.bottomRight.x) / 4;
        const centerY = (corners.topLeft.y + corners.topRight.y + 
                        corners.bottomLeft.y + corners.bottomRight.y) / 4;

        // Calculate rotation angle from top edge
        const dx = corners.topRight.x - corners.topLeft.x;
        const dy = corners.topRight.y - corners.topLeft.y;
        const rotation = Math.atan2(dy, dx);

        // Calculate skew from perspective distortion
        const topWidth = Math.sqrt(
            Math.pow(corners.topRight.x - corners.topLeft.x, 2) +
            Math.pow(corners.topRight.y - corners.topLeft.y, 2)
        );
        const bottomWidth = Math.sqrt(
            Math.pow(corners.bottomRight.x - corners.bottomLeft.x, 2) +
            Math.pow(corners.bottomRight.y - corners.bottomLeft.y, 2)
        );
        const leftHeight = Math.sqrt(
            Math.pow(corners.bottomLeft.x - corners.topLeft.x, 2) +
            Math.pow(corners.bottomLeft.y - corners.topLeft.y, 2)
        );
        const rightHeight = Math.sqrt(
            Math.pow(corners.bottomRight.x - corners.topRight.x, 2) +
            Math.pow(corners.bottomRight.y - corners.topRight.y, 2)
        );

        // Calculate perspective distortion
        const horizontalSkew = (bottomWidth - topWidth) / topWidth;
        const verticalSkew = (rightHeight - leftHeight) / leftHeight;

        // Calculate scale based on paper size
        const avgWidth = (topWidth + bottomWidth) / 2;
        const avgHeight = (leftHeight + rightHeight) / 2;
        const paperAspect = avgWidth / avgHeight;

        return {
            centerX: centerX / canvasWidth,
            centerY: centerY / canvasHeight,
            rotation: rotation,
            horizontalSkew: horizontalSkew,
            verticalSkew: verticalSkew,
            scale: Math.sqrt((avgWidth * avgHeight) / (canvasWidth * canvasHeight)),
            paperAspect: paperAspect,
            confidence: corners.confidence
        };
    }

    drawDetectionOverlay(ctx, corners, canvasWidth, canvasHeight) {
        if (!corners) return;

        ctx.save();
        
        // Draw corner markers
        ctx.strokeStyle = '#4CAF50';
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.lineWidth = 3;

        const drawCorner = (corner, label) => {
            const radius = 15;
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(label, corner.x - 5, corner.y + 5);
        };

        drawCorner(corners.topLeft, '1');
        drawCorner(corners.topRight, '2');
        drawCorner(corners.bottomLeft, '3');
        drawCorner(corners.bottomRight, '4');

        // Draw paper outline
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
        ctx.lineTo(corners.topRight.x, corners.topRight.y);
        ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
        ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
        ctx.closePath();
        ctx.stroke();

        // Draw confidence indicator
        ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.fillRect(10, 10, 200, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(
            `Papier erkannt: ${Math.round(corners.confidence * 100)}%`,
            20, 30
        );

        ctx.restore();
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaperDetector;
}

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
            const detectionWidth = Math.floor(videoElement.videoWidth * scale);
            const detectionHeight = Math.floor(videoElement.videoHeight * scale);
            
            this.detectionCanvas.width = detectionWidth;
            this.detectionCanvas.height = detectionHeight;

            // Draw current video frame
            this.detectionCtx.drawImage(
                videoElement,
                0, 0,
                detectionWidth,
                detectionHeight
            );

            // Get image data
            const imageData = this.detectionCtx.getImageData(
                0, 0,
                detectionWidth,
                detectionHeight
            );

            // Detect white paper
            const corners = this.findPaperCorners(imageData);

            if (corners && corners.confidence > this.confidenceThreshold) {
                // WICHTIG: Skaliere Koordinaten zurück zur CANVAS-Größe, nicht Video-Größe
                // Die Canvas hat möglicherweise andere Dimensionen als das Video
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
                    confidence: corners.confidence,
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight
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

        // Berechne Skalierung von Video zu Canvas
        const videoWidth = corners.videoWidth || canvasWidth;
        const videoHeight = corners.videoHeight || canvasHeight;
        
        const scaleX = canvasWidth / videoWidth;
        const scaleY = canvasHeight / videoHeight;
        
        // Skaliere Corners auf Canvas-Koordinaten
        const tl = {
            x: corners.topLeft.x * scaleX,
            y: corners.topLeft.y * scaleY
        };
        const tr = {
            x: corners.topRight.x * scaleX,
            y: corners.topRight.y * scaleY
        };
        const bl = {
            x: corners.bottomLeft.x * scaleX,
            y: corners.bottomLeft.y * scaleY
        };
        const br = {
            x: corners.bottomRight.x * scaleX,
            y: corners.bottomRight.y * scaleY
        };

        // Calculate center
        const centerX = (tl.x + tr.x + bl.x + br.x) / 4;
        const centerY = (tl.y + tr.y + bl.y + br.y) / 4;

        // Calculate rotation angle from top edge
        const dx = tr.x - tl.x;
        const dy = tr.y - tl.y;
        const rotation = Math.atan2(dy, dx);

        // Calculate skew from perspective distortion
        const topWidth = Math.sqrt(
            Math.pow(tr.x - tl.x, 2) +
            Math.pow(tr.y - tl.y, 2)
        );
        const bottomWidth = Math.sqrt(
            Math.pow(br.x - bl.x, 2) +
            Math.pow(br.y - bl.y, 2)
        );
        const leftHeight = Math.sqrt(
            Math.pow(bl.x - tl.x, 2) +
            Math.pow(bl.y - tl.y, 2)
        );
        const rightHeight = Math.sqrt(
            Math.pow(br.x - tr.x, 2) +
            Math.pow(br.y - tr.y, 2)
        );

        // Calculate perspective distortion
        const horizontalSkew = (bottomWidth - topWidth) / Math.max(topWidth, 1);
        const verticalSkew = (rightHeight - leftHeight) / Math.max(leftHeight, 1);

        // Calculate scale based on paper size
        const avgWidth = (topWidth + bottomWidth) / 2;
        const avgHeight = (leftHeight + rightHeight) / 2;
        const paperAspect = avgWidth / Math.max(avgHeight, 1);

        return {
            centerX: centerX / canvasWidth,
            centerY: centerY / canvasHeight,
            rotation: rotation,
            horizontalSkew: Math.max(-0.5, Math.min(0.5, horizontalSkew)),
            verticalSkew: Math.max(-0.5, Math.min(0.5, verticalSkew)),
            scale: Math.sqrt((avgWidth * avgHeight) / (canvasWidth * canvasHeight)),
            paperAspect: paperAspect,
            confidence: corners.confidence
        };
    }

    drawDetectionOverlay(ctx, corners, canvasWidth, canvasHeight) {
        if (!corners) return;

        ctx.save();
        
        // Berechne Skalierung von Video zu Canvas
        // Video und Canvas können unterschiedliche Größen haben
        const videoWidth = corners.videoWidth || canvasWidth;
        const videoHeight = corners.videoHeight || canvasHeight;
        
        const scaleX = canvasWidth / videoWidth;
        const scaleY = canvasHeight / videoHeight;
        
        // Skaliere Corner-Koordinaten auf Canvas-Größe
        const scaledCorners = {
            topLeft: {
                x: corners.topLeft.x * scaleX,
                y: corners.topLeft.y * scaleY
            },
            topRight: {
                x: corners.topRight.x * scaleX,
                y: corners.topRight.y * scaleY
            },
            bottomLeft: {
                x: corners.bottomLeft.x * scaleX,
                y: corners.bottomLeft.y * scaleY
            },
            bottomRight: {
                x: corners.bottomRight.x * scaleX,
                y: corners.bottomRight.y * scaleY
            }
        };
        
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
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, corner.x, corner.y);
        };

        drawCorner(scaledCorners.topLeft, '1');
        drawCorner(scaledCorners.topRight, '2');
        drawCorner(scaledCorners.bottomLeft, '3');
        drawCorner(scaledCorners.bottomRight, '4');

        // Draw paper outline
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(scaledCorners.topLeft.x, scaledCorners.topLeft.y);
        ctx.lineTo(scaledCorners.topRight.x, scaledCorners.topRight.y);
        ctx.lineTo(scaledCorners.bottomRight.x, scaledCorners.bottomRight.y);
        ctx.lineTo(scaledCorners.bottomLeft.x, scaledCorners.bottomLeft.y);
        ctx.closePath();
        ctx.stroke();

        // Draw confidence indicator
        const confidence = Math.round(corners.confidence * 100);
        const indicatorWidth = 220;
        const indicatorHeight = 40;
        const padding = 15;
        
        ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
        ctx.fillRect(padding, padding, indicatorWidth, indicatorHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `📄 Papier: ${confidence}%`,
            padding + 10,
            padding + indicatorHeight / 2
        );

        ctx.restore();
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaperDetector;
}

// AR Zeichen-Hilfe App
class DrawingARApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Template settings
        this.templateImage = null;
        this.templateVisible = true;
        this.templatePosition = { x: 0.5, y: 0.5 }; // Relative position (0-1)
        this.templateScale = 1.0;
        this.templateOpacity = 0.5;
        this.templateRotation = 0;
        this.templatePerspective = 0;
        this.templateMirrored = false;
        this.positionLocked = false;
        
        // Gyroscope/Orientation
        this.gyroEnabled = true;
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.orientationPermissionGranted = false;
        
        // Grid settings
        this.showGrid = true;
        
        // Touch/drag state
        this.isDragging = false;
        this.isPinching = false;
        this.lastTouchDistance = 0;
        this.touchStartPos = { x: 0, y: 0 };
        
        this.init();
    }

    async init() {
        // Request fullscreen mode
        this.requestFullscreen();
        
        await this.setupCamera();
        this.setupCanvas();
        this.setupEventListeners();
        await this.setupGyroscope();
        this.updateGyroIndicator();
        this.animate();
        
        document.getElementById('loading').classList.add('hidden');
        this.showInfoBanner('Berühre den Bildschirm, um die Vorlage zu verschieben');
    }

    async setupGyroscope() {
        // Check if DeviceOrientation is supported
        if (!window.DeviceOrientationEvent) {
            console.log('Device Orientation not supported');
            this.gyroEnabled = false;
            return;
        }

        // iOS 13+ requires permission
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.orientationPermissionGranted = true;
                    this.startOrientationTracking();
                } else {
                    console.log('Device Orientation permission denied');
                    this.gyroEnabled = false;
                }
            } catch (error) {
                console.error('Error requesting orientation permission:', error);
                this.gyroEnabled = false;
            }
        } else {
            // Non-iOS or older iOS - no permission needed
            this.orientationPermissionGranted = true;
            this.startOrientationTracking();
        }
    }

    startOrientationTracking() {
        window.addEventListener('deviceorientation', (event) => {
            if (!this.gyroEnabled) return;
            
            // Store raw orientation data
            this.deviceOrientation = {
                alpha: event.alpha || 0,  // Z-axis (0-360) - rotation around vertical
                beta: event.beta || 0,    // X-axis (-180 to 180) - front-to-back tilt
                gamma: event.gamma || 0   // Y-axis (-90 to 90) - left-to-right tilt
            };
        });
    }

    calculatePerspectiveFromOrientation() {
        if (!this.gyroEnabled || !this.orientationPermissionGranted) {
            return { skewX: 0, skewY: 0, scaleY: 1 };
        }

        const { beta, gamma } = this.deviceOrientation;
        
        // Beta: front-to-back tilt
        // When phone tilts forward (positive beta), we need to compensate
        // Typical reading position: beta around 30-60 degrees
        const betaNormalized = (beta - 45) / 45; // Normalize around 45° (typical angle)
        
        // Gamma: left-to-right tilt
        const gammaNormalized = gamma / 45;
        
        // Calculate perspective transforms
        // Clamp values to prevent extreme distortion
        const skewX = Math.max(-0.5, Math.min(0.5, gammaNormalized * 0.3));
        const skewY = Math.max(-0.5, Math.min(0.5, betaNormalized * 0.3));
        
        // Scale compensation for depth perception
        const scaleY = 1 + Math.abs(betaNormalized) * 0.1;
        
        return { skewX, skewY, scaleY };
    }
        // Prevent browser UI from showing
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
        
        // Lock screen orientation to portrait (optional)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(err => {
                console.log('Orientation lock failed:', err);
            });
        }
    }

    async setupCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Rückkamera bevorzugen
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
        } catch (error) {
            console.error('Kamera-Fehler:', error);
            alert('Kamera konnte nicht gestartet werden. Bitte erlaube den Kamera-Zugriff.');
        }
    }

    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.overlayCanvas.width = window.innerWidth;
            this.overlayCanvas.height = window.innerHeight;
        };
        
        resize();
        window.addEventListener('resize', resize);
    }

    setupEventListeners() {
        // File upload
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.loadTemplate(e.target.files[0]);
        });

        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // Settings panel
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('open');
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.remove('open');
        });

        // Toggle buttons
        document.getElementById('toggle-template').addEventListener('click', () => {
            this.templateVisible = !this.templateVisible;
        });

        document.getElementById('toggle-grid').addEventListener('click', () => {
            this.showGrid = !this.showGrid;
        });

        document.getElementById('reset-position').addEventListener('click', () => {
            this.resetPosition();
        });

        // Sliders
        document.getElementById('scale-slider').addEventListener('input', (e) => {
            this.templateScale = e.target.value / 100;
            document.getElementById('scale-value').textContent = e.target.value + '%';
        });

        document.getElementById('opacity-slider').addEventListener('input', (e) => {
            this.templateOpacity = e.target.value / 100;
            document.getElementById('opacity-value').textContent = e.target.value + '%';
        });

        document.getElementById('rotation-slider').addEventListener('input', (e) => {
            this.templateRotation = parseInt(e.target.value);
            document.getElementById('rotation-value').textContent = e.target.value + '°';
        });

        document.getElementById('perspective-slider').addEventListener('input', (e) => {
            this.templatePerspective = parseInt(e.target.value);
            document.getElementById('perspective-value').textContent = e.target.value;
        });

        document.getElementById('mirror-template').addEventListener('change', (e) => {
            this.templateMirrored = e.target.checked;
        });

        document.getElementById('lock-position').addEventListener('change', (e) => {
            this.positionLocked = e.target.checked;
        });

        // Gyroscope toggle
        document.getElementById('toggle-gyro').addEventListener('change', (e) => {
            this.gyroEnabled = e.target.checked;
            if (e.target.checked && !this.orientationPermissionGranted) {
                // Request permission if not granted yet
                this.setupGyroscope();
            }
            this.updateGyroIndicator();
        });

        // Gyroscope indicator button - shows status and requests permission
        document.getElementById('gyro-indicator').addEventListener('click', async () => {
            if (!this.orientationPermissionGranted) {
                await this.setupGyroscope();
                if (this.orientationPermissionGranted) {
                    this.showInfoBanner('✅ Gyroscope aktiviert! Neige dein Handy.');
                } else {
                    this.showInfoBanner('⚠️ Gyroscope-Berechtigung verweigert');
                }
            } else {
                // Toggle gyro on/off
                this.gyroEnabled = !this.gyroEnabled;
                document.getElementById('toggle-gyro').checked = this.gyroEnabled;
                this.showInfoBanner(this.gyroEnabled ? '🔄 Auto-Perspektive AN' : '⏸️ Auto-Perspektive AUS');
            }
            this.updateGyroIndicator();
        });

        // Touch/Mouse events for dragging
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        const canvas = this.overlayCanvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            if (this.positionLocked) return;
            this.startDrag(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && !this.positionLocked) {
                this.drag(e.clientX, e.clientY);
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.endDrag();
        });

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            if (this.positionLocked) return;
            e.preventDefault();
            
            if (e.touches.length === 1) {
                this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 2) {
                this.startPinch(e.touches);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && this.isDragging && !this.positionLocked) {
                this.drag(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 2 && !this.positionLocked) {
                this.pinch(e.touches);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.endDrag();
                this.endPinch();
            }
        });

        // Enable pointer events
        canvas.style.pointerEvents = 'auto';
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.touchStartPos = {
            x: x - this.templatePosition.x * this.canvas.width,
            y: y - this.templatePosition.y * this.canvas.height
        };
        
        this.showTouchIndicator(x, y);
    }

    drag(x, y) {
        if (!this.isDragging) return;
        
        this.templatePosition.x = (x - this.touchStartPos.x) / this.canvas.width;
        this.templatePosition.y = (y - this.touchStartPos.y) / this.canvas.height;
        
        // Clamp to canvas bounds
        this.templatePosition.x = Math.max(0, Math.min(1, this.templatePosition.x));
        this.templatePosition.y = Math.max(0, Math.min(1, this.templatePosition.y));
        
        this.showTouchIndicator(x, y);
    }

    endDrag() {
        this.isDragging = false;
        this.hideTouchIndicator();
    }

    startPinch(touches) {
        this.isPinching = true;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }

    pinch(touches) {
        if (!this.isPinching) return;
        
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const scaleFactor = distance / this.lastTouchDistance;
        this.templateScale *= scaleFactor;
        this.templateScale = Math.max(0.1, Math.min(3, this.templateScale));
        
        // Update slider
        const sliderValue = Math.round(this.templateScale * 100);
        document.getElementById('scale-slider').value = sliderValue;
        document.getElementById('scale-value').textContent = sliderValue + '%';
        
        this.lastTouchDistance = distance;
    }

    endPinch() {
        this.isPinching = false;
    }

    showTouchIndicator(x, y) {
        const indicator = document.getElementById('touch-indicator');
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        indicator.style.display = 'block';
    }

    hideTouchIndicator() {
        document.getElementById('touch-indicator').style.display = 'none';
    }

    loadTemplate(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.templateImage = img;
                this.showInfoBanner('Vorlage geladen! Verschiebe sie mit dem Finger.');
                document.getElementById('settings-panel').classList.remove('open');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    resetPosition() {
        this.templatePosition = { x: 0.5, y: 0.5 };
        this.templateScale = 1.0;
        this.templateRotation = 0;
        this.templatePerspective = 0;
        
        document.getElementById('scale-slider').value = 100;
        document.getElementById('scale-value').textContent = '100%';
        document.getElementById('rotation-slider').value = 0;
        document.getElementById('rotation-value').textContent = '0°';
        document.getElementById('perspective-slider').value = 0;
        document.getElementById('perspective-value').textContent = '0';
    }

    showInfoBanner(message, duration = 3000) {
        const banner = document.getElementById('info-banner');
        banner.textContent = message;
        banner.classList.remove('hidden');
        
        setTimeout(() => {
            banner.classList.add('hidden');
        }, duration);
    }

    drawGrid() {
        if (!this.showGrid) return;

        const ctx = this.overlayCtx;
        const width = this.overlayCanvas.width;
        const height = this.overlayCanvas.height;

        // Center guide
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);

        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.setLineDash([]);

        // Corner markers
        const margin = 50;
        const markerSize = 30;
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.lineWidth = 3;

        const corners = [
            { x: margin, y: margin },
            { x: width - margin, y: margin },
            { x: margin, y: height - margin },
            { x: width - margin, y: height - margin }
        ];

        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, markerSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Reference rectangle
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);
    }

    drawTemplate() {
        if (!this.templateImage || !this.templateVisible) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.save();

        // Position
        const x = this.templatePosition.x * width;
        const y = this.templatePosition.y * height;
        ctx.translate(x, y);

        // Rotation
        ctx.rotate((this.templateRotation * Math.PI) / 180);

        // Get gyroscope-based perspective
        const gyroPerspective = this.calculatePerspectiveFromOrientation();
        
        // Apply gyroscope perspective if enabled
        if (this.gyroEnabled && this.orientationPermissionGranted) {
            // Apply skew based on device tilt
            ctx.transform(
                1, 
                gyroPerspective.skewY, 
                gyroPerspective.skewX, 
                gyroPerspective.scaleY, 
                0, 
                0
            );
        }

        // Manual perspective adjustment (if user set it)
        if (this.templatePerspective !== 0) {
            const skew = this.templatePerspective / 100;
            ctx.transform(1, skew, 0, 1, 0, 0);
        }

        // Mirror
        if (this.templateMirrored) {
            ctx.scale(-1, 1);
        }

        // Scale
        const imgWidth = this.templateImage.width * this.templateScale;
        const imgHeight = this.templateImage.height * this.templateScale;

        // Opacity
        ctx.globalAlpha = this.templateOpacity;

        // Draw centered
        ctx.drawImage(
            this.templateImage,
            -imgWidth / 2,
            -imgHeight / 2,
            imgWidth,
            imgHeight
        );

        ctx.restore();
    }

    animate() {
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Draw template
        this.drawTemplate();

        // Draw grid overlay
        this.drawGrid();

        // Update debug display
        this.updateDebugDisplay();

        requestAnimationFrame(() => this.animate());
    }

    updateDebugDisplay() {
        if (!document.getElementById('gyro-debug')) return;

        const betaEl = document.getElementById('debug-beta');
        const gammaEl = document.getElementById('debug-gamma');
        const statusEl = document.getElementById('debug-status');

        if (betaEl && gammaEl && statusEl) {
            betaEl.textContent = this.deviceOrientation.beta.toFixed(1) + '°';
            gammaEl.textContent = this.deviceOrientation.gamma.toFixed(1) + '°';
            
            if (this.gyroEnabled && this.orientationPermissionGranted) {
                statusEl.textContent = '✅ Aktiv';
                statusEl.style.color = '#4CAF50';
            } else if (!this.orientationPermissionGranted) {
                statusEl.textContent = '⚠️ Keine Berechtigung';
                statusEl.style.color = '#FF9800';
            } else {
                statusEl.textContent = '⏸️ Deaktiviert';
                statusEl.style.color = '#757575';
            }
        }
    }

    updateGyroIndicator() {
        const indicator = document.getElementById('gyro-indicator');
        if (!indicator) return;

        indicator.classList.remove('active', 'inactive');
        
        if (this.gyroEnabled && this.orientationPermissionGranted) {
            indicator.classList.add('active');
            indicator.title = 'Gyroscope: Aktiv (Klicken zum Deaktivieren)';
        } else if (!this.orientationPermissionGranted) {
            indicator.classList.add('inactive');
            indicator.title = 'Gyroscope: Berechtigung erforderlich (Klicken)';
        } else {
            indicator.classList.add('inactive');
            indicator.title = 'Gyroscope: Aus (Klicken zum Aktivieren)';
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DrawingARApp();
    });
} else {
    new DrawingARApp();
}

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registriert:', reg.scope))
            .catch(err => console.log('Service Worker Fehler:', err));
    });
}

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
        this.templatePosition = { x: 0.5, y: 0.5 };
        this.templateScale = 1.0;
        this.templateOpacity = 0.5;
        this.templateRotation = 0;
        this.templatePerspective = 0;
        this.templateMirrored = false;
        this.positionLocked = false;
        
        // Gyroscope/Orientation - DISABLED by default to prevent blocking
        this.gyroEnabled = false;
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.orientationPermissionGranted = false;
        
        // Paper Detection
        this.paperDetector = new PaperDetector();
        this.paperDetectionEnabled = true;
        this.detectedPaper = null;
        this.autoPerspectiveEnabled = true;
        
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
        try {
            console.log('App initializing...');
            
            await this.setupCamera();
            this.setupCanvas();
            this.setupEventListeners();
            
            // Setup gyroscope WITHOUT blocking - only on user request
            this.setupGyroscopeListener();
            
            this.animate();
            
            document.getElementById('loading').classList.add('hidden');
            this.showInfoBanner('✅ Bereit! Berühre den Bildschirm zum Verschieben');
        } catch (error) {
            console.error('Initialization error:', error);
            document.getElementById('loading').classList.add('hidden');
            
            // App trotzdem starten
            this.setupCanvas();
            this.setupEventListeners();
            this.setupGyroscopeListener();
            this.animate();
            
            this.showInfoBanner('⚠️ App gestartet im Test-Modus', 5000);
        }
    }

    async setupCamera() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            console.log('Requesting camera access...');
            
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            console.log('Camera stream acquired');
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Camera initialization timeout'));
                }, 10000);
                
                this.video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log('Video metadata loaded');
                    this.video.play()
                        .then(() => {
                            console.log('Video playing');
                            resolve();
                        })
                        .catch(reject);
                };
                
                this.video.onerror = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };
            });
        } catch (error) {
            console.error('Camera error:', error);
            
            let errorMessage = 'Kamera-Fehler: ';
            
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Berechtigung verweigert. Bitte erlaube Kamera-Zugriff.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'Keine Kamera gefunden.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Kamera wird bereits verwendet.';
            } else if (error.message === 'Camera API not supported') {
                errorMessage += 'Browser unterstützt keine Kamera. Nutze Chrome/Safari.';
            } else {
                errorMessage += error.message || 'Unbekannter Fehler';
            }
            
            alert(errorMessage);
            throw error;
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

        // Paper Detection toggle
        const paperToggle = document.getElementById('toggle-paper-detection');
        if (paperToggle) {
            paperToggle.addEventListener('change', (e) => {
                this.paperDetectionEnabled = e.target.checked;
                if (!e.target.checked) {
                    this.detectedPaper = null;
                }
            });
        }

        // Auto Perspective toggle
        const autoToggle = document.getElementById('toggle-auto-perspective');
        if (autoToggle) {
            autoToggle.addEventListener('change', (e) => {
                this.autoPerspectiveEnabled = e.target.checked;
            });
        }

        // Gyroscope toggle
        const gyroToggle = document.getElementById('toggle-gyro');
        if (gyroToggle) {
            gyroToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.requestGyroscopePermission();
                } else {
                    this.gyroEnabled = false;
                    this.updateGyroIndicator();
                }
            });
        }

        // Gyroscope indicator button
        const gyroIndicator = document.getElementById('gyro-indicator');
        if (gyroIndicator) {
            gyroIndicator.addEventListener('click', () => {
                if (!this.orientationPermissionGranted) {
                    this.requestGyroscopePermission();
                } else {
                    this.gyroEnabled = !this.gyroEnabled;
                    const toggle = document.getElementById('toggle-gyro');
                    if (toggle) toggle.checked = this.gyroEnabled;
                    this.showInfoBanner(this.gyroEnabled ? '🔄 Gyroscope AN' : '⏸️ Gyroscope AUS');
                    this.updateGyroIndicator();
                }
            });
        }

        // Touch/Mouse events
        this.setupTouchEvents();
    }

    setupGyroscopeListener() {
        // Don't request permission automatically - only setup listener
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (event) => {
                if (!this.gyroEnabled) return;
                
                this.deviceOrientation = {
                    alpha: event.alpha || 0,
                    beta: event.beta || 0,
                    gamma: event.gamma || 0
                };
            });
        } else {
            console.log('Device Orientation not supported');
        }
    }

    async requestGyroscopePermission() {
        try {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.orientationPermissionGranted = true;
                    this.gyroEnabled = true;
                    this.showInfoBanner('✅ Gyroscope aktiviert!');
                } else {
                    this.showInfoBanner('⚠️ Gyroscope-Berechtigung verweigert');
                }
            } else {
                // Non-iOS or older iOS
                this.orientationPermissionGranted = true;
                this.gyroEnabled = true;
                this.showInfoBanner('✅ Gyroscope aktiviert!');
            }
            
            this.updateGyroIndicator();
            const toggle = document.getElementById('toggle-gyro');
            if (toggle) toggle.checked = this.gyroEnabled;
        } catch (error) {
            console.error('Gyroscope permission error:', error);
            this.showInfoBanner('❌ Gyroscope-Fehler');
        }
    }

    setupTouchEvents() {
        const canvas = this.overlayCanvas;
        
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
                this.showInfoBanner('✅ Vorlage geladen!');
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

    calculatePerspectiveFromOrientation() {
        if (!this.gyroEnabled || !this.orientationPermissionGranted) {
            return { skewX: 0, skewY: 0, scaleY: 1 };
        }

        const { beta, gamma } = this.deviceOrientation;
        const betaNormalized = (beta - 45) / 45;
        const gammaNormalized = gamma / 45;
        
        const skewX = Math.max(-0.5, Math.min(0.5, gammaNormalized * 0.3));
        const skewY = Math.max(-0.5, Math.min(0.5, betaNormalized * 0.3));
        const scaleY = 1 + Math.abs(betaNormalized) * 0.1;
        
        return { skewX, skewY, scaleY };
    }

    drawGrid() {
        if (!this.showGrid) return;

        const ctx = this.overlayCtx;
        const width = this.overlayCanvas.width;
        const height = this.overlayCanvas.height;

        ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);

        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.setLineDash([]);

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

        // Use paper detection for positioning if available and enabled
        let x, y;
        if (this.autoPerspectiveEnabled && this.detectedPaper) {
            const transform = this.paperDetector.calculatePerspectiveTransform(
                this.detectedPaper,
                width,
                height
            );
            
            if (transform) {
                // Position template at detected paper center
                x = transform.centerX * width;
                y = transform.centerY * height;
                
                // Apply detected rotation
                ctx.translate(x, y);
                ctx.rotate(transform.rotation + (this.templateRotation * Math.PI) / 180);
                
                // Apply perspective correction
                const skewX = transform.horizontalSkew * 0.5;
                const skewY = transform.verticalSkew * 0.5;
                ctx.transform(1, skewY, skewX, 1, 0, 0);
            } else {
                // Fallback to manual position
                x = this.templatePosition.x * width;
                y = this.templatePosition.y * height;
                ctx.translate(x, y);
                ctx.rotate((this.templateRotation * Math.PI) / 180);
            }
        } else {
            // Manual positioning
            x = this.templatePosition.x * width;
            y = this.templatePosition.y * height;
            ctx.translate(x, y);
            ctx.rotate((this.templateRotation * Math.PI) / 180);
        }

        // Gyroscope perspective (if enabled and no paper detection)
        if (!this.autoPerspectiveEnabled || !this.detectedPaper) {
            const gyroPerspective = this.calculatePerspectiveFromOrientation();
            
            if (this.gyroEnabled && this.orientationPermissionGranted) {
                ctx.transform(
                    1, 
                    gyroPerspective.skewY, 
                    gyroPerspective.skewX, 
                    gyroPerspective.scaleY, 
                    0, 
                    0
                );
            }
        }

        // Manual perspective adjustment
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

    updateDebugDisplay() {
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
                statusEl.textContent = '⚠️ Klick 🔄 für Berechtigung';
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
            indicator.title = 'Gyroscope: Aktiv';
        } else if (!this.orientationPermissionGranted) {
            indicator.classList.add('inactive');
            indicator.title = 'Gyroscope: Klicken für Berechtigung';
        } else {
            indicator.classList.add('inactive');
            indicator.title = 'Gyroscope: Aus';
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Run paper detection
        if (this.paperDetectionEnabled && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.detectedPaper = this.paperDetector.detectPaper(this.video);
        }

        this.drawTemplate();
        this.drawGrid();
        
        // Draw paper detection overlay
        if (this.paperDetectionEnabled && this.detectedPaper) {
            this.paperDetector.drawDetectionOverlay(
                this.overlayCtx,
                this.detectedPaper,
                this.overlayCanvas.width,
                this.overlayCanvas.height
            );
        }
        
        this.updateDebugDisplay();

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize app
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
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker error:', err));
    });
}

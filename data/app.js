// Remote Mouse Controller App
class RemoteMouseApp {
    constructor() {
        this.ws = null;
        this.mouseEnabled = false;  // Start disabled by default
        this.touchActive = false;
        this.scrollActive = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastScrollY = 0;
        this.tapCount = 0;
        this.lastTapTime = 0;
        this.doubleTapTimer = null;
        this.isDragging = false;
        this.reconnectTimer = null;
        this.vibrationEnabled = 'vibrate' in navigator;
        
        // Navigation state
        this.currentPage = 'mouse-control';
        this.navMenuOpen = false;
        
        // Jiggler state
        this.jigglerEnabled = false;
        this.jigglerInterval = null;
        this.jigglerSettings = {
            interval: 5,
            speed: 5,
            range: 50,
            pattern: 'circle'
        };
        this.previewAnimation = null;
        this.countdownInterval = null;
        this.syncInterval = null;
        this.countdownValue = 0;
        this.isMoving = false;
        
        // KeyStroker state
        this.keystrokerEnabled = false;
        this.keystrokerSettings = {
            key: 'F12',
            modifiers: [],
            interval: 5
        };
        this.keystrokerCountdownInterval = null;
        this.keystrokerCountdownValue = 0;
        this.isCapturingKey = false;
        this.capturedModifiers = new Set();
        this.virtualKeyboardModifiers = new Set();
        
        // Constants
        this.DOUBLE_TAP_DELAY = 300;
        this.RECONNECT_DELAY = 3000;
        this.VIBRATION_DURATION = 10;
        
        // DOM Elements
        this.elements = {
            status: document.getElementById('connectionStatus'),
            statusText: document.querySelector('.status-text'),
            touchpad: document.getElementById('touchpad'),
            scrollArea: document.getElementById('scrollArea'),
            leftButton: document.getElementById('leftClick'),
            rightButton: document.getElementById('rightClick'),
            enableToggle: document.getElementById('enableToggle'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            sensitivityValue: document.getElementById('sensitivityValue'),
            touchpadHint: document.getElementById('touchpadHint'),
            
            // Navigation elements
            navMenuToggle: document.getElementById('navMenuToggle'),
            navMenu: document.getElementById('navMenu'),
            navLinks: document.querySelectorAll('.nav-link'),
            
            // Page elements
            pages: document.querySelectorAll('.page-content'),
            
            // Jiggler elements
            jigglerToggle: document.getElementById('jigglerToggle'),
            intervalSlider: document.getElementById('intervalSlider'),
            intervalValue: document.getElementById('intervalValue'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            rangeSlider: document.getElementById('rangeSlider'),
            rangeValue: document.getElementById('rangeValue'),
            patternSelect: document.getElementById('patternSelect'),
            previewContainer: document.getElementById('previewContainer'),
            previewCursor: document.getElementById('previewCursor'),
            
            // Countdown timer elements
            countdownTimer: document.getElementById('countdownTimer'),
            countdownValueDisplay: document.getElementById('countdownValue'),
            
            // KeyStroker elements
            keystrokerToggle: document.getElementById('keystrokerToggle'),
            hidModeSelect: document.getElementById('hidModeSelect'),
            apSsidInput: document.getElementById('apSsidInput'),
            apPassInput: document.getElementById('apPassInput'),
            apHiddenToggle: document.getElementById('apHiddenToggle'),
            apSaveBtn: document.getElementById('apSaveBtn'),
            keyCaptureInput: document.getElementById('keyCaptureInput'),
            keyCaptureHint: document.getElementById('keyCaptureHint'),
            clearKeyBtn: document.getElementById('clearKeyBtn'),
            virtualKeyboardBtn: document.getElementById('virtualKeyboardBtn'),
            keystrokerIntervalSlider: document.getElementById('keystrokerIntervalSlider'),
            keystrokerIntervalValue: document.getElementById('keystrokerIntervalValue'),
            keystrokerCountdown: document.getElementById('keystrokerCountdown'),
            keystrokerCountdownValue: document.getElementById('keystrokerCountdownValue'),
            keystrokerStatusIcon: document.getElementById('keystrokerStatusIcon'),
            keystrokerStatusLabel: document.getElementById('keystrokerStatusLabel'),
            
            // Virtual keyboard modal elements
            virtualKeyboardModal: document.getElementById('virtualKeyboardModal'),
            modalCloseBtn: document.getElementById('modalCloseBtn'),
            keyPreview: document.getElementById('keyPreview'),
            modalClearBtn: document.getElementById('modalClearBtn'),
            modalApplyBtn: document.getElementById('modalApplyBtn')
        };
        
        this.init();
    }
    
    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.setupServiceWorker();
        this.loadJigglerSettings();
        this.loadKeystrokerSettings();
        this.startPreviewAnimation();
        this.createFeedbackElement();
        // Fetch current HID mode to set dropdown
        this.sendMessage({ type: 'getHIDMode' });
    }
    
    createFeedbackElement() {
        const feedback = document.createElement('div');
        feedback.id = 'feedback';
        feedback.className = 'feedback';
        document.body.appendChild(feedback);
    }
    
    showFeedback(message) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.classList.add('show');
        
        setTimeout(() => {
            feedback.classList.remove('show');
        }, 3000);
    }
    
    // WebSocket Management
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
        
        this.ws.onopen = () => this.handleWebSocketOpen();
        this.ws.onclose = () => this.handleWebSocketClose();
        this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
        this.ws.onerror = (error) => console.error('WebSocket error:', error);
    }
    
    handleWebSocketOpen() {
        console.log('WebSocket connected');
        this.updateConnectionStatus(true);
        clearTimeout(this.reconnectTimer);
        this.sendMessage({ type: 'getSettings' });
        this.sendMessage({ type: 'getJigglerSettings' });
        this.sendMessage({ type: 'getAPSettings' });
        
        // Request countdown sync if jiggler is enabled
        if (this.jigglerEnabled) {
            setTimeout(() => {
                this.sendMessage({ type: 'getJigglerCountdown' });
            }, 100);
        }
    }
    
    handleWebSocketClose() {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus(false);
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), this.RECONNECT_DELAY);
    }
    
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'settings') {
                this.mouseEnabled = data.enabled;
                this.elements.enableToggle.checked = data.enabled;
                this.elements.sensitivitySlider.value = data.sensitivity;
                this.elements.sensitivityValue.textContent = `${data.sensitivity.toFixed(1)}×`;
                this.updateUI();
            } else if (data.type === 'jigglerSettings') {
                this.jigglerSettings = data.settings;
                this.jigglerEnabled = data.enabled || false;
                this.updateJigglerUI();
            } else if (data.type === 'jigglerStatus') {
                this.jigglerEnabled = data.enabled;
                this.showFeedback(`Jiggler ${data.enabled ? 'enabled' : 'disabled'}`);
                // Sync countdown when status changes
                if (data.enabled && data.countdown !== undefined) {
                    this.syncCountdown(data.countdown);
                }
            } else if (data.type === 'jigglerSettingsUpdated') {
                this.jigglerSettings = data.settings;
                this.updateJigglerUI();
                this.showFeedback('Jiggler settings updated');
            } else if (data.type === 'jigglerMovementStart') {
                // Movement is starting, pause countdown
                console.log('Jiggler movement started');
                this.isMoving = true;
                if (this.jigglerEnabled) {
                    this.pauseCountdown();
                }
            } else if (data.type === 'jigglerMovementEnd') {
                // Movement ended, resume and reset countdown
                console.log('Jiggler movement ended');
                this.isMoving = false;
                if (this.jigglerEnabled) {
                    this.resetCountdownToFull();
                }
            } else if (data.type === 'jigglerCountdown') {
                // Sync countdown with backend
                if (this.jigglerEnabled && data.remaining !== undefined) {
                    // Update moving state from backend
                    if (data.isMoving !== undefined) {
                        this.isMoving = data.isMoving;
                    }
                    
                    // Only sync countdown if not moving
                    if (!this.isMoving && data.remaining >= 0) {
                        this.syncCountdown(data.remaining);
                    }
                    
                    this.updateCountdownDisplay();
                }
            } else if (data.type === 'hidMode') {
                if (this.elements.hidModeSelect) {
                    this.elements.hidModeSelect.value = String(data.mode);
                }
            } else if (data.type === 'apSettings') {
                if (this.elements.apSsidInput && (data.ssid !== undefined)) this.elements.apSsidInput.value = data.ssid;
                if (this.elements.apHiddenToggle && (data.hidden !== undefined)) this.elements.apHiddenToggle.checked = !!data.hidden;
                if (this.elements.apPassInput && (data.pass !== undefined)) this.elements.apPassInput.value = data.pass;
            } else if (data.type === 'apSettingsSaved') {
                this.showFeedback('AP settings saved. Rebooting...');
            } else if (data.type === 'rebootingForKeyboardHID' || data.type === 'rebootingForMouseOnlyHID' || data.type === 'rebootingForBootKeyboardHID' || data.type === 'rebootingForComboHID') {
                this.showFeedback('USB mode changing... device will reboot');
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }
    
    sendMessage(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.status.classList.add('connected');
            this.elements.status.classList.remove('disconnected');
            this.elements.statusText.textContent = 'Connected';
        } else {
            this.elements.status.classList.remove('connected');
            this.elements.status.classList.add('disconnected');
            this.elements.statusText.textContent = 'Disconnected';
        }
    }
    
    // Navigation Management
    setupNavigation() {
        // Hamburger menu toggle
        this.elements.navMenuToggle.addEventListener('click', () => {
            this.toggleNavMenu();
        });
        
        // Navigation links
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.switchPage(page);
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-bar') && this.navMenuOpen) {
                this.closeNavMenu();
            }
        });
        
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && (hash === 'mouse-control' || hash === 'mouse-jiggler' || hash === 'key-stroker' || hash === 'settings')) {
                this.switchPage(hash);
            }
        });
        
        // Set initial page from hash
        const hash = window.location.hash.slice(1);
        if (hash && (hash === 'mouse-control' || hash === 'mouse-jiggler' || hash === 'key-stroker' || hash === 'settings')) {
            this.switchPage(hash);
        }
    }
    
    toggleNavMenu() {
        this.navMenuOpen = !this.navMenuOpen;
        this.elements.navMenuToggle.classList.toggle('active', this.navMenuOpen);
        this.elements.navMenu.classList.toggle('active', this.navMenuOpen);
    }
    
    closeNavMenu() {
        this.navMenuOpen = false;
        this.elements.navMenuToggle.classList.remove('active');
        this.elements.navMenu.classList.remove('active');
    }
    
    switchPage(page) {
        // Update current page
        this.currentPage = page;
        
        // Update navigation links
        this.elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });
        
        // Show/hide page content
        this.elements.pages.forEach(pageElement => {
            pageElement.classList.toggle('active', pageElement.id === `${page}-page`);
        });
        
        // Update URL hash
        window.location.hash = page;
        
        // Close mobile menu
        this.closeNavMenu();
        
        // Update preview animation if on jiggler page
        if (page === 'mouse-jiggler') {
            this.startPreviewAnimation();
        } else {
            this.stopPreviewAnimation();
        }
    }
    
    // Event Listeners Setup
    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Touchpad events
        this.setupTouchpadEvents();
        
        // Scroll area events
        this.setupScrollEvents();
        
        // Button events
        this.setupButtonEvents();
        
        // Settings events
        this.elements.enableToggle.addEventListener('change', () => this.handleToggleChange());
        this.elements.sensitivitySlider.addEventListener('input', () => this.handleSensitivityChange());
        
        // Jiggler events
        this.setupJigglerEvents();
        
        // KeyStroker events
        this.setupKeystrokerEvents();
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isDragging) {
                this.handleTouchpadEnd();
            }
        });
    }
    
    setupJigglerEvents() {
        this.elements.jigglerToggle.addEventListener('change', () => this.handleJigglerToggle());
        this.elements.intervalSlider.addEventListener('input', () => this.handleIntervalChange());
        this.elements.speedSlider.addEventListener('input', () => this.handleSpeedChange());
        this.elements.rangeSlider.addEventListener('input', () => this.handleRangeChange());
        this.elements.patternSelect.addEventListener('change', () => this.handlePatternChange());
    }
    
    setupKeystrokerEvents() {
        this.elements.keystrokerToggle.addEventListener('change', () => this.handleKeystrokerToggle());
        this.elements.keystrokerIntervalSlider.addEventListener('input', () => this.handleKeystrokerIntervalChange());
        this.elements.hidModeSelect.addEventListener('change', () => this.handleHIDModeChange());
        if (this.elements.apSaveBtn) {
            this.elements.apSaveBtn.addEventListener('click', () => this.handleAPSave());
        }
        
        // Key capture events
        this.elements.keyCaptureInput.addEventListener('click', () => this.startKeyCapture());
        this.elements.clearKeyBtn.addEventListener('click', () => this.clearCapturedKey());
        this.elements.virtualKeyboardBtn.addEventListener('click', () => this.openVirtualKeyboard());
        
        // Virtual keyboard modal events
        this.elements.modalCloseBtn.addEventListener('click', () => this.closeVirtualKeyboard());
        this.elements.modalClearBtn.addEventListener('click', () => this.clearVirtualKeyboard());
        this.elements.modalApplyBtn.addEventListener('click', () => this.applyVirtualKeyboard());
        
        // Virtual keyboard key events
        document.querySelectorAll('.modifier-key').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleModifier(e.target.closest('.modifier-key')));
        });
        
        document.querySelectorAll('.vk-key').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectVirtualKey(e.target.closest('.vk-key')));
        });
        
        // Close modal on overlay click
        this.elements.virtualKeyboardModal.addEventListener('click', (e) => {
            if (e.target === this.elements.virtualKeyboardModal) {
                this.closeVirtualKeyboard();
            }
        });
    }
    
    // Jiggler Management
    handleJigglerToggle() {
        this.jigglerEnabled = this.elements.jigglerToggle.checked;
        
        this.sendMessage({ 
            type: 'setJigglerEnabled', 
            enabled: this.jigglerEnabled 
        });
        
        this.saveJigglerSettings();
        
        if (this.jigglerEnabled) {
            this.startCountdown();
            // Request countdown sync from backend
            this.sendMessage({ type: 'getJigglerCountdown' });
        } else {
            this.stopCountdown();
        }
    }
    
    handleIntervalChange() {
        this.jigglerSettings.interval = parseInt(this.elements.intervalSlider.value);
        this.elements.intervalValue.textContent = this.formatTime(this.jigglerSettings.interval);
        
        this.sendMessage({
            type: 'setJigglerSettings',
            interval: this.jigglerSettings.interval,
            speed: this.jigglerSettings.speed,
            range: this.jigglerSettings.range,
            pattern: this.jigglerSettings.pattern
        });
        
        this.saveJigglerSettings();
        this.updatePreviewAnimation();
        this.resetCountdown();
    }
    
    handleSpeedChange() {
        this.jigglerSettings.speed = parseInt(this.elements.speedSlider.value);
        const speedLabels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
        this.elements.speedValue.textContent = speedLabels[Math.floor((this.jigglerSettings.speed - 1) / 2)];
        
        this.sendMessage({
            type: 'setJigglerSettings',
            interval: this.jigglerSettings.interval,
            speed: this.jigglerSettings.speed,
            range: this.jigglerSettings.range,
            pattern: this.jigglerSettings.pattern
        });
        
        this.saveJigglerSettings();
        this.updatePreviewAnimation();
    }
    
    handleRangeChange() {
        this.jigglerSettings.range = parseInt(this.elements.rangeSlider.value);
        this.elements.rangeValue.textContent = `${this.jigglerSettings.range}px`;
        
        this.sendMessage({
            type: 'setJigglerSettings',
            interval: this.jigglerSettings.interval,
            speed: this.jigglerSettings.speed,
            range: this.jigglerSettings.range,
            pattern: this.jigglerSettings.pattern
        });
        
        this.saveJigglerSettings();
        this.updatePreviewAnimation();
    }
    
    handlePatternChange() {
        this.jigglerSettings.pattern = this.elements.patternSelect.value;
        
        this.sendMessage({
            type: 'setJigglerSettings',
            interval: this.jigglerSettings.interval,
            speed: this.jigglerSettings.speed,
            range: this.jigglerSettings.range,
            pattern: this.jigglerSettings.pattern
        });
        
        this.saveJigglerSettings();
        this.updatePreviewAnimation();
    }
    
    // Time formatting function
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            if (remainingSeconds === 0) {
                return `${minutes}m`;
            } else {
                return `${minutes}m ${remainingSeconds}s`;
            }
        }
    }
    
    // Countdown timer functions
    startCountdown() {
        this.stopCountdown();
        this.countdownValue = this.jigglerSettings.interval;
        this.elements.countdownTimer.style.display = 'block';
        this.updateCountdownDisplay();
        
        // Main countdown interval
        this.countdownInterval = setInterval(() => {
            // Only count down if not moving
            if (!this.isMoving) {
                this.countdownValue--;
                if (this.countdownValue <= 0) {
                    // Don't auto-reset here, wait for backend confirmation
                    this.countdownValue = 0;
                }
                this.updateCountdownDisplay();
            }
        }, 1000);
        
        // Periodic sync with backend every 5 seconds
        this.syncInterval = setInterval(() => {
            if (this.jigglerEnabled && !this.isMoving) {
                this.sendMessage({ type: 'getJigglerCountdown' });
            }
        }, 5000);
    }
    
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.elements.countdownTimer.style.display = 'none';
    }
    
    pauseCountdown() {
        // Update display to show paused state
        this.updateCountdownDisplay();
    }
    
    resetCountdown() {
        if (this.jigglerEnabled) {
            this.startCountdown();
        }
    }
    
    resetCountdownToFull() {
        // Reset countdown to full interval when movement occurs
        this.countdownValue = this.jigglerSettings.interval;
        this.updateCountdownDisplay();
        
        // Restart the countdown timer
        if (this.jigglerEnabled) {
            this.stopCountdown();
            this.startCountdown();
        }
    }
    
    syncCountdown(remainingSeconds) {
        // Sync countdown with backend value
        if (remainingSeconds !== undefined && remainingSeconds >= 0) {
            this.countdownValue = Math.round(remainingSeconds);
            this.updateCountdownDisplay();
            
            // If countdown is not running but should be, start it
            if (!this.countdownInterval && this.jigglerEnabled) {
                this.startCountdown();
            }
        }
    }
    
    updateCountdownDisplay() {
        if (this.elements.countdownValueDisplay) {
            if (this.isMoving) {
                this.elements.countdownValueDisplay.textContent = 'Moving...';
                this.elements.countdownTimer.classList.add('moving');
            } else if (this.countdownValue <= 0) {
                this.elements.countdownValueDisplay.textContent = 'Starting...';
                this.elements.countdownTimer.classList.remove('moving');
            } else {
                this.elements.countdownValueDisplay.textContent = this.formatTime(this.countdownValue);
                this.elements.countdownTimer.classList.remove('moving');
            }
        }
    }
    
    // KeyStroker Management
    handleKeystrokerToggle() {
        this.keystrokerEnabled = this.elements.keystrokerToggle.checked;
        
        this.sendMessage({ 
            type: 'setKeystrokerEnabled', 
            enabled: this.keystrokerEnabled 
        });
        
        if (this.keystrokerEnabled) {
            this.startKeystrokerCountdown();
            this.elements.keystrokerCountdown.style.display = 'block';
            this.updateKeystrokerStatus();
            // Add active class for visual feedback
            this.elements.keystrokerStatusIcon.parentElement.parentElement.classList.add('keystroker-active');
        } else {
            this.stopKeystrokerCountdown();
            this.elements.keystrokerCountdown.style.display = 'none';
            this.updateKeystrokerStatus();
            // Remove active class
            this.elements.keystrokerStatusIcon.parentElement.parentElement.classList.remove('keystroker-active');
        }
        
        this.saveKeystrokerSettings();
    }
    

    
    handleKeystrokerIntervalChange() {
        this.keystrokerSettings.interval = parseInt(this.elements.keystrokerIntervalSlider.value);
        this.elements.keystrokerIntervalValue.textContent = this.formatTime(this.keystrokerSettings.interval);
        
        this.sendMessage({
            type: 'setKeystrokerSettings',
            key: this.keystrokerSettings.key,
            interval: this.keystrokerSettings.interval
        });
        
        this.saveKeystrokerSettings();
        this.updateKeystrokerStatus();
        this.resetKeystrokerCountdown();
    }
    
    startKeystrokerCountdown() {
        this.stopKeystrokerCountdown();
        this.keystrokerCountdownValue = this.keystrokerSettings.interval;
        this.updateKeystrokerCountdownDisplay();
        
        this.keystrokerCountdownInterval = setInterval(() => {
            this.keystrokerCountdownValue--;
            if (this.keystrokerCountdownValue <= 0) {
                this.keystrokerCountdownValue = this.keystrokerSettings.interval;
            }
            this.updateKeystrokerCountdownDisplay();
        }, 1000);
    }
    
    stopKeystrokerCountdown() {
        if (this.keystrokerCountdownInterval) {
            clearInterval(this.keystrokerCountdownInterval);
            this.keystrokerCountdownInterval = null;
        }
    }
    
    resetKeystrokerCountdown() {
        if (this.keystrokerEnabled) {
            this.startKeystrokerCountdown();
        }
    }
    
    updateKeystrokerCountdownDisplay() {
        if (this.elements.keystrokerCountdownValue) {
            if (this.keystrokerCountdownValue <= 0) {
                this.elements.keystrokerCountdownValue.textContent = 'Now';
            } else {
                this.elements.keystrokerCountdownValue.textContent = `${this.keystrokerCountdownValue}s`;
            }
        }
    }
    
    updateKeystrokerStatus() {
        const keyCombo = this.formatKeyCombo(this.keystrokerSettings.modifiers, this.keystrokerSettings.key);
        const statusText = this.keystrokerEnabled 
            ? `Pressing ${keyCombo} every ${this.keystrokerSettings.interval} seconds`
            : `Press ${keyCombo} every ${this.keystrokerSettings.interval} seconds`;
        this.elements.keystrokerStatusLabel.textContent = statusText;
    }
    
    // Key capture methods
    startKeyCapture() {
        if (this.isCapturingKey) {
            this.stopKeyCapture();
            return;
        }
        
        this.isCapturingKey = true;
        this.capturedModifiers.clear();
        this.elements.keyCaptureInput.classList.add('capturing');
        this.elements.keyCaptureHint.classList.add('visible');
        this.elements.keyCaptureHint.textContent = 'Press any key or combination';
        
        // Add event listeners for key capture
        this.keydownHandler = (e) => this.handleKeyDown(e);
        this.keyupHandler = (e) => this.handleKeyUp(e);
        
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
        
        // Stop capture on blur
        this.elements.keyCaptureInput.addEventListener('blur', () => {
            setTimeout(() => this.stopKeyCapture(), 100);
        });
    }
    
    stopKeyCapture() {
        this.isCapturingKey = false;
        this.capturedModifiers.clear();
        this.elements.keyCaptureInput.classList.remove('capturing');
        this.elements.keyCaptureHint.classList.remove('visible');
        
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            document.removeEventListener('keyup', this.keyupHandler);
        }
    }
    
    handleKeyDown(e) {
        if (!this.isCapturingKey) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Track modifier keys
        if (e.ctrlKey || e.key === 'Control') this.capturedModifiers.add('ctrl');
        if (e.altKey || e.key === 'Alt') this.capturedModifiers.add('alt');
        if (e.shiftKey || e.key === 'Shift') this.capturedModifiers.add('shift');
        if (e.metaKey || e.key === 'Meta') this.capturedModifiers.add('meta');
        
        // Ignore modifier-only presses
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            return;
        }
        
        // Capture the actual key
        let key = e.key;
        
        // Normalize key names
        if (key === ' ') key = 'Space';
        if (key === 'ArrowUp') key = '↑';
        if (key === 'ArrowDown') key = '↓';
        if (key === 'ArrowLeft') key = '←';
        if (key === 'ArrowRight') key = '→';
        
        // Store the captured key combination
        this.keystrokerSettings.key = key;
        this.keystrokerSettings.modifiers = Array.from(this.capturedModifiers);
        
        // Update display
        const keyCombo = this.formatKeyCombo(this.keystrokerSettings.modifiers, key);
        this.elements.keyCaptureInput.value = keyCombo;
        
        // Send to backend
        this.sendMessage({
            type: 'setKeystrokerSettings',
            key: this.keystrokerSettings.key,
            modifiers: this.keystrokerSettings.modifiers,
            interval: this.keystrokerSettings.interval
        });
        
        this.saveKeystrokerSettings();
        this.updateKeystrokerStatus();
        this.resetKeystrokerCountdown();
        
        // Stop capturing
        this.stopKeyCapture();
    }
    
    handleKeyUp(e) {
        if (!this.isCapturingKey) return;
        
        // Track modifier key releases
        if (e.key === 'Control') this.capturedModifiers.delete('ctrl');
        if (e.key === 'Alt') this.capturedModifiers.delete('alt');
        if (e.key === 'Shift') this.capturedModifiers.delete('shift');
        if (e.key === 'Meta') this.capturedModifiers.delete('meta');
    }
    
    clearCapturedKey() {
        this.keystrokerSettings.key = '';
        this.keystrokerSettings.modifiers = [];
        this.elements.keyCaptureInput.value = '';
        this.elements.keyCaptureInput.placeholder = 'Click to set key...';
        
        this.sendMessage({
            type: 'setKeystrokerSettings',
            key: '',
            modifiers: [],
            interval: this.keystrokerSettings.interval
        });
        
        this.saveKeystrokerSettings();
        this.updateKeystrokerStatus();
    }
    
    // Virtual keyboard methods
    openVirtualKeyboard() {
        this.elements.virtualKeyboardModal.classList.add('show');
        this.virtualKeyboardModifiers.clear();
        this.updateVirtualKeyboardPreview();
        
        // Reset modifier buttons
        document.querySelectorAll('.modifier-key').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set current modifiers if any
        if (this.keystrokerSettings.modifiers) {
            this.keystrokerSettings.modifiers.forEach(mod => {
                this.virtualKeyboardModifiers.add(mod);
                const btn = document.querySelector(`.modifier-key[data-modifier="${mod}"]`);
                if (btn) btn.classList.add('active');
            });
        }
        
        this.updateVirtualKeyboardPreview();
    }
    
    closeVirtualKeyboard() {
        this.elements.virtualKeyboardModal.classList.remove('show');
        this.virtualKeyboardModifiers.clear();
    }
    
    toggleModifier(btn) {
        const modifier = btn.dataset.modifier;
        
        if (this.virtualKeyboardModifiers.has(modifier)) {
            this.virtualKeyboardModifiers.delete(modifier);
            btn.classList.remove('active');
        } else {
            this.virtualKeyboardModifiers.add(modifier);
            btn.classList.add('active');
        }
        
        this.updateVirtualKeyboardPreview();
    }
    
    selectVirtualKey(btn) {
        const key = btn.dataset.key;
        
        // Store the combination
        this.keystrokerSettings.key = key;
        this.keystrokerSettings.modifiers = Array.from(this.virtualKeyboardModifiers);
        
        // Update display
        const keyCombo = this.formatKeyCombo(this.keystrokerSettings.modifiers, key);
        this.elements.keyCaptureInput.value = keyCombo;
        
        // Send to backend
        this.sendMessage({
            type: 'setKeystrokerSettings',
            key: this.keystrokerSettings.key,
            modifiers: this.keystrokerSettings.modifiers,
            interval: this.keystrokerSettings.interval
        });
        
        this.saveKeystrokerSettings();
        this.updateKeystrokerStatus();
        this.resetKeystrokerCountdown();
        
        // Close modal
        this.closeVirtualKeyboard();
    }
    
    clearVirtualKeyboard() {
        this.virtualKeyboardModifiers.clear();
        document.querySelectorAll('.modifier-key').forEach(btn => {
            btn.classList.remove('active');
        });
        this.updateVirtualKeyboardPreview();
    }
    
    applyVirtualKeyboard() {
        if (this.virtualKeyboardModifiers.size > 0 || this.elements.keyPreview.textContent !== 'Press keys...') {
            // A key has been selected, apply it
            const currentPreview = this.elements.keyPreview.textContent;
            if (currentPreview !== 'Press keys...') {
                this.elements.keyCaptureInput.value = currentPreview;
            }
        }
        this.closeVirtualKeyboard();
    }
    
    updateVirtualKeyboardPreview() {
        const modifiers = Array.from(this.virtualKeyboardModifiers);
        const preview = this.formatKeyCombo(modifiers, '');
        
        if (preview) {
            this.elements.keyPreview.textContent = preview + '...';
        } else {
            this.elements.keyPreview.textContent = 'Press keys...';
        }
    }
    
    formatKeyCombo(modifiers, key) {
        const parts = [];
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        
        // Order modifiers consistently
        if (modifiers.includes('meta')) {
            parts.push(isMac ? '⌘' : 'Win');
        }
        if (modifiers.includes('ctrl')) {
            parts.push(isMac ? '⌃' : 'Ctrl');
        }
        if (modifiers.includes('alt')) {
            parts.push(isMac ? '⌥' : 'Alt');
        }
        if (modifiers.includes('shift')) {
            parts.push(isMac ? '⇧' : 'Shift');
        }
        
        if (key) {
            // Format special keys
            if (key === ' ') {
                parts.push('Space');
            } else if (key.length === 1) {
                parts.push(key.toUpperCase());
            } else {
                parts.push(key);
            }
        }
        
        return parts.join(isMac ? '' : '+');
    }
    
    saveKeystrokerSettings() {
        try {
            localStorage.setItem('keystrokerSettings', JSON.stringify({
                enabled: this.keystrokerEnabled,
                settings: this.keystrokerSettings
            }));
        } catch (e) {
            console.error('Error saving keystroker settings:', e);
        }
    }
    
    loadKeystrokerSettings() {
        try {
            const saved = localStorage.getItem('keystrokerSettings');
            if (saved) {
                const data = JSON.parse(saved);
                this.keystrokerEnabled = data.enabled || false;
                this.keystrokerSettings = data.settings || {
                    key: 'F12',
                    modifiers: [],
                    interval: 5
                };
                // Ensure modifiers array exists for backward compatibility
                if (!this.keystrokerSettings.modifiers) {
                    this.keystrokerSettings.modifiers = [];
                }
                this.updateKeystrokerUI();
            }
        } catch (e) {
            console.error('Error loading keystroker settings:', e);
        }
    }
    
    updateKeystrokerUI() {
        this.elements.keystrokerToggle.checked = this.keystrokerEnabled;
        const keyCombo = this.formatKeyCombo(this.keystrokerSettings.modifiers || [], this.keystrokerSettings.key);
        this.elements.keyCaptureInput.value = keyCombo;
        this.elements.keystrokerIntervalSlider.value = this.keystrokerSettings.interval;
        this.elements.keystrokerIntervalValue.textContent = this.formatTime(this.keystrokerSettings.interval);
        this.updateKeystrokerStatus();
        
        if (this.keystrokerEnabled) {
            this.elements.keystrokerCountdown.style.display = 'block';
            this.startKeystrokerCountdown();
            this.elements.keystrokerStatusIcon.parentElement.parentElement.classList.add('keystroker-active');
        } else {
            this.elements.keystrokerCountdown.style.display = 'none';
            this.elements.keystrokerStatusIcon.parentElement.parentElement.classList.remove('keystroker-active');
        }
    }

    // HID Mode
    handleHIDModeChange() {
        const mode = parseInt(this.elements.hidModeSelect.value);
        if (Number.isNaN(mode)) return;
        // Inform user about imminent reboot
        this.sendMessage({ type: 'setHIDMode', mode });
        this.showFeedback('Changing USB mode, device will reboot...');
    }

    handleAPSave() {
        const ssid = (this.elements.apSsidInput?.value || '').trim();
        const pass = (this.elements.apPassInput?.value || '').trim();
        const hidden = !!this.elements.apHiddenToggle?.checked;
        if (pass.length > 0 && pass.length < 8) {
            this.showFeedback('Password must be 8+ characters or empty');
            return;
        }
        this.sendMessage({ type: 'setAPSettings', ssid, pass, hidden });
        this.showFeedback('Saving AP settings... device will reboot');
    }

    
    generateCirclePattern(range, speed) {
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 2 pixels of range, minimum 30 steps
        const steps = Math.max(30, range / 2);
        // Speed affects step size, not number of steps
        const movements = [];
        const radius = range / 2;
        
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * 2 * Math.PI;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return movements;
    }
    
    generateFigure8Pattern(range, speed) {
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 1.5 pixels of range, minimum 40 steps
        const steps = Math.max(40, range * 2 / 3);
        // Speed affects step size, not number of steps
        const movements = [];
        const radius = range / 3;
        
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * 2 * Math.PI;
            const x = radius * Math.sin(t);
            const y = radius * Math.sin(t) * Math.cos(t);
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return movements;
    }
    
    generateSpiralPattern(range, speed) {
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 1 pixel of range, minimum 50 steps
        const steps = Math.max(50, range);
        // Speed affects step size, not number of steps
        const movements = [];
        const maxRadius = range / 2;
        
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * 4 * Math.PI;
            const radius = (i / steps) * maxRadius;
            const x = Math.cos(t) * radius;
            const y = Math.sin(t) * radius;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return movements;
    }
    
    generateSquarePattern(range, speed) {
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 2 pixels of range, minimum 25 steps
        const steps = Math.max(25, range / 2);
        // Speed affects step size, not number of steps
        const movements = [];
        const size = range / 2;
        const stepsPerSide = Math.floor(steps / 4);
        
        // Top side
        for (let i = 0; i < stepsPerSide; i++) {
            const t = i / stepsPerSide;
            const x = -size + (i / stepsPerSide) * size * 2;
            const y = -size;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        // Right side
        for (let i = 0; i < stepsPerSide; i++) {
            const t = i / stepsPerSide;
            const x = size;
            const y = -size + (i / stepsPerSide) * size * 2;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        // Bottom side
        for (let i = 0; i < stepsPerSide; i++) {
            const t = i / stepsPerSide;
            const x = size - (i / stepsPerSide) * size * 2;
            const y = size;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        // Left side
        for (let i = 0; i < stepsPerSide; i++) {
            const t = i / stepsPerSide;
            const x = -size;
            const y = size - (i / stepsPerSide) * size * 2;
            movements.push({ x: Math.round(x), y: Math.round(y) });
        }
        
        return movements;
    }
    
    generateTrianglePattern(range, speed) {
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 2 pixels of range, minimum 30 steps
        const steps = Math.max(30, range / 2);
        // Speed affects step size, not number of steps
        const movements = [];
        const size = range / 2;
        const stepsPerSide = Math.floor(steps / 3);
        
        // Calculate triangle vertices
        const vertices = [
            { x: 0, y: -size },
            { x: size * Math.cos(Math.PI / 6), y: size * Math.sin(Math.PI / 6) },
            { x: -size * Math.cos(Math.PI / 6), y: size * Math.sin(Math.PI / 6) }
        ];
        
        // Generate movements along triangle sides
        for (let side = 0; side < 3; side++) {
            const start = vertices[side];
            const end = vertices[(side + 1) % 3];
            
            for (let i = 0; i < stepsPerSide; i++) {
                const t = i / stepsPerSide;
                const x = start.x + (end.x - start.x) * t;
                const y = start.y + (end.y - start.y) * t;
                movements.push({ x: Math.round(x), y: Math.round(y) });
            }
        }
        
        return movements;
    }
    
    generateWanderPattern(range, speed) {
        // Generates a long random walk path that smoothly changes direction.
        // Calculate steps based on range: more range = more steps for smooth movement
        // Base: 1 step per 1 pixel of range, minimum 200 steps
        const steps = Math.max(200, range);
        const movements = [];
        let x = 0;
        let y = 0;
        // Initial direction
        let angle = Math.random() * Math.PI * 2;
        // Step length scales with range and speed
        const stepLength = Math.max(1, range / 40) * (speed / 5);

        for (let i = 0; i < steps; i++) {
            // Randomly change angle a little each step to create a wandering effect
            angle += (Math.random() - 0.5) * Math.PI / 3; // turn up to ±60°

            // Move in the current direction
            x += Math.cos(angle) * stepLength;
            y += Math.sin(angle) * stepLength;

            // Keep walk roughly within range by reflecting direction when we get too far
            const distance = Math.sqrt(x * x + y * y);
            const maxRadius = range / 2;
            if (distance > maxRadius) {
                // Reflect direction back towards center
                const reflectAngle = Math.atan2(y, x) + Math.PI; // back towards origin
                angle = reflectAngle + (Math.random() - 0.5) * Math.PI / 4; // add some randomness
                x = Math.cos(angle) * maxRadius;
                y = Math.sin(angle) * maxRadius;
            }

            movements.push({ x: Math.round(x), y: Math.round(y) });
        }

        return movements;
    }
    
    // Preview Animation
    startPreviewAnimation() {
        if (this.currentPage === 'mouse-jiggler') {
            this.updatePreviewAnimation();
        }
    }
    
    stopPreviewAnimation() {
        if (this.previewAnimation) {
            clearTimeout(this.previewAnimation);
            this.previewAnimation = null;
        }
    }
    
    updatePreviewAnimation() {
        this.stopPreviewAnimation();
        
        if (this.currentPage !== 'mouse-jiggler') return;
        
        const pattern = this.jigglerSettings.pattern;
        const range = this.jigglerSettings.range;
        const speed = this.jigglerSettings.speed;
        
        let movements = [];
        
        switch (pattern) {
            case 'circle':
                movements = this.generateCirclePattern(range, speed);
                break;
            case 'figure8':
                movements = this.generateFigure8Pattern(range, speed);
                break;
            case 'spiral':
                movements = this.generateSpiralPattern(range, speed);
                break;
            case 'square':
                movements = this.generateSquarePattern(range, speed);
                break;
            case 'triangle':
                movements = this.generateTrianglePattern(range, speed);
                break;
            case 'wander':
                movements = this.generateWanderPattern(range, speed);
                break;
        }
        
        this.animatePreview(movements);
    }
    
    animatePreview(movements) {
        const container = this.elements.previewContainer;
        const cursor = this.elements.previewCursor;
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        const scale = Math.min(containerRect.width, containerRect.height) / 200; // Scale to fit container
        
        let currentIndex = 0;
        const animationSpeed = Math.max(50, 200 - this.jigglerSettings.speed * 15); // Faster speed = faster animation
        
        const animate = () => {
            if (this.currentPage !== 'mouse-jiggler') return;
            
            const movement = movements[currentIndex];
            const x = centerX + movement.x * scale;
            const y = centerY + movement.y * scale;
            
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
            
            currentIndex = (currentIndex + 1) % movements.length;
            
            this.previewAnimation = setTimeout(animate, animationSpeed);
        };
        
        animate();
    }
    
    // Settings Management
    loadJigglerSettings() {
        const saved = localStorage.getItem('jigglerSettings');
        if (saved) {
            try {
                this.jigglerSettings = { ...this.jigglerSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading jiggler settings:', e);
            }
        }
        this.updateJigglerUI();
    }
    
    saveJigglerSettings() {
        try {
            localStorage.setItem('jigglerSettings', JSON.stringify(this.jigglerSettings));
        } catch (e) {
            console.error('Error saving jiggler settings:', e);
        }
    }
    
    updateJigglerUI() {
        this.elements.jigglerToggle.checked = this.jigglerEnabled;
        this.elements.intervalSlider.value = this.jigglerSettings.interval;
        this.elements.intervalValue.textContent = this.formatTime(this.jigglerSettings.interval);
        this.elements.speedSlider.value = this.jigglerSettings.speed;
        this.elements.rangeSlider.value = this.jigglerSettings.range;
        this.elements.rangeValue.textContent = `${this.jigglerSettings.range}px`;
        this.elements.patternSelect.value = this.jigglerSettings.pattern;
        
        const speedLabels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
        this.elements.speedValue.textContent = speedLabels[Math.floor((this.jigglerSettings.speed - 1) / 2)];
        
        // Update countdown timer state
        if (this.jigglerEnabled) {
            this.startCountdown();
        } else {
            this.stopCountdown();
        }
    }
    
    setupTouchpadEvents() {
        const touchpad = this.elements.touchpad;
        
        // Mouse events
        touchpad.addEventListener('mousedown', (e) => this.handleTouchpadStart(e));
        touchpad.addEventListener('mousemove', (e) => this.handleTouchpadMove(e));
        touchpad.addEventListener('mouseup', (e) => this.handleTouchpadEnd(e));
        touchpad.addEventListener('mouseleave', (e) => this.handleTouchpadEnd(e));
        
        // Touch events
        touchpad.addEventListener('touchstart', (e) => this.handleTouchpadStart(e), { passive: false });
        touchpad.addEventListener('touchmove', (e) => this.handleTouchpadMove(e), { passive: false });
        touchpad.addEventListener('touchend', (e) => this.handleTouchpadEnd(e), { passive: false });
        touchpad.addEventListener('touchcancel', (e) => this.handleTouchpadEnd(e), { passive: false });
    }
    
    setupScrollEvents() {
        const scrollArea = this.elements.scrollArea;
        
        // Mouse events
        scrollArea.addEventListener('mousedown', (e) => this.handleScrollStart(e));
        scrollArea.addEventListener('mousemove', (e) => this.handleScrollMove(e));
        scrollArea.addEventListener('mouseup', (e) => this.handleScrollEnd(e));
        scrollArea.addEventListener('mouseleave', (e) => this.handleScrollEnd(e));
        
        // Touch events
        scrollArea.addEventListener('touchstart', (e) => this.handleScrollStart(e), { passive: false });
        scrollArea.addEventListener('touchmove', (e) => this.handleScrollMove(e), { passive: false });
        scrollArea.addEventListener('touchend', (e) => this.handleScrollEnd(e), { passive: false });
        scrollArea.addEventListener('touchcancel', (e) => this.handleScrollEnd(e), { passive: false });
    }
    
    setupButtonEvents() {
        [this.elements.leftButton, this.elements.rightButton].forEach(button => {
            // Mouse events
            button.addEventListener('mousedown', (e) => this.handleButtonPress(button, e));
            button.addEventListener('mouseup', (e) => this.handleButtonRelease(button, e));
            button.addEventListener('mouseleave', (e) => this.handleButtonRelease(button, e));
            
            // Touch events
            button.addEventListener('touchstart', (e) => this.handleButtonPress(button, e), { passive: false });
            button.addEventListener('touchend', (e) => this.handleButtonRelease(button, e), { passive: false });
            button.addEventListener('touchcancel', (e) => this.handleButtonRelease(button, e), { passive: false });
        });
    }
    
    // Touchpad Handlers
    handleTouchpadStart(e) {
        if (!this.mouseEnabled) return;
        
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        
        this.touchStartX = this.lastTouchX = touch.clientX;
        this.touchStartY = this.lastTouchY = touch.clientY;
        this.touchActive = true;
        
        this.elements.touchpad.classList.add('active');
        this.updateTouchpadVisualFeedback(touch.clientX, touch.clientY);
        
        // Handle double-tap
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - this.lastTapTime;
        
        if (timeSinceLastTap < this.DOUBLE_TAP_DELAY) {
            this.tapCount++;
            if (this.tapCount === 2) {
                this.handleDoubleTap();
            }
        } else {
            this.tapCount = 1;
            clearTimeout(this.doubleTapTimer);
            this.doubleTapTimer = setTimeout(() => {
                this.tapCount = 0;
            }, this.DOUBLE_TAP_DELAY);
        }
        
        this.lastTapTime = currentTime;
    }
    
    handleTouchpadMove(e) {
        if (!this.mouseEnabled || !this.touchActive) return;
        
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
        
        this.updateTouchpadVisualFeedback(touch.clientX, touch.clientY);
        
        this.sendMessage({
            type: 'move',
            x: deltaX,
            y: deltaY
        });
    }
    
    handleTouchpadEnd(e) {
        if (!this.touchActive) return;
        
        e.preventDefault();
        this.touchActive = false;
        this.elements.touchpad.classList.remove('active');
        
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - this.touchStartX, 2) +
            Math.pow(touch.clientY - this.touchStartY, 2)
        );
        
        // Handle single tap click
        if (moveDistance < 10 && this.tapCount === 1 && !this.isDragging) {
            this.doubleTapTimer = setTimeout(() => {
                if (this.tapCount === 1) {
                    this.sendMessage({ type: 'click', button: 'left' });
                    this.provideHapticFeedback();
                }
            }, this.DOUBLE_TAP_DELAY);
        }
        
        if (this.isDragging) {
            this.endDrag();
        }
    }
    
    handleDoubleTap() {
        this.isDragging = true;
        this.sendMessage({ type: 'mouseDown', button: 'left' });
        this.provideHapticFeedback(20);
    }
    
    endDrag() {
        this.isDragging = false;
        this.sendMessage({ type: 'mouseUp', button: 'left' });
    }
    
    updateTouchpadVisualFeedback(clientX, clientY) {
        const touchpad = this.elements.touchpad;
        const rect = touchpad.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        
        touchpad.style.setProperty('--touch-x', `${x}%`);
        touchpad.style.setProperty('--touch-y', `${y}%`);
    }
    
    handleScrollStart(e) {
        if (!this.mouseEnabled) return;
        
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        this.lastScrollY = touch.clientY;
        this.scrollActive = true;
        this.elements.scrollArea.classList.add('active');
    }
    
    handleScrollMove(e) {
        if (!this.mouseEnabled || !this.scrollActive) return;
        
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        
        const deltaY = this.lastScrollY - touch.clientY;
        this.lastScrollY = touch.clientY;
        
            this.sendMessage({
                type: 'scroll',
            y: deltaY
            });
    }
    
    handleScrollEnd(e) {
        if (!this.scrollActive) return;
        
        e.preventDefault();
        this.scrollActive = false;
        this.elements.scrollArea.classList.remove('active');
    }
    
    handleButtonPress(button, e) {
        if (!this.mouseEnabled) return;
        
        e.preventDefault();
        button.classList.add('pressed');
        
        const buttonType = button.id === 'leftClick' ? 'left' : 'right';
        this.sendMessage({ type: 'mouseDown', button: buttonType });
        this.provideHapticFeedback();
    }
    
    handleButtonRelease(button, e) {
        if (!this.mouseEnabled) return;
        
        e.preventDefault();
        button.classList.remove('pressed');
        
        const buttonType = button.id === 'leftClick' ? 'left' : 'right';
        this.sendMessage({ type: 'mouseUp', button: buttonType });
    }
    
    handleToggleChange() {
        this.mouseEnabled = this.elements.enableToggle.checked;
        this.sendMessage({ type: 'setEnabled', enabled: this.mouseEnabled });
        this.updateUI();
    }
    
    handleSensitivityChange() {
        const sensitivity = parseFloat(this.elements.sensitivitySlider.value);
        this.elements.sensitivityValue.textContent = `${sensitivity.toFixed(1)}×`;
        this.sendMessage({ type: 'setSensitivity', sensitivity: sensitivity });
    }
    
    updateUI() {
        const disabled = !this.mouseEnabled;
        
        this.elements.touchpad.classList.toggle('disabled', disabled);
        this.elements.scrollArea.classList.toggle('disabled', disabled);
        this.elements.leftButton.classList.toggle('disabled', disabled);
        this.elements.rightButton.classList.toggle('disabled', disabled);
        
        if (disabled) {
            this.elements.touchpad.classList.remove('active');
            this.elements.scrollArea.classList.remove('active');
            this.elements.leftButton.classList.remove('pressed');
            this.elements.rightButton.classList.remove('pressed');
            }
    }
    
    provideHapticFeedback(duration = this.VIBRATION_DURATION) {
        if (this.vibrationEnabled) {
            navigator.vibrate(duration);
        }
    }
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
            });
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RemoteMouseApp();
}); 
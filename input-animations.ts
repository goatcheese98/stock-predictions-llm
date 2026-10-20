import type * as AnimationRuntime from './runtime/animation-runtime';
import type { Observer } from 'gsap/Observer';
import { Lifecycle } from './utils/lifecycle';
type CursorState = 'confetti' | 'pointer' | 'default';
export interface ConfettiState {
    isDrawing: boolean;
    animationIsOk: boolean;
    imageKeys: string[];
    explosionKeys: string[];
    imageMap: Record<string, HTMLImageElement>;
    explosionMap: Record<string, HTMLImageElement>;
    lastDistance: number;
    startX: number;
    startY: number;
    currentLine: SVGLineElement | null;
    startImage: SVGImageElement | null;
    circle: SVGImageElement | null;
    wiggle: gsap.EaseFunction | null;
    clamper: ((value: number) => number) | null;
    xSetter: ((value: number) => void) | null;
    ySetter: ((value: number) => void) | null;
    currentCursorState: CursorState;
    lastStateChange: number;
    stateChangeDelay: number;
}
export function confettiState(): ConfettiState {
    return { isDrawing: false, animationIsOk: false, imageKeys: [], explosionKeys: [], imageMap: {}, explosionMap: {}, lastDistance: 0, startX: 0, startY: 0, currentLine: null, startImage: null, circle: null, wiggle: null, clamper: null, xSetter: null, ySetter: null, currentCursorState: 'confetti', lastStateChange: 0, stateChangeDelay: 50 };
}
export class InputAnimations {
    private scope = new Lifecycle();
    private animations = new Set<gsap.core.Animation>();
    private observers = new Set<Observer>();
    private originalPlaceholder: string | null = null;
    constructor(private readonly runtime: typeof AnimationRuntime, readonly confettiSystem: ConfettiState) { }
    private track<T extends gsap.core.Animation>(animation: T): T {
        for (const item of this.animations)
            if (item.totalProgress() === 1)
                this.animations.delete(item);
        if (animation.totalProgress() !== 1)
            this.animations.add(animation);
        return animation;
    }
    private observe(options: Observer.ObserverVars): Observer {
        const observer = this.runtime.Observer.create(options);
        this.observers.add(observer);
        return observer;
    }
    start(): void {
        this.stop();
        this.scope = new Lifecycle();
        this.initConfettiSystem();
        this.initTickerPlaceholderAnimation();
    }
    stop(): void {
        this.scope.dispose();
        for (const observer of this.observers)
            observer.kill();
        this.observers.clear();
        for (const animation of this.animations)
            animation.kill();
        this.animations.clear();
        document.querySelectorAll('.confetti-piece').forEach(piece => piece.remove());
        document.querySelector('.confetti-canvas')?.replaceChildren();
        document.body.classList.remove('confetti-dragging');
        document.body.style.cursor = '';
        this.runtime.gsap.set('.confetti-cursor', { opacity: 0, rotation: 0 });
        this.runtime.gsap.set('.day-range-number', { clearProps: 'transform,opacity' });
        const placeholder = document.getElementById('ticker-placeholder');
        if (placeholder && this.originalPlaceholder !== null) {
            placeholder.textContent = this.originalPlaceholder;
            placeholder.removeAttribute('style');
        }
        Object.assign(this.confettiSystem, confettiState());
    }
    // Integrated Confetti System Methods
    initConfettiSystem() {
        // Check if GSAP is available
        if (!this.runtime) {
            console.warn('GSAP not loaded, skipping confetti initialization');
            return;
        }
        // Register plugins
        try {
            this.runtime.gsap.registerPlugin(this.runtime.Observer, this.runtime.CustomEase, this.runtime.CustomWiggle, this.runtime.Physics2DPlugin);
        }
        catch (error) {
            console.error('❌ Error registering GSAP plugins:', error);
            return;
        }
        // Check for reduced motion preference
        this.confettiSystem.animationIsOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Build image maps
        this.buildImageMaps();
        // Create CustomWiggle and clamper
        this.confettiSystem.wiggle = this.runtime.CustomWiggle.create('myWiggle', { wiggles: 6, type: 'uniform' });
        this.confettiSystem.clamper = this.runtime.gsap.utils.clamp(1, 100);
        // Wait for DOM elements to be available, then set up GSAP setters
        queueMicrotask(() => {
            if (this.scope.disposed)
                return;
            const cursorElement = document.querySelector('.confetti-cursor');
            if (cursorElement) {
                const setX = this.runtime.gsap.quickSetter('.confetti-cursor', 'x', 'px');
                this.confettiSystem.xSetter = value => setX(value);
                const setY = this.runtime.gsap.quickSetter('.confetti-cursor', 'y', 'px');
                this.confettiSystem.ySetter = value => setY(value);
            }
            else {
                console.error('❌ Confetti cursor element not found');
            }
        });
        // Initialize mouse events
        this.initMouseEvents();
        // Initialize Observer for drag interactions
        this.initObserver();
    }
    buildImageMaps() {
        // Build image maps for confetti pieces
        const preloadImages = document.querySelectorAll<HTMLImageElement>('.image-preload img[data-key]');
        const explosionImages = document.querySelectorAll<HTMLImageElement>('.explosion-preload img[data-key]');
        preloadImages.forEach(img => {
            const key = img.dataset.key;
            if (key) {
                this.confettiSystem.imageMap[key] = img;
                this.confettiSystem.imageKeys.push(key);
            }
        });
        explosionImages.forEach(img => {
            const key = img.dataset.key;
            if (key) {
                this.confettiSystem.explosionMap[key] = img;
                this.confettiSystem.explosionKeys.push(key);
            }
        });
    }
    initMouseEvents() {
        if (!this.confettiSystem.animationIsOk || this.runtime.Observer.isTouch === 1) {
            return;
        }
        // Initialize cursor state
        this.setCursorState('confetti');
        // Bind methods to preserve 'this' context
        const boundMouseEnter = this.onMouseEnter.bind(this);
        const boundMouseLeave = this.onMouseLeave.bind(this);
        const boundMouseMove = this.onMouseMove.bind(this);
        // Add mouse event listeners to the main app
        this.scope.document('mouseenter', boundMouseEnter);
        this.scope.document('mouseleave', boundMouseLeave);
        this.scope.document('mousemove', boundMouseMove);
        // Store bound functions for cleanup
        // Initialize interactive element handling
        this.addInteractiveElementEvents();
    }
    addInteractiveElementEvents() {
        // Note: Cursor state is now handled centrally in updateCursorState()
        // This method is kept for any future interactive element setup
    }
    initObserver() {
        if (!this.confettiSystem.animationIsOk) {
            return;
        }
        const targetElement = document.body;
        if (this.runtime.Observer.isTouch === 1) {
            this.observe({
                target: targetElement,
                type: 'touch',
                onPress: (e) => {
                    if (e.x === undefined || e.y === undefined)
                        return false;
                    const elementUnderMouse = document.elementFromPoint(e.x, e.y);
                    if (this.isInteractiveElement(elementUnderMouse)) {
                        return false;
                    }
                    if (this.isNoClickElement(elementUnderMouse)) {
                        return false;
                    }
                    this.clearTextSelection();
                    this.createExplosion(e.x, e.y, 400);
                }
            });
        }
        else {
            this.observe({
                target: document.body,
                type: 'pointer',
                preventDefault: false,
                onPress: (e) => {
                    if (e.x === undefined || e.y === undefined)
                        return false;
                    // Check if we're clicking on an interactive element
                    const elementUnderMouse = document.elementFromPoint(e.x, e.y);
                    if (this.isInteractiveElement(elementUnderMouse)) {
                        return false; // Don't start drawing
                    }
                    // Check if we're in a no-click zone (but allow drag-through)
                    if (this.isNoClickElement(elementUnderMouse)) {
                        return false; // Don't start drawing on click
                    }
                    this.startDrawing({ x: e.x, y: e.y });
                    return true;
                },
                onDrag: (e) => {
                    // Allow drag-through even in no-click zones
                    if (this.confettiSystem.isDrawing) {
                        if (e.x !== undefined && e.y !== undefined)
                            this.updateDrawing({ x: e.x, y: e.y });
                    }
                },
                onDragEnd: (e) => {
                    if (this.confettiSystem.isDrawing) {
                        this.clearDrawing();
                    }
                },
                onRelease: (e) => {
                    if (this.confettiSystem.isDrawing) {
                        this.clearDrawing();
                    }
                }
            });
        }
    }
    onMouseEnter(e: MouseEvent) {
        // Show confetti cursor when entering the page
        this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 1 }));
        if (this.confettiSystem.xSetter && this.confettiSystem.ySetter) {
            this.confettiSystem.xSetter(e.clientX);
            this.confettiSystem.ySetter(e.clientY);
        }
    }
    onMouseLeave(_e: MouseEvent) {
        // Hide confetti cursor when leaving the page
        this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 0 }));
        document.body.style.cursor = 'default';
    }
    onMouseMove(e: MouseEvent) {
        // Always update confetti cursor position
        if (this.confettiSystem.xSetter && this.confettiSystem.ySetter) {
            this.confettiSystem.xSetter(e.clientX);
            this.confettiSystem.ySetter(e.clientY);
        }
        // Centralized cursor state management
        this.updateCursorState(e.clientX, e.clientY);
        // Debug occasionally to avoid spam
        if (Math.random() < 0.001) {
        }
    }
    isInteractiveElement(element: Element | null) {
        if (!element)
            return false;
        // Check if element or its parents are interactive
        const interactiveSelectors = [
            'button',
            'input',
            'select',
            'textarea',
            'a',
            'label',
            '.personality-card',
            '.personality-selection', // Entire personality selection area
            '.personality-grid',
            '.personality-avatar',
            '.personality-info',
            '.personality-image',
            '.slider',
            '.day-range-selection', // Entire day range selection area
            '.day-range-slider', // Entire slider container
            '.generate-report-btn',
            '.add-ticker-btn',
            '.ticker',
            '.form-input-control',
            '.action-panel'
        ];
        // Check the element itself and its parents
        let currentElement: Element | null = element;
        while (currentElement && currentElement !== document.body) {
            for (const selector of interactiveSelectors) {
                if (currentElement.matches && currentElement.matches(selector)) {
                    return true;
                }
            }
            currentElement = currentElement.parentElement;
        }
        return false;
    }
    isInSafeZone(mouseX: number, mouseY: number) {
        // Define selectors for elements that should have safe zones
        const safeZoneSelectors = [
            'button',
            'input',
            'select',
            'textarea',
            'a',
            '.personality-card',
            '.personality-selection',
            '.day-range-selection',
            '.day-range-slider',
            '.slider',
            '.generate-report-btn',
            '.add-ticker-btn',
            'label[for]',
            '.ticker'
        ];
        const safeZoneMargin = 4; // 4px safe zone as requested
        // Check each type of interactive element
        for (const selector of safeZoneSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const rect = element.getBoundingClientRect();
                // Expand the element's bounds by the safe zone margin
                const expandedRect = {
                    left: rect.left - safeZoneMargin,
                    right: rect.right + safeZoneMargin,
                    top: rect.top - safeZoneMargin,
                    bottom: rect.bottom + safeZoneMargin
                };
                // Check if mouse is within the expanded bounds
                if (mouseX >= expandedRect.left &&
                    mouseX <= expandedRect.right &&
                    mouseY >= expandedRect.top &&
                    mouseY <= expandedRect.bottom) {
                    return true;
                }
            }
        }
        return false;
    }
    updateCursorState(mouseX: number, mouseY: number) {
        const now = Date.now();
        // Prevent rapid state changes
        if (now - this.confettiSystem.lastStateChange < this.confettiSystem.stateChangeDelay) {
            return;
        }
        // Determine what the cursor state should be
        const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
        const isOverInteractive = this.isInteractiveElement(elementUnderMouse);
        const isInSafeZone = this.isInSafeZone(mouseX, mouseY);
        let desiredState: CursorState = 'confetti';
        if (isOverInteractive) {
            // Direct hover over interactive element - use pointer
            desiredState = 'pointer';
        }
        else if (isInSafeZone) {
            // In safe zone around interactive element - use default
            desiredState = 'default';
        }
        else {
            // Normal area - use confetti cursor
            desiredState = 'confetti';
        }
        // Only change state if different from current
        if (desiredState !== this.confettiSystem.currentCursorState) {
            this.setCursorState(desiredState);
            this.confettiSystem.lastStateChange = now;
        }
    }
    setCursorState(state: CursorState) {
        // Update internal state
        this.confettiSystem.currentCursorState = state;
        // Apply the cursor state
        switch (state) {
            case 'confetti':
                this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 1 }));
                document.body.style.cursor = 'none';
                break;
            case 'pointer':
                this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 0 }));
                document.body.style.cursor = 'pointer';
                break;
            case 'default':
                this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 0 }));
                document.body.style.cursor = 'default';
                break;
        }
        // Debug log for state changes
        if (Math.random() < 0.1) { // 10% chance to avoid spam
        }
    }
    isNoClickElement(element: Element | null) {
        if (!element)
            return false;
        // Areas where confetti clicks should be disabled but drag-through allowed
        const noClickSelectors = [
            '.personality-selection',
            '.personality-grid',
            '.day-range-selection',
            '.day-range-slider',
            '.ticker-choice-display',
            '.form-input-control'
        ];
        // Check the element itself and its parents
        let currentElement: Element | null = element;
        while (currentElement && currentElement !== document.body) {
            for (const selector of noClickSelectors) {
                if (currentElement.matches && currentElement.matches(selector)) {
                    return true;
                }
            }
            currentElement = currentElement.parentElement;
        }
        return false;
    }
    clearTextSelection() {
        // Clear any text selection on the page
        if (window.getSelection) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                selection.removeAllRanges();
            }
        }
    }
    startDrawing(e: {
        x: number;
        y: number;
    }) {
        this.confettiSystem.isDrawing = true;
        this.confettiSystem.startX = e.x;
        this.confettiSystem.startY = e.y + window.scrollY;
        // Clear any text selection when starting confetti interaction
        this.clearTextSelection();
        const canvas = document.querySelector('.confetti-canvas');
        if (!canvas)
            return;
        // Create line (exactly like original)
        this.confettiSystem.currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.confettiSystem.currentLine.setAttribute('x1', String(this.confettiSystem.startX));
        this.confettiSystem.currentLine.setAttribute('y1', String(this.confettiSystem.startY));
        this.confettiSystem.currentLine.setAttribute('x2', String(this.confettiSystem.startX));
        this.confettiSystem.currentLine.setAttribute('y2', String(this.confettiSystem.startY));
        this.confettiSystem.currentLine.setAttribute('stroke', '#fffce1');
        this.confettiSystem.currentLine.setAttribute('stroke-width', '2');
        this.confettiSystem.currentLine.setAttribute('stroke-dasharray', '4');
        // Create circle (the growing object - use random confetti piece)
        const circleRandomKey = this.runtime.gsap.utils.random(this.confettiSystem.imageKeys);
        const circleOriginal = this.confettiSystem.imageMap[circleRandomKey];
        if (circleOriginal) {
            this.confettiSystem.circle = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            this.confettiSystem.circle.setAttribute('x', String(this.confettiSystem.startX - 25));
            this.confettiSystem.circle.setAttribute('y', String(this.confettiSystem.startY - 25));
            this.confettiSystem.circle.setAttribute('width', '50');
            this.confettiSystem.circle.setAttribute('height', '50');
            this.confettiSystem.circle.setAttributeNS('http://www.w3.org/1999/xlink', 'href', circleOriginal.src);
        }
        // Create image at start point
        const imageRandomKey = this.runtime.gsap.utils.random(this.confettiSystem.imageKeys);
        const imageOriginal = this.confettiSystem.imageMap[imageRandomKey];
        if (imageOriginal) {
            this.confettiSystem.startImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            this.confettiSystem.startImage.setAttribute('x', String(this.confettiSystem.startX - 25));
            this.confettiSystem.startImage.setAttribute('y', String(this.confettiSystem.startY - 25));
            this.confettiSystem.startImage.setAttribute('width', '50');
            this.confettiSystem.startImage.setAttribute('height', '50');
            this.confettiSystem.startImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageOriginal.src);
            canvas.appendChild(this.confettiSystem.startImage);
        }
        // Add elements to canvas
        canvas.appendChild(this.confettiSystem.currentLine);
        if (this.confettiSystem.circle)
            canvas.appendChild(this.confettiSystem.circle);
        // Update cursor state
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-drag', { opacity: 1 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-handle', { opacity: 1 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-pink-pucker', { opacity: 1 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-rock', { opacity: 0 }));
        // Prevent text selection during drag
        document.body.classList.add('confetti-dragging');
    }
    updateDrawing(e: {
        x: number;
        y: number;
    }) {
        if (!this.confettiSystem.currentLine || !this.confettiSystem.startImage)
            return;
        let cursorX = e.x;
        let cursorY = e.y + window.scrollY;
        let dx = cursorX - this.confettiSystem.startX;
        let dy = cursorY - this.confettiSystem.startY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        // Calculate shrink for line (like original)
        let shrink = (distance - 30) / distance;
        let x2 = this.confettiSystem.startX + dx * shrink;
        let y2 = this.confettiSystem.startY + dy * shrink;
        if (distance < 30) {
            x2 = this.confettiSystem.startX;
            y2 = this.confettiSystem.startY;
        }
        // Calculate angle for rotation
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Update line
        this.track(this.runtime.gsap.to(this.confettiSystem.currentLine, {
            attr: { x2, y2 },
            duration: 0.1,
            ease: 'none'
        }));
        // Scale both image and circle based on distance (like original)
        let raw = distance / 100;
        let eased = Math.pow(raw, 0.5);
        let clamped = this.confettiSystem.clamper?.(eased) ?? 1;
        this.track(this.runtime.gsap.set([this.confettiSystem.startImage, this.confettiSystem.circle], {
            scale: clamped,
            rotation: `${angle + -45}_short`,
            transformOrigin: 'center center'
        }));
        // Move & rotate hand cursor
        this.track(this.runtime.gsap.to('.confetti-cursor', {
            rotation: `${angle + -90}_short`,
            duration: 0.1,
            ease: 'none'
        }));
        this.confettiSystem.lastDistance = distance;
    }
    clearDrawing() {
        if (!this.confettiSystem.isDrawing)
            return;
        // Create explosion at start position
        this.createExplosion(this.confettiSystem.startX, this.confettiSystem.startY, this.confettiSystem.lastDistance);
        // Update cursor state
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-drag', { opacity: 0 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-handle', { opacity: 0 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-pink-pucker', { opacity: 0 }));
        this.track(this.runtime.gsap.set('.confetti-cursor .cursor-rock', { opacity: 1 }));
        // Remove text selection prevention
        document.body.classList.remove('confetti-dragging');
        // Animate cursor rock with wiggle
        this.track(this.runtime.gsap.to('.confetti-cursor .cursor-rock', {
            duration: 0.4,
            rotation: '+=30',
            ease: this.confettiSystem.wiggle ?? 'none',
            onComplete: () => {
                this.track(this.runtime.gsap.set('.confetti-cursor .cursor-rock', { opacity: 0 }));
                this.track(this.runtime.gsap.set('.confetti-cursor', { rotation: 0, overwrite: 'auto' }));
                this.track(this.runtime.gsap.set('.confetti-cursor .cursor-drag', { opacity: 1 }));
            }
        }));
        this.confettiSystem.isDrawing = false;
        // Clear all SVG elements
        const canvas = document.querySelector('.confetti-canvas');
        if (canvas) {
            canvas.innerHTML = '';
        }
        // Reset references
        this.confettiSystem.currentLine = null;
        this.confettiSystem.startImage = null;
        this.confettiSystem.circle = null;
    }
    createExplosion(x: number, y: number, distance = 100) {
        if (this.scope.disposed || !this.confettiSystem.animationIsOk)
            return;
        if (this.confettiSystem.explosionKeys.length === 0) {
            console.warn('❌ No explosion images available');
            return;
        }
        const count = Math.round(this.runtime.gsap.utils.clamp(3, 100, distance / 20));
        const explosion = this.track(this.runtime.gsap.timeline());
        const speed = this.runtime.gsap.utils.mapRange(0, 500, 0.3, 1.5, distance);
        const sizeRange = this.runtime.gsap.utils.mapRange(0, 500, 20, 60, distance);
        for (let i = 0; i < count; i++) {
            const randomKey = this.runtime.gsap.utils.random(this.confettiSystem.explosionKeys);
            const original = this.confettiSystem.explosionMap[randomKey];
            if (!original)
                continue;
            const img = original.cloneNode(true);
            if (!(img instanceof HTMLImageElement))
                continue;
            img.className = 'confetti-piece';
            img.style.position = 'fixed';
            img.style.pointerEvents = 'none';
            img.style.height = `${this.runtime.gsap.utils.random(20, sizeRange)}px`;
            img.style.left = `${x}px`;
            img.style.top = `${y}px`;
            img.style.zIndex = '9999';
            document.body.appendChild(img);
            const angle = Math.random() * Math.PI * 2;
            const velocity = this.runtime.gsap.utils.random(500, 1500) * speed;
            explosion
                .to(img, {
                physics2D: {
                    angle: angle * (180 / Math.PI),
                    velocity: velocity,
                    gravity: 3000
                },
                rotation: this.runtime.gsap.utils.random(-180, 180),
                duration: 1 + Math.random()
            }, 0)
                .to(img, {
                opacity: 0,
                duration: 0.2,
                ease: 'power1.out',
                onComplete: () => img.remove()
            }, 1);
        }
        return explosion;
    }
    // Test function for confetti
    testConfetti() {
        this.createExplosion(100, 100, 500);
    }
    // Force show cursor for testing
    testCursor() {
        this.track(this.runtime.gsap.set('.confetti-cursor', { opacity: 1, x: 200, y: 200 }));
        document.body.style.cursor = 'none';
    }
    // Test explosion without safe zone check
    testExplosionDirect() {
        this.createExplosion(window.innerWidth / 2, window.innerHeight / 2, 400);
    }
    // Initialize ticker placeholder animation with custom scramble text reveal
    initTickerPlaceholderAnimation() {
        if (!this.runtime || matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        const placeholder = document.getElementById('ticker-placeholder');
        if (!placeholder) {
            return;
        }
        // Store original text
        const originalText = this.originalPlaceholder ?? placeholder.textContent ?? '';
        this.originalPlaceholder = originalText;
        // Character sets for scrambling
        const scrambleChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'.split('');
        const getRandomChar = () => scrambleChars[Math.floor(Math.random() * scrambleChars.length)] ?? '';
        // Split text manually into character spans
        const chars = originalText.split('').map((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.classList.add('scramble-char');
            span.dataset.original = char;
            span.dataset.index = String(index);
            return span;
        });
        // Replace placeholder content with character spans
        placeholder.innerHTML = '';
        chars.forEach(char => placeholder.appendChild(char));
        // Add subtle color pulse animation
        this.track(this.runtime.gsap.to(placeholder, {
            color: 'var(--acc)',
            duration: 3,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        }));
        // Initially scramble all characters
        chars.forEach(char => {
            if (char.dataset.original !== ' ') { // Don't scramble spaces
                char.textContent = getRandomChar();
            }
        });
        // Start the reveal animation after 1 second delay
        this.track(this.runtime.gsap.delayedCall(1, () => {
            // Reveal each character with custom scramble effect
            chars.forEach((char, index) => {
                if (char.dataset.original === ' ') {
                    // Skip spaces
                    return;
                }
                const revealDelay = index * 0.08; // Stagger the reveals
                // Create scramble timeline for this character
                const tl = this.track(this.runtime.gsap.timeline({ delay: revealDelay }));
                // Scramble phase (0.3 seconds of random characters)
                const scrambleInterval = this.scope.interval(() => {
                    char.textContent = getRandomChar();
                }, 50);
                // Stop scrambling and reveal original character
                tl.call(() => {
                    this.scope.clearInterval(scrambleInterval);
                    char.textContent = char.dataset.original ?? '';
                }, [], 0.3);
                // Add a subtle scale effect on reveal
                tl.fromTo(char, {
                    scale: 1.2,
                    opacity: 0.7
                }, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.3,
                    ease: "back.out(1.7)"
                }, 0.3);
            });
        }));
    }
    animateDayRangeNumber(newValue: number, oldValue: number) {
        if (!this.runtime || matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        const numberElement = document.querySelector('.day-range-number');
        if (!numberElement)
            return;
        // Set data attributes for shadows
        const prevNumber = Math.max(3, newValue - 1);
        const nextNumber = Math.min(30, newValue + 1);
        numberElement.setAttribute('data-prev', String(prevNumber));
        numberElement.setAttribute('data-next', String(nextNumber));
        // Determine animation direction
        const isIncreasing = newValue > oldValue;
        const direction = isIncreasing ? -1 : 1;
        // GSAP animation
        this.track(this.runtime.gsap.fromTo(numberElement, {
            y: direction * 20,
            opacity: 0.7,
            scale: 0.95
        }, {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.7)"
        }));
    }
}

/** Own asynchronous work so a page that has been left cannot mutate or navigate later. */
export class Lifecycle {
    private generation = 0;
    get version(): number { return this.generation; }
    private controller = new AbortController();
    private timers = new Map<ReturnType<typeof setTimeout>, () => void>();
    private intervals = new Set<ReturnType<typeof setInterval>>();
    private removers: (() => void)[] = [];
    get disposed(): boolean { return this.controller.signal.aborted; }
    readonly fetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: this.controller.signal });
    document<K extends keyof DocumentEventMap>(type: K, listener: (event: DocumentEventMap[K]) => void): void {
        document.addEventListener(type, listener);
        this.removers.push(() => document.removeEventListener(type, listener));
    }
    window<K extends keyof WindowEventMap>(type: K, listener: (event: WindowEventMap[K]) => void): void {
        window.addEventListener(type, listener);
        this.removers.push(() => window.removeEventListener(type, listener));
    }
    media(target: MediaQueryList, listener: (event: MediaQueryListEvent) => void): void {
        target.addEventListener('change', listener);
        this.removers.push(() => target.removeEventListener('change', listener));
    }
    element<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void): void {
        target.addEventListener(type, listener);
        this.removers.push(() => target.removeEventListener(type, listener));
    }
    timeout(callback: () => void, milliseconds: number): void {
        if (this.disposed)
            return;
        const timer = setTimeout(() => { this.timers.delete(timer); if (!this.disposed)
            callback(); }, milliseconds);
        this.timers.set(timer, () => { });
    }
    pause(milliseconds: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.disposed) {
                reject(new DOMException('Page left', 'AbortError'));
                return;
            }
            const timer = setTimeout(() => { this.timers.delete(timer); resolve(); }, milliseconds);
            this.timers.set(timer, () => reject(new DOMException('Page left', 'AbortError')));
        });
    }
    interval(callback: () => void, milliseconds: number): ReturnType<typeof setInterval> {
        const timer = setInterval(() => { if (!this.disposed)
            callback(); }, milliseconds);
        this.intervals.add(timer);
        return timer;
    }
    clearInterval(timer: ReturnType<typeof setInterval>): void { clearInterval(timer); this.intervals.delete(timer); }
    dispose(): void {
        this.generation++;
        this.controller.abort();
        for (const [timer, reject] of this.timers) {
            clearTimeout(timer);
            reject();
        }
        this.timers.clear();
        for (const timer of this.intervals)
            clearInterval(timer);
        this.intervals.clear();
        for (const remove of this.removers)
            remove();
        this.removers = [];
    }
    renew(): void { this.dispose(); this.controller = new AbortController(); }
}

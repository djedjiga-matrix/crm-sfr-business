describe('Rate Limiting', () => {
    // Simule le store de rate limit
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

    const MAX_REQUESTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    const checkRateLimit = (key: string): { allowed: boolean; remaining: number } => {
        const now = Date.now();
        const entry = rateLimitStore.get(key);

        if (!entry || entry.resetTime < now) {
            rateLimitStore.set(key, { count: 1, resetTime: now + WINDOW_MS });
            return { allowed: true, remaining: MAX_REQUESTS - 1 };
        }

        entry.count++;
        const allowed = entry.count <= MAX_REQUESTS;
        const remaining = Math.max(0, MAX_REQUESTS - entry.count);

        return { allowed, remaining };
    };

    beforeEach(() => {
        rateLimitStore.clear();
    });

    it('should allow first request', () => {
        const result = checkRateLimit('test-ip');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('should allow up to MAX_REQUESTS', () => {
        for (let i = 0; i < MAX_REQUESTS; i++) {
            const result = checkRateLimit('test-ip');
            expect(result.allowed).toBe(true);
        }
    });

    it('should block after MAX_REQUESTS', () => {
        for (let i = 0; i < MAX_REQUESTS; i++) {
            checkRateLimit('test-ip');
        }
        const result = checkRateLimit('test-ip');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('should track different IPs separately', () => {
        // Épuiser les requêtes pour IP1
        for (let i = 0; i <= MAX_REQUESTS; i++) {
            checkRateLimit('ip1');
        }
        const result1 = checkRateLimit('ip1');
        expect(result1.allowed).toBe(false);

        // IP2 devrait encore fonctionner
        const result2 = checkRateLimit('ip2');
        expect(result2.allowed).toBe(true);
    });

    it('should return correct remaining count', () => {
        const result1 = checkRateLimit('test-ip');
        expect(result1.remaining).toBe(4);

        const result2 = checkRateLimit('test-ip');
        expect(result2.remaining).toBe(3);

        const result3 = checkRateLimit('test-ip');
        expect(result3.remaining).toBe(2);
    });
});

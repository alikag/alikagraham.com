        // Year
        document.getElementById('year').textContent = new Date().getFullYear();

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Custom cursor (pointer devices only)
        const cursor = document.querySelector('.cursor-dot');
        const hasHover = window.matchMedia('(hover: hover)').matches;
        if (hasHover && !reduceMotion) {
            let mx = -50, my = -50, cx = -50, cy = -50;
            document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
            document.addEventListener('mousedown', () => cursor.classList.add('is-clicking'));
            document.addEventListener('mouseup', () => cursor.classList.remove('is-clicking'));
            document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
                el.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
                el.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
            });
            (function loop() {
                cx += (mx - cx) * 0.22;
                cy += (my - cy) * 0.22;
                cursor.style.transform = `translate(${cx - 4}px, ${cy - 4}px)` +
                    (cursor.classList.contains('is-link') ? ' scale(2.4)' :
                     cursor.classList.contains('is-clicking') ? ' scale(0.6)' : '');
                requestAnimationFrame(loop);
            })();
        } else if (cursor) {
            cursor.style.display = 'none';
        }

        // Sticky nav state
        const nav = document.getElementById('siteNav');
        const onScroll = () => {
            nav.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // Reveal on scroll
        if ('IntersectionObserver' in window && !reduceMotion) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('in');
                        io.unobserve(e.target);
                    }
                });
            }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
            document.querySelectorAll('.reveal').forEach(el => io.observe(el));
        } else {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
        }

        // Card spotlight
        document.querySelectorAll('[data-tilt]').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
                card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
            });
        });

        // Typewriter
        const phrases = [
            'Investor & Holdco Operator',
            'Founder, IMPAKT Labs',
            'Franchise Owner, Pink’s Windows',
            'Builder of operator-led businesses',
            'AI infrastructure, applied'
        ];
        const tw = document.getElementById('tw-text');
        if (tw && !reduceMotion) {
            let pi = 0, ci = 0, del = false;
            const tick = () => {
                const cur = phrases[pi];
                if (del) { tw.textContent = cur.slice(0, --ci); }
                else     { tw.textContent = cur.slice(0, ++ci); }
                let d = del ? 28 : 60;
                if (!del && ci === cur.length) { d = 1900; del = true; }
                else if (del && ci === 0)      { del = false; pi = (pi + 1) % phrases.length; d = 360; }
                setTimeout(tick, d);
            };
            setTimeout(tick, 600);
        } else if (tw) {
            tw.textContent = phrases[0];
        }

        /* ----- WebGL background ----- */
        (function initShader() {
            if (reduceMotion) return;
            const canvas = document.getElementById('canvas');
            const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
            if (!gl) { canvas.style.display = 'none'; return; }

            const vsSource = `attribute vec4 aP; void main(){ gl_Position = aP; }`;
            const fsSource = `
                precision highp float;
                uniform vec2 iR;
                uniform float iT;
                const float speed = 0.12;
                const float lineSpeed = 0.7 * speed;
                const float warpSpeed = 0.13 * speed;
                const float offsetSpeed = 0.95 * speed;
                const float lineFreq = 0.18;
                const float mobileFreq = 0.11;
                const float warpFreq = 0.5;
                const float warpAmp = 1.0;
                const float minLW = 0.006;
                const float maxLW = 0.10;
                const float lineAmp = 1.5;
                const float minOff = 0.55;
                const float maxOff = 3.4;
                const int LINES = 8;
                const vec4 base = vec4(0.21, 0.16, 0.36, 0.5);
                const vec4 cool = vec4(0.18, 0.42, 0.55, 0.55);
                const vec4 warm = vec4(0.55, 0.30, 0.28, 0.5);

                float r1(float t) { return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0; }
                float plasmaY(float x, float h, float o, float f) { return r1(x * f + iT * lineSpeed) * h * lineAmp + o; }
                float drawLine(float p, float w, float t) { return smoothstep(w, 0.0, abs(p - t)); }
                float drawCrisp(float p, float w, float t) { return smoothstep(w + 0.012, w, abs(p - t)); }

                void main() {
                    vec2 uv = gl_FragCoord.xy / iR.xy;
                    float ar = iR.x / iR.y;
                    float scale = ar < 0.75 ? 8.0 : 5.5;
                    vec2 sp = (gl_FragCoord.xy - iR.xy / 2.0) / iR.x * 2.0 * scale;
                    float hf = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);

                    sp.y += r1(sp.x * warpFreq + iT * warpSpeed) * warpAmp * (0.5 + hf);
                    sp.x += r1(sp.y * warpFreq + iT * warpSpeed + 2.0) * warpAmp * hf;

                    vec4 lines = vec4(0.0);
                    float lf = ar < 0.75 ? mobileFreq : lineFreq;
                    for (int i = 0; i < LINES; i++) {
                        float ot = iT * offsetSpeed;
                        float op = float(i) + sp.x * 0.5;
                        float rnd = r1(op + ot) * 0.5 + 0.5;
                        float w = mix(minLW, maxLW, rnd * hf) / 2.0;
                        float off = r1(op + ot * (1.0 + float(i) / float(LINES))) * mix(minOff, maxOff, hf);
                        float pos = plasmaY(sp.x, hf, off, lf);
                        float ln = drawLine(pos, w, sp.y) * 0.5 + drawCrisp(pos, w * 0.15, sp.y);
                        vec4 c = base;
                        if (i == 3) c = cool; else if (i == 5) c = warm;
                        lines += ln * c * rnd * 0.55;
                    }

                    vec4 bg = mix(vec4(0.04, 0.04, 0.06, 1.0), vec4(0.06, 0.05, 0.09, 1.0), uv.x);
                    bg *= 0.55 + 0.45 * (1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5));
                    bg.a = 1.0;
                    gl_FragColor = bg + lines;
                }`;

            function compile(type, src) {
                const s = gl.createShader(type);
                gl.shaderSource(s, src); gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
                return s;
            }
            const prog = gl.createProgram();
            gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
            gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
            gl.useProgram(prog);

            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
            const aP = gl.getAttribLocation(prog, 'aP');
            gl.enableVertexAttribArray(aP);
            gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
            const uR = gl.getUniformLocation(prog, 'iR');
            const uT = gl.getUniformLocation(prog, 'iT');

            // Throttle DPR for perf
            const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
            function resize() {
                canvas.width = Math.floor(window.innerWidth * dpr);
                canvas.height = Math.floor(window.innerHeight * dpr);
                canvas.style.width = window.innerWidth + 'px';
                canvas.style.height = window.innerHeight + 'px';
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            resize();
            window.addEventListener('resize', resize, { passive: true });
            window.addEventListener('orientationchange', () => setTimeout(resize, 120));

            // Pause when tab hidden
            let running = true;
            document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) tick(); });

            const t0 = performance.now();
            function tick() {
                if (!running) return;
                gl.uniform2f(uR, canvas.width, canvas.height);
                gl.uniform1f(uT, (performance.now() - t0) / 1000);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                requestAnimationFrame(tick);
            }
            tick();
        })();

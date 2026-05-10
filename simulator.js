// === LiDAR ALS Simulator – Physics Engine (v6) ===
const canvas = document.getElementById('lidarCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimapCanvas');
const miniCtx = miniCanvas.getContext('2d');

let isRunning = false, animationId, lastTime = performance.now(), totalSimTime = 0;
let planeX = -100, maxRevealX = 0, frameCount = 0;

// Use typed arrays for point storage (MASSIVE perf improvement)
const MAX_POINTS = 150000;
let pointCount = 0;
const ptX = new Float32Array(MAX_POINTS);
const ptY = new Float32Array(MAX_POINTS);
const ptType = new Uint8Array(MAX_POINTS);    // 0=ground, 1=veg, 2=outlier
const ptReturn = new Uint8Array(MAX_POINTS);  // return number (1-based)
const ptIsLast = new Uint8Array(MAX_POINTS);  // 1 if last return
const ptTotalRet = new Uint8Array(MAX_POINTS); // total returns in this pulse

// Snapshot A storage (for comparison)
let snapCount = 0;
const snapX = new Float32Array(MAX_POINTS);
const snapY = new Float32Array(MAX_POINTS);
const snapType = new Uint8Array(MAX_POINTS);
const snapReturn = new Uint8Array(MAX_POINTS);
const snapIsLast = new Uint8Array(MAX_POINTS);
const snapTotalRet = new Uint8Array(MAX_POINTS);
let hasSnapshot = false;
let compareMode = false;
let swipePosX = 0.5; // 0-1 ratio, where the divider sits

// Incremental counters (avoid filtering entire array)
let countGround = 0, countOutlier = 0;

let trees = [], birds = [];

const params = {
    prf: 150, returns: 4, fov: 40, scanRate: 1, divergence: 0.3,
    altitude: 600, speed: 180, forestDens: 70, birdCount: 5,
    terrain: 50, colorMode: 'class', loopMode: true,
    darkMode: true, pointSize: 1.0, overlap: 0,
    scanPattern: 'zigzag',
    pulseWidth: 5,      // nanoseconds (1-15ns, affects range resolution)
    intensity: 100       // percent laser power (50-100%)
};

const GROUND_BASE = () => canvas.height - 100;

function getTopography(x) {
    const t = params.terrain / 100; // 0=flat, 1=very hilly
    return GROUND_BASE() + Math.sin(x * 0.015) * 40 * t + Math.cos(x * 0.005) * 30 * t;
}

function getPlaneY() {
    const gnd = GROUND_BASE();
    const t = (params.altitude - 200) / 1300;
    return (gnd - 400) - t * ((gnd - 400) - 35);
}

function getSpreadX() {
    return (GROUND_BASE() - getPlaneY()) * Math.tan(params.fov * Math.PI / 360);
}

function getSwathMeters() {
    return 2 * params.altitude * Math.tan(params.fov * Math.PI / 360);
}

function getFootprintMeters() {
    return params.altitude * params.divergence / 1000;
}

// Theoretical density: PRF / (speed_m/s × swath_m)
function getTheoDensity() {
    const swath = getSwathMeters();
    const speedMs = params.speed / 3.6;
    return (swath > 0 && speedMs > 0) ? (params.prf * 1000) / (speedMs * swath) : 0;
}

// Range resolution from pulse width (meters)
function getRangeResolution() {
    return (params.pulseWidth * 1e-9 * 3e8) / 2; // c*τ/2
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateEnvironment();
}
window.addEventListener('resize', resize);

document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('sidebar-collapsed');
});



function generateEnvironment() {
    trees = []; birds = [];
    const numTrees = Math.floor((canvas.width / 20) * (params.forestDens / 100));
    const spacing = canvas.width / Math.max(1, numTrees);
    for (let i = 0; i < numTrees; i++) {
        const xPos = i * spacing + (Math.random() * spacing - spacing / 2);
        trees.push({
            x: xPos, groundY: getTopography(xPos),
            height: 80 + Math.random() * 250,
            width: 50 + Math.random() * 120,
            type: Math.random() > 0.4 ? 'broadleaf' : 'pine',
            lai: (params.forestDens / 100) * (Math.random() * 0.5 + 0.5)
        });
    }
    for (let i = 0; i < params.birdCount; i++) {
        const isLow = Math.random() > 0.5;
        birds.push({
            x: Math.random() * canvas.width,
            y: isLow ? (canvas.height * 0.5 + Math.random() * canvas.height * 0.15) : (80 + Math.random() * canvas.height * 0.15),
            vx: (Math.random() * 17 + 8) * (Math.random() > 0.5 ? 1 : -1),
            vy: (Math.random() * 7 + 3) * (Math.random() > 0.5 ? 1 : -1),
            offset: Math.random() * 100
        });
    }
    drawFrame(); drawMinimap(); updateStats(); updateDerivedMetrics();
}

function fullReset() {
    pointCount = 0; countGround = 0; countOutlier = 0;
    planeX = -100; maxRevealX = 0;
    totalSimTime = 0; lastTime = performance.now();
    generateEnvironment();
}

// Clear points but KEEP same trees/birds (for comparison mode)
function clearPointsOnly() {
    pointCount = 0; countGround = 0; countOutlier = 0;
    planeX = -100; maxRevealX = 0;
    totalSimTime = 0; lastTime = performance.now();
    drawFrame(); drawMinimap(); updateStats();
}

// Save current scan as Snapshot A
function saveSnapshot() {
    snapCount = pointCount;
    snapX.set(ptX.subarray(0, pointCount));
    snapY.set(ptY.subarray(0, pointCount));
    snapType.set(ptType.subarray(0, pointCount));
    snapReturn.set(ptReturn.subarray(0, pointCount));
    snapIsLast.set(ptIsLast.subarray(0, pointCount));
    snapTotalRet.set(ptTotalRet.subarray(0, pointCount));
    hasSnapshot = true;
}

document.getElementById('btn-reset').addEventListener('click', fullReset);

function addPoint(x, y, type, returnNum, isLast, totalReturns) {
    if (pointCount >= MAX_POINTS) return;
    const i = pointCount++;
    ptX[i] = x; ptY[i] = y;
    ptType[i] = type;
    ptReturn[i] = returnNum;
    ptIsLast[i] = isLast ? 1 : 0;
    ptTotalRet[i] = totalReturns || 1;
    if (type === 0) countGround++;
    if (type === 2) countOutlier++;
}

// === PHYSICS ===
function updatePhysics(deltaTime) {
    if (!isRunning) return;
    const prevSimTime = totalSimTime;
    totalSimTime += deltaTime;

    const speedPxSec = (params.speed * 1000 / 3600) * 1.5;
    const prevPlaneX = planeX;
    planeX += speedPxSec * deltaTime;

    if (planeX > canvas.width + 100) {
        if (params.loopMode) {
            fullReset();
        } else {
            // Stop at end, keep scenery for comparison
            isRunning = false;
            planeX = canvas.width + 100;
            const btn = document.getElementById('btn-toggle');
            const ind = document.getElementById('indicator');
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
            btn.className = 'flex-1 bg-emerald-500/90 hover:bg-emerald-400 text-white py-2 rounded-lg font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest';
            ind.className = 'w-2 h-2 rounded-full bg-amber-500';
            cancelAnimationFrame(animationId);
            updateStats();
        }
        return;
    }

    for (const b of birds) {
        b.x += b.vx * deltaTime;
        b.y += b.vy * deltaTime + Math.sin(totalSimTime * 0.4 + b.offset) * 0.15;
        if (b.x > canvas.width + 100) b.x = -50;
        if (b.x < -100) b.x = canvas.width + 50;
        if (b.y < 50) b.vy = Math.abs(b.vy);
        if (b.y > canvas.height * 0.75) b.vy = -Math.abs(b.vy);
    }

    const planeY = getPlaneY();
    const fovRad = params.fov * Math.PI / 180;
    const footprintFactor = Math.max(0.5, getFootprintMeters() * 4);

    // ALL relevant parameters affect visual point generation:
    //   PRF ↑       → more points (linear — main driver)
    //   Scan Rate ↑ → more coverage lines → denser cloud (sqrt)
    //   Speed ↑     → fewer points per area (inverse)
    //   Altitude ↑  → wider swath → fewer pts/area (via swath)
    //   FOV ↑       → wider swath → fewer pts/area (via swath)
    const swathM = getSwathMeters();
    const speedMs = params.speed / 3.6;
    const basePulses = 15
        * (params.prf / 150)
        * Math.sqrt(params.scanRate / 40)
        * (50 / speedMs)
        / Math.sqrt(swathM / 437);
    const loadFactor = Math.max(0.1, 1 - (pointCount / MAX_POINTS));
    const rawPulses = basePulses * loadFactor * Math.min(1, deltaTime / 0.016);
    // Allow fractional pulses: e.g. 0.3 → 30% chance of 1 pulse per frame
    const pulsesThisFrame = Math.floor(rawPulses) + (Math.random() < (rawPulses % 1) ? 1 : 0);

    for (let i = 0; i < pulsesThisFrame; i++) {
        if (pointCount >= MAX_POINTS) break;

        const t = prevSimTime + (i / pulsesThisFrame) * deltaTime;
        const exactPlaneX = prevPlaneX + speedPxSec * (t - prevSimTime);
        // Scan pattern: zigzag (sine) vs parallel (sawtooth)
        let angle;
        if (params.scanPattern === 'parallel') {
            const phase = (t * params.scanRate) % 1;
            angle = (phase * 2 - 1) * (fovRad / 2);
        } else {
            angle = Math.sin(t * params.scanRate * Math.PI * 2) * (fovRad / 2);
        }
        const dirX = Math.sin(angle);
        const dirY = Math.cos(angle);
        const maxDist = (canvas.height - planeY) / dirY;

        const endX = exactPlaneX + maxDist * dirX;
        const rMinX = Math.min(exactPlaneX, endX) - 10;
        const rMaxX = Math.max(exactPlaneX, endX) + 10;

        // Pre-filter trees
        const nearby = [];
        for (const tr of trees) {
            if (tr.x + tr.width / 2 >= rMinX && tr.x - tr.width / 2 <= rMaxX) nearby.push(tr);
        }

        let energy = 1.0, returns = 0, dist = 0;
        const hits = []; // temp per-ray

        while (dist < maxDist && energy > 0.01) {
            const rx = exactPlaneX + dist * dirX;
            const ry = planeY + dist * dirY;
            if (rx < 0 || rx > canvas.width) break;

            const gy = getTopography(rx);

            // Ground
            if (ry >= gy) {
                if (returns < params.returns) {
                    hits.push([rx, gy, 0, ++returns]);
                }
                break;
            }

            // Birds
            let birdHit = false;
            for (const b of birds) {
                if (Math.abs(b.x - rx) < 12 && Math.abs(b.y - ry) < 12) {
                    hits.push([rx, ry, 2, returns + 1]);
                    birdHit = true; break;
                }
            }
            if (birdHit) break;

            // Vegetation
            let inLeaf = false, lai = 0;
            for (const tr of nearby) {
                const dx = Math.abs(rx - tr.x);
                if (dx < tr.width / 2) {
                    let hT, hB;
                    if (tr.type === 'pine') {
                        hT = tr.height * (1 - dx / (tr.width / 2));
                        hB = 20;
                    } else {
                        const ey = (tr.height / 2) * Math.sqrt(1 - (dx / (tr.width / 2)) ** 2);
                        hT = tr.height / 2 + ey;
                        hB = Math.max(25, tr.height / 2 - ey);
                    }
                    if (ry >= tr.groundY - hT && ry <= tr.groundY - hB) {
                        inLeaf = true;
                        lai += tr.lai;
                    }
                }
            }

            if (inLeaf) {
                const intensityFactor = params.intensity / 100;
                if (Math.random() < lai * 0.06 * footprintFactor * energy * intensityFactor) {
                    returns++;
                    hits.push([rx, ry, 1, returns]);
                    energy -= 1.0 / params.returns;
                    if (returns >= params.returns) break;
                }
            }
            dist += 3;
        }

        // Store hits with last-return marking and total returns count
        const nHits = hits.length;
        for (let h = 0; h < nHits; h++) {
            addPoint(hits[h][0], hits[h][1], hits[h][2], hits[h][3], h === nHits - 1, nHits);
        }

        // Track swath reveal
        const ghx = exactPlaneX + ((GROUND_BASE() - planeY) / dirY) * dirX;
        if (ghx > maxRevealX) maxRevealX = ghx;
    }
}

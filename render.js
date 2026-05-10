// === RENDERING & UI (v7) ===

// Point colors - mutable so color pickers can change them
let COLOR_GROUND = '#fbbf24';
let COLOR_OUTLIER = '#ef4444';
let COLOR_VEG_FIRST = '#38bdf8';
let COLOR_VEG_MID = '#a855f7';
let COLOR_VEG_LAST = '#22c55e';

function drawAirplane(x, y) {
    ctx.save(); ctx.translate(x, y);
    // Fuselage
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(0, 0, 35, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Cockpit
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(20, -2, 8, 3, 0, 0, Math.PI); ctx.fill();
    // Top wing
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-20, -20); ctx.lineTo(15, -20); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.ellipse(-10, -10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    // Bottom wing
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-25, 25); ctx.lineTo(15, 25); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.ellipse(-10, 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(-25, -2); ctx.lineTo(-38, -18); ctx.lineTo(-35, 0); ctx.fill();
    // Sensor
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(5, 6, 5, 0, Math.PI); ctx.fill();
    // Nav light
    ctx.fillStyle = '#10b981'; ctx.fillRect(4, 10, 2, 2);
    // Blinking light
    if (isRunning && Math.sin(totalSimTime * 8) > 0.5) {
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-30, -14, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawSolidWorld(revealX) {
    ctx.save();
    ctx.beginPath(); ctx.rect(revealX, 0, canvas.width - revealX, canvas.height); ctx.clip();

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
    if (params.darkMode) {
        skyGrad.addColorStop(0, '#0c1222'); skyGrad.addColorStop(1, '#020617');
    } else {
        skyGrad.addColorStop(0, '#bfdbfe'); skyGrad.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(revealX, 0, canvas.width - revealX, canvas.height * 0.5);

    // Ground fill
    ctx.beginPath(); ctx.moveTo(revealX, getTopography(revealX));
    for (let x = revealX; x <= canvas.width; x += 30) ctx.lineTo(x, getTopography(x));
    ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(revealX, canvas.height); ctx.closePath();

    const grdGrad = ctx.createLinearGradient(0, GROUND_BASE() - 30, 0, canvas.height);
    if (params.darkMode) {
        grdGrad.addColorStop(0, '#1a2332'); grdGrad.addColorStop(1, '#0a0f18');
    } else {
        grdGrad.addColorStop(0, '#a3846f'); grdGrad.addColorStop(1, '#8b7355');
    }
    ctx.fillStyle = grdGrad; ctx.fill();
    ctx.strokeStyle = params.darkMode ? '#2d4a3e' : '#6b8f71'; ctx.lineWidth = 2; ctx.stroke();

    // Trees
    for (const t of trees) {
        if (t.x < revealX - t.width) continue;
        // Trunk
        ctx.fillStyle = '#3d2517';
        const trunkH = t.type === 'pine' ? 20 : 30;
        ctx.fillRect(t.x - 4, t.groundY - trunkH, 8, trunkH);

        // Canopy
        const grad = ctx.createLinearGradient(t.x, t.groundY - t.height, t.x, t.groundY);
        grad.addColorStop(0, t.type === 'pine' ? '#3a8c40' : '#45a049');
        grad.addColorStop(0.5, t.type === 'pine' ? '#2e7d32' : '#388e3c');
        grad.addColorStop(1, '#1a4d1e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (t.type === 'pine') {
            ctx.moveTo(t.x, t.groundY - t.height);
            ctx.lineTo(t.x - t.width / 2, t.groundY - 20);
            ctx.lineTo(t.x + t.width / 2, t.groundY - 20);
        } else {
            ctx.ellipse(t.x, t.groundY - t.height / 2, t.width / 2, t.height / 2, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        // Canopy outline
        ctx.strokeStyle = 'rgba(100,200,100,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.restore();


    // Smooth fade at transition
    if (revealX > 0 && revealX < canvas.width) {
        const fadeW = 100;
        const fadeColor = params.darkMode ? '#020617' : '#f1f5f9';
        const fade = ctx.createLinearGradient(revealX, 0, revealX + fadeW, 0);
        fade.addColorStop(0, fadeColor);
        fade.addColorStop(1, params.darkMode ? 'rgba(2,6,23,0)' : 'rgba(241,245,249,0)');
        ctx.fillStyle = fade;
        ctx.fillRect(revealX, 0, fadeW, canvas.height);
    }
}

// Reusable point batch renderer (works for both current data and snapshot)
function drawPointsBatch(px, py, ptype, preturn, plast, ptotal, count) {
    const s = params.pointSize;
    if (params.colorMode === 'class') {
        // Classification: distinct colors per return type
        ctx.fillStyle = COLOR_VEG_MID;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 1 && preturn[i] > 1 && !plast[i]) ctx.fillRect(px[i] - 0.7*s, py[i] - 0.7*s, 1.4*s, 1.4*s);
        }
        ctx.fillStyle = COLOR_VEG_LAST;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 1 && plast[i] && ptotal[i] > 1) ctx.fillRect(px[i] - 0.7*s, py[i] - 0.7*s, 1.4*s, 1.4*s);
        }
        ctx.fillStyle = COLOR_VEG_FIRST;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 1 && preturn[i] === 1) ctx.fillRect(px[i] - 0.8*s, py[i] - 0.8*s, 1.6*s, 1.6*s);
        }
        ctx.fillStyle = COLOR_GROUND;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 0) ctx.fillRect(px[i] - 0.9*s, py[i] - 0.9*s, 1.8*s, 1.8*s);
        }
        ctx.fillStyle = COLOR_OUTLIER;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 2) ctx.fillRect(px[i] - 1.5*s, py[i] - 1.5*s, 3*s, 3*s);
        }
    } else if (params.colorMode === 'didactic') {
        // Didactic: just Vegetation (green) vs Ground (amber) vs Outlier (red)
        ctx.fillStyle = '#22c55e';
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 1) ctx.fillRect(px[i] - 0.8*s, py[i] - 0.8*s, 1.6*s, 1.6*s);
        }
        ctx.fillStyle = COLOR_GROUND;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 0) ctx.fillRect(px[i] - 1*s, py[i] - 1*s, 2*s, 2*s);
        }
        ctx.fillStyle = COLOR_OUTLIER;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 2) ctx.fillRect(px[i] - 1.5*s, py[i] - 1.5*s, 3*s, 3*s);
        }
    } else {
        // Elevation: height-based color ramp
        const yTop = GROUND_BASE() - 350;
        const yBot = GROUND_BASE() + 50;
        const yRange = yBot - yTop;
        for (let i = 0; i < count; i++) {
            if (ptype[i] === 2) { ctx.fillStyle = COLOR_OUTLIER; ctx.fillRect(px[i]-1.5*s, py[i]-1.5*s, 3*s, 3*s); continue; }
            const t = Math.max(0, Math.min(1, (py[i] - yTop) / yRange));
            let r, g, b;
            if (t < 0.25) { const q = t / 0.25; r = 0; g = Math.floor(q * 200); b = Math.floor(255 - q * 100); }
            else if (t < 0.5) { const q = (t - 0.25) / 0.25; r = 0; g = Math.floor(200 + q * 55); b = Math.floor(155 - q * 155); }
            else if (t < 0.75) { const q = (t - 0.5) / 0.25; r = Math.floor(q * 255); g = 255; b = 0; }
            else { const q = (t - 0.75) / 0.25; r = 255; g = Math.floor(255 - q * 180); b = 0; }
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const sz = (ptype[i] === 0 ? 1.8 : (preturn[i] === 1 ? 1.5 : 1)) * s;
            ctx.fillRect(px[i] - sz/2, py[i] - sz/2, sz, sz);
        }
    }
}

function drawFrame() {
    const bg = params.darkMode ? '#020617' : '#f1f5f9';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ghost wireframe trees (subtle guide in scanned area)
    ctx.lineWidth = 1;
    const ghostAlpha = params.darkMode ? 0.04 : 0.08;
    for (const t of trees) {
        if (t.x > maxRevealX) continue;
        ctx.strokeStyle = params.darkMode ? `rgba(16,185,129,${ghostAlpha})` : `rgba(0,100,0,${ghostAlpha})`;
        ctx.beginPath();
        if (t.type === 'pine') {
            ctx.moveTo(t.x, t.groundY - t.height);
            ctx.lineTo(t.x - t.width / 2, t.groundY - 20);
            ctx.lineTo(t.x + t.width / 2, t.groundY - 20); ctx.closePath();
        } else {
            ctx.ellipse(t.x, t.groundY - t.height / 2, t.width / 2, t.height / 2, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
    }

    // Ground reference line
    ctx.strokeStyle = params.darkMode ? 'rgba(251,191,36,0.08)' : 'rgba(180,130,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, getTopography(0));
    for (let x = 0; x < Math.min(maxRevealX, canvas.width); x += 40) ctx.lineTo(x, getTopography(x));
    ctx.stroke();

    // === POINT RENDERING (supports comparison swipe) ===
    if (compareMode && hasSnapshot) {
        const divX = Math.floor(swipePosX * canvas.width);
        // Left side: Snapshot A
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, divX, canvas.height); ctx.clip();
        drawPointsBatch(snapX, snapY, snapType, snapReturn, snapIsLast, snapTotalRet, snapCount);
        ctx.restore();
        // Right side: Current B
        ctx.save(); ctx.beginPath(); ctx.rect(divX, 0, canvas.width - divX, canvas.height); ctx.clip();
        drawPointsBatch(ptX, ptY, ptType, ptReturn, ptIsLast, ptTotalRet, pointCount);
        ctx.restore();
    } else {
        drawPointsBatch(ptX, ptY, ptType, ptReturn, ptIsLast, ptTotalRet, pointCount);
    }

    // Solid world (unscanned area)
    drawSolidWorld(maxRevealX);

    // Birds
    for (const b of birds) {
        const wingY = Math.sin(totalSimTime * 10 + b.offset) * 4;
        ctx.fillStyle = params.darkMode ? '#e2e8f0' : '#334155';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 7, b.y - wingY - 2);
        ctx.lineTo(b.x - 3, b.y);
        ctx.lineTo(b.x + 3, b.y);
        ctx.lineTo(b.x + 7, b.y + wingY - 2);
        ctx.closePath();
        ctx.fill();
    }

    const planeY = getPlaneY();
    const fovRad = params.fov * Math.PI / 180;

    if (isRunning || planeX > 0) {
        const distToGround = GROUND_BASE() - planeY;
        const spreadX = distToGround * Math.tan(fovRad / 2);

        // FOV cone - MORE VISIBLE with lines + glow
        const coneGrad = ctx.createLinearGradient(0, planeY, 0, GROUND_BASE());
        coneGrad.addColorStop(0, 'rgba(16, 185, 129, 0.20)');
        coneGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
        coneGrad.addColorStop(1, 'rgba(16, 185, 129, 0.03)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(planeX + 5, planeY + 10);
        ctx.lineTo(planeX - spreadX, GROUND_BASE() + 50);
        ctx.lineTo(planeX + spreadX, GROUND_BASE() + 50);
        ctx.fill();

        // FOV edge lines (dashed)
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(planeX + 5, planeY + 10); ctx.lineTo(planeX - spreadX, GROUND_BASE() + 50);
        ctx.moveTo(planeX + 5, planeY + 10); ctx.lineTo(planeX + spreadX, GROUND_BASE() + 50);
        ctx.stroke();
        ctx.setLineDash([]);

        // FOV angle label
        ctx.fillStyle = 'rgba(16,185,129,0.7)';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(params.fov + '°', planeX + 5, planeY + 32);

        // Swath width annotation at ground level
        const swathM = getSwathMeters();
        const gndY = GROUND_BASE() + 30;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(planeX - spreadX, gndY); ctx.lineTo(planeX + spreadX, gndY);
        ctx.stroke();
        // End ticks
        ctx.beginPath();
        ctx.moveTo(planeX - spreadX, gndY - 6); ctx.lineTo(planeX - spreadX, gndY + 6);
        ctx.moveTo(planeX + spreadX, gndY - 6); ctx.lineTo(planeX + spreadX, gndY + 6);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(56,189,248,0.5)'; ctx.font = '9px JetBrains Mono';
        ctx.fillText('Swath ≈ ' + swathM.toFixed(0) + 'm', planeX + 5, gndY + 18);

        // Active laser beam (bright, pulsing)
        if (isRunning) {
            const scanAngle = Math.sin(totalSimTime * params.scanRate * Math.PI * 2) * (fovRad / 2);
            const dX = Math.sin(scanAngle);
            const dY = Math.cos(scanAngle);

            // Trace ray to find actual hit point
            let hitX = planeX + 5, hitY = GROUND_BASE();
            let d = 0;
            const mDist = distToGround / dY;
            while (d < mDist) {
                const rx = planeX + 5 + d * dX;
                const ry = planeY + 10 + d * dY;
                if (ry >= getTopography(rx)) { hitX = rx; hitY = ry; break; }
                // Check trees
                let blocked = false;
                for (const tr of trees) {
                    const dx2 = Math.abs(rx - tr.x);
                    if (dx2 < tr.width / 2) {
                        let hT, hB;
                        if (tr.type === 'pine') { hT = tr.height * (1 - dx2 / (tr.width / 2)); hB = 20; }
                        else {
                            const ey = (tr.height / 2) * Math.sqrt(1 - (dx2 / (tr.width / 2)) ** 2);
                            hT = tr.height / 2 + ey; hB = Math.max(25, tr.height / 2 - ey);
                        }
                        if (ry >= tr.groundY - hT && ry <= tr.groundY - hB) {
                            if (Math.random() < 0.3) { hitX = rx; hitY = ry; blocked = true; break; }
                        }
                    }
                }
                if (blocked) break;
                d += 8;
            }
            if (d >= mDist) { hitX = planeX + 5 + mDist * dX; hitY = GROUND_BASE(); }

            // Laser glow
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(planeX + 5, planeY + 10); ctx.lineTo(hitX, hitY); ctx.stroke();
            // Laser core
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.95)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(planeX + 5, planeY + 10); ctx.lineTo(hitX, hitY); ctx.stroke();

            // Footprint at impact
            const fpPx = Math.max(3, getFootprintMeters() * 4);
            ctx.beginPath(); ctx.arc(hitX, hitY, fpPx, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(52, 211, 153, 0.35)'; ctx.fill();
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.8)'; ctx.lineWidth = 1.5; ctx.stroke();

            // Altitude line (dashed, subtle)
            ctx.setLineDash([4, 8]);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(planeX + 5, planeY + 10); ctx.lineTo(planeX + 5, GROUND_BASE()); ctx.stroke();
            ctx.setLineDash([]);

            // H label
            ctx.fillStyle = 'rgba(56,189,248,0.4)'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'left';
            ctx.fillText('H=' + params.altitude + 'm', planeX + 12, (planeY + GROUND_BASE()) / 2);
        }
    }

    drawAirplane(planeX, planeY);

    // Comparison swipe divider
    if (compareMode && hasSnapshot) {
        const divX = Math.floor(swipePosX * canvas.width);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(divX, 0); ctx.lineTo(divX, canvas.height); ctx.stroke();
        // Labels
        ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(168,85,247,0.8)'; ctx.fillText('A', divX - 20, 30);
        ctx.fillStyle = 'rgba(56,189,248,0.8)'; ctx.fillText('B', divX + 20, 30);
    }

    // Point count limit indicator
    if (pointCount > MAX_POINTS * 0.9) {
        ctx.fillStyle = params.darkMode ? 'rgba(239,68,68,0.7)' : 'rgba(220,38,38,0.9)';
        ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
        ctx.fillText('⚠ Buffer ' + Math.round(pointCount / MAX_POINTS * 100) + '%', canvas.width / 2, canvas.height - 20);
    }
}

function drawMinimap() {
    miniCtx.fillStyle = '#0a1628';
    miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

    const planeRelX = Math.max(0, (planeX / canvas.width) * miniCanvas.width);
    const visualSwathW = Math.min(miniCanvas.height * 0.8, getSwathMeters() * 0.08);
    const midY = miniCanvas.height / 2;

    // Trees covering ENTIRE minimap (forest seen from above)
    for (const t of trees) {
        const rx = (t.x / canvas.width) * miniCanvas.width;
        // Pseudo-random Y across full minimap height (seeded from tree properties)
        const seed = (t.x * 7.31 + t.width * 13.17) % 1;
        const ry = 8 + seed * (miniCanvas.height - 16);
        miniCtx.fillStyle = t.type === 'pine' ? '#1b5e20' : '#2e7d32';
        miniCtx.globalAlpha = 0.2;
        miniCtx.beginPath();
        miniCtx.arc(rx, ry, Math.max(1.5, (t.width / canvas.width) * miniCanvas.width), 0, Math.PI * 2);
        miniCtx.fill();
    }
    // Extra random trees to fill gaps
    for (let i = 0; i < 60; i++) {
        const seed1 = ((i * 127.1 + 311.7) % 1000) / 1000;
        const seed2 = ((i * 269.5 + 183.3) % 1000) / 1000;
        miniCtx.fillStyle = seed1 > 0.5 ? '#1b5e20' : '#2e7d32';
        miniCtx.globalAlpha = 0.15;
        miniCtx.beginPath();
        miniCtx.arc(seed1 * miniCanvas.width, 6 + seed2 * (miniCanvas.height - 12), 2 + seed1 * 3, 0, Math.PI * 2);
        miniCtx.fill();
    }
    miniCtx.globalAlpha = 1.0;

    // === OVERLAP VISUALIZATION (drawn ON TOP of trees) ===
    const stripTop = midY - visualSwathW / 2;
    const stripBot = midY + visualSwathW / 2;

    if (params.overlap > 0) {
        const overlapH = visualSwathW * (params.overlap / 100);
        const adjTopStart = stripTop - visualSwathW + overlapH;
        const adjBotStart = stripBot;

        // ---- Adjacent flight strips (blue) ----
        miniCtx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        miniCtx.fillRect(0, adjTopStart, miniCanvas.width, visualSwathW);
        miniCtx.fillRect(0, adjBotStart, miniCanvas.width, visualSwathW);

        // Adjacent strip borders (solid blue)
        miniCtx.strokeStyle = '#3b82f6'; miniCtx.lineWidth = 1.5; miniCtx.setLineDash([]);
        miniCtx.beginPath();
        miniCtx.moveTo(0, adjTopStart); miniCtx.lineTo(miniCanvas.width, adjTopStart);
        miniCtx.moveTo(0, adjTopStart + visualSwathW); miniCtx.lineTo(miniCanvas.width, adjTopStart + visualSwathW);
        miniCtx.moveTo(0, adjBotStart); miniCtx.lineTo(miniCanvas.width, adjBotStart);
        miniCtx.moveTo(0, adjBotStart + visualSwathW); miniCtx.lineTo(miniCanvas.width, adjBotStart + visualSwathW);
        miniCtx.stroke();

        // ---- Overlap zones (bright orange fill + hatch) ----
        miniCtx.fillStyle = 'rgba(251, 146, 60, 0.5)';
        miniCtx.fillRect(0, stripTop, miniCanvas.width, overlapH);
        miniCtx.fillRect(0, stripBot - overlapH, miniCanvas.width, overlapH);

        // Diagonal hatch pattern
        miniCtx.strokeStyle = 'rgba(251, 191, 36, 0.6)'; miniCtx.lineWidth = 1;
        miniCtx.beginPath();
        for (let hx = -150; hx < miniCanvas.width + 150; hx += 8) {
            miniCtx.moveTo(hx, stripTop); miniCtx.lineTo(hx + overlapH, stripTop + overlapH);
            miniCtx.moveTo(hx, stripBot - overlapH); miniCtx.lineTo(hx + overlapH, stripBot);
        }
        miniCtx.stroke();

        // Overlap zone borders (thick orange)
        miniCtx.strokeStyle = '#f97316'; miniCtx.lineWidth = 2; miniCtx.setLineDash([]);
        miniCtx.beginPath();
        miniCtx.moveTo(0, stripTop); miniCtx.lineTo(miniCanvas.width, stripTop);
        miniCtx.moveTo(0, stripTop + overlapH); miniCtx.lineTo(miniCanvas.width, stripTop + overlapH);
        miniCtx.moveTo(0, stripBot - overlapH); miniCtx.lineTo(miniCanvas.width, stripBot - overlapH);
        miniCtx.moveTo(0, stripBot); miniCtx.lineTo(miniCanvas.width, stripBot);
        miniCtx.stroke();

        // ---- Flight path center lines ----
        const adjAboveY = adjTopStart + visualSwathW / 2;
        const adjBelowY = adjBotStart + visualSwathW / 2;
        miniCtx.strokeStyle = '#60a5fa'; miniCtx.lineWidth = 1;
        miniCtx.setLineDash([8, 4]);
        miniCtx.beginPath();
        miniCtx.moveTo(0, adjAboveY); miniCtx.lineTo(miniCanvas.width, adjAboveY);
        miniCtx.moveTo(0, adjBelowY); miniCtx.lineTo(miniCanvas.width, adjBelowY);
        miniCtx.stroke(); miniCtx.setLineDash([]);

        // Small airplane icons on adjacent flight paths
        for (const ay of [adjAboveY, adjBelowY]) {
            miniCtx.fillStyle = '#60a5fa'; miniCtx.globalAlpha = 0.7;
            miniCtx.beginPath();
            miniCtx.moveTo(miniCanvas.width * 0.3 + 5, ay);
            miniCtx.lineTo(miniCanvas.width * 0.3 - 3, ay - 3);
            miniCtx.lineTo(miniCanvas.width * 0.3 - 1, ay);
            miniCtx.lineTo(miniCanvas.width * 0.3 - 3, ay + 3);
            miniCtx.fill(); miniCtx.globalAlpha = 1;
        }

        // ---- Labels ----
        miniCtx.textAlign = 'left';
        const lblText = params.overlap + '% OVERLAP';
        miniCtx.font = 'bold 9px JetBrains Mono';
        const lblW = miniCtx.measureText(lblText).width;
        miniCtx.fillStyle = 'rgba(249, 115, 22, 0.95)';
        miniCtx.fillRect(4, stripTop + overlapH / 2 - 6, lblW + 6, 12);
        miniCtx.fillStyle = '#fff';
        miniCtx.fillText(lblText, 7, stripTop + overlapH / 2 + 3);

        miniCtx.font = '7px JetBrains Mono'; miniCtx.fillStyle = '#60a5fa';
        miniCtx.fillText('Faixa adjacente ↑', 4, adjAboveY - 5);
        miniCtx.fillText('Faixa adjacente ↓', 4, adjBelowY + 10);
    }

    // Current swath strip
    const scanGrad = miniCtx.createLinearGradient(0, 0, planeRelX, 0);
    scanGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
    scanGrad.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
    miniCtx.fillStyle = scanGrad;
    miniCtx.fillRect(0, midY - visualSwathW / 2, planeRelX, visualSwathW);

    // Swath borders
    miniCtx.setLineDash([4, 4]);
    miniCtx.strokeStyle = 'rgba(16,185,129,0.3)'; miniCtx.lineWidth = 0.5;
    miniCtx.beginPath();
    miniCtx.moveTo(0, midY - visualSwathW / 2); miniCtx.lineTo(planeRelX, midY - visualSwathW / 2);
    miniCtx.moveTo(0, midY + visualSwathW / 2); miniCtx.lineTo(planeRelX, midY + visualSwathW / 2);
    miniCtx.stroke(); miniCtx.setLineDash([]);

    // Scan pattern trail (SLOWED DOWN, pattern-dependent)
    if (isRunning || planeX > 0) {
        miniCtx.lineWidth = 1.5;
        const miniSpeed = (((params.speed * 1000 / 3600) * 1.5) / canvas.width) * miniCanvas.width;
        // More trail points for slow scan rates
        const trailSteps = Math.max(80, Math.min(300, Math.round(200 / Math.max(1, params.scanRate / 20))));
        const dt = 0.01;

        // Draw zigzag or parallel pattern
        miniCtx.strokeStyle = params.scanPattern === 'parallel' ? 'rgba(251,191,36,0.7)' : 'rgba(110,231,183,0.8)';
        miniCtx.beginPath();
        let first = true;
        for (let i = 0; i < trailSteps; i++) {
            const tO = i * dt;
            if (totalSimTime - tO < 0) break;
            const pX = planeRelX - tO * miniSpeed;
            if (pX < 0) break;
            let sa;
            if (params.scanPattern === 'parallel') {
                const phase = ((totalSimTime - tO) * params.scanRate) % 1;
                sa = (phase * 2 - 1);
            } else {
                sa = Math.sin((totalSimTime - tO) * params.scanRate * Math.PI * 2);
            }
            const pY = midY + sa * visualSwathW / 2;
            if (first) { miniCtx.moveTo(pX, pY); first = false; } else miniCtx.lineTo(pX, pY);
        }
        miniCtx.stroke();

        // Pattern label
        miniCtx.fillStyle = 'rgba(148,163,184,0.4)'; miniCtx.font = '7px JetBrains Mono'; miniCtx.textAlign = 'left';
        miniCtx.fillText(params.scanPattern === 'parallel' ? 'SAW' : 'SIN', 4, miniCanvas.height - 4);
    }

    // Plane icon
    miniCtx.fillStyle = '#f8fafc';
    miniCtx.beginPath();
    miniCtx.moveTo(planeRelX + 8, midY);
    miniCtx.lineTo(planeRelX - 4, midY - 5);
    miniCtx.lineTo(planeRelX - 2, midY);
    miniCtx.lineTo(planeRelX - 4, midY + 5);
    miniCtx.fill();
}

// === STATS ===
function updateStats() {
    document.getElementById('stat-total').innerText = pointCount > 9999 ? (pointCount / 1000).toFixed(1) + 'k' : pointCount;

    // Use centralized formula from simulator.js
    const theoDens = getTheoDensity();
    document.getElementById('stat-dens-theo').innerHTML = theoDens.toFixed(1) + ' <span class="text-[7px]">pts/m²</span>';

    const gPct = pointCount ? Math.round((countGround / pointCount) * 100) : 0;
    document.getElementById('stat-ground').innerText = gPct + '%';
    document.getElementById('stat-ground').className = 'stat-val ' + (gPct < 5 ? 'text-red-500' : 'text-amber-500');
    document.getElementById('stat-outliers').innerText = countOutlier;
}

function updateDerivedMetrics() {
    const swath = getSwathMeters();
    const footprint = getFootprintMeters();
    const prfHz = params.prf * 1000;
    const speedMs = params.speed / 3.6;
    const alongTrack = prfHz > 0 ? speedMs / prfHz : 0;
    const ptsPerLine = params.scanRate > 0 ? prfHz / params.scanRate : 0;
    const crossTrack = ptsPerLine > 0 ? swath / ptsPerLine : 0;
    const theoDens = getTheoDensity();
    const ptSpacing = theoDens > 0 ? (1 / Math.sqrt(theoDens)).toFixed(2) : '∞';
    const rangeRes = getRangeResolution();
    const stripSpacing = swath * (1 - params.overlap / 100);

    document.getElementById('met-swath').innerText = swath.toFixed(0) + ' m';
    document.getElementById('met-footprint').innerText = (footprint * 100).toFixed(0) + ' cm';
    document.getElementById('met-along').innerText = alongTrack < 0.001 ? '<0.001 m' : alongTrack.toFixed(3) + ' m';
    document.getElementById('met-cross').innerText = crossTrack < 0.0001 ? '<0.001 m' : crossTrack.toFixed(3) + ' m';
    document.getElementById('met-ptsline').innerText = ptsPerLine > 999 ? (ptsPerLine / 1000).toFixed(1) + 'k' : Math.round(ptsPerLine);
    document.getElementById('met-overlap').innerText = params.overlap + '%';
    document.getElementById('met-rangeres').innerText = rangeRes.toFixed(2) + ' m';
    document.getElementById('met-stripspacing').innerText = stripSpacing.toFixed(0) + ' m';
    document.getElementById('met-ptspacing').innerText = ptSpacing + ' m';

    // Also update density immediately when params change
    updateStats();
}

// === GAME LOOP ===
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;
    updatePhysics(dt);
    drawFrame();
    drawMinimap();
    frameCount++;
    if (frameCount % 8 === 0) updateStats();
    if (isRunning) animationId = requestAnimationFrame(gameLoop);
}

// === UI SETUP ===
const updateText = (id, val) => document.getElementById(id).innerText = val;

const setupSlider = (id, paramKey, displayId, suffix, cb) => {
    document.getElementById(id).addEventListener('input', (e) => {
        params[paramKey] = parseFloat(e.target.value);
        updateText(displayId, params[paramKey] + (suffix || ''));
        if (cb) cb();
        updateDerivedMetrics();
        if (!isRunning) { drawFrame(); drawMinimap(); }
    });
};

setupSlider('slider-prf', 'prf', 'val-prf', ' kHz');
setupSlider('slider-returns', 'returns', 'val-returns', '');
setupSlider('slider-fov', 'fov', 'val-fov', '°');
setupSlider('slider-scanrate', 'scanRate', 'val-scanrate', ' Hz');
setupSlider('slider-alt', 'altitude', 'val-alt', ' m');
setupSlider('slider-speed', 'speed', 'val-speed', ' km/h');

// Pulse width slider
document.getElementById('slider-pulsewidth').addEventListener('input', (e) => {
    params.pulseWidth = parseInt(e.target.value);
    document.getElementById('val-pulsewidth').innerText = params.pulseWidth + ' ns';
    updateDerivedMetrics();
});

// Intensity slider
document.getElementById('slider-intensity').addEventListener('input', (e) => {
    params.intensity = parseInt(e.target.value);
    document.getElementById('val-intensity').innerText = params.intensity + '%';
});

document.getElementById('slider-divergence').addEventListener('input', (e) => {
    params.divergence = parseInt(e.target.value) / 10;
    updateText('val-divergence', params.divergence.toFixed(1) + ' mrad');
    updateDerivedMetrics();
    if (!isRunning) { drawFrame(); drawMinimap(); }
});

// Overlap slider
document.getElementById('slider-overlap').addEventListener('input', (e) => {
    params.overlap = parseInt(e.target.value);
    updateText('val-overlap', params.overlap + '%');
    updateDerivedMetrics();
    if (!isRunning) drawMinimap();
});

// Scan pattern toggle
function setScanBtn(active, inactive) {
    document.getElementById(active).className = 'btn-sm active flex-1';
    document.getElementById(inactive).className = 'btn-sm flex-1';
}
document.getElementById('btn-scan-zigzag').addEventListener('click', () => {
    params.scanPattern = 'zigzag'; setScanBtn('btn-scan-zigzag', 'btn-scan-parallel');
    document.getElementById('val-scanpattern').innerText = 'Zigzag';
});
document.getElementById('btn-scan-parallel').addEventListener('click', () => {
    params.scanPattern = 'parallel'; setScanBtn('btn-scan-parallel', 'btn-scan-zigzag');
    document.getElementById('val-scanpattern').innerText = 'Paralelo';
});

setupSlider('slider-density', 'forestDens', 'val-density', '', () => {
    let t = 'Média';
    if (params.forestDens > 80) t = 'Muito Densa';
    else if (params.forestDens > 60) t = 'Densa';
    else if (params.forestDens < 35) t = 'Rala';
    updateText('val-density', t);
    fullReset();
});

setupSlider('slider-birds', 'birdCount', 'val-birds', '', fullReset);

// === PLAY / PAUSE ===
function togglePlay() {
    isRunning = !isRunning;
    const btn = document.getElementById('btn-toggle');
    const ind = document.getElementById('indicator');
    if (isRunning) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        btn.className = 'flex-1 bg-amber-500/90 hover:bg-amber-400 text-slate-900 py-2 rounded-lg font-bold transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest';
        ind.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]';
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Continuar';
        btn.className = 'flex-1 bg-emerald-500/90 hover:bg-emerald-400 text-white py-2 rounded-lg font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest';
        ind.className = 'w-2 h-2 rounded-full bg-amber-500';
        cancelAnimationFrame(animationId);
    }
}
document.getElementById('btn-toggle').addEventListener('click', togglePlay);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target !== document.body) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'KeyM') { document.getElementById('sidebar').classList.toggle('sidebar-collapsed'); }
});

// === COLOR MODE ===
function setColorMode(mode) {
    params.colorMode = mode;
    ['legend-class', 'legend-didactic', 'legend-elev'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['btn-color-class', 'btn-color-didactic', 'btn-color-elev'].forEach(id => document.getElementById(id).className = 'btn-sm flex-1');
    if (mode === 'class') {
        document.getElementById('btn-color-class').className = 'btn-sm active flex-1';
        document.getElementById('legend-class').classList.remove('hidden');
        document.getElementById('val-colormode').innerText = 'Retornos';
    } else if (mode === 'didactic') {
        document.getElementById('btn-color-didactic').className = 'btn-sm active flex-1';
        document.getElementById('legend-didactic').classList.remove('hidden');
        document.getElementById('val-colormode').innerText = 'Didático';
    } else {
        document.getElementById('btn-color-elev').className = 'btn-sm active flex-1';
        document.getElementById('legend-elev').classList.remove('hidden');
        document.getElementById('val-colormode').innerText = 'Elevação';
    }
    if (!isRunning) drawFrame();
}
document.getElementById('btn-color-class').addEventListener('click', () => setColorMode('class'));
document.getElementById('btn-color-didactic').addEventListener('click', () => setColorMode('didactic'));
document.getElementById('btn-color-elev').addEventListener('click', () => setColorMode('elev'));

// === POINT SIZE ===
document.getElementById('slider-ptsize').addEventListener('input', (e) => {
    params.pointSize = parseInt(e.target.value) / 10;
    document.getElementById('val-ptsize').innerText = params.pointSize.toFixed(1) + 'x';
    if (!isRunning) drawFrame();
});

// === DARK / LIGHT ===
document.getElementById('btn-darklight').addEventListener('click', () => {
    params.darkMode = !params.darkMode;
    const btn = document.getElementById('btn-darklight');
    btn.innerHTML = params.darkMode
        ? '<i class="fa-solid fa-circle-half-stroke"></i> Fundo Claro'
        : '<i class="fa-solid fa-sun"></i> Fundo Escuro';
    if (!isRunning) drawFrame();
});

// === COLOR PICKERS ===
function setupColorPicker(inputId, varSetter, legendDotId) {
    document.getElementById(inputId).addEventListener('input', (e) => {
        varSetter(e.target.value);
        if (legendDotId) document.getElementById(legendDotId).style.background = e.target.value;
        if (!isRunning) drawFrame();
    });
}
setupColorPicker('color-first', v => { COLOR_VEG_FIRST = v; }, 'leg-c1');
setupColorPicker('color-mid', v => { COLOR_VEG_MID = v; }, 'leg-c2');
setupColorPicker('color-last', v => { COLOR_VEG_LAST = v; }, 'leg-c3');
setupColorPicker('color-ground', v => { COLOR_GROUND = v; }, 'leg-c4');
setupColorPicker('color-outlier', v => { COLOR_OUTLIER = v; }, 'leg-c5');

// === TERRAIN ===
document.getElementById('slider-terrain').addEventListener('input', (e) => {
    params.terrain = parseInt(e.target.value);
    let label = 'Médio';
    if (params.terrain < 15) label = 'Plano';
    else if (params.terrain < 35) label = 'Suave';
    else if (params.terrain > 75) label = 'Acidentado';
    document.getElementById('val-terrain').innerText = label;
    fullReset();
});

// === LOOP MODE ===
document.getElementById('btn-loop').addEventListener('click', () => {
    params.loopMode = !params.loopMode;
    const btn = document.getElementById('btn-loop');
    const label = document.getElementById('val-loop');
    if (params.loopMode) {
        btn.className = 'btn-sm active w-full mt-1';
        label.innerText = 'Loop ON'; label.className = 'val-display text-emerald-400';
    } else {
        btn.className = 'btn-sm w-full mt-1';
        label.innerText = 'Loop OFF'; label.className = 'val-display text-amber-400';
    }
});

// === RE-SCAN ===
document.getElementById('btn-rescan').addEventListener('click', () => clearPointsOnly());

// === SNAPSHOT & COMPARISON ===
document.getElementById('btn-save-a').addEventListener('click', () => {
    saveSnapshot();
    const btn = document.getElementById('btn-save-a');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> A (' + (snapCount > 999 ? (snapCount/1000).toFixed(1)+'k' : snapCount) + ' pts)';
    btn.className = 'btn-sm active flex-1';
    const cmpBtn = document.getElementById('btn-compare');
    cmpBtn.disabled = false;
    cmpBtn.className = 'btn-sm flex-1 bg-sky-700/50 cursor-pointer';
    cmpBtn.style.opacity = '1';
});

document.getElementById('btn-compare').addEventListener('click', () => {
    if (!hasSnapshot) return;
    compareMode = !compareMode;
    const cmpBtn = document.getElementById('btn-compare');
    const divider = document.getElementById('swipe-divider');
    if (compareMode) {
        cmpBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Sair';
        cmpBtn.className = 'btn-sm flex-1 bg-red-600/50'; divider.classList.remove('hidden');
    } else {
        cmpBtn.innerHTML = '<i class="fa-solid fa-arrows-left-right"></i> A|B';
        cmpBtn.className = 'btn-sm flex-1 bg-sky-700/50'; divider.classList.add('hidden');
    }
    if (!isRunning) drawFrame();
});

// === SWIPE DIVIDER DRAG ===
const dividerEl = document.getElementById('swipe-divider');
let isDraggingDivider = false;
dividerEl.addEventListener('mousedown', (e) => { isDraggingDivider = true; e.preventDefault(); });
dividerEl.addEventListener('touchstart', (e) => { isDraggingDivider = true; e.preventDefault(); }, { passive: false });
window.addEventListener('mousemove', (e) => {
    if (!isDraggingDivider) return;
    swipePosX = Math.max(0.05, Math.min(0.95, e.clientX / window.innerWidth));
    dividerEl.style.left = (swipePosX * 100) + '%';
    if (!isRunning) drawFrame();
});
window.addEventListener('touchmove', (e) => {
    if (!isDraggingDivider) return;
    swipePosX = Math.max(0.05, Math.min(0.95, e.touches[0].clientX / window.innerWidth));
    dividerEl.style.left = (swipePosX * 100) + '%';
    if (!isRunning) drawFrame();
}, { passive: false });
window.addEventListener('mouseup', () => { isDraggingDivider = false; });
window.addEventListener('touchend', () => { isDraggingDivider = false; });

// === SIDEBAR TOGGLE ===
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('sidebar-collapsed');
});

window.onload = resize;

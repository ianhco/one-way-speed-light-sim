// Physics constants
const DISTANCE = 600; // Distance between Alpha and Beta mirrors
const BASE_C = 12;    // Base pixel speed (12px/frame means 50 frames to cross 600px). One-way time is 100 ticks natively.

// State
let bias = 0; // -0.99 to 0.99
let cRight, cLeft;
let mainPulse = null;
let reconPulse = null;
let clocks = [];
let cameraPhotons = [];
let tooltips = []; // Clear and rebuild every frame

// Layout constraints
let views = {
    omniscient: { y: 0, h: 0 },
    empiricalTrue: { y: 0, h: 0 },
    empiricalObserved: { y: 0, h: 0 }
};

let CAMERA_Y_OFFSET = 120; // How far the camera is below the axis in the Empirical True view

// DOM Elements
let biasSlider;
let speedRightVal, speedLeftVal;
let resetBtn, togglePulseBtn;
let isAnimating = false;

function setup() {
    let container = select('#canvas-container');
    let canvas = createCanvas(container.width, container.height);
    canvas.parent('canvas-container');
    
    // UI bindings
    biasSlider = select('#directionalBias');
    speedRightVal = select('#speedRightVal');
    speedLeftVal = select('#speedLeftVal');
    
    resetBtn = select('#resetBtn');
    togglePulseBtn = select('#togglePulseBtn');
    
    biasSlider.input(updateBias);
    resetBtn.mousePressed(resetSimulation);
    togglePulseBtn.mousePressed(spawnPulse);

    // Modal logic
    let modal = document.getElementById('solutionsModal');
    let openBtn = document.getElementById('openModalBtn');
    let closeBtn = document.getElementById('closeModalBtn');
    
    if (openBtn && modal && closeBtn) {
        openBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    calculateLayout();
    resetSimulation();
}

function setUIState(disabled) {
    isAnimating = disabled;
    if (disabled) {
        biasSlider.attribute('disabled', 'true');
        resetBtn.attribute('disabled', 'true');
        togglePulseBtn.attribute('disabled', 'true');
    } else {
        biasSlider.removeAttribute('disabled');
        resetBtn.removeAttribute('disabled');
        togglePulseBtn.removeAttribute('disabled');
    }
}

function calculateLayout() {
    let h = height;
    views.omniscient.y = 0;
    views.omniscient.h = h * 0.33;
    
    views.empiricalTrue.y = h * 0.33;
    views.empiricalTrue.h = h * 0.42;
    
    views.empiricalObserved.y = h * 0.75;
    views.empiricalObserved.h = h * 0.25;
}

function updateBias() {
    if (isAnimating) return;
    bias = parseFloat(biasSlider.value());
    
    let cRight_val = 1.0 + bias;
    let cLeft_val = 1.0 - bias;
    
    speedRightVal.html(`$c_{\\rightarrow}$: ${(cRight_val).toFixed(2)}c`);
    speedLeftVal.html(`$c_{\\leftarrow}$: ${(cLeft_val).toFixed(2)}c`);
    
    if (window.MathJax) {
        window.MathJax.typesetPromise([speedRightVal.elt, speedLeftVal.elt]);
    }
    
    // Constant physical pixel speeds to keep true round-trip time absolutely constant
    cRight = BASE_C / (2 * cLeft_val);
    cLeft = BASE_C / (2 * cRight_val);
    
    // Sync offset perfectly conceals the real speed.
    clocks[1].offset = (DISTANCE * 2 * bias) / BASE_C;
}

function resetSimulation() {
    mainPulse = null;
    reconPulse = null;
    cameraPhotons = [];
    
    let cx = width / 2;
    
    clocks = [
        { label: 'Alpha (x=0)', x: cx - DISTANCE/2, time: 0, offset: 0, color: '#3b82f6' },
        { label: 'Beta (x=d)', x: cx + DISTANCE/2, time: 0, offset: 0, color: '#ef4444' }
    ];
    
    updateBias();
    setUIState(false);
}

function spawnPulse() {
    if ((mainPulse && mainPulse.active) || isAnimating) return;
    
    setUIState(true);
    
    let startTime = clocks[0].time;
    mainPulse = {
        x: clocks[0].x,
        dir: 1, // 1 for right, -1 for left
        active: true,
        t_depart_E: startTime,
        t_arrive_M: null,
        t_arrive_E: null,
        lastPhotonEmitTime: startTime
    };
    
    let camX = width/2;
    let camYOffset = CAMERA_Y_OFFSET;
    
    // Time from Alpha to Camera
    let dxE = camX - clocks[0].x;
    let dE = Math.sqrt(dxE*dxE + camYOffset*camYOffset);
    let thetaE = Math.atan2(camYOffset, dxE);
    let delayE = dE / getReichenbachC(thetaE);
    
    // Time from Beta to Camera
    let dxM = camX - clocks[1].x;
    let dM = Math.sqrt(dxM*dxM + camYOffset*camYOffset);
    let thetaM = Math.atan2(camYOffset, dxM);
    let delayM = dM / getReichenbachC(thetaM);
    
    let t_arrive_M_true = startTime + (DISTANCE / cRight);
    let t_arrive_E_true = t_arrive_M_true + (DISTANCE / cLeft);

    reconPulse = {
        x: clocks[0].x,
        active: true,
        visible: false,
        t_outbound_start: startTime + delayE,
        t_outbound_end: t_arrive_M_true + delayM,
        t_return_end: t_arrive_E_true + delayE
    };
    
    cameraPhotons = [];
}


// Computes the one-way speed of light in direction theta under Reichenbach convention.
// theta = 0 is rightward, theta = PI is leftward.
// Base physical c mapping for photons: BASE_C/2
function getReichenbachC(theta) {
    let c_iso = BASE_C / 2; // Isotropic speed mapping
    // c(theta) = c / (1 - bias * cos(theta))
    return c_iso / (1 - bias * Math.cos(theta));
}

function draw() {
    background(13, 15, 23); // var(--bg-color)
    
    // Draw grid
    stroke(255, 255, 255, 8);
    strokeWeight(1);
    for(let i = 0; i < width; i += 50) line(i, 0, i, height);
    for(let i = 0; i < height; i += 50) line(0, i, width, i);
    
    // Update master time
    let dt = 1;
    clocks[0].time += dt;
    clocks[1].time = clocks[0].time + clocks[1].offset;
    
    // Update main physics
    if (mainPulse && mainPulse.active) {
        let speed = mainPulse.dir === 1 ? cRight : cLeft;
        mainPulse.x += speed * mainPulse.dir;
        
        // Emit observation photons periodically (e.g., every 3 frames)
        if (clocks[0].time - mainPulse.lastPhotonEmitTime >= 3) {
            let camX = width/2;
            let camYOffset = CAMERA_Y_OFFSET;
            let dx = camX - mainPulse.x;
            let dy = camYOffset; // Camera is always 'below' the axis
            let distToCam = sqrt(dx*dx + dy*dy);
            
            // Physical angle to camera (0 = right, PI/2 = down)
            let theta = atan2(dy, dx);
            let photonSpeed = getReichenbachC(theta);
            
            cameraPhotons.push({
                x: mainPulse.x,
                y: 0, // Relative to the view's local axis
                targetX: dx, // Relative vector
                targetY: dy,
                distTraveled: 0,
                totalDist: distToCam,
                speed: photonSpeed,
                theta: theta,
                pulseOriginX: mainPulse.x // What position this photon represents observing
            });
            mainPulse.lastPhotonEmitTime = clocks[0].time;
        }
        
        // Bounce logic
        if (mainPulse.dir === 1 && mainPulse.x >= clocks[1].x) {
            mainPulse.x = clocks[1].x;
            mainPulse.dir = -1;
            mainPulse.t_arrive_M = clocks[1].time;
        } else if (mainPulse.dir === -1 && mainPulse.x <= clocks[0].x) {
            mainPulse.x = clocks[0].x;
            mainPulse.active = false;
            mainPulse.t_arrive_E = clocks[0].time;
        }
    }
    
    // Update camera photons
    let latestArrivedPhoton = null;
    for (let i = cameraPhotons.length - 1; i >= 0; i--) {
        let p = cameraPhotons[i];
        p.distTraveled += p.speed;
        
        if (p.distTraveled >= p.totalDist) {
            // Photon arrived at camera
            cameraPhotons.splice(i, 1);
        }
    }
    
    // Update Reconstructed Uniform Pulse
    // Represents what the camera observes based on true photon arrival times
    if (reconPulse && reconPulse.active) {
        let t = clocks[0].time;
        if (t < reconPulse.t_outbound_start) {
            reconPulse.x = clocks[0].x;
            reconPulse.visible = false;
        } else if (t < reconPulse.t_outbound_end) {
            reconPulse.visible = true;
            let progress = (t - reconPulse.t_outbound_start) / (reconPulse.t_outbound_end - reconPulse.t_outbound_start);
            reconPulse.x = clocks[0].x + progress * DISTANCE;
        } else if (t < reconPulse.t_return_end) {
            reconPulse.visible = true;
            let progress = (t - reconPulse.t_outbound_end) / (reconPulse.t_return_end - reconPulse.t_outbound_end);
            reconPulse.x = clocks[1].x - progress * DISTANCE;
        } else {
            reconPulse.x = clocks[0].x;
            reconPulse.visible = true;
            reconPulse.active = false;
            
            // Re-enable UI when View 3 finishes its observation
            setUIState(false);
        }
    }
    
    
    tooltips = [];
    
    // --- DRAW VIEWS ---
    
    drawOmniscientView(views.omniscient);
    
    drawViewSeparator(views.empiricalTrue.y);
    drawEmpiricalTrueView(views.empiricalTrue);
    
    drawViewSeparator(views.empiricalObserved.y);
    drawEmpiricalObservedView(views.empiricalObserved);
    
    // Draw tooltips on top
    for (let t of tooltips) {
        drawTooltip(t.x, t.y, t.text);
    }
}

function drawViewSeparator(y) {
    stroke(255, 255, 255, 30);
    strokeWeight(2);
    line(0, y, width, y);
}

function drawTitle(title, config, tooltipText) {
    fill(255, 255, 255, 200);
    noStroke();
    textAlign(LEFT, TOP);
    textFont('Inter');
    textSize(16);
    textStyle(BOLD);
    text(title, 32, config.y + 20);
    let tw = textWidth(title);
    textStyle(NORMAL);
    
    if (tooltipText) {
        let iconX = 32 + tw + 20;
        let iconY = config.y + 28;
        
        let d = dist(mouseX, mouseY, iconX, iconY);
        let hovering = d < 9;
        
        stroke(100);
        fill(hovering ? 50 : 20);
        circle(iconX, iconY, 18);
        fill(200);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(12);
        textFont('Inter');
        text('?', iconX, iconY);
        
        if (hovering) {
            tooltips.push({
                x: iconX,
                y: iconY,
                text: tooltipText
            });
        }
    }
}

function drawTooltip(x, y, txt) {
    push();
    textFont('Inter');
    textSize(12);
    textLeading(18);
    let lines = txt.split('\n');
    let maxW = 0;
    for (let l of lines) {
        let w = textWidth(l);
        if (w > maxW) maxW = w;
    }
    let boxW = maxW + 24;
    let boxH = lines.length * 18 + 12;
    
    let boxX = x + 15;
    let boxY = Math.max(10, y - boxH / 2);
    
    fill(15, 20, 30, 240);
    stroke(100);
    rectMode(CORNER);
    rect(boxX, boxY, boxW, boxH, 6);
    
    fill(200);
    noStroke();
    textAlign(LEFT, TOP);
    text(txt, boxX + 12, boxY + 8);
    pop();
}

function drawOmniscientView(config) {
    drawTitle('View 1: Omniscient Frame (Absolute State)', config,
    `This view displays the absolute position of the light pulse.\nNotice how the Alpha and Beta clocks are physically de-synchronized\nby an exact offset when directional bias is introduced. This\n'Einstein Sync' offsets true time precisely to mask the one-way\nspeed difference, forcing the round-trip average to appear\nfunctionally constant (1.0c) at both endpoints.`);
    
    let cy = config.y + config.h / 2;
    
    // Track line
    stroke(255, 255, 255, 30);
    strokeWeight(2);
    line(clocks[0].x, cy, clocks[1].x, cy);
    
    // Pulse
    if (mainPulse && mainPulse.active) {
        drawPulse(mainPulse.x, cy, mainPulse.dir === 1 ? color(96, 165, 250) : color(248, 113, 113));
    }
    
    // Clocks
    for (let clock of clocks) {
        drawClock(clock.x, cy, clock.time, clock.label, clock.color);
    }
    
    // Draw in-canvas logs
    let t_dep = mainPulse ? Math.floor(mainPulse.t_depart_E) : NaN;
    let t_arr = (mainPulse && mainPulse.t_arrive_M !== null) ? Math.floor(mainPulse.t_arrive_M) : null;
    let t_ret = (mainPulse && mainPulse.t_arrive_E !== null) ? Math.floor(mainPulse.t_arrive_E) : null;

    let m_em = (t_arr !== null) ? Math.floor(mainPulse.t_arrive_M - mainPulse.t_depart_E) : null;
    let m_me = (t_ret !== null) ? Math.floor(mainPulse.t_arrive_E - mainPulse.t_arrive_M) : null;

    fill(180);
    noStroke();
    textFont('Space Mono');
    textSize(11);
    textAlign(CENTER, TOP);
    let logY = cy + 65;
    
    // Alpha logs
    text(`Departure: t=${!isNaN(t_dep) ? t_dep : '--'}\nReturn: t=${t_ret !== null ? t_ret : '--'}`, clocks[0].x, logY);
    
    // Beta logs
    text(`Arrival: t=${t_arr !== null ? t_arr : '--'}`, clocks[1].x, logY + 14);
    
    // Center delta logs
    fill(100, 200, 255);
    text(`Forward Δt (±1): ${m_em !== null ? m_em + ' ticks (1.00c)' : '--'}\nBackward Δt (±1): ${m_me !== null ? m_me + ' ticks (1.00c)' : '--'}`, width/2, logY);
    
    // Beta Offset graphic
    fill(248, 113, 113);
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text(`De-sync: t=${clocks[1].offset > 0 ? '+' : ''}${clocks[1].offset.toFixed(0)}`, clocks[1].x, logY + 12);
}

function drawEmpiricalTrueView(config) {
    drawTitle('View 2: Empirical Frame (Observation Signals)', config,
    `This view demonstrates how visual data behaves when collected by\na hypothetical high-speed camera. As the absolute pulse travels, it\ncontinuously emits photons toward the lens. The travel speed of\nthese observation photons is dynamically bound by Reichenbach's\nformula, taking longer to reach the camera from certain angles.`);
    
    let cy = config.y + config.h * 0.35; // Lift axis exactly to perfectly center the camera box at bottom of this section
    let camY = cy + CAMERA_Y_OFFSET;
    let camX = width / 2;
    
    // Track line
    stroke(255, 255, 255, 30);
    strokeWeight(2);
    line(clocks[0].x, cy, clocks[1].x, cy);
    
    // Pulses traveling to camera
    for (let p of cameraPhotons) {
        let ratio = p.distTraveled / p.totalDist;
        let px = p.x + (camX - p.x) * ratio;
        let py = cy + CAMERA_Y_OFFSET * ratio;
        
        fill(255, 255, 100);
        noStroke();
        circle(px, py, 4);
    }
    
    // Main Pulse
    if (mainPulse && mainPulse.active) {
        drawPulse(mainPulse.x, cy, mainPulse.dir === 1 ? color(96, 165, 250) : color(248, 113, 113));
    }
    
    // Camera
    fill(50, 50, 60);
    stroke(200);
    strokeWeight(2);
    rectMode(CENTER);
    rect(camX, camY, 40, 30, 4);
    fill(100, 200, 255);
    circle(camX, camY, 15);
    fill(255);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(12);
    text('High-Speed Camera', camX, camY + 20);
    
    // Bases (No huge clocks here to keep clean)
    fill(20, 25, 40);
    stroke(100);
    strokeWeight(2);
    rectMode(CENTER);
    rect(clocks[0].x, cy, 20, 40);
    rect(clocks[1].x, cy, 20, 40);
}

function drawEmpiricalObservedView(config) {
    drawTitle('View 3: Reconstructed Frame (Measured State)', config,
    `This view shows the universe as it is measured, not as it instantly is.\nBecause visual information relies on light reaching the camera, any\ndirectional changes in the speed of light (Reichenbach’s anisotropy)\nare perfectly hidden. The delay of the light traveling back to the\nlens cancels out the one-way speed difference, making the speed\nof light always appear perfectly constant (1.00c each way).`);

    let cy = config.y + config.h / 2 + 15;
    
    // Track line
    stroke(255, 255, 255, 30);
    strokeWeight(2);
    line(clocks[0].x, cy, clocks[1].x, cy);
    
    // Observed Pulse
    if (reconPulse && reconPulse.visible) {
        // We only color it constant white or yellow to emphasize it's reconstructed observation
        drawPulse(reconPulse.x, cy, color(255, 255, 100));
    }
    
    // Bases
    fill(20, 25, 40);
    stroke(100);
    strokeWeight(2);
    rectMode(CENTER);
    rect(clocks[0].x, cy, 20, 40);
    rect(clocks[1].x, cy, 20, 40);
}

function drawPulse(x, y, c) {
    for (let r = 20; r > 0; r -= 4) {
        fill(red(c), green(c), blue(c), map(r, 0, 20, 50, 0));
        noStroke();
        circle(x, y, r);
    }
    fill(255);
    circle(x, y, 6);
}

function drawClock(cx, cy, timeTicks, label, accentColor) {
    push();
    translate(cx, cy);
    
    // Glow
    noStroke();
    fill(color(accentColor)._getRed(), color(accentColor)._getGreen(), color(accentColor)._getBlue(), 20);
    circle(0, 0, 70);
    
    // Station Base
    fill(20, 25, 40);
    stroke(100);
    strokeWeight(2);
    rectMode(CENTER);
    rect(0, 40, 75, 20, 5);
    
    // Clock face
    fill(10, 15, 25);
    stroke(accentColor);
    strokeWeight(3);
    circle(0, 0, 60);
    
    // Clock ticks
    stroke(255, 255, 255, 50);
    strokeWeight(1);
    for (let i = 0; i < 12; i++) {
        let angle = map(i, 0, 12, 0, TWO_PI);
        let x1 = 20 * cos(angle);
        let y1 = 20 * sin(angle);
        let x2 = 25 * cos(angle);
        let y2 = 25 * sin(angle);
        line(x1, y1, x2, y2);
    }
    
    // Clock hands
    // 1 rotation = 100 ticks
    let ticksPerRotation = 100;
    let angle = map(timeTicks % ticksPerRotation, 0, ticksPerRotation, -HALF_PI, TWO_PI - HALF_PI);
    
    stroke(255);
    strokeWeight(3);
    line(0, 0, 15 * cos(angle), 15 * sin(angle));
    
    fill(255);
    noStroke();
    circle(0, 0, 4);
    
    // Text labels
    fill(200);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textFont('Inter');
    textSize(12);
    text(label, 0, -35); // Moved label up a bit
    
    // Digital time readout
    fill(accentColor);
    textFont('Space Mono');
    textSize(11);
    textAlign(CENTER, CENTER);
    text(`t=${Math.floor(timeTicks)}`, 0, 40);
    
    pop();
}

function windowResized() {
    let container = select('#canvas-container');
    resizeCanvas(container.width, container.height);
    calculateLayout();
    
    // Re-center x properties on resize
    clocks[0].x = width/2 - DISTANCE/2;
    clocks[1].x = width/2 + DISTANCE/2;
}

import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { GameStatus, PlayerState, Projectile, Landmark } from '../types';
import { GAME_CONSTANTS } from '../constants';
import { GameOverlay } from './GameOverlay';
import { calculateAngle, dist, checkCollision, getConvexHull, Point } from '../utils/geometry';

// We declare these outside the component to avoid stale closures in the p5 loop
// and to keep the loop performant without excessive React state updates.
let video: p5.MediaElement; // Use p5.MediaElement type
let poseLandmarker: PoseLandmarker | null = null;
let lastVideoTime = -1;
let landmarkerResults: any = null;

// Game State (Mutable for loop performance)
let gameStateRef: GameStatus = 'loading';
let projectiles: Projectile[] = [];

// Default Player Data
const createPlayer = (id: 1 | 2): PlayerState => ({
  id,
  hp: GAME_CONSTANTS.MAX_HP,
  maxHp: GAME_CONSTANTS.MAX_HP,
  isBlocking: false,
  isHit: false,
  hitTimer: 0,
  punchCooldown: 0,
  swordCooldown: 0,
  rainCooldown: 0,
  score: 0,
  charge: {
    active: false,
    progress: 0,
    complete: false,
    startTime: 0
  }
});

let p1Data = createPlayer(1);
let p2Data = createPlayer(2);

// Prev Positions for velocity calculation (Track both hands)
let prevP1Wrists = { left: {x:0, y:0}, right: {x:0, y:0} };
let prevP2Wrists = { left: {x:0, y:0}, right: {x:0, y:0} };

// Track combined hand center for sword swings
let prevP1HandCenter = { y: 0 };
let prevP2HandCenter = { y: 0 };

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [reactStatus, setReactStatus] = useState<GameStatus>('loading');
  const [uiTrigger, setUiTrigger] = useState(0); // Force re-render for UI updates
  const [gameMessage, setGameMessage] = useState('');

  // Sync ref to state for React UI
  const updateReactState = (msg?: string) => {
    if (gameStateRef !== reactStatus) setReactStatus(gameStateRef);
    if (msg) {
        setGameMessage(msg);
        setTimeout(() => setGameMessage(''), 2000);
    }
    setUiTrigger(prev => prev + 1);
  };

  const handleRestart = () => {
    p1Data = createPlayer(1);
    p2Data = createPlayer(2);
    projectiles = [];
    prevP1Wrists = { left: {x:0, y:0}, right: {x:0, y:0} };
    prevP2Wrists = { left: {x:0, y:0}, right: {x:0, y:0} };
    prevP1HandCenter = { y: 0 };
    prevP2HandCenter = { y: 0 };
    gameStateRef = 'waiting';
    updateReactState();
  };

  useEffect(() => {
    let myP5: p5;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 2
        });
        gameStateRef = 'waiting';
        updateReactState();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    setupMediaPipe();

    const sketch = (p: p5) => {
      p.setup = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        p.createCanvas(w, h).parent(canvasRef.current!);
        
        // Webcam Setup using p5.createCapture
        // @ts-ignore
        video = p.createCapture({
          audio: false,
          video: {
            width: 1280,
            height: 720,
            facingMode: 'user'
          }
        });
        video.elt.setAttribute('playsinline', '');
        video.hide();

        p.frameRate(60);
        p.textFont('Courier New');
      };

      p.windowResized = () => {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
      };

      const detectLogic = () => {
        if (!poseLandmarker || !video || !video.elt || video.elt.readyState < 2) return;

        // Perform detection
        if (video.elt.currentTime !== lastVideoTime) {
          lastVideoTime = video.elt.currentTime;
          landmarkerResults = poseLandmarker.detectForVideo(video.elt, performance.now());
        }

        // Process Logic
        if (landmarkerResults && landmarkerResults.landmarks) {
            processGameLogic(p, landmarkerResults.landmarks);
        }
      };

      p.draw = () => {
        p.background(15, 23, 42); // Dark blue-ish bg

        if (video && video.elt && video.elt.readyState >= 2) {
            // Draw Mirrored Video
            p.push();
            p.translate(p.width, 0);
            p.scale(-1, 1);
            
            // Maintain aspect ratio cover
            const vRatio = video.elt.videoWidth / video.elt.videoHeight;
            const cRatio = p.width / p.height;
            let drawW, drawH;
            
            if (cRatio > vRatio) {
                drawW = p.width;
                drawH = p.width / vRatio;
            } else {
                drawH = p.height;
                drawW = p.height * vRatio;
            }
            const offsetX = (drawW - p.width) / 2;
            const offsetY = (drawH - p.height) / 2;
            
            p.image(video, -offsetX, -offsetY, drawW, drawH);
            
            detectLogic();
            drawGameElements(p);
            
            p.pop();
        }
      };
    };

    const processGameLogic = (p: p5, landmarksArray: Landmark[][]) => {
        if (gameStateRef === 'gameover') return;

        // Reset hit flags for frame
        if (p1Data.hitTimer > 0) p1Data.hitTimer--;
        else p1Data.isHit = false;

        if (p2Data.hitTimer > 0) p2Data.hitTimer--;
        else p2Data.isHit = false;

        // Cooldowns
        if (p1Data.punchCooldown > 0) p1Data.punchCooldown--;
        if (p2Data.punchCooldown > 0) p2Data.punchCooldown--;
        if (p1Data.swordCooldown > 0) p1Data.swordCooldown--;
        if (p2Data.swordCooldown > 0) p2Data.swordCooldown--;
        if (p1Data.rainCooldown > 0) p1Data.rainCooldown--;
        if (p2Data.rainCooldown > 0) p2Data.rainCooldown--;

        // Identify players (Left vs Right)
        let leftPlayerLandmarks: Landmark[] | null = null;
        let rightPlayerLandmarks: Landmark[] | null = null;

        // MediaPipe coords: 0 is Video Left, 1 is Video Right.
        landmarksArray.forEach((lm) => {
            const nose = lm[0];
            if (nose.x < 0.5) {
                 // Video Left -> Visual Right (P2)
                 rightPlayerLandmarks = lm; 
            } else {
                 // Video Right -> Visual Left (P1)
                 leftPlayerLandmarks = lm; 
            }
        });

        // Start Game Trigger
        if (gameStateRef === 'waiting') {
            if (leftPlayerLandmarks && rightPlayerLandmarks) {
                gameStateRef = 'playing';
                updateReactState("FIGHT!");
            }
        }

        if (gameStateRef === 'playing') {
            // P1 (Left) shoots towards Right. Direction -1 
            if (leftPlayerLandmarks) updatePlayer(p, p1Data, leftPlayerLandmarks, prevP1Wrists, prevP1HandCenter, -1);
            
            // P2 (Right) shoots towards Left. Direction 1 
            if (rightPlayerLandmarks) updatePlayer(p, p2Data, rightPlayerLandmarks, prevP2Wrists, prevP2HandCenter, 1);
            
            updateProjectiles(p, leftPlayerLandmarks, rightPlayerLandmarks);
        }
    };

    const updatePlayer = (
        p: p5, 
        playerData: PlayerState, 
        landmarks: Landmark[], 
        prevWrists: { left: {x:number, y:number}, right: {x:number, y:number} }, 
        prevHandCenter: { y: number },
        direction: number
    ) => {
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        // 1. BLOCK DETECTION (STRICTER - Crossed Arms)
        // Check distance from wrist to OPPOSITE shoulder
        const distLtoR = dist(leftWrist, rightShoulder);
        const distRtoL = dist(rightWrist, leftShoulder);
        
        // Anti-False Positive: Block MUST involve crossed arms.
        // In the mirrored view (and standard MediaPipe pose), 
        // the Right Wrist (normally low X) crossing to the Left side (high X) 
        // results in Right Wrist X > Left Wrist X.
        const isArmsCrossed = rightWrist.x > leftWrist.x;

        const isNowBlocking = distLtoR < GAME_CONSTANTS.BLOCK_SHOULDER_DIST && 
                              distRtoL < GAME_CONSTANTS.BLOCK_SHOULDER_DIST &&
                              isArmsCrossed;

        if (isNowBlocking) {
             playerData.isBlocking = true;
             playerData.charge.active = false;
             playerData.charge.progress = 0;
             // Update history
             prevWrists.left.x = leftWrist.x; prevWrists.left.y = leftWrist.y;
             prevWrists.right.x = rightWrist.x; prevWrists.right.y = rightWrist.y;
             prevHandCenter.y = (leftWrist.y + rightWrist.y) / 2;
             return; 
        } else {
            playerData.isBlocking = false;
        }

        // 2. SWORD ATTACK (Hands Together)
        const wristDist = dist(leftWrist, rightWrist);
        const isSwordStance = wristDist < GAME_CONSTANTS.SWORD_HAND_DIST;

        if (isSwordStance) {
             // Anti-Cross Check 1: X-Axis Overlap
             // If Right Wrist is significantly to the right of Left Wrist, it's likely a cross.
             if (rightWrist.x - leftWrist.x > GAME_CONSTANTS.SWORD_CROSS_CHECK_X) {
                 return;
             }

             // Anti-Cross Check 2: Shoulder Proximity Buffer
             // If either wrist is getting close to the opposite shoulder (preparing to block),
             // disable sword generation.
             if (distLtoR < GAME_CONSTANTS.SWORD_BLOCK_BUFFER || distRtoL < GAME_CONSTANTS.SWORD_BLOCK_BUFFER) {
                 return;
             }

             // Reset Charge if entering sword mode
             playerData.charge.active = false;
             
             // Sword Swing Logic
             const currentHandCenterY = (leftWrist.y + rightWrist.y) / 2;
             const vy = currentHandCenterY - prevHandCenter.y;
             
             // If moving up/down fast
             if (Math.abs(vy) > GAME_CONSTANTS.SWORD_SWING_THRESHOLD && playerData.swordCooldown === 0) {
                 const midX = (leftWrist.x + rightWrist.x) / 2;
                 const midY = (leftWrist.y + rightWrist.y) / 2;
                 
                 // Spawn Slash
                 projectiles.push({
                     id: Math.random().toString(36),
                     x: midX * p.width,
                     y: midY * p.height,
                     vx: direction * GAME_CONSTANTS.PROJECTILE_SPEED_SLASH,
                     vy: 0,
                     ownerId: playerData.id,
                     active: true,
                     type: 'slash',
                     damage: GAME_CONSTANTS.DAMAGE_SWORD
                 });
                 playerData.swordCooldown = GAME_CONSTANTS.SWORD_COOLDOWN;
             }
             
             prevHandCenter.y = currentHandCenterY;
             // Update wrist history to prevent punch trigger
             prevWrists.left.x = leftWrist.x; prevWrists.left.y = leftWrist.y;
             prevWrists.right.x = rightWrist.x; prevWrists.right.y = rightWrist.y;
             
             return; // Skip other attacks
        }

        // 3. RAIN ATTACK (Bird Flap)
        const isRightWingOut = rightWrist.x < (rightShoulder.x - GAME_CONSTANTS.RAIN_WING_SPAN);
        const isLeftWingOut = leftWrist.x > (leftShoulder.x + GAME_CONSTANTS.RAIN_WING_SPAN);
        
        const isWingsOut = isRightWingOut && isLeftWingOut;

        if (isWingsOut && playerData.rainCooldown === 0) {
             const vLeftY = Math.abs(leftWrist.y - prevWrists.left.y);
             const vRightY = Math.abs(rightWrist.y - prevWrists.right.y);

             if (vLeftY > GAME_CONSTANTS.RAIN_VELOCITY_THRESHOLD && vRightY > GAME_CONSTANTS.RAIN_VELOCITY_THRESHOLD) {
                 // Trigger Rain
                 playerData.rainCooldown = GAME_CONSTANTS.RAIN_COOLDOWN;
                 
                 const startX = playerData.id === 1 ? 0.1 : 0.6;
                 const endX = playerData.id === 1 ? 0.4 : 0.9;
                 const step = (endX - startX) / 4;

                 for(let i=0; i<5; i++) {
                     const tx = startX + step * i + (Math.random() * 0.05 - 0.025);
                     projectiles.push({
                         id: Math.random().toString(36),
                         x: tx * p.width,
                         y: -50 - (Math.random() * 100),
                         vx: 0,
                         vy: GAME_CONSTANTS.PROJECTILE_SPEED_RAIN,
                         ownerId: playerData.id,
                         active: true,
                         type: 'rain',
                         damage: GAME_CONSTANTS.DAMAGE_RAIN
                     });
                 }
                 updateReactState("SWORD RAIN!");
             }
        }

        // 4. SPECIAL ATTACK - CHARGE DETECTION
        const validGesture = Math.abs(leftWrist.y - rightWrist.y) > GAME_CONSTANTS.CHARGE_MIN_VERTICAL_DIST;
        const xDiff = Math.abs(leftWrist.x - rightWrist.x);
        
        // NEW REQUIREMENT: At least one hand must be ABOVE the shoulder.
        // In screen coords, Y=0 is top, Y=1 is bottom. Smaller Y = Higher up.
        const isOneHandAbove = leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y;

        // Relaxed detection: We don't check for "Uncrossed" or "NearBlock" strictly here.
        // The Block detection at the top handles the "Crossed Arms" case (which returns early).
        // If we are here, we are NOT blocking.
        // Just ensure horizontal distance is reasonable (holding a ball) and vertical distance is sufficient,
        // AND one hand is raised above shoulder height.
        
        const isChargeGesture = validGesture && xDiff < GAME_CONSTANTS.CHARGE_MAX_HORIZONTAL_DIST && isOneHandAbove;

        // If we were charging and got hit, allow charge to continue (Super Armor-ish for visual continuity)
        // OR if current gesture is valid.
        if (isChargeGesture || (playerData.charge.active && playerData.isHit)) {
            const now = performance.now();
            
            if (!playerData.charge.active) {
                playerData.charge.active = true;
                playerData.charge.startTime = now;
                playerData.charge.progress = 0;
                playerData.charge.complete = false;
            }

            // Time-based progress
            const elapsed = now - playerData.charge.startTime;
            playerData.charge.progress = Math.min(1.0, elapsed / GAME_CONSTANTS.CHARGE_DURATION);
            
            if (playerData.charge.progress >= 1.0) {
                playerData.charge.complete = true;
            }
            
            prevWrists.left.x = leftWrist.x; prevWrists.left.y = leftWrist.y;
            prevWrists.right.x = rightWrist.x; prevWrists.right.y = rightWrist.y;
            return;
        } else {
            // Gesture broken (and not being hit)
            if (playerData.charge.active) {
                if (playerData.charge.complete) {
                    // FIRE SPECIAL!
                    const midX = (leftWrist.x + rightWrist.x) / 2;
                    const midY = (leftWrist.y + rightWrist.y) / 2;
                    
                    projectiles.push({
                        id: Math.random().toString(36),
                        x: midX * p.width,
                        y: midY * p.height,
                        vx: direction * GAME_CONSTANTS.PROJECTILE_SPEED_SPECIAL,
                        vy: 0,
                        ownerId: playerData.id,
                        active: true,
                        type: 'special',
                        damage: GAME_CONSTANTS.DAMAGE_SPECIAL
                    });
                    updateReactState("SPECIAL BLAST!");
                }
                playerData.charge.active = false;
                playerData.charge.progress = 0;
                playerData.charge.complete = false;
                return;
            }
        }

        // 5. PUNCH DETECTION
        const hands = [
            { id: 'left', wrist: leftWrist, elbow: leftElbow, shoulder: leftShoulder, prev: prevWrists.left },
            { id: 'right', wrist: rightWrist, elbow: rightElbow, shoulder: rightShoulder, prev: prevWrists.right }
        ];

        let didPunch = false;
        let punchHandPos = { x: 0, y: 0 };

        for (const hand of hands) {
            if (hand.prev.x === 0 && hand.prev.y === 0) {
                hand.prev.x = hand.wrist.x;
                hand.prev.y = hand.wrist.y;
                continue;
            }

            const vx = hand.wrist.x - hand.prev.x;
            const vy = hand.wrist.y - hand.prev.y;
            const velocity = Math.sqrt(vx*vx + vy*vy);
            const armAngle = calculateAngle(hand.shoulder, hand.elbow, hand.wrist);
            
            // Check direction: P1 needs negative vx (towards right side of screen/opponent), P2 needs positive vx
            const isForwardDir = playerData.id === 1 
                ? vx < -GAME_CONSTANTS.PUNCH_DIRECTION_THRESHOLD 
                : vx > GAME_CONSTANTS.PUNCH_DIRECTION_THRESHOLD;

            // Check if wrist is extended outward relative to elbow (to confirm it's a thrust, not just a swing)
            const isExtendedOutward = playerData.id === 1 
                ? hand.wrist.x < hand.elbow.x 
                : hand.wrist.x > hand.elbow.x;

            // Check if wrist is sufficiently far from shoulder horizontally (Reach check)
            const isReachValid = Math.abs(hand.wrist.x - hand.shoulder.x) > GAME_CONSTANTS.PUNCH_REACH_THRESHOLD;

            hand.prev.x = hand.wrist.x;
            hand.prev.y = hand.wrist.y;

            if (!didPunch && playerData.punchCooldown === 0) {
                if (velocity > GAME_CONSTANTS.PUNCH_VELOCITY_THRESHOLD && 
                    armAngle > GAME_CONSTANTS.ARM_EXTENSION_THRESHOLD && 
                    isForwardDir &&
                    isExtendedOutward &&
                    isReachValid) {
                    didPunch = true;
                    punchHandPos = hand.wrist;
                }
            }
        }

        if (didPunch) {
            playerData.punchCooldown = GAME_CONSTANTS.PUNCH_COOLDOWN;
            const spawnX = punchHandPos.x * p.width;
            const spawnY = punchHandPos.y * p.height;
            projectiles.push({
                id: Math.random().toString(36),
                x: spawnX,
                y: spawnY,
                vx: direction * GAME_CONSTANTS.PROJECTILE_SPEED, 
                vy: 0,
                ownerId: playerData.id,
                active: true,
                type: 'normal',
                damage: GAME_CONSTANTS.DAMAGE_NORMAL
            });
        }
    };

    const updateProjectiles = (p: p5, p1Landmarks: Landmark[] | null, p2Landmarks: Landmark[] | null) => {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.x += proj.vx;
            proj.y += proj.vy; // Handle Y movement for Rain
            
            // Bounds check (X or Y)
            if (proj.x < 0 || proj.x > p.width || proj.y > p.height) {
                projectiles.splice(i, 1);
                continue;
            }

            const targetData = proj.ownerId === 1 ? p2Data : p1Data;
            const targetLandmarks = proj.ownerId === 1 ? p2Landmarks : p1Landmarks;

            if (targetLandmarks && checkCollision(proj.x, proj.y, targetLandmarks, p.width, p.height)) {
                projectiles.splice(i, 1);
                
                if (targetData.isBlocking) {
                    if (proj.type === 'special') {
                        targetData.hp -= GAME_CONSTANTS.DAMAGE_SPECIAL_BLOCKED;
                        updateReactState("HEAVY HIT!");
                    } else if (proj.type === 'slash') {
                        // Sword slash does 0 damage if blocked
                        updateReactState("FULL BLOCK!");
                    } else if (proj.type === 'rain') {
                        // Rain DOES damage if blocked (Armor Piercing / Punishment)
                        targetData.hp -= proj.damage;
                        targetData.isHit = true; 
                        targetData.hitTimer = GAME_CONSTANTS.HIT_FLASH_DURATION;
                        updateReactState("GUARD BREAK!");
                    } else {
                        targetData.hp -= GAME_CONSTANTS.DAMAGE_BLOCKED;
                        updateReactState("BLOCKED!");
                    }
                } else {
                    if (proj.type === 'rain') {
                        // Rain does 0 damage if NOT blocking
                        updateReactState("MISSED!");
                    } else {
                        targetData.hp -= proj.damage;
                        targetData.isHit = true;
                        targetData.hitTimer = GAME_CONSTANTS.HIT_FLASH_DURATION;
                    }
                }

                if (targetData.hp <= 0 || (proj.ownerId === 1 ? p1Data.hp <= 0 : p2Data.hp <= 0)) {
                    gameStateRef = 'gameover';
                }
                updateReactState();
            }
        }
    };

    const drawGameElements = (p: p5) => {
        p.noStroke();
        projectiles.forEach(proj => {
            if (proj.type === 'special') {
                p.fill(0, 255, 255, 150); 
                p.circle(proj.x + Math.random()*10 - 5, proj.y + Math.random()*10 - 5, 120);
                p.fill(255);
                p.circle(proj.x, proj.y, 60);
            } else if (proj.type === 'slash') {
                // Draw a crescent slash
                p.push();
                p.translate(proj.x, proj.y);
                p.rotate(proj.vx > 0 ? 0 : p.PI); // Face direction
                p.fill(255, 50, 50, 200);
                p.arc(0, 0, 80, 160, -p.PI/2, p.PI/2, p.CHORD);
                p.pop();
            } else if (proj.type === 'rain') {
                // Draw green vertical sword/beam
                p.fill(0, 255, 0, 200);
                p.rect(proj.x - 5, proj.y - 40, 10, 80);
                p.fill(200, 255, 200);
                p.rect(proj.x - 2, proj.y - 40, 4, 80);
                // Glow
                p.fill(0, 255, 0, 100);
                p.ellipse(proj.x, proj.y, 20, 100);
            } else {
                p.fill(255, 255, 255, 100);
                p.circle(proj.x, proj.y, 60);
                p.fill(255);
                p.circle(proj.x, proj.y, 30);
            }
        });

        const drawPlayerVisuals = (landmarks: Landmark[], data: PlayerState) => {
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            landmarks.forEach(lm => {
                minX = Math.min(minX, lm.x);
                maxX = Math.max(maxX, lm.x);
                minY = Math.min(minY, lm.y);
                maxY = Math.max(maxY, lm.y);
            });

            const sx = minX * p.width; 
            const sw = (maxX - minX) * p.width;
            const sy = minY * p.height;
            const sh = (maxY - minY) * p.height;

            // Hit Effect - Red Blob/Contour
            if (data.isHit) {
                p.fill(255, 0, 0, 150);
                p.noStroke();
                
                // Map landmarks to screen points
                const points = landmarks.map(lm => ({ x: lm.x * p.width, y: lm.y * p.height }));
                const hull = getConvexHull(points);

                p.beginShape();
                hull.forEach(pt => p.vertex(pt.x, pt.y));
                p.endShape(p.CLOSE);
            }

            // Shield Effect
            if (data.isBlocking) {
                p.stroke(255, 215, 0);
                p.strokeWeight(4);
                p.fill(255, 215, 0, 50);
                const cx = sx + sw/2;
                const cy = sy + sh/3; 
                p.ellipse(cx, cy, sw * 1.5, sh * 0.8);
            }

            // SWORD VISUAL
            const leftWrist = landmarks[15];
            const rightWrist = landmarks[16];
            const leftElbow = landmarks[13];
            const rightElbow = landmarks[14];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            
            // Re-calc stance for drawing (including anti-cross checks) to keep visuals in sync with logic
            const wristDist = dist(leftWrist, rightWrist);
            const distLtoR = dist(leftWrist, rightShoulder);
            const distRtoL = dist(rightWrist, leftShoulder);
            const isSwordStance = wristDist < GAME_CONSTANTS.SWORD_HAND_DIST && 
                                  !(rightWrist.x - leftWrist.x > GAME_CONSTANTS.SWORD_CROSS_CHECK_X) &&
                                  !(distLtoR < GAME_CONSTANTS.SWORD_BLOCK_BUFFER || distRtoL < GAME_CONSTANTS.SWORD_BLOCK_BUFFER);

            if (isSwordStance && !data.isBlocking) {
                // Calculate Sword Angle based on forearms
                // Vector from Elbow Center to Wrist Center
                const ex = (leftElbow.x + rightElbow.x) / 2;
                const ey = (leftElbow.y + rightElbow.y) / 2;
                const wx = (leftWrist.x + rightWrist.x) / 2;
                const wy = (leftWrist.y + rightWrist.y) / 2;
                
                const angle = Math.atan2(wy - ey, wx - ex);
                const length = 250;
                
                const swordRootX = wx * p.width;
                const swordRootY = wy * p.height;
                
                p.push();
                p.translate(swordRootX, swordRootY);
                p.rotate(angle);
                
                // Draw Sword
                p.stroke(255, 0, 0, 200); // Red Outline
                p.strokeWeight(3);
                p.fill(200, 0, 0, 150); // Red Fill
                
                // Blade
                p.beginShape();
                p.vertex(0, -10);
                p.vertex(length, 0);
                p.vertex(0, 10);
                p.vertex(-20, 10);
                p.vertex(-20, -10);
                p.endShape(p.CLOSE);
                
                // Glow
                p.noStroke();
                p.fill(255, 50, 50, 80);
                p.ellipse(length/2, 0, length, 40);
                
                p.pop();
            }

            // CHARGE EFFECT
            if (data.charge.active) {
                const mx = (leftWrist.x + rightWrist.x) / 2 * p.width;
                const my = (leftWrist.y + rightWrist.y) / 2 * p.height;
                const maxRadius = 150;
                const currentRadius = data.charge.progress * maxRadius;

                p.noStroke();
                if (data.charge.complete) {
                     p.fill(0, 255, 255, 100 + Math.sin(p.frameCount * 0.2) * 50);
                     p.circle(mx, my, currentRadius + 20);
                }
                p.fill(0, 255, 255, 150);
                p.circle(mx, my, currentRadius);
                p.fill(255);
                p.circle(mx, my, currentRadius * 0.5);
            }
        };

        if (landmarkerResults?.landmarks) {
             landmarkerResults.landmarks.forEach((lm: Landmark[]) => {
                 const nose = lm[0];
                 const isP2 = nose.x < 0.5; // Video Left -> Visual Right
                 const data = isP2 ? p2Data : p1Data;
                 drawPlayerVisuals(lm, data);
             });
        }
    };

    myP5 = new p5(sketch);

    return () => {
        myP5.remove();
        if (video) {
            video.remove();
        }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
        <GameOverlay 
            p1={p1Data} 
            p2={p2Data} 
            status={reactStatus} 
            onStart={() => {}} 
            onRestart={handleRestart}
            message={gameMessage}
        />
        <div ref={canvasRef} className="absolute inset-0 z-0" />
    </div>
  );
};
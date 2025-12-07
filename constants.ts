
export const GAME_CONSTANTS = {
  MAX_HP: 100,
  DAMAGE_NORMAL: 2,
  DAMAGE_BLOCKED: 1, // Damage taken when blocking normal
  DAMAGE_REFLECT: 0, // REMOVED: No damage reflected to attacker
  
  // Special Attack Constants
  DAMAGE_SPECIAL: 10,
  DAMAGE_SPECIAL_BLOCKED: 3,
  CHARGE_DURATION: 2500, // 2.5 seconds (Time based)
  CHARGE_MIN_VERTICAL_DIST: 0.1, // Relaxed: Easier to trigger
  CHARGE_MAX_HORIZONTAL_DIST: 0.25, // Hands must be relatively vertically aligned
  
  // Sword Constants
  DAMAGE_SWORD: 3,
  DAMAGE_SWORD_BLOCKED: 0, // No damage if blocked
  SWORD_HAND_DIST: 0.1, // Stricter: Hands must be very close
  SWORD_CROSS_CHECK_X: 0.05, // If right wrist is to the right of left wrist by this much, it's crossed arms
  SWORD_BLOCK_BUFFER: 0.35, // If hands are within this distance of opposite shoulder, disable sword (prevents misfire during block)
  SWORD_SWING_THRESHOLD: 0.015, // Vertical velocity to trigger swing
  SWORD_COOLDOWN: 20, // Frames between swings
  
  // Rain Attack Constants (Bird Flap)
  DAMAGE_RAIN: 1, // Damage PER SWORD if blocked
  RAIN_COOLDOWN: 40,
  RAIN_VELOCITY_THRESHOLD: 0.04, // Must flap fast
  RAIN_WING_SPAN: 0.15, // Distance outwards from shoulder to count as "wings"
  PROJECTILE_SPEED_RAIN: 20,
  
  PUNCH_COOLDOWN: 15, 
  PROJECTILE_SPEED: 15,
  PROJECTILE_SPEED_SPECIAL: 10, // Slower but bigger
  PROJECTILE_SPEED_SLASH: 25, // Fast slash wave
  HIT_FLASH_DURATION: 10, // Frames
  
  // Block Thresholds
  // Distance from Wrist to Opposite Shoulder (Crossed Arms)
  BLOCK_SHOULDER_DIST: 0.25, 
  
  // Punch Thresholds - Tightened for "back and forth" requirement
  PUNCH_VELOCITY_THRESHOLD: 0.05, // Doubled: requires faster thrust
  PUNCH_DIRECTION_THRESHOLD: 0.02, // Min X-velocity in direction of enemy
  ARM_EXTENSION_THRESHOLD: 140, // Arm must be nearly straight (180 is straight)
  PUNCH_REACH_THRESHOLD: 0.1, // Wrist must be at least this far from shoulder (x-axis)
};

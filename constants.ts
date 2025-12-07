export const GAME_CONSTANTS = {
  MAX_HP: 50,
  DAMAGE_NORMAL: 2,
  DAMAGE_BLOCKED: 1, // Damage taken when blocking normal
  DAMAGE_REFLECT: 1, // Damage reflected to attacker when blocking normal
  
  // Special Attack Constants
  DAMAGE_SPECIAL: 10,
  DAMAGE_SPECIAL_BLOCKED: 3,
  CHARGE_FRAMES: 180, // 3 seconds at 60fps
  CHARGE_HAND_Y_DIFF: 0.2, // Min vertical distance between hands to register 'one up one down'
  CHARGE_HAND_X_DIFF: 0.2, // Max horizontal distance (hands shouldn't be too wide apart)
  
  // Sword Constants
  DAMAGE_SWORD: 3,
  DAMAGE_SWORD_BLOCKED: 0, // No damage if blocked
  SWORD_HAND_DIST: 0.1, // Stricter: Hands must be very close
  SWORD_CROSS_CHECK_X: 0.05, // If right wrist is to the right of left wrist by this much, it's crossed arms
  SWORD_SWING_THRESHOLD: 0.015, // Vertical velocity to trigger swing
  SWORD_COOLDOWN: 20, // Frames between swings
  
  PUNCH_COOLDOWN: 15, // Reduced for alternating punches
  PROJECTILE_SPEED: 15,
  PROJECTILE_SPEED_SPECIAL: 10, // Slower but bigger
  PROJECTILE_SPEED_SLASH: 25, // Fast slash wave
  HIT_FLASH_DURATION: 10, // Frames
  
  // Block Thresholds
  // Distance from Wrist to Opposite Shoulder (Crossed Arms)
  BLOCK_SHOULDER_DIST: 0.25, 
  
  PUNCH_VELOCITY_THRESHOLD: 0.025, // More sensitive for rapid movement
  ARM_EXTENSION_THRESHOLD: 120, // More forgiving angle
};
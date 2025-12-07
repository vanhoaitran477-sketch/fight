import { Landmark } from '../types';

export interface Point {
  x: number;
  y: number;
}

export const calculateAngle = (a: Point, b: Point, c: Point): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
};

export const dist = (a: Point, b: Point): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

// Monotone Chain Convex Hull Algorithm
export const getConvexHull = (points: Point[]): Point[] => {
  if (points.length < 3) return points;

  // Sort by X then Y
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);

  const crossProduct = (o: Point, a: Point, b: Point) => {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  };

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
};

// Check if a point (projectile) is inside a bounding box defined by landmarks
export const checkCollision = (projX: number, projY: number, landmarks: Landmark[], width: number, height: number): boolean => {
  // Simple bounding box for performance
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  
  // Use torso landmarks (11, 12, 23, 24) + head (0) to define hit box
  const hitIndices = [0, 11, 12, 23, 24];
  
  for (const idx of hitIndices) {
    if (landmarks[idx]) {
      minX = Math.min(minX, landmarks[idx].x);
      maxX = Math.max(maxX, landmarks[idx].x);
      minY = Math.min(minY, landmarks[idx].y);
      maxY = Math.max(maxY, landmarks[idx].y);
    }
  }

  // Expand slightly
  const padding = 0.05;
  minX -= padding; maxX += padding;
  minY -= padding; maxY += padding;

  const px = projX / width;
  const py = projY / height;

  return px >= minX && px <= maxX && py >= minY && py <= maxY;
};
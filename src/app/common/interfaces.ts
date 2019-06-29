export interface FrameTime {
  currentTime: number;
  deltaTime: number;
}

export interface Model {
  vertices: number[];
  indices: number[];
  color?: number[];
}

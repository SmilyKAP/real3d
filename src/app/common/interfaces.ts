import { Dictionary } from 'lodash';

export interface FrameTime {
  currentTime: number;
  deltaTime: number;
}

export interface Shader {
  program: WebGLProgram,
  attributes: Dictionary<number>;
  uniforms: Dictionary<WebGLUniformLocation>;
}

export interface Model {
  vertices: number[];
  indices: number[];
  color?: [number, number, number, number];
  ambient?: [number, number, number, number];
  diffuse?: [number, number, number, number];
  specular?: [number, number, number, number];
}

export interface ModelGL { 
  vao: WebGLVertexArrayObject;
  ibo: WebGLBuffer;
  indices: number[];
}

#version 300 es
precision mediump float;

// Color that is the result of this shader
out vec4 fragColor;

void main(void) {
  // Set the result as red
  fragColor = vec4(0.5, 0.5, 1.0, 1.0);
}

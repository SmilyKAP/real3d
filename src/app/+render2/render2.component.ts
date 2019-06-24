import { Component, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ShaderService } from '../common/shader.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-render1',
  template: '',
  styles: [':host { width: 100%; height: 100%; display: block;}']
})
export class Render2Component implements OnInit, OnDestroy {

  private canvas: HTMLCanvasElement;
  private hostNative: HTMLElement;
  private gl: WebGL2RenderingContext;
  private subscription: Subscription;
  private aVertexPosition: number;
  private squareVertexBuffer: WebGLBuffer;

  constructor(
    private shader: ShaderService,
    el: ElementRef
  ) {
    this.hostNative = el.nativeElement;
  }

  public ngOnInit(): void {
    this.canvas = this.hostNative.appendChild(document.createElement('canvas'));
    this.canvas.style.position = 'fixed';
    this.gl = this.canvas.getContext('webgl2');

    this.subscription = this.shader.loadShaders(this.gl, 'render1').subscribe(program => {
      this.gl.useProgram(program);
      this.aVertexPosition = this.gl.getAttribLocation(program, 'aVertexPosition');
      this.initBuffers();
      this.draw();
    });
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  @HostListener('window:resize')
  private onResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvasRect = this.hostNative.getBoundingClientRect();
    this.canvas.width = canvasRect.width;
    this.canvas.height = canvasRect.height;
    this.gl.viewport(0, 0, canvasRect.width, canvasRect.height);
  }

  // Set up the buffers for the square
  private initBuffers(): void {
      /*
        V0                    V3
        (-0.5, 0.5, 0)        (0.5, 0.5, 0)
        X---------------------X
        |                     |
        |                     |
        |       (0, 0)        |
        |                     |
        |                     |
        X---------------------X
        V1                    V2
        (-0.5, -0.5, 0)       (0.5, -0.5, 0)
      */
    const vertices = [
      // first triangle (V0, V1, V2)
      -0.5, 0.5, 0,
      -0.5, -0.5, 0,
      0.5, -0.5, 0,

      // second triangle (V0, V2, V3)
      -0.5, 0.5, 0,
      0.5, -0.5, 0,
      0.5, 0.5, 0
    ];

    // Setting up the VBO
    this.squareVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    // Clean
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  private draw(): void {
    this.resizeCanvas();

    // Clear the scene
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Use the buffers we've constructed
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexBuffer);
    this.gl.vertexAttribPointer(this.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aVertexPosition);

    // Draw to the scene using triangle primitives and the number of vertices
    // that define our geometry (i.e. six in this case)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    // Clean
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }
}

import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ShaderService } from '../common/shader.service';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@NgComponent({
  selector: 'app-render',
  template: '',
  styles: [':host { width: 100%; height: 100%; display: block;}']
})
export class Component implements OnInit, OnDestroy {

  private canvas: HTMLCanvasElement;
  private hostNative: HTMLElement;
  private gl: WebGL2RenderingContext;
  private subscription: Subscription;
  private aVertexPosition: number;
  private uProjectionMatrix: WebGLUniformLocation;
  private uModelViewMatrix: WebGLUniformLocation;
  private coneVAO: WebGLVertexArrayObject;
  private coneIndexBuffer: WebGLBuffer;
  private indices: number[];
  private projectionMatrix = mat4.create();
  private modelViewMatrix = mat4.create();

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
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.enable(this.gl.DEPTH_TEST);

    this.subscription = this.shader.loadShaders(this.gl, 'render5')
      .pipe(
        switchMap(program => {
          this.gl.useProgram(program);
          this.aVertexPosition = this.gl.getAttribLocation(program, 'aVertexPosition');
          this.uProjectionMatrix = this.gl.getUniformLocation(program, 'uProjectionMatrix');
          this.uModelViewMatrix = this.gl.getUniformLocation(program, 'uModelViewMatrix');
          this.initBuffers(this.gl);
          this.resizeCanvas();
          return ticker();
        })
      ).subscribe(() => {
        this.draw(this.gl);
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
  private initBuffers(gl: WebGL2RenderingContext): void {
    const vertices = [
      1.5, 0, 0,
      -1.5, 1, 0,
      -1.5, 0.809017, 0.587785,
      -1.5, 0.309017, 0.951057,
      -1.5, -0.309017, 0.951057,
      -1.5, -0.809017, 0.587785,
      -1.5, -1, 0,
      -1.5, -0.809017, -0.587785,
      -1.5, -0.309017, -0.951057,
      -1.5, 0.309017, -0.951057,
      -1.5, 0.809017, -0.587785
    ];

    this.indices = [
      0, 1, 2,
      0, 2, 3,
      0, 3, 4,
      0, 4, 5,
      0, 5, 6,
      0, 6, 7,
      0, 7, 8,
      0, 8, 9,
      0, 9, 10,
      0, 10, 1
    ];

    // Create VAO
    this.coneVAO = gl.createVertexArray();

    // Bind VAO
    gl.bindVertexArray(this.coneVAO);

    const coneVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    // Configure instructions for VAO
    gl.vertexAttribPointer(this.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aVertexPosition);

    this.coneIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.coneIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private draw(gl: WebGL2RenderingContext): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // We will discuss these operations in later chapters
    mat4.perspective(this.projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
    mat4.identity(this.modelViewMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, -5]);

    gl.uniformMatrix4fv(this.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uModelViewMatrix, false, this.modelViewMatrix);

    // Bind
    gl.bindVertexArray(this.coneVAO);

    // Draw
    gl.drawElements(gl.LINE_LOOP, this.indices.length, gl.UNSIGNED_SHORT, 0);

    // Clean
    gl.bindVertexArray(null);
  }
}

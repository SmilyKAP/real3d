import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ShaderService } from '../common/shader.service';
import { ticker } from '../common/ticker';
import { configureControls } from '../common/controls';
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
  private trapezoidVAO: WebGLVertexArrayObject;
  private trapezoidIndexBuffer: WebGLBuffer;
  private indices: number[];
  private renderingMode = 'TRIANGLES';

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
    this.initControls();

    this.subscription = this.shader.loadShaders(this.gl, 'render4')
      .pipe(
        switchMap(program => {
          this.gl.useProgram(program);
          this.aVertexPosition = this.gl.getAttribLocation(program, 'aVertexPosition');
          this.initBuffers();
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
  private initBuffers(): void {
    const vertices = [
      -0.5, -0.5, 0,
      -0.25, 0.5, 0,
      0.0, -0.5, 0,
      0.25, 0.5, 0,
      0.5, -0.5, 0
    ];

    this.indices = [0, 1, 2, 0, 2, 3, 2, 3, 4];

    // Create VAO
    this.trapezoidVAO = this.gl.createVertexArray();

    // Bind VAO
    this.gl.bindVertexArray(this.trapezoidVAO);

    const trapezoidVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, trapezoidVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    // Provide instructions to VAO
    this.gl.vertexAttribPointer(this.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aVertexPosition);

    this.trapezoidIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.trapezoidIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), this.gl.STATIC_DRAW);

    // Clean
    this.gl.bindVertexArray(null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private draw(gl: WebGL2RenderingContext): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Bind VAO
    gl.bindVertexArray(this.trapezoidVAO);

    // Depending on the rendering mode type, we will draw differently
    switch (this.renderingMode) {
      case 'TRIANGLES': {
        this.indices = [0, 1, 2, 2, 3, 4];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'LINES': {
        this.indices = [1, 3, 0, 4, 1, 2, 2, 3];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'POINTS': {
        this.indices = [1, 2, 3];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.POINTS, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'LINE_LOOP': {
        this.indices = [2, 3, 4, 1, 0];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.LINE_LOOP, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'LINE_STRIP': {
        this.indices = [2, 3, 4, 1, 0];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.LINE_STRIP, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'TRIANGLE_STRIP': {
        this.indices = [0, 1, 2, 3, 4];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLE_STRIP, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
      case 'TRIANGLE_FAN': {
        this.indices = [0, 1, 2, 3, 4];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLE_FAN, this.indices.length, gl.UNSIGNED_SHORT, 0);
        break;
      }
    }

    // Clean
    gl.bindVertexArray(null);
  }

  private initControls(): void {
    configureControls({
      'Rendering Mode': {
        value: this.renderingMode,
        options: [
          'TRIANGLES',
          'LINES',
          'POINTS',
          'LINE_LOOP',
          'LINE_STRIP',
          'TRIANGLE_STRIP',
          'TRIANGLE_FAN'
        ],
        onChange: v => this.renderingMode = v
      }
    });
  }
}

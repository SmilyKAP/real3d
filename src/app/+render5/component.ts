import { Component as NgComponent, ElementRef, AfterViewInit,
  HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { mat4 } from 'gl-matrix';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ShaderService } from '../common/shader.service';
import { ticker } from '../common/ticker';
import { configureControls } from '../common/controls';

@NgComponent({
  selector: 'app-render',
  templateUrl: 'component.html',
  // styles: [':host { width: 100%; height: 100%; display: block;}']
  styleUrls: ['component.scss']
})
export class Component implements OnInit, AfterViewInit,OnDestroy {

  @ViewChild('canvas', {static: false}) private canvas: ElementRef;

  private hostNative: HTMLElement;
  private gl: WebGL2RenderingContext;
  private subscription: Subscription;
  private aVertexPosition: number;
  private uProjectionMatrix: WebGLUniformLocation;
  private uModelViewMatrix: WebGLUniformLocation;
  private coneVAO: WebGLVertexArrayObject;
  private coneIndexBuffer: WebGLBuffer;
  private indices: number[];
  private vboName: string;
  private iboName: string;
  private isConeVertexBufferVbo: boolean;
  private isVerticesVbo: boolean;
  private vboSize: any;
  private vboUsage: any;
  private iboSize: any;
  private iboUsage: any;
  private projectionMatrix = mat4.create();
  private modelViewMatrix = mat4.create();

  constructor(
    private shader: ShaderService,
    el: ElementRef
  ) {
    this.hostNative = el.nativeElement;
  }

  public ngAfterViewInit(): void {
    this.gl = this.canvas.nativeElement.getContext('webgl2');

    this.subscription = this.shader.loadShaders(this.gl, 'render5')
      .pipe(
        switchMap(program => {
          this.gl.useProgram(program);
          // Attach locations to program instance
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

  public ngOnInit(): void {
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
    this.canvas.nativeElement.width = canvasRect.width;
    this.canvas.nativeElement.height = canvasRect.height;
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

    // Set the global variables based on the parameter type
    if (coneVertexBuffer === gl.getParameter(gl.ARRAY_BUFFER_BINDING)) {
      this.vboName = 'coneVertexBuffer';
    }
    if (this.coneIndexBuffer === gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)) {
      this.iboName = 'coneIndexBuffer';
    }

    this.vboSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
    this.vboUsage = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_USAGE);

    this.iboSize = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_SIZE);
    this.iboUsage = gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_USAGE);

    try {
      this.isVerticesVbo = gl.isBuffer(vertices);
    } catch (e) {
      this.isVerticesVbo = false;
    }

    this.isConeVertexBufferVbo = gl.isBuffer(coneVertexBuffer);

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

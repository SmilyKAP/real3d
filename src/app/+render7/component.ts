import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../common/loading.service';
import { Model } from '../common/interfaces';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription, combineLatest } from 'rxjs';
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
  private uModelColor: WebGLUniformLocation;
  private coneVAO: WebGLVertexArrayObject;
  private modelIndexBuffer: WebGLBuffer;
  private model: Model;
  private projectionMatrix = mat4.create();
  private modelViewMatrix = mat4.create();

  constructor(
    private service: LoadingService,
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

    this.subscription = combineLatest(
        this.service.loadShaders(this.gl, 'render5'),
        this.service.loadModel('geometries/cone1.json')
      ).pipe(
        switchMap(([program, model]) => {
          this.gl.useProgram(program);
          this.aVertexPosition = this.gl.getAttribLocation(program, 'aVertexPosition');
          this.uProjectionMatrix = this.gl.getUniformLocation(program, 'uProjectionMatrix');
          this.uModelViewMatrix = this.gl.getUniformLocation(program, 'uModelViewMatrix');
          this.uModelColor = this.gl.getUniformLocation(program, 'uModelColor');
          this.model = model;
          this.initBuffers(this.gl, this.model);
          this.resizeCanvas();
          return ticker();
        })
      ).subscribe(() => {
        this.draw(this.gl, this.model);
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
  private initBuffers(gl: WebGL2RenderingContext, model: Model): void {
    // Create VAO
    this.coneVAO = gl.createVertexArray();

    // Bind VAO
    gl.bindVertexArray(this.coneVAO);

    // Set uniform color
    gl.uniform3fv(this.uModelColor, model.color);

    const modelVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

    // Configure instructions for VAO
    gl.enableVertexAttribArray(this.aVertexPosition);
    gl.vertexAttribPointer(this.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    this.modelIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.modelIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

    // Clean
    gl.bindVertexArray(null);
  }

  private draw(gl: WebGL2RenderingContext, model: Model): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // We will cover these operations in later chapters
    mat4.perspective(this.projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
    mat4.identity(this.modelViewMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, -5.0]);

    gl.uniformMatrix4fv(this.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uModelViewMatrix, false, this.modelViewMatrix);

    // Bind
    gl.bindVertexArray(this.coneVAO);

    // Draw
    gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);

    // Clean
    gl.bindVertexArray(null);
}
}

import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../common/loading.service';
import { Model } from '../common/interfaces';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription, combineLatest, forkJoin } from 'rxjs';
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
  private parts: { vao: WebGLVertexArrayObject, ibo: WebGLBuffer, indices: number[]}[] = [];
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
        forkJoin( new Array(178).fill(null).map((_, i) => this.service.loadModel(`nissan-gtr/part${++i}.json`)) )
      ).pipe(
        switchMap(([program, models]) => {
          this.gl.useProgram(program);
          this.aVertexPosition = this.gl.getAttribLocation(program, 'aVertexPosition');
          this.uProjectionMatrix = this.gl.getUniformLocation(program, 'uProjectionMatrix');
          this.uModelViewMatrix = this.gl.getUniformLocation(program, 'uModelViewMatrix');
          this.uModelColor = this.gl.getUniformLocation(program, 'uModelColor');

          models.map(model => {
            this.initBuffers(this.gl, model);
          });
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
  private initBuffers(gl: WebGL2RenderingContext, model: Model): void {
    // Create a VAO
    const vao = gl.createVertexArray();

    // Bind VAO
    gl.bindVertexArray(vao);

    // VBO
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

    // Configure instructions
    gl.enableVertexAttribArray(this.aVertexPosition);
    gl.vertexAttribPointer(this.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // IBO
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

    // Push data onto parts array
    this.parts.push({vao, ibo, indices: model.indices});

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private draw(gl: WebGL2RenderingContext): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // We will cover these operations in later chapters
    mat4.perspective(this.projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 10, 10000);
    mat4.identity(this.modelViewMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [-10, 0, -100]);
    mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, 30 * Math.PI / 180, [1, 0, 0]);
    mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, 30 * Math.PI / 180, [0, 1, 0]);

    gl.uniformMatrix4fv(this.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uModelViewMatrix, false, this.modelViewMatrix);

    // Iterate over every part inside of the `parts` array
    this.parts.forEach(part => {
      // Bind
      gl.bindVertexArray(part.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.ibo);

      // Draw
      gl.drawElements(gl.LINES, part.indices.length, gl.UNSIGNED_SHORT, 0);

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }

  private initControls(): void {
    
  }
}

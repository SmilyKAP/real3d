import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../common/loading.service';
import { Shader } from '../common/interfaces';
import { Dictionary } from 'lodash';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription, fromEvent } from 'rxjs';
import { share, tap, withLatestFrom } from 'rxjs/operators';
import { calculateNormals } from 'app/common/helpers';

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

  private modelViewMatrix = mat4.create();
  private projectionMatrix = mat4.create();
  private normalMatrix = mat4.create();
  private vao: WebGLVertexArrayObject;
  private indices: number[];
  private indicesBuffer: WebGLBuffer;
  private azimuth = 0;
  private elevation = 10;

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
    this.gl.clearColor(0.9, 0.9, 0.9, 1);
    this.gl.clearDepth(100);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    const shaderObservable = this.service.loadShader(
      this.gl,
      'light5',
      ['aVertexPosition', 'aVertexNormal'],
      [
        'uProjectionMatrix',
        'uModelViewMatrix',
        'uNormalMatrix',
        'uLightDirection',
        'uLightAmbient',
        'uLightDiffuse',
        'uMaterialDiffuse'
      ]
    ).pipe(
      tap(shader => {
        this.gl.useProgram(shader.program);
        this.initLights(this.gl, shader.uniforms);
        this.initBuffers(this.gl, shader.attributes);
        this.resizeCanvas();
      }),
      share()
    );

    this.subscription = ticker().pipe(
        withLatestFrom(shaderObservable)
      ).subscribe(([_, shader]) => {
        this.draw(this.gl, shader.uniforms);
      }).add(
        fromEvent<KeyboardEvent>(window, 'keydown', { passive: true })
          .pipe(
              withLatestFrom(shaderObservable)
          ).subscribe(([key, shader]) => {
            this.processKeyboard(this.gl, key, shader);
          })
      );
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

  private initLights(gl: WebGL2RenderingContext, uniforms: Dictionary<WebGLUniformLocation>): void {
    gl.uniform3fv(uniforms.uLightDirection, [0, 0, -1]);
    gl.uniform4fv(uniforms.uLightAmbient, [0.01, 0.01, 0.01, 1]);
    gl.uniform4fv(uniforms.uLightDiffuse, [0.5, 0.5, 0.5, 1]);
    gl.uniform4f(uniforms.uMaterialDiffuse, 0.1, 0.5, 0.8, 1);
}

  // Set up the buffers for the square
  private initBuffers(gl: WebGL2RenderingContext, attributes: Dictionary<number>): void {
    const vertices = [
      -20, -8, 20, // 0
      -10, -8, 0,  // 1
      10, -8, 0,   // 2
      20, -8, 20,  // 3
      -20, 8, 20,  // 4
      -10, 8, 0,   // 5
      10, 8, 0,    // 6
      20, 8, 20    // 7
    ];

    this.indices = [
      0, 5, 4,
      1, 5, 0,
      1, 6, 5,
      2, 6, 1,
      2, 7, 6,
      3, 7, 2
    ];

    // Create VAO
    this.vao = gl.createVertexArray();

    // Bind Vao
    gl.bindVertexArray(this.vao);

    const normals = calculateNormals(vertices, this.indices);

    const verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    // Configure instructions
    gl.enableVertexAttribArray(attributes.aVertexPosition);
    gl.vertexAttribPointer(attributes.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    const normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    // Configure instructions
    gl.enableVertexAttribArray(attributes.aVertexNormal);
    gl.vertexAttribPointer(attributes.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    this.indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private processKeyboard(gl: WebGL2RenderingContext, event: KeyboardEvent, shader: Shader): void {
    const lightDirection = gl.getUniform(shader.program, shader.uniforms.uLightDirection);
    const incrementValue = 10;

    switch (event.key) {
      // left arrow
      case 'ArrowLeft': {
        this.azimuth -= incrementValue;
        break;
      }
      // up arrow
      case 'ArrowUp': {
        this.elevation += incrementValue;
        break;
      }
      // right arrow
      case 'ArrowRight': {
        this.azimuth += incrementValue;
        break;
      }
      // down arrow
      case 'ArrowDown': {
        this.elevation -= incrementValue;
        break;
      }
    }

    this.azimuth %= 360;
    this.elevation %= 360;

    const theta = this.elevation * Math.PI / 180;
    const phi = this.azimuth * Math.PI / 180;

    // Spherical to cartesian coordinate transformation
    lightDirection[0] = Math.cos(theta) * Math.sin(phi);
    lightDirection[1] = Math.sin(theta);
    lightDirection[2] = Math.cos(theta) * -Math.cos(phi);

    gl.uniform3fv(shader.uniforms.uLightDirection, lightDirection);
  }

  private draw(gl: WebGL2RenderingContext, uniforms: Dictionary<WebGLUniformLocation>): void {
    const { width, height } = gl.canvas;

    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.projectionMatrix, 45, width / height, 0.1, 10000);
    mat4.identity(this.modelViewMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, -40]);

    mat4.copy(this.normalMatrix, this.modelViewMatrix);
    mat4.invert(this.normalMatrix, this.normalMatrix);
    mat4.transpose(this.normalMatrix, this.normalMatrix);

    gl.uniformMatrix4fv(uniforms.uModelViewMatrix, false, this.modelViewMatrix);
    gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(uniforms.uNormalMatrix, false, this.normalMatrix);

    // We will start using the `try/catch` to capture any errors from our `draw` calls
    try {
      // Bind
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);

      // Draw
      gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

      // Clean
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    } catch (error) {
      // We catch the `error` and simply output to the screen for testing/debugging purposes
      console.error(error);
    }
  }
}

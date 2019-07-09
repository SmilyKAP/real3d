import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../common/loading.service';
import { Model, ModelGL, Shader } from '../common/interfaces';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription, combineLatest, forkJoin } from 'rxjs';
import { switchMap, tap, share, withLatestFrom } from 'rxjs/operators';
import { calculateNormals, normalizeColor, denormalizeColor } from 'app/common/helpers';
import { configureControls } from '../common/controls';
import { Dictionary, forIn } from 'lodash';

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

  private clearColor = [0.9, 0.9, 0.9];
  private compiledModels: ModelGL[] = [];
  private angle = 0;
  private lightPosition = [100, 400, 100];
  private shininess = 24;
  private distance = -120;

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
    this.gl.clearColor(...[...this.clearColor, 1] as [number, number, number, number])
    this.gl.clearDepth(100);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    const shaderObservable = combineLatest(
      this.service.loadShader(
        this.gl,
        'light7',
        ['aVertexPosition', 'aVertexNormal'],
        [
          'uProjectionMatrix',
          'uModelViewMatrix',
          'uNormalMatrix',
          'uMaterialDiffuse',
          'uMaterialSpecular',
          'uShininess',
          'uLightPosition',
          'uLightAmbient'
        ]
      ),
      forkJoin( new Array(178).fill(null).map((_, i) => this.service.loadModel(`nissan-gtr/part${++i}.json`)) )
    ).pipe(
      tap(([shader, models]) => {
        this.gl.useProgram(shader.program);
        this.initLights(this.gl, shader.uniforms);
        models.map(model => {
          this.initBuffers(this.gl, model, shader.attributes);
        });
        this.initControls(shader.uniforms);
        this.resizeCanvas();

      }),
      share()
    );

    this.subscription = ticker().pipe(
      withLatestFrom(shaderObservable)
    ).subscribe(([frame, [shader]]) => {
        this.angle += 90 * frame.deltaTime;
        this.draw(this.gl, shader);
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

  private initLights(gl: WebGL2RenderingContext, uniforms: Dictionary<WebGLUniformLocation>): void {
    gl.uniform3fv(uniforms.uLightPosition, this.lightPosition);
    gl.uniform3f(uniforms.uLightAmbient, 0.1, 0.1, 0.1);
    gl.uniform3f(uniforms.uMaterialSpecular, 0.5, 0.5, 0.5);
    gl.uniform3f(uniforms.uMaterialDiffuse, 0.8, 0.8, 0.8);
    gl.uniform1f(uniforms.uShininess, this.shininess);
  }

  private initBuffers(gl: WebGL2RenderingContext, model: Model, attrs: Dictionary<number>): void {
    // Configure VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Vertices
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    // Configure instructions for VAO
    gl.enableVertexAttribArray(attrs.aVertexPosition);
    gl.vertexAttribPointer(attrs.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // Normals
    const normalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(calculateNormals(model.vertices, model.indices)), gl.STATIC_DRAW);
    // Configure instructions for VAO
    gl.enableVertexAttribArray(attrs.aVertexNormal);
    gl.vertexAttribPointer(attrs.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    // Indices
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

    // Push data onto parts array
    this.compiledModels.push({vao, ibo, indices: model.indices});

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private draw(gl: WebGL2RenderingContext, shader: Shader): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // We will discuss these operations in later chapters
    mat4.perspective(this.projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 1, 10000);
    mat4.identity(this.modelViewMatrix);
    mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, this.distance]);
    mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, 20 * Math.PI / 180, [1, 0, 0]);
    mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.angle * Math.PI / 180, [0, 1, 0]);

    mat4.copy(this.normalMatrix, this.modelViewMatrix);
    mat4.invert(this.normalMatrix, this.normalMatrix);
    mat4.transpose(this.normalMatrix, this.normalMatrix);

    gl.uniformMatrix4fv(shader.uniforms.uProjectionMatrix, false, this.projectionMatrix);
    gl.uniformMatrix4fv(shader.uniforms.uModelViewMatrix, false, this.modelViewMatrix);
    gl.uniformMatrix4fv(shader.uniforms.uNormalMatrix, false, this.normalMatrix);

    this.compiledModels.forEach(model => {
      // Bind
      gl.bindVertexArray(model.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.ibo);

      // Draw
      gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
    });

    // Clean
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  private initControls(uniforms: Dictionary<WebGLUniformLocation>): void {
    configureControls({
      'Car Color': {
        value: [255, 255, 255],
        onChange: v => this.gl.uniform3f(uniforms.uMaterialDiffuse, ...normalizeColor(v) as [number, number, number])
      },
      Background: {
        value: denormalizeColor(this.clearColor),
        onChange: v => this.gl.clearColor(...[...normalizeColor(v), 1] as [number, number, number, number])
      },
      Shininess: {
        value: this.shininess,
        min: 1, max: 50, step: 0.1,
        onChange: value => this.gl.uniform1f(uniforms.uShininess, value)
      },
      Distance: {
        value: this.distance,
        min: -600, max: -80, step: 1,
        onChange: value => this.distance = value
      },
      // Spread all values from the reduce onto the controls
      ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
        result[name] = {
          value: this.lightPosition[i],
          min: -1000, max: 1000, step: -0.1,
          onChange: (v, state) => {
            this.gl.uniform3fv(uniforms.uLightPosition, [
              state['Translate X'],
              state['Translate Y'],
              state['Translate Z']
            ]);
          }
        };
        return result;
      }, {}),
    });
  }
}

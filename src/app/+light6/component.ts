import { Component as NgComponent, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { LoadingService } from '../common/loading.service';
import { Model, ModelGL, Shader } from '../common/interfaces';
import { ticker } from '../common/ticker';
import { mat4 } from 'gl-matrix';
import { Subscription, combineLatest } from 'rxjs';
import { switchMap, tap, share, withLatestFrom } from 'rxjs/operators';
import { calculateNormals, normalizeColor } from 'app/common/helpers';
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

  private models: Dictionary<Model> = {};
  private compiledModels: Dictionary<ModelGL> = {};
  private angle = 0;
  private lightPosition = [4.5, 3, 15];
  private shininess = 200;
  private distance = -100;

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

    const shaderObservable = combineLatest(
      this.service.loadShader(
        this.gl,
        'light6',
        ['aVertexPosition', 'aVertexNormal'],
        [
          'uProjectionMatrix',
          'uModelViewMatrix',
          'uNormalMatrix',
          'uMaterialAmbient',
          'uMaterialDiffuse',
          'uMaterialSpecular',
          'uShininess',
          'uLightPosition',
          'uLightAmbient',
          'uLightDiffuse',
          'uLightSpecular'
        ]
      ),
      this.service.loadModel('geometries/plane.json'),
      this.service.loadModel('geometries/cone2.json'),
      this.service.loadModel('geometries/sphere1.json'),
      this.service.loadModel('geometries/sphere3.json')
    ).pipe(
      tap(([shader, plane, cone, sphere, light]) => {
        this.gl.useProgram(shader.program);
        this.initLights(this.gl, shader.uniforms);
        this.models = { plane, cone, sphere, light };
        this.initBuffers(this.gl, shader.attributes);
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
    gl.uniform4f(uniforms.uLightAmbient, 1, 1, 1, 1);
    gl.uniform4f(uniforms.uLightDiffuse, 1, 1, 1, 1);
    gl.uniform4f(uniforms.uLightSpecular, 1, 1, 1, 1);
    gl.uniform4f(uniforms.uMaterialAmbient, 0.1, 0.1, 0.1, 1);
    gl.uniform4f(uniforms.uMaterialDiffuse, 0.5, 0.8, 0.1, 1);
    gl.uniform4f(uniforms.uMaterialSpecular, 0.6, 0.6, 0.6, 1);
    gl.uniform1f(uniforms.uShininess, this.shininess);
  }

  // Set up the buffers for the square
  private initBuffers(gl: WebGL2RenderingContext, attrs: Dictionary<number>): void {
    forIn(this.models, (model, name) => {
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

      this.compiledModels = { ...this.compiledModels, [name]: {
        vao,
        ibo,
        indices: model.indices 
      }};

      // Clean
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    });
  }

  private draw(gl: WebGL2RenderingContext, shader: Shader): void {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 1000);

    // We will start using the `try/catch` to capture any errors from our `draw` calls
    try {
      // Iterate over every object
      forIn(this.models, (model, name) => {
        mat4.identity(this.modelViewMatrix);
        mat4.translate(this.modelViewMatrix, this.modelViewMatrix, [0, 0, this.distance]);
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, 30 * Math.PI / 180, [1, 0, 0]);
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.angle * Math.PI / 180, [0, 1, 0]);

        // If object is the light, we update its position
        if (name === 'light') {
          const lightPosition = gl.getUniform(shader.program, shader.uniforms.uLightPosition);
          mat4.translate(this.modelViewMatrix, this.modelViewMatrix, lightPosition);
        }

        mat4.copy(this.normalMatrix, this.modelViewMatrix);
        mat4.invert(this.normalMatrix, this.normalMatrix);
        mat4.transpose(this.normalMatrix, this.normalMatrix);

        gl.uniformMatrix4fv(shader.uniforms.uModelViewMatrix, false, this.modelViewMatrix);
        gl.uniformMatrix4fv(shader.uniforms.uProjectionMatrix, false, this.projectionMatrix);
        gl.uniformMatrix4fv(shader.uniforms.uNormalMatrix, false, this.normalMatrix);

        // Set lighting data
        gl.uniform4fv(shader.uniforms.uMaterialAmbient, model.ambient);
        gl.uniform4fv(shader.uniforms.uMaterialDiffuse, model.diffuse);
        gl.uniform4fv(shader.uniforms.uMaterialSpecular, model.specular);

        // Bind
        gl.bindVertexArray(this.compiledModels[name].vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.compiledModels[name].ibo);

        // Draw
        gl.drawElements(gl.TRIANGLES, this.compiledModels[name].indices.length, gl.UNSIGNED_SHORT, 0);

        // Clean
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      });
    } catch (error) {
      // We catch the `error` and simply output to the screen for testing/debugging purposes
      console.error(error);
    }
}

  private initControls(uniforms: Dictionary<WebGLUniformLocation>): void {
    configureControls({
      'Sphere Color': {
        value: [0, 255, 0],
        onChange: v => this.models.sphere.diffuse = [...normalizeColor(v), 1.0] as [number, number, number, number]
      },
      'Cone Color': {
        value: [235, 0, 210],
        onChange: v => this.models.cone.diffuse = [...normalizeColor(v), 1.0] as [number, number, number, number]
      },
      Shininess: {
        value: this.shininess,
        min: 1, max: 50, step: 0.1,
        onChange: v => this.gl.uniform1f(uniforms.uShininess, v)
      },
      // Spread all values from the reduce onto the controls
      ...['Translate X', 'Translate Y', 'Translate Z'].reduce((result, name, i) => {
        result[name] = {
          value: this.lightPosition[i],
          min: -50, max: 50, step: -0.1,
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
      Distance: {
        value: this.distance,
        min: -200, max: -50, step: 0.1,
        onChange: v => this.distance = v
      }
    });
  }
}

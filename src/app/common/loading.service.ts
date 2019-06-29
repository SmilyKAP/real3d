import { Injectable } from '@angular/core';
import { Observable, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { SHADERS_PATH, VERTEX_SHADER, FRAGMENT_SHADER, MODELS_PATH } from './consts';
import { Model } from './interfaces';

@Injectable()
export class LoadingService {

  public loadShaders(gl: WebGL2RenderingContext, shader: string): Observable<WebGLProgram> {
    return zip(
      this.http.get(`${SHADERS_PATH}${shader}/${VERTEX_SHADER}`, {responseType: 'text'}),
      this.http.get(`${SHADERS_PATH}${shader}/${FRAGMENT_SHADER}`, {responseType: 'text'})
    ).pipe(
      map(([vertexShaderSource, fragmentShaderSource]) => {
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        gl.deleteShader(vertexShader);
        gl.deleteShader(vertexShader);

        return shaderProgram;
      })
    );
  }

  public loadModel(model: string): Observable<Model> {
    return this.http.get<Model>(MODELS_PATH + model);
  }

  constructor(private http: HttpClient) {}
}

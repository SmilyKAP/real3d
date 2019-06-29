import { Observable, interval,
  animationFrameScheduler } from 'rxjs';
import { map, scan } from 'rxjs/operators';

import { FrameTime } from './interfaces';
import { TICKER_INTERVAL } from './consts';

export function ticker(tickSize = TICKER_INTERVAL): Observable<FrameTime> {
  return interval(tickSize, animationFrameScheduler)
    .pipe(
      map(() => ({
        currentTime: performance.now(),
        deltaTime: 0
      })),
      scan((previous, current) => ({
        currentTime: current.currentTime,
        deltaTime: (current.currentTime - previous.currentTime) / 1000.0
      }))
    );
}

import { Directive, ElementRef,  HostBinding, Input, NgZone,  OnDestroy,  OnInit, Renderer2 } from '@angular/core';
import { fromEvent, merge,  Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[appAutosize]',
  exportAs: 'appAutosize'
})
export class AutosizeDirective implements OnInit, OnDestroy {
  private _destroy$: Subject<any>;

  @HostBinding('style.min-height.px')
  @Input()
  minHeight: number;

  @HostBinding('style.max-height.px')
  @Input()
  maxHeight: number;

  constructor(public elem: ElementRef<HTMLElement>, private _zone: NgZone, private _renderer: Renderer2) { 
    this._destroy$ = new Subject();
  }

  ngOnInit() {
    const el = this.elem.nativeElement;
    // No need to run change detection
    this._zone.runOutsideAngular(() => {
      // Compute height on init
      this.computeNewHeight();
      // Listen to window resize and input changes
      const windowResize$ = fromEvent(window, 'resize').pipe(debounceTime(200), takeUntil(this._destroy$));
      const inputChange$ = fromEvent(el, 'input').pipe(takeUntil(this._destroy$));
      const change$ = merge(windowResize$, inputChange$).pipe(takeUntil(this._destroy$));

      change$.subscribe({
        next: () => {
          this.computeNewHeight();
        }
      });
    });
  }

  // Can be called externally to force new height
  computeNewHeight() {
    const el = this.elem.nativeElement;
    // Resets height
    this._setHostHeight(0);
    const computedHostStyles = window?.getComputedStyle(el);
    // Accounts for borders incase box-sizing="border-box";
    const heightCorrection = el.offsetHeight - el.clientHeight;

    // Check for min and max height in element styles
    const minHeight = this.minHeight || this._pixelToNumber(computedHostStyles?.minHeight);
    const maxHeight = this.maxHeight || this._pixelToNumber(computedHostStyles?.maxHeight);

    // Compute new height
    const newMinHeight = minHeight ? Math.max(el.scrollHeight, minHeight) : el.scrollHeight;
    const newHeight = maxHeight ? Math.min(maxHeight, newMinHeight) : newMinHeight;
    this._setHostHeight(newHeight + heightCorrection);
  }

  private _setHostHeight(value: number) {
    const el = this.elem.nativeElement;
    this._renderer.setStyle(el, 'height', this._numberToPixel(value));
  }

  private _pixelToNumber(value: string) {
    const val = + value.replace('px', '');
    return isNaN(val) ? null : val;
  }

  private _numberToPixel(value: number) {
    return value + 'px';
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
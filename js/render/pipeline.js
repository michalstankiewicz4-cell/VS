// Picks the active post-process by graphics style and lets the style change live (no reload).
// Same interface as the individual pipelines: setParams / resize / render / rt.
import { PixelPipeline } from './pixel-pipeline.js';
import { StylePipeline } from './style-pipeline.js';

export class Pipeline {
  constructor(renderer, style = 'pixel') {
    this.r = renderer;
    this.params = {};
    this.style = null;
    this.impl = null;
    this.setStyle(style);
  }
  setStyle(style) {
    if (style === this.style) return;
    const old = this.impl;
    this.style = style;
    if (style === 'pixel') this.impl = this.px ||= new PixelPipeline(this.r);
    else { this.impl = this.st ||= new StylePipeline(this.r); this.impl.setStyle(style); }
    if (old && old !== this.impl) old.release();
    this.impl.setParams(this.params);
    this.impl.resize(innerWidth, innerHeight);
  }
  setParams(p) { this.params = { ...p }; this.impl.setParams(this.params); }
  resize(w, h) { this.impl.resize(w, h); }
  render(scene, camera) { this.impl.render(scene, camera); }
  get rt() { return this.impl.rt; }
}

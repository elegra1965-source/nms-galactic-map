/* <send-button> — no dependencies, no build.
   Drop this file next to your HTML and load it once:
     <script type="module" src="send-button.js"></script>
   Then use it in place of a normal button:
     <send-button id="fbSubmit" sent-label="Feedback sent">Send feedback</send-button>

   This version is built to sit inside a REAL async submit flow (a fetch
   call with an unknown, variable duration) rather than run on a fixed
   timer. It behaves like a normal <button> for click/disabled purposes
   -- your own click handler on the element still fires exactly as it
   would on a plain <button id="fbSubmit"> -- and exposes methods your
   submit code calls at the right moments:

     el.playSending()   -- call this once validation passes and you're
                            about to start the network request. Plays
                            the launch + text-wipe. The ship flies off
                            and the label swaps to sent-label, and then
                            just HOLDS there (no auto-timer) until you
                            call one of the two methods below.

     el.playReturn()     -- call this on failure, once you're ready to
                            let the person retry. Warps the ship back
                            in and restores the original label. If the
                            ship hadn't even finished launching yet
                            (a very fast failure), it just snaps back
                            instantly instead of playing the return
                            flourish out of sequence.

     el.reset()          -- instant, no animation. Call this when you
                            reopen the modal fresh (in case a previous
                            attempt was left mid-flight or mid-hold),
                            or after a successful send once you're done
                            with the modal.

     el.disabled = true/false -- works like a normal button's property;
                            also settable as the `disabled` attribute.

   The ship is a small trimmed PNG (a No Man's Sky exotic-class starship)
   inlined below as a data URI, so this file has zero external assets. */

const template = document.createElement('template');
template.innerHTML = `
<style>

:host{
  --nms-cyan:#4fe3ff;
  --nms-orange:#ffb020;
  display:inline-block;
}
button{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:100%;
  box-sizing:border-box;
  gap:.7em;
  padding:.85em 1.3em;
  background:transparent;
  border:1px solid var(--nms-orange);
  border-radius:2px;
  color:var(--nms-orange);
  font:inherit;
  font-family:'Consolas','Menlo','Courier New',monospace;
  font-size:.8rem;
  letter-spacing:.08em;
  cursor:pointer;
  overflow:visible;
  transition:box-shadow .3s ease, color .3s ease, border-color .3s ease, opacity .2s ease;
}
button:hover:not(:disabled){
  box-shadow:0 0 14px rgba(255,176,32,.35);
}
button:disabled{ cursor:default; opacity:.7; }
:host(.is-sending) button,
:host(.is-sent) button{
  border-color:var(--nms-cyan);
  color:var(--nms-cyan);
  box-shadow:0 0 18px rgba(79,227,255,.45);
}

/* overflow is ALWAYS hidden -- the right edge of the stage is a hard wall.
   the ship doesn't fade in open space, it slides behind this edge and
   gets cut off, like it's exiting through a doorway. */
.stage{
  position:relative;
  display:inline-flex;
  align-items:center;
  height:2.6em;
  overflow:hidden;
}
.icon-slot{
  width:2.3em;
  height:2.6em;
  flex:0 0 auto;
}
.ship{
  position:absolute;
  left:-0.4em;
  top:50%;
  height:2.3em;
  width:auto;
  transform:translateY(-50%) rotate(-28deg);
  transform-origin:center;
  z-index:3;
  pointer-events:none;
  display:block;
  opacity:1;
  transition:opacity .18s linear;
}
:host(.is-sending) .ship{
  animation:sb-fly 4s ease-in-out forwards;
}
/* fades the ship to fully transparent BEFORE it ever reaches the
   clipped edge, so overflow:hidden never has to visibly crop a
   rotated, semi-transparent image mid-flight -- some mobile
   compositors draw a solid backing box for a frame when that happens.
   the transition lives on the base rule above so it also plays in
   reverse -- a fade-IN -- the moment this class is removed again. */
.ship.is-exiting{
  opacity:0;
}
@keyframes sb-fly{
  from { left:-0.4em; }
  to   { left:145%;   }
}

/* fired by JS at the exact real-time moment the ship's rotated bounding
   box crosses the stage's edge -- not guessed as a % of the animation,
   since the rotation makes the nose exit before the box's own left
   value would suggest. one variant sits at the exit (right) edge, the
   other at the dock (left) for the return "warp-in". */
.warp-flash{
  position:absolute;
  top:50%;
  width:46px;
  height:46px;
  margin-top:-23px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(210,245,255,.95) 25%, rgba(79,227,255,.6) 50%, transparent 72%);
  opacity:0;
  transform:scale(.2);
  z-index:4;
  pointer-events:none;
}
.warp-flash--out{ right:-6px; }
.warp-flash--in{ left:-6px; }
.warp-flash--out::after{
  content:'';
  position:absolute;
  top:50%;
  right:100%;
  width:60px;
  height:3px;
  margin-top:-1.5px;
  background:linear-gradient(to left, rgba(220,248,255,.9), transparent);
  transform-origin:right center;
  transform:scaleX(0);
}
.warp-flash--in::after{
  content:'';
  position:absolute;
  top:50%;
  left:100%;
  width:60px;
  height:3px;
  margin-top:-1.5px;
  background:linear-gradient(to right, rgba(220,248,255,.9), transparent);
  transform-origin:left center;
  transform:scaleX(0);
}
.warp-flash.flash-now{
  animation:sb-warp-burst .38s cubic-bezier(.15,.8,.3,1);
}
.warp-flash.flash-now::after{
  animation:sb-warp-streak .38s cubic-bezier(.15,.8,.3,1);
}
@keyframes sb-warp-burst{
  0%   { opacity:0;   transform:scale(.15); }
  12%  { opacity:1;   transform:scale(1.15); }
  30%  { opacity:1;   transform:scale(.85); }
  100% { opacity:0;   transform:scale(.5); }
}
@keyframes sb-warp-streak{
  0%   { opacity:0;   transform:scaleX(0); }
  12%  { opacity:.9;  transform:scaleX(1); }
  55%  { opacity:.4;  transform:scaleX(1.4); }
  100% { opacity:0;   transform:scaleX(1.6); }
}

.label{
  position:relative;
  display:inline-block;
  line-height:1;
}
.label-default{
  position:relative;
  z-index:2;
  display:inline-block;
  white-space:nowrap;
  clip-path:inset(0 0 0 0%);
}
.label-sent{
  position:absolute;
  top:0;
  left:0;
  z-index:1;
  white-space:nowrap;
  clip-path:inset(0 100% 0 0);
}
:host(.is-sending) .label-default{
  animation:sb-wipe-out 4s ease-in-out forwards;
}
:host(.is-sending) .label-sent{
  animation:sb-wipe-in 4s ease-in-out forwards;
}
:host(.is-sent) .label-default{
  clip-path:inset(0 0 0 100%);
}
:host(.is-sent) .label-sent{
  clip-path:inset(0 0% 0 0);
}
@keyframes sb-wipe-out{
  0%   { clip-path:inset(0 0 0 0%); }
  60%  { clip-path:inset(0 0 0 100%); }
  100% { clip-path:inset(0 0 0 100%); }
}
@keyframes sb-wipe-in{
  0%   { clip-path:inset(0 100% 0 0); }
  60%  { clip-path:inset(0 0% 0 0); }
  100% { clip-path:inset(0 0% 0 0); }
}

</style>

<button type="button" part="button">
  <span class="stage">
    <span class="icon-slot"></span>
    <img class="ship" alt="" src="data:image/png;base64,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">
    <span class="label">
      <span class="label-default"><slot></slot></span>
      <span class="label-sent"></span>
    </span>
    <span class="warp-flash warp-flash--out"></span>
    <span class="warp-flash warp-flash--in"></span>
  </span>
</button>

`;

class SendButton extends HTMLElement {
  static get observedAttributes(){ return ['sent-label','disabled']; }

  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(){
    this._btn = this.shadowRoot.querySelector('button');
    this._stage = this.shadowRoot.querySelector('.stage');
    this._ship = this.shadowRoot.querySelector('.ship');
    this._flashOut = this.shadowRoot.querySelector('.warp-flash--out');
    this._flashIn = this.shadowRoot.querySelector('.warp-flash--in');
    this._sentLabelEl = this.shadowRoot.querySelector('.label-sent');
    this._sentLabelEl.textContent = this.getAttribute('sent-label') || 'Sent';
    this._btn.disabled = this.hasAttribute('disabled');
  }

  attributeChangedCallback(name, _old, value){
    if (name === 'sent-label' && this._sentLabelEl) {
      this._sentLabelEl.textContent = value || 'Sent';
    }
    if (name === 'disabled' && this._btn) {
      this._btn.disabled = value !== null;
    }
  }

  get disabled(){ return this.hasAttribute('disabled'); }
  set disabled(val){
    if (val) this.setAttribute('disabled','');
    else this.removeAttribute('disabled');
  }

  _fireFlash(el){
    el.classList.remove('flash-now');
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add('flash-now');
  }

  _watchForExit(){
    // Polls real layout each frame. Triggers while the ship still has a
    // little runway left before the stage's edge (half its own width),
    // so the opacity fade below has time to finish BEFORE the ship
    // would ever need to be clipped by overflow:hidden -- avoiding a
    // rendering glitch some mobile browsers show when a rotated,
    // semi-transparent image gets clipped mid-transform.
    if (!this.classList.contains('is-sending')) return;

    const stageRect = this._stage.getBoundingClientRect();
    const shipRect = this._ship.getBoundingClientRect();
    const margin = Math.max(shipRect.width * 0.5, 16);

    if (stageRect.right - shipRect.right <= margin) {
      this._ship.classList.add('is-exiting');
      this._fireFlash(this._flashOut);
      return;
    }
    requestAnimationFrame(() => this._watchForExit());
  }

  playSending(){
    if (this.classList.contains('is-sending') || this.classList.contains('is-sent')) return;
    this.classList.add('is-sending');
    requestAnimationFrame(() => this._watchForExit());
    this._sendingTimer = window.setTimeout(() => {
      if (!this.classList.contains('is-sending')) return; // aborted via reset/playReturn
      this.classList.remove('is-sending');
      this.classList.add('is-sent');
    }, 4000);
  }

  playReturn(){
    if (!this.classList.contains('is-sending') && !this.classList.contains('is-sent')) return;

    if (this._ship.classList.contains('is-exiting')) {
      // The ship had already flown off -- warp it back in properly.
      window.clearTimeout(this._sendingTimer);
      this.classList.remove('is-sending','is-sent');
      this._fireFlash(this._flashIn);
      window.setTimeout(() => {
        this._ship.classList.remove('is-exiting');
      }, 140);
    } else {
      // Still mid-launch (a very fast failure) -- nothing to warp back
      // FROM yet, so just snap cleanly to idle instead of playing the
      // return flourish out of sequence.
      this.reset();
    }
  }

  reset(){
    window.clearTimeout(this._sendingTimer);
    this.classList.remove('is-sending','is-sent');
    this._ship.classList.remove('is-exiting');
    this._flashOut.classList.remove('flash-now');
    this._flashIn.classList.remove('flash-now');
  }
}

customElements.define('send-button', SendButton);

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

   The ship is a small trimmed PNG (a No Man's Sky exotic-class starship),
   loaded from Icons/send-feedback-ship.png (the same folder as the
   existing race/economy icons, rather than a new folder) -- update the
   <img> src below if you move it. */

const template = document.createElement('template');
template.innerHTML = `
<style>

:host{
  --nms-cyan:#4fe3ff;
  --nms-idle-border:rgba(0,229,255,.16);
  --nms-idle-text:#cfe0f0;
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
  border:1px solid var(--nms-idle-border);
  border-radius:2px;
  color:var(--nms-idle-text);
  font:inherit;
  font-family:'Consolas','Menlo','Courier New',monospace;
  font-size:.8rem;
  letter-spacing:.08em;
  cursor:pointer;
  overflow:visible;
  transition:box-shadow .3s ease, color .3s ease, border-color .3s ease, opacity .2s ease;
}
button:hover:not(:disabled){
  border-color:var(--nms-cyan);
  box-shadow:0 0 14px rgba(79,227,255,.25);
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
    <img class="ship" alt="" src="Icons/send-feedback-ship.png">
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

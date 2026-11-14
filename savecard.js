/* 2026-11-13: save card. Shown after a public system save is accepted (first save of a visit; tap to skip).
   Hooks: window.NMSSaveCard.show({address,galaxy,name,wasNew,editor}) from submitEditPayload() in preview.js. */
(function(){
  var T={
    en:['SYSTEM CHARTED','SYSTEM UPDATED','Documented by'],
    es:['SISTEMA CARTOGRAFIADO','SISTEMA ACTUALIZADO','Documentado por'],
    de:['SYSTEM KARTIERT','SYSTEM AKTUALISIERT','Dokumentiert von'],
    nl:['SYSTEEM IN KAART GEBRACHT','SYSTEEM BIJGEWERKT','Gedocumenteerd door'],
    pl:['UK\u0141AD ZMAPOWANY','UK\u0141AD ZAKTUALIZOWANY','Dokumentacja: '],
    fr:['SYST\u00c8ME CARTOGRAPHI\u00c9','SYST\u00c8ME MIS \u00c0 JOUR','Document\u00e9 par'],
    'pt-BR':['SISTEMA MAPEADO','SISTEMA ATUALIZADO','Documentado por'],
    it:['SISTEMA CARTOGRAFATO','SISTEMA AGGIORNATO','Documentato da']
  };
  var NX={
    en:function(n){return n+' more charted system'+(n===1?'':'s')+' to your next medal';},
    es:function(n){return n===1?'Te falta 1 sistema cartografiado para tu pr\u00f3xima medalla':'Te faltan '+n+' sistemas cartografiados para tu pr\u00f3xima medalla';},
    de:function(n){return n===1?'Noch 1 kartiertes System bis zur n\u00e4chsten Medaille':'Noch '+n+' kartierte Systeme bis zur n\u00e4chsten Medaille';},
    nl:function(n){return n===1?'Nog 1 systeem in kaart brengen tot je volgende medaille':'Nog '+n+' systemen in kaart brengen tot je volgende medaille';},
    pl:function(n){return 'Jeszcze '+n+(n===1?' uk\u0142ad':(n<5?' uk\u0142ady':' uk\u0142ad\u00f3w'))+' do nast\u0119pnego medalu';},
    fr:function(n){return 'Encore '+n+' syst\u00e8me'+(n===1?' cartographi\u00e9':'s cartographi\u00e9s')+' avant ta prochaine m\u00e9daille';},
    'pt-BR':function(n){return n===1?'Falta 1 sistema mapeado para a pr\u00f3xima medalha':'Faltam '+n+' sistemas mapeados para a pr\u00f3xima medalha';},
    it:function(n){return 'Ancora '+n+' sistem'+(n===1?'a cartografato':'i cartografati')+' alla prossima medaglia';}
  };
  var CSS=' .nsc-sc{width:min(340px,92vw);font-family:Orbitron,Rajdhani,sans-serif;color:#dfeaf2;position:relative;background:#0a1220;border:1px solid #17566a;padding:18px 16px 16px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.6)} .nsc-sc::before,.nsc-sc::after{content:"";position:absolute;width:14px;height:14px;border:2px solid #f0a500} .nsc-sc::before{top:-1px;left:-1px;border-right:0;border-bottom:0}.nsc-sc::after{bottom:-1px;right:-1px;border-left:0;border-top:0} .nsc-ic{width:52px;height:52px;display:block;margin:0 auto 6px} .nsc-k{font-size:11px;letter-spacing:.22em;color:#00d8f0} .nsc-rule{width:56px;height:2px;background:#f0a500;margin:9px auto} .nsc-nm{font-size:17px;letter-spacing:.08em;margin-bottom:10px} .nsc-gl{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:0 auto 6px;max-width:260px} .nsc-gl i{aspect-ratio:1;background:#00d8f0;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat} .nsc-hx{font-size:12px;letter-spacing:.14em;color:#00d8f0;margin-bottom:10px} .nsc-by{font-size:10px;letter-spacing:.1em;color:#8fa3b3} .nsc-med{margin-top:10px;padding-top:9px;border-top:1px solid #17566a;font-size:10px;letter-spacing:.08em;color:#f0a500} .nsc-sc{overflow:hidden;animation:nsc_pop 0.72s cubic-bezier(.2,.9,.3,1.2) both} @keyframes nsc_pop{from{transform:scale(.82);opacity:0}to{transform:none;opacity:1}} .nsc-sc::before,.nsc-sc::after,.nsc-c3,.nsc-c4{content:"";position:absolute;width:14px;height:14px;border:2px solid #f0a500} .nsc-c3{top:-1px;right:-1px;border-left:0;border-bottom:0}.nsc-c4{bottom:-1px;left:-1px;border-right:0;border-top:0} .nsc-sc::before,.nsc-sc::after,.nsc-c3,.nsc-c4{animation:nsc_corner 0.8s ease-out 0.32s both} @keyframes nsc_corner{from{width:0;height:0;opacity:0}to{width:14px;height:14px;opacity:1}} .nsc-ic{animation:nsc_spin 1.76s cubic-bezier(.2,.8,.2,1) 0.24s both;position:relative;z-index:1} @keyframes nsc_spin{from{transform:rotate(-300deg) scale(.3);opacity:0}to{transform:none;opacity:1}} .nsc-ring{position:absolute;left:50%;top:44px;width:52px;height:52px;margin:-26px 0 0 -26px;border:2px solid #00d8f0;border-radius:50%;animation:nsc_ring 1.6s ease-out 1.44s both} @keyframes nsc_ring{from{transform:scale(.6);opacity:.9}to{transform:scale(4);opacity:0}} .nsc-k{animation:nsc_fade 0.64s ease 0.88s both}.nsc-rule{animation:nsc_grow 0.8s ease 1.2s both} @keyframes nsc_fade{from{opacity:0;letter-spacing:.5em}to{opacity:1;letter-spacing:.22em}} @keyframes nsc_grow{from{width:0}to{width:56px}} .nsc-nm{animation:nsc_fade2 0.8s ease 1.6s both}@keyframes nsc_fade2{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} .nsc-gl i{animation:nsc_ign 0.8s ease-out both;animation-delay:calc(1.92s + var(--n)*0.14s)} @keyframes nsc_ign{0%{opacity:0;transform:scale(.4);filter:brightness(3)}40%{opacity:1;transform:scale(1.25);background:#fff}100%{opacity:1;transform:none;filter:drop-shadow(0 0 3px rgba(0,216,240,.7))}} .nsc-hx{animation:nsc_fade3 0.8s ease 3.84s both}.nsc-by{animation:nsc_fade3 0.8s ease 4.08s both}.nsc-med{animation:nsc_fade3 0.8s ease 4.32s both} @keyframes nsc_fade3{from{opacity:0}to{opacity:1}} .nsc-sweep{position:absolute;top:0;bottom:0;left:-40%;width:30%;background:linear-gradient(100deg,transparent,rgba(0,216,240,.28),transparent);animation:nsc_sw 1.44s ease-in-out 3.68s both} @keyframes nsc_sw{from{left:-40%}to{left:120%}} .nsc-med b{display:inline-block;animation:nsc_star 0.96s ease 4.64s both} @keyframes nsc_star{0%{transform:scale(0)}60%{transform:scale(1.6)}100%{transform:scale(1)}} .nsc-sc::before{top:-1px;left:-1px;border-right:0;border-bottom:0}.nsc-sc::after{bottom:-1px;right:-1px;border-left:0;border-top:0}.nsc-c3{top:-1px;right:-1px;border-left:0;border-bottom:0}.nsc-c4{bottom:-1px;left:-1px;border-right:0;border-top:0} .nsc-body{animation:nsc_rev 3.68s linear 0.8s both} @keyframes nsc_rev{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}} .nsc-scan{position:absolute;left:0;right:0;top:0;height:2px;background:#00d8f0;box-shadow:0 -14px 22px rgba(0,216,240,.45);animation:nsc_scn 3.68s linear 0.8s both;z-index:3} @keyframes nsc_scn{0%{top:0;opacity:1}92%{opacity:1}100%{top:100%;opacity:0}} .nsc-sweep{display:none} .nsc-ic{animation:nsc_spin 1.6s cubic-bezier(.2,.8,.2,1) 0.88s both}.nsc-ring{animation:nsc_ring 1.6s ease-out 1.6s both} .nsc-k,.nsc-rule,.nsc-nm,.nsc-hx,.nsc-by,.nsc-med{animation:none!important} .nsc-gl i{animation-delay:calc(2.4s + var(--n)*0.11s)} .nsc-med b{animation-delay:4.64s} .nsc-scan{height:46px;background:linear-gradient(to bottom,rgba(0,216,240,0),rgba(0,216,240,.10) 55%,rgba(0,216,240,.32) 96%,#00d8f0 96%,#00d8f0 100%);box-shadow:none;transform:translateY(-100%);top:0;animation:nsc_scn2 3.68s linear 0.8s both} @keyframes nsc_scn2{0%{top:0;opacity:1}92%{opacity:1}100%{top:calc(100% + 46px);opacity:0}} @media(prefers-reduced-motion:reduce){.nsc-sc *,.nsc-sc{animation:none!important}} .nsc-ring{opacity:0;animation-fill-mode:forwards!important} .nsc-nx{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:10px;padding-top:9px;border-top:1px solid #17566a;font-size:10px;letter-spacing:.05em;color:#f0a500;line-height:1.35;animation:nsc_fade3 .8s ease 4.6s both} .nsc-nx img{width:18px;height:18px;flex:none}';
  var timer=null;
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function close(){
    clearTimeout(timer); var w=document.getElementById('nscWrap'); if(w&&w.parentNode) w.parentNode.removeChild(w);
  }
  function show(o){
    try{
      if(sessionStorage.getItem('nms_savecard_seen')==='1') return false;
      sessionStorage.setItem('nms_savecard_seen','1');
    }catch(e){}
    var addr=String(o.address||'').toUpperCase().replace(/[^0-9A-F]/g,'');
    if(addr.length!==12||/^0+$/.test(addr)) return false;
    var l=(window.NMS_LANG&&window.NMS_LANG())||'en', t=T[l]||T.en;
    var reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
    close();
    if(!document.getElementById('nscCss')){ var st=document.createElement('style'); st.id='nscCss'; st.textContent=CSS; document.head.appendChild(st); }
    var gl=''; for(var i=0;i<12;i++) gl+='<i style="--n:'+i+';--m:url(glyphs/glyph-mask-'+addr.charAt(i)+'.png)"></i>';
    var by=o.editor?'<div class="nsc-by">'+esc(t[2])+' '+esc(o.editor)+'</div>':'';
    var nx='', pr=null;
    try{ if(o.wasNew&&window.NMSMedals&&NMSMedals.progress) pr=NMSMedals.progress({address:addr,galaxy:o.galaxy}); }catch(e){}
    if(pr){ nx='<div class="nsc-nx"><img src="crystal/ci-star.webp" alt="Star icon" width="18" height="18"><span>'+esc((NX[l]||NX.en)(pr.left))+'</span></div>'; }
    var w=document.createElement('div'); w.id='nscWrap'; w.setAttribute('role','status');
    w.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(3,6,10,.62);cursor:pointer';
    w.innerHTML='<div class="nsc-sc"><i class="nsc-c3"></i><i class="nsc-c4"></i><i class="nsc-ring"></i><i class="nsc-scan"></i><div class="nsc-body"><img class="nsc-ic" src="crystal-savecard-compass.webp" alt="Compass icon" width="52" height="52"><div class="nsc-k">'+esc(o.wasNew?t[0]:t[1])+'</div><div class="nsc-rule"></div><div class="nsc-nm">'+esc(o.name||'')+'</div><div class="nsc-gl">'+gl+'</div><div class="nsc-hx">'+addr+'</div>'+by+nx+'</div></div>';
    w.addEventListener('click',close);
    document.body.appendChild(w);
    timer=setTimeout(close,reduced?3500:8500);
    return true;
  }
  window.NMSSaveCard={show:show,close:close};
})();

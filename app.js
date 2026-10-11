
(function(){var sp=document.getElementById('splash');if(!sp)return;function out(){sp.classList.add('out');setTimeout(function(){sp.remove();},700);}setTimeout(out,3000);})();
(function(){
'use strict';
var G0=window.GEO, RAD=G0.RAD, ITEMS=G0.ITEMS, byId=G0.byId;
var CATS=['Werelddelen','Wateren','Gebergtes'];
var CAT_COL={Werelddelen:'#7bd88f',Wateren:'#4cc2ff',Gebergtes:'#ff8a65',Alles:'#e6edf5'};
var CAT_ICON={
  Alles:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
  Werelddelen:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5 9c3 0 4 2 6 2s2 3 1 5M14 6c2 1 4 1 5 3"/></svg>',
  Wateren:'<svg viewBox="0 0 24 24"><path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/></svg>',
  Gebergtes:'<svg viewBox="0 0 24 24"><path d="M3 19l6-11 4 7 3-4 5 8z"/></svg>'
};
var $=function(s){return document.querySelector(s);};
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var S={view:'globe',f:{k:1,tx:0,ty:0},rot:[-15,-22],k:1,filter:'Alles',mode:'verkennen',
  active:new Set(ITEMS.map(function(i){return i.id;})),
  selected:null,reveal:{},review:null,fx:[],hint:null,parts:[],confirmReset:false};
var G=null, dirty=true, tw=null, timer=null, toastT=null;
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

/* ---------- voortgang, badges en beloningen ---------- */
var STORE_KEY='topo-trainer-v1';
var P={items:{},badges:{},best:0,flags:{}};
var SC={known:'#3ddc97',hard:'#ff9f43',new:'#9fb3c8'}, GL={known:'\u2713 ',hard:'! ',new:''};
var CONF=['#0EA5E9','#22C55E','#ffffff','#1D4ED8','#FBBF24','#7DD3FC'];
/** Haalt de voortgang uit de browser. Zonder opslag werkt de app gewoon door, maar vergeet hij alles bij sluiten. */
function loadP(){ try{ var s=localStorage.getItem(STORE_KEY); if(s){ var o=JSON.parse(s); if(o&&o.items){ P=o; P.badges=P.badges||{}; P.flags=P.flags||{}; P.best=P.best||0; } } }catch(e){} }
function saveP(){ try{ localStorage.setItem(STORE_KEY,JSON.stringify(P)); }catch(e){} }
/** Slaat de uitkomst van één vraag op (1 = in één keer goed). */
function record(id,ok){ var it=P.items[id]||(P.items[id]={r:[],t:0}); it.r.push(ok?1:0); if(it.r.length>6) it.r.shift(); it.t=Date.now(); saveP(); }
/** known = ken ik, hard = lastig, new = nog niet geoefend. */
function status(id){
  var it=P.items[id]; if(!it||!it.r.length) return 'new';
  var l3=it.r.slice(-3), s=l3.reduce(function(a,b){return a+b;},0);
  return (it.r[it.r.length-1]===1&&s/l3.length>=0.66)?'known':'hard';
}
function allKnown(cat){ return ITEMS.filter(function(i){return !cat||i.cat===cat;}).every(function(i){return status(i.id)==='known';}); }
var BADGES=[
  {id:'eerste-stap',name:'Eerste stap',desc:'Je eerste goede antwoord',test:function(){return ITEMS.some(function(i){var r=(P.items[i.id]||{}).r;return r&&r.indexOf(1)>-1;});}},
  {id:'op-dreef',name:'Op dreef',desc:'5 keer achter elkaar in één keer goed',test:function(){return P.best>=5;}},
  {id:'werelddelen',name:'Werelddelen-kenner',desc:'Je kent alle werelddelen',test:function(){return allKnown('Werelddelen');}},
  {id:'waterrat',name:'Waterrat',desc:'Je kent alle wateren',test:function(){return allKnown('Wateren');}},
  {id:'bergbeklimmer',name:'Bergbeklimmer',desc:'Je kent alle gebergtes',test:function(){return allKnown('Gebergtes');}},
  {id:'foutloos',name:'Foutloos',desc:'Een toets zonder fouten',test:function(){return !!P.flags.foutloos;}},
  {id:'kampioen',name:'Topo-kampioen',desc:'Je kent alle 20 begrippen',test:function(){return allKnown();}}
];
/** Kent nieuwe badges toe en geeft de namen terug. */
function checkBadges(){
  var nw=[]; BADGES.forEach(function(b){ if(!P.badges[b.id]&&b.test()){ P.badges[b.id]=Date.now(); nw.push(b.name); } });
  if(nw.length){ saveP(); toast('Nieuwe badge: '+nw.join(', ')); rain(70); }
  return nw;
}
function burst(x,y,n,speed){
  if(reduce) n=Math.min(n,5);
  for(var i=0;i<n;i++){ var a=Math.random()*6.283, v=(speed||3)*(.4+Math.random());
    S.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,life:1,d:.017+Math.random()*.01,col:pick(CONF),s:3+Math.random()*4,g:.12}); }
  dirty=true;
}
function rain(n){
  if(reduce) n=Math.min(n,8);
  for(var i=0;i<n;i++) S.parts.push({x:Math.random()*W,y:-10-Math.random()*H*.35,vx:(Math.random()-.5)*1.6,vy:2+Math.random()*3,life:1,d:.006,col:pick(CONF),s:4+Math.random()*4,g:.02});
  dirty=true;
}
function floatText(x,y,txt,col){ S.parts.push({x:x,y:y,vx:0,vy:-1.2,life:1,d:.016,txt:txt,col:col||'#ffd23f',g:0}); dirty=true; }
function drawParts(){
  S.parts=S.parts.filter(function(q){ return q.life>0&&q.y<H+20; });
  S.parts.forEach(function(q){
    q.x+=q.vx; q.y+=q.vy; q.vy+=q.g; q.life-=q.d;
    ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,q.life*1.4));
    if(q.txt){ ctx.font='800 22px "Plus Jakarta Sans",system-ui,sans-serif'; ctx.textAlign='center'; ctx.lineWidth=4; ctx.strokeStyle='rgba(6,16,30,.85)'; ctx.strokeText(q.txt,q.x,q.y); ctx.fillStyle=q.col; ctx.fillText(q.txt,q.x,q.y); }
    else { ctx.fillStyle=q.col; ctx.fillRect(q.x,q.y,q.s,q.s*.6); }
    ctx.restore();
  });
}
function tintList(now){
  var out=[], pulse=.75+.25*Math.sin((now||0)/380);
  function add(id,col,a){ if(byId[id]&&byId[id].kind==='ocean') out.push([id,col,a]); }
  if(S.mode==='verkennen'&&!S.review){
    visibleItems().forEach(function(it){ add(it.id,CAT_COL[it.cat],.20+.12*pulse); });
    if(S.selected) add(S.selected,CAT_COL[byId[S.selected].cat],.5);
  } else if(S.mode==='kaart'){
    visibleItems().forEach(function(it){ var s=status(it.id); add(it.id,SC[s],s==='new'?.18:.5); });
  }
  if(S.review) S.review.forEach(function(id){ add(id,'#ffd23f',.25+.2*pulse); });
  Object.keys(S.reveal).forEach(function(id){ add(id,'#ffd23f',.45); });
  return out;
}
/** Kleurt oceanen in voordat het land erover heen komt, zodat de vorm schoon blijft. */
function tintOceans(now){
  tintList(now).forEach(function(t){ ctx.beginPath(); path(G0.OCEANGEO[t[0]]); ctx.fillStyle=hexA(t[1],t[2]); ctx.fill(); });
}


/* ---------- canvas ---------- */
var stage=$('#stage'), canvas=$('#globe'), ctx=canvas.getContext('2d');
var W=800,H=600,DPR=1,baseR=250,TOP=0,VY=300,AH=600,fbSpace=0;
var projG=d3.geoOrthographic().clipAngle(90).precision(0.4), projF=d3.geoEqualEarth().rotate([1e-6,0]).precision(0.4);
var pathG=d3.geoPath(projG,ctx), pathF=d3.geoPath(projF,ctx);
var proj=projG, path=pathG, bsF=100, bwF=800, bhF=400, KMAX=8;
var SPHERE={type:'Sphere'}, GRAT=d3.geoGraticule10();
var STARS=[]; for(var s=0;s<70;s++) STARS.push([Math.random(),Math.random(),Math.random()<.2?2:1]);

function applyProj(){
  if(S.view==='globe'){ proj=projG; path=pathG; projG.translate([W/2,VY]).scale(baseR*S.k).rotate([S.rot[0],S.rot[1],0]); }
  else { proj=projF; path=pathF; clampF(); projF.scale(bsF*S.f.k).translate([W/2+S.f.tx,VY+S.f.ty]); }
}
function clampF(){
  var f=S.f, w=bwF*f.k, h=bhF*f.k;
  f.tx=w<=W?0:Math.min(w/2-W/2,Math.max(W/2-w/2,f.tx));
  f.ty=h<=AH?0:Math.min(h/2-AH/2,Math.max(AH/2-h/2,f.ty));
}
function layout(){
  var r=stage.getBoundingClientRect();
  W=Math.max(200,r.width); H=Math.max(200,r.height); DPR=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
  var pr=document.getElementById('prompt');
  TOP=(pr&&!pr.hidden)?Math.ceil(pr.offsetTop+pr.offsetHeight+4+fbSpace):0;
  AH=Math.max(160,H-TOP); VY=H-AH/2;
  baseR=Math.min(W*0.47,AH*0.44);
  projF.fitExtent([[16,TOP+16],[W-16,H-16]],SPHERE); bsF=projF.scale(); projF.translate([W/2,VY]);
  var b=pathF.bounds(SPHERE); bwF=b[1][0]-b[0][0]; bhF=b[1][1]-b[0][1];
  applyProj(); dirty=true;
}
function center(){ return [-S.rot[0],-S.rot[1]]; }
function visible(pt,extra){ if(S.view!=='globe') return true; return d3.geoDistance(center(),pt)<Math.PI/2+(extra||0); }
function curK(){ return S.view==='globe'?S.k:S.f.k; }
function tolF(){ return Math.min(2.4,Math.max(0.45,Math.pow(1/curK(),0.8))); }
/** Minimale trefzone in graden, zodat vingers op een tablet genoeg ruimte hebben (ca. 22 px). */
function minDeg(){ return 22/(proj.scale()*RAD); }

function draw(now){
  applyProj();
  var globe=S.view==='globe';
  var R=proj.scale(), cx=W/2, cy=VY, c=globe?center():[0,0], g;
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,W,H);
  if(globe){
    ctx.fillStyle='rgba(255,255,255,.5)';
    g=ctx.createRadialGradient(cx,cy,R*.96,cx,cy,R*1.16);
    g.addColorStop(0,'rgba(110,190,255,.42)'); g.addColorStop(1,'rgba(110,190,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R*1.16,0,6.3); ctx.fill();
    g=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.05,cx,cy,R*1.02);
    g.addColorStop(0,'#2f8fbf'); g.addColorStop(.45,'#1b6ba0'); g.addColorStop(.8,'#0f4a7c'); g.addColorStop(1,'#082e55');
  } else {
    var y0=cy+S.f.ty-bhF*S.f.k/2, y1=cy+S.f.ty+bhF*S.f.k/2;
    g=ctx.createLinearGradient(0,y0,0,y1);
    g.addColorStop(0,'#2b88b8'); g.addColorStop(.5,'#1b6ba0'); g.addColorStop(1,'#14588c');
  }
  ctx.fillStyle=g; ctx.beginPath(); path(SPHERE); ctx.fill();
  ctx.beginPath(); path(GRAT); ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1; ctx.stroke();
  tintOceans(now);
  /* grenzen van de oceanen */
  ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.setLineDash([Math.max(7,R*.03),Math.max(5,R*.02)]);
  G0.OCEANLINES.forEach(function(l){ ctx.beginPath(); path(l); ctx.strokeStyle='rgba(8,30,60,.55)'; ctx.lineWidth=Math.max(3,R*.009); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=Math.max(1.5,R*.0045); ctx.stroke(); });
  ctx.restore();
  /* kustwater */
  ctx.save(); ctx.lineJoin='round'; ctx.beginPath(); path(G0.LANDMULTI);
  ctx.strokeStyle='rgba(95,200,215,.20)'; ctx.lineWidth=Math.max(6,R*.05); ctx.stroke();
  ctx.strokeStyle='rgba(130,225,228,.28)'; ctx.lineWidth=Math.max(3,R*.022); ctx.stroke(); ctx.restore();
  /* land */
  ctx.beginPath(); path(G0.LANDMULTI); ctx.fillStyle='#78974f'; ctx.fill();
  ctx.save(); ctx.clip();
  G0.PATCHES.forEach(function(p){
    var pt=[p[0],p[1]], dist=globe?d3.geoDistance(c,pt):0;
    if(dist>Math.PI/2+p[2]*RAD) return;
    var xy=proj(pt), rr=R*p[2]*RAD*(0.35+0.65*Math.max(0,Math.cos(dist)))*1.25;
    var gg=ctx.createRadialGradient(xy[0],xy[1],0,xy[0],xy[1],rr);
    gg.addColorStop(0,hexA(p[3],.95)); gg.addColorStop(.6,hexA(p[3],.55)); gg.addColorStop(1,hexA(p[3],0));
    ctx.fillStyle=gg; ctx.fillRect(xy[0]-rr,xy[1]-rr,rr*2,rr*2);
  });
  ctx.beginPath(); path(G0.ICEMULTI); ctx.fillStyle='#f1f6f9'; ctx.fill();
  ctx.restore();
  ctx.beginPath(); path(G0.LANDMULTI); ctx.strokeStyle='rgba(25,50,35,.55)'; ctx.lineWidth=1; ctx.stroke();
  G0.LAKES.forEach(function(l){ ctx.beginPath(); path(l); ctx.fillStyle='#1d6fa0'; ctx.fill(); });
  /* reliëf: bergruggen */
  ctx.lineCap='round'; ctx.lineJoin='round';
  G0.RIDGEGEO.forEach(function(r){
    ctx.beginPath(); path(r); ctx.strokeStyle='rgba(98,78,58,.45)'; ctx.lineWidth=Math.max(2,R*.013); ctx.stroke();
    ctx.strokeStyle='rgba(240,232,215,.45)'; ctx.lineWidth=Math.max(.8,R*.004); ctx.stroke();
  });
  ITEMS.forEach(function(it){
    if(it.kind!=='line') return;
    if(it.cat==='Gebergtes'){
      ctx.beginPath(); path(it.geo); ctx.strokeStyle='rgba(98,78,58,.65)'; ctx.lineWidth=Math.max(3,R*.024); ctx.stroke();
      ctx.strokeStyle='rgba(245,238,222,.75)'; ctx.lineWidth=Math.max(1,R*.006); ctx.stroke();
    } else {
      ctx.beginPath(); path(it.geo); ctx.strokeStyle='#5cc0ee'; ctx.lineWidth=Math.max(1.4,R*.007); ctx.stroke();
    }
  });
  /* belichting */
  if(globe){
    g=ctx.createRadialGradient(cx-R*.3,cy-R*.35,R*.2,cx,cy,R);
    g.addColorStop(0,'rgba(255,255,255,.10)'); g.addColorStop(.6,'rgba(0,10,30,0)'); g.addColorStop(1,'rgba(0,8,26,.6)');
    ctx.fillStyle=g; ctx.beginPath(); path(SPHERE); ctx.fill();
  } else { ctx.beginPath(); path(SPHERE); ctx.strokeStyle='rgba(160,205,240,.55)'; ctx.lineWidth=1.5; ctx.stroke(); }
  drawOverlays(now,R,c);
}
function hexA(h,a){ var n=parseInt(h.slice(1),16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }

function visibleItems(){
  return ITEMS.filter(function(i){ return S.active.has(i.id)&&(S.filter==='Alles'||i.cat===S.filter); });
}
function glowItem(it,R,c,alpha,col,fill){
  col=col||CAT_COL[it.cat];
  if(it.kind==='ocean') return;
  ctx.save();
  if(it.kind==='land'){
    if(fill){ ctx.beginPath(); path(G0.LANDGEO[it.id]); ctx.fillStyle=hexA(col,.55*alpha); ctx.fill(); }
    ctx.beginPath(); path(G0.LANDGEO[it.id]); ctx.shadowColor=col; ctx.shadowBlur=18; ctx.strokeStyle=col; ctx.lineWidth=2.4; ctx.globalAlpha=Math.max(.5,alpha); ctx.stroke();
  } else {
    ctx.beginPath(); path(it.geo); ctx.shadowColor=col; ctx.shadowBlur=16; ctx.strokeStyle=col; ctx.lineWidth=Math.max(3,R*.012)*(fill?1.4:1); ctx.globalAlpha=Math.max(.5,alpha); ctx.lineCap='round'; ctx.stroke();
  }
  ctx.restore();
}
function labelItem(it,R,c,prefix){
  if(!visible(it.label,-0.12)) return;
  var xy=proj(it.label), fs=Math.max(12,Math.min(20,R*.052));
  if(xy[0]<-40||xy[0]>W+40||xy[1]<-20||xy[1]>H+20) return;
  var txt=(prefix||'')+it.name;
  ctx.save();
  ctx.font='700 '+fs+'px "Plus Jakarta Sans",system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  if(it.kind==='ocean'){ ctx.font='italic 600 '+fs+'px "Plus Jakarta Sans",system-ui,sans-serif'; try{ctx.letterSpacing='2px';}catch(e){} }
  ctx.lineWidth=5; ctx.lineJoin='round'; ctx.strokeStyle='rgba(6,16,30,.85)'; ctx.strokeText(txt,xy[0],xy[1]);
  ctx.fillStyle='#fff'; ctx.fillText(txt,xy[0],xy[1]);
  ctx.restore();
}
function drawOverlays(now,R,c){
  var pulse=.75+.25*Math.sin((now||0)/380);
  if(S.mode==='verkennen'&&!S.review){
    var vis=visibleItems();
    vis.forEach(function(it){ glowItem(it,R,c,pulse); });
    vis.forEach(function(it){ labelItem(it,R,c); });
    if(S.selected&&byId[S.selected]){ glowItem(byId[S.selected],R,c,1); }
  }
  if(S.mode==='kaart'){
    var kv=visibleItems();
    kv.forEach(function(it){ var s=status(it.id); glowItem(it,R,c,s==='new'?.45:1,SC[s],true); });
    kv.forEach(function(it){ labelItem(it,R,c,GL[status(it.id)]); });
    if(S.selected&&byId[S.selected]&&visibleItems().indexOf(byId[S.selected])>-1) glowItem(byId[S.selected],R,c,1,'#ffffff',false);
  }
  if(S.review){ S.review.forEach(function(id){ var it=byId[id]; glowItem(it,R,c,pulse,'#ffd23f'); labelItem(it,R,c); }); }
  var t=Date.now();
  Object.keys(S.reveal).forEach(function(id){
    if(S.reveal[id]<t){ delete S.reveal[id]; return; }
    glowItem(byId[id],R,c,1,'#ffd23f'); labelItem(byId[id],R,c);
  });
  S.fx=S.fx.filter(function(f){ return f.dur===Infinity||t-f.t0<f.dur; });
  S.fx.forEach(function(f){
    if(!visible(f.pt,0)) return;
    var xy=proj(f.pt), u=f.dur===Infinity?((t-f.t0)%1200)/1200:(t-f.t0)/f.dur;
    var col=f.kind==='ok'?'#3ddc97':f.kind==='bad'?'#ff7070':f.kind==='pick'?'#ffffff':'#ffd23f';
    ctx.save(); ctx.strokeStyle=col; ctx.fillStyle=col;
    if(f.kind==='pick'){ ctx.globalAlpha=1-u*.6; ctx.beginPath(); ctx.arc(xy[0],xy[1],7,0,6.3); ctx.fill(); }
    else { ctx.globalAlpha=1-u; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(xy[0],xy[1],10+u*R*(f.kind==='hint'?.16:.1),0,6.3); ctx.stroke();
      if(f.kind==='hint'){ ctx.globalAlpha=.9; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(xy[0],xy[1],14,0,6.3); ctx.stroke(); } }
    ctx.restore();
  });
  drawParts();
}
function frame(now){
  if(tw){
    if(tw.view!==S.view){ tw=null; }
    else {
      var u=Math.min(1,(now-tw.t0)/tw.ms), e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
      vset([tw.f[0]+tw.d[0]*e,tw.f[1]+tw.d[1]*e,tw.f[2]+tw.d[2]*e]); if(u>=1) tw=null; dirty=true;
    }
  }
  var anim=S.parts.length>0||S.fx.length>0||Object.keys(S.reveal).length>0||(S.mode==='verkennen'&&!S.review&&visibleItems().length>0)||!!S.review;
  if(dirty||anim){ draw(now); dirty=false; }
  requestAnimationFrame(frame);
}
function vget(){ return S.view==='globe'?[S.rot[0],S.rot[1],S.k]:[S.f.tx,S.f.ty,S.f.k]; }
function vset(v){ if(S.view==='globe'){ S.rot=[v[0],v[1]]; S.k=v[2]; } else { S.f.tx=v[0]; S.f.ty=v[1]; S.f.k=v[2]; } }
function clampK(k){ return S.view==='globe'?Math.max(.8,Math.min(7,k)):Math.max(1,Math.min(KMAX,k)); }
function tweenV(to,ms){
  var f=vget(), d=[to[0]-f[0],to[1]-f[1],to[2]-f[2]];
  if(S.view==='globe') d[0]=((to[0]-f[0]+540)%360)-180;
  tw={t0:performance.now(),ms:reduce?1:ms,f:f,d:d,view:S.view}; dirty=true;
}
/** Beweeg de kaart naar een punt; frac<1 gaat maar een deel van de weg. */
function viewTo(ll,frac,k,ms){
  k=clampK(k);
  if(S.view==='globe'){
    var cur=center(), dl=((ll[0]-cur[0]+540)%360)-180, mid=[cur[0]+dl*frac,cur[1]+(ll[1]-cur[1])*frac];
    tweenV([-mid[0],Math.max(-80,Math.min(80,-mid[1])),k],ms);
  } else {
    var p0=d3.geoEqualEarth().scale(bsF*k).translate([0,0])(ll), f=S.f, w=bwF*k, h=bhF*k;
    var tx=-p0[0], ty=-p0[1];
    tx=w<=W?0:Math.min(w/2-W/2,Math.max(W/2-w/2,tx)); ty=h<=AH?0:Math.min(h/2-AH/2,Math.max(AH/2-h/2,ty));
    tweenV([f.tx+(tx-f.tx)*frac,f.ty+(ty-f.ty)*frac,k],ms);
  }
}
function centerOn(it,k,ms){ viewTo(it.label,1,k||curK(),ms||700); }
function zoomBy(r){
  var v=vget(), k=clampK(v[2]*r);
  if(S.view==='globe') tweenV([v[0],v[1],k],250); else { var q=k/v[2]; tweenV([v[0]*q,v[1]*q,k],250); }
}
function goHome(){ tweenV(S.view==='globe'?[-15,-22,1]:[0,0,1],600); }
function zoomF(newK,mx,my){
  var f=S.f, k=clampK(newK), r=k/f.k;
  f.tx=(mx-W/2)-((mx-W/2)-f.tx)*r; f.ty=(my-VY)-((my-VY)-f.ty)*r; f.k=k; dirty=true;
}
function setK(k){ S.k=clampK(k); dirty=true; }

/* ---------- invoer ---------- */
var ptrs={}, dragMoved=0, pinch0=null;
canvas.addEventListener('pointerdown',function(e){
  canvas.setPointerCapture(e.pointerId); ptrs[e.pointerId]={x:e.offsetX,y:e.offsetY}; dragMoved=0; tw=null;
  var ids=Object.keys(ptrs); if(ids.length===2){ var a=ptrs[ids[0]],b=ptrs[ids[1]]; pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),k:curK()}; }
  canvas.classList.add('drag');
});
canvas.addEventListener('pointermove',function(e){
  var p=ptrs[e.pointerId]; if(!p) return;
  var ids=Object.keys(ptrs);
  if(ids.length===2&&pinch0){
    ptrs[e.pointerId]={x:e.offsetX,y:e.offsetY};
    var a=ptrs[ids[0]],b=ptrs[ids[1]], nk=pinch0.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch0.d;
    if(S.view==='globe') setK(nk); else zoomF(nk,(a.x+b.x)/2,(a.y+b.y)/2);
    dragMoved=99; return;
  }
  var dx=e.offsetX-p.x, dy=e.offsetY-p.y; dragMoved+=Math.abs(dx)+Math.abs(dy);
  if(S.view==='globe'){
    var deg=57.3/(baseR*S.k);
    S.rot=[S.rot[0]+dx*deg,Math.max(-85,Math.min(85,S.rot[1]-dy*deg))];
  } else { S.f.tx+=dx; S.f.ty+=dy; }
  ptrs[e.pointerId]={x:e.offsetX,y:e.offsetY}; dirty=true;
});
function endPtr(e){
  var had=ptrs[e.pointerId]; delete ptrs[e.pointerId]; pinch0=null;
  if(!Object.keys(ptrs).length) canvas.classList.remove('drag');
  if(had&&dragMoved<8&&e.type==='pointerup') onTap(e.offsetX,e.offsetY);
}
canvas.addEventListener('pointerup',endPtr); canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',function(e){
  e.preventDefault(); var f=Math.exp(-e.deltaY*.0015);
  if(S.view==='globe') setK(S.k*f); else zoomF(S.f.k*f,e.offsetX,e.offsetY);
},{passive:false});
$('#zin').onclick=function(){ zoomBy(1.4); };
$('#zout').onclick=function(){ zoomBy(1/1.4); };
$('#zhome').onclick=goHome;
/* Wissel tussen 3D-bol en platte kaart */
$('#views').addEventListener('click',function(e){
  var b=e.target.closest('button[data-view]'); if(!b) return;
  var v=b.getAttribute('data-view'); if(v===S.view) return;
  S.view=v; tw=null; ptrs={}; applyProj(); dirty=true;
  [].forEach.call(document.querySelectorAll('#views button'),function(x){ x.setAttribute('aria-pressed',String(x.getAttribute('data-view')===v)); });
});
window.addEventListener('resize',layout);
if(window.ResizeObserver) new ResizeObserver(layout).observe(stage);

/* ---------- hulpfuncties ---------- */
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }
function pool(){ return visibleItems(); }
function toast(t){ var el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){el.hidden=true;},1800); }
function qText(it){ return 'Wijs '+(it.art?'de ':'')+it.name+' aan'; }
function bearing(a,b){
  var f1=a[1]*RAD,f2=b[1]*RAD,dl=(b[0]-a[0])*RAD;
  var y=Math.sin(dl)*Math.cos(f2), x=Math.cos(f1)*Math.sin(f2)-Math.sin(f1)*Math.cos(f2)*Math.cos(dl);
  var th=(Math.atan2(y,x)/RAD+360)%360;
  return ['noorden','noordoosten','oosten','zuidoosten','zuiden','zuidwesten','westen','noordwesten'][Math.round(th/45)%8];
}
function whatIs(lon,lat){
  var all=new Set(ITEMS.map(function(i){return i.id;}));
  var it=G0.identify(lon,lat,all,tolF(),minDeg());
  if(it) return it;
  return null;
}
function ptFromEvent(x,y){
  applyProj(); var p=proj.invert([x,y]); if(!p||!isFinite(p[0])||!isFinite(p[1])) return null;
  if(S.view!=='globe'){ var q=proj(p); if(!q||Math.abs(q[0]-x)>2||Math.abs(q[1]-y)>2) return null; }
  return p;
}

/* ---------- categoriebalk ---------- */
function renderRail(){
  var rail=$('#rail'), html='';
  ['Alles'].concat(CATS).forEach(function(c){
    var n=ITEMS.filter(function(i){return S.active.has(i.id)&&(c==='Alles'||i.cat===c);}).length;
    var lock=(S.mode==='toets'&&G&&G.running);
    html+='<button data-cat="'+c+'" style="--tint:'+CAT_COL[c]+'" aria-pressed="'+(S.filter===c)+'"'+(lock?' disabled title="Tijdens de toets kun je het filter niet wisselen"':'')+'>'+CAT_ICON[c]+'<span>'+c+'</span><small>'+n+' begrippen</small></button>';
  });
  rail.innerHTML=html;
}
$('#rail').addEventListener('click',function(e){
  var b=e.target.closest('button[data-cat]'); if(!b||b.disabled) return;
  S.filter=b.getAttribute('data-cat'); S.selected=null; S.review=null; renderRail(); enterMode(S.mode,true);
});
$('#modes').addEventListener('click',function(e){
  var b=e.target.closest('button[data-mode]'); if(!b) return;
  S.review=null; enterMode(b.getAttribute('data-mode'),false);
});

/* ---------- modi ---------- */
function stopTimer(){ clearInterval(timer); timer=null; }
function hideAll(){ $('#prompt').hidden=true; fbSpace=0; if(TOP) layout(); $('#info').hidden=true; $('#center').hidden=true; }
function enterMode(m,fromFilter){
  stopTimer(); S.mode=m; S.fx=[]; S.reveal={}; G=null; hideAll(); S.selected=null; S.confirmReset=false; $('#info').classList.remove('kaart');
  [].forEach.call(document.querySelectorAll('#modes button'),function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-mode')===m)); });
  renderRail(); dirty=true;
  if(m==='verkennen') showInfoDefault();
  if(m==='kaart') showKaart();
  if(m==='oefenen') startPractice();
  if(m==='toets') showToetsSetup();
}
function filterLabel(){ return S.filter==='Alles'?'alle categorieën':S.filter; }

/* Verkennen */
function showInfoDefault(){
  var i=$('#info'); i.hidden=false;
  i.innerHTML='<div class="chip" style="background:'+CAT_COL[S.filter]+'">'+filterLabel()+'</div><p>Draai de wereld met je vinger. Tik op een gekleurd gebied of een naam om er meer over te lezen.</p>';
}
function showInfo(it){
  var i=$('#info'); i.hidden=false;
  i.innerHTML='<div class="chip" style="background:'+CAT_COL[it.cat]+'">'+it.cat.replace(/s$/,'')+'</div><h2>'+it.name+'</h2><p>'+it.fact+'</p><div class="btns"><button class="btn sm" data-act="closeinfo">Sluiten</button></div>';
}


/* Mijn kaart */
function showKaart(){
  var vis=visibleItems(), k=[],hd=[],nw=[];
  vis.forEach(function(i){ var s=status(i.id); (s==='known'?k:s==='hard'?hd:nw).push(i); });
  var i=$('#info'); i.hidden=false; i.classList.add('kaart');
  var sel=S.selected&&byId[S.selected], lab={known:'ken je',hard:'is nog lastig',new:'is nog niet geoefend'};
  var html='<div class="legend"><span><i style="background:'+SC.known+'"></i>'+k.length+' ken ik</span><span><i style="background:'+SC.hard+'"></i>'+hd.length+' lastig</span><span><i style="background:'+SC.new+'"></i>'+nw.length+' nog niet geoefend</span></div>';
  if(sel&&vis.indexOf(sel)>-1) html+='<p><strong>'+sel.name+'</strong> '+lab[status(sel.id)]+'.</p>';
  else html+='<p>'+(hd.length?'Oranje begrippen zijn nog lastig. Oefen ze, dan worden ze groen.':(k.length===vis.length?'Alles groen. Wat een kenner!':'Groen ken je al. Grijs heb je nog niet geoefend.'))+'</p>';
  if(hd.length) html+='<div class="chips">'+hd.map(function(x){return '<button class="chip2" data-act="goto" data-id="'+x.id+'">'+x.name+'</button>';}).join('')+'</div>';
  var earned=BADGES.filter(function(b){return P.badges[b.id];}).length;
  html+='<div class="badges"><span class="bl">Badges '+earned+'/'+BADGES.length+'</span>'+BADGES.map(function(b){return '<span class="bdg'+(P.badges[b.id]?' on':'')+'" title="'+b.desc+'">'+b.name+'</span>';}).join('')+'</div>';
  html+='<div class="btns">'+(hd.length?'<button class="btn cta sm" data-act="trainhard">Oefen lastige begrippen</button>':'<button class="btn cta sm" data-act="gotoets">Doe de toets</button>')+
    '<button class="btn sm'+(S.confirmReset?' danger':'')+'" data-act="reset">'+(S.confirmReset?'Zeker weten? Wis alles':'Wis voortgang')+'</button></div>';
  i.innerHTML=html;
}
function hardIds(){ return visibleItems().filter(function(i){return status(i.id)==='hard';}).map(function(i){return i.id;}); }
/** Start oefenen met een vaste lijst begrippen. */
function switchToPractice(ids){
  S.mode='oefenen'; S.review=null; S.selected=null; $('#info').classList.remove('kaart');
  [].forEach.call(document.querySelectorAll('#modes button'),function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-mode')==='oefenen'));});
  $('#center').hidden=true; startPractice(ids); renderRail();
}

/* Oefenen */
function smartOrder(ids){
  var g={hard:[],new:[],known:[]}; ids.forEach(function(id){ g[status(id)].push(id); });
  return shuffle(g.hard).concat(shuffle(g.new),shuffle(g.known));
}
function startPractice(ids){
  stopTimer();
  var list=ids?ids.filter(function(id){return S.active.has(id);}):pool().map(function(i){return i.id;});
  G={mode:'oefenen',queue:ids?shuffle(list):smartOrder(list),i:0,attempts:0,score:0,locked:false,streak:0,fb:'',fbc:''};
  S.review=null; $('#center').hidden=true; $('#info').hidden=true; nextQuestion(true);
}
function curItem(){ return byId[G.queue[G.i]]; }
function nextQuestion(first){
  if(G.i>=G.queue.length){ practiceDone(); return; }
  G.attempts=0; G.locked=false; G.fb=first?(G.queue.some(function(id){return status(id)==='hard';})?'Lastige begrippen komen eerst. Succes!':'Succes! Tik op de kaart.'):''; G.fbc=''; S.fx=[]; S.reveal={};
  renderPrompt(); dirty=true;
}
function renderPrompt(){
  var p=$('#prompt'); p.hidden=false;
  var it=curItem(), n=G.queue.length;
  if(G.mode==='oefenen'){
    p.innerHTML='<div class="row"><span><span class="long">Oefenen · '+filterLabel()+' · vraag '+(G.i+1)+' van '+n+'</span><span class="short">Oefenen '+(G.i+1)+'/'+n+'</span></span><span>'+G.score+' punten'+(G.streak>=2?' · reeks '+G.streak:'')+'</span></div>'+
      '<div class="q">'+qText(it)+'</div><div class="fb '+G.fbc+'">'+G.fb+'</div>'+
      '<div class="acts"><button class="btn sm" data-act="skip">Sla over</button><button class="btn sm" data-act="stop">Stoppen</button></div>';
  } else {
    p.innerHTML='<div class="row"><span><span class="long">Toets · '+filterLabel()+' · vraag '+(G.i+1)+' van '+n+'</span><span class="short">Toets '+(G.i+1)+'/'+n+'</span></span><span>'+(G.limit?'<span id="tl">'+G.limit+'</span> s':'Geen tijdslimiet')+'</span></div>'+
      '<div class="q">'+qText(it)+'</div>'+(G.limit?'<div class="bar"><i id="tbar"></i></div>':'')+'<div class="fb">'+G.fb+'</div>';
  }
  var key=G.mode+':'+G.i+':'+n;
  if(key!==renderPrompt.key||!TOP){ renderPrompt.key=key; fbSpace=(p.querySelector('.fb')&&p.querySelector('.fb').textContent)?0:28; layout(); }
}
function onTapPractice(lon,lat){
  if(G.locked) return;
  var it=curItem(), f=tolF();
  if(G0.isHit(it,lon,lat,f,minDeg())){
    var pts=[3,2,1,0][Math.min(G.attempts,3)]; G.score+=pts; var first=G.attempts===0; if(first) G.streak++; else G.streak=0;
    record(it.id,first); if(G.streak>P.best){ P.best=G.streak; saveP(); }
    var bxy=proj([lon,lat]); if(bxy){ burst(bxy[0],bxy[1],first?28:12,first?3.6:2.6); floatText(bxy[0],bxy[1]-16,'+'+pts); }
    if(G.streak>0&&G.streak%5===0){ rain(60); toast('Reeks van '+G.streak+'!'); }
    G.locked=true; S.fx=[{pt:[lon,lat],kind:'ok',t0:Date.now(),dur:900}]; S.reveal[it.id]=Date.now()+1900;
    var praise=pick(['Top!','Goed gedaan!','Precies goed!','Sterk bezig!','Yes, dat klopt!']);
    G.fb=praise+(G.streak>=3?' Al '+G.streak+' goed achter elkaar.':'')+(pts<3?' ('+pts+' punt'+(pts===1?'':'en')+')':' (3 punten)');
    G.fbc='ok'; G.attempts=0; checkBadges(); renderPrompt(); dirty=true;
    setTimeout(function(){ if(G&&G.mode==='oefenen'){ G.i++; nextQuestion(); } },1800);
    return;
  }
  G.attempts++; G.streak=0;
  S.fx=[{pt:[lon,lat],kind:'bad',t0:Date.now(),dur:700}];
  var clicked=whatIs(lon,lat), name=clicked?(clicked.art?'de ':'')+clicked.name:'open water of een andere plek';
  if(G.attempts===1){
    G.fb='Nog niet. Dat was '+name+'. Zoek meer naar het '+bearing([lon,lat],it.label)+'.';
  } else if(G.attempts===2){
    G.fb='De kaart draait mee. Je kunt het!';
    viewTo(it.label,.6,Math.min(curK()*1.25,4),900);
  } else if(G.attempts===3){
    G.fb='Zie je de gloed? Tik erop!';
    S.fx.push({pt:it.label,kind:'hint',t0:Date.now(),dur:Infinity}); centerOn(it,Math.min(Math.max(curK(),1.3),3),800);
  } else {
    record(it.id,false); G.locked=true; G.fb='Dat was lastig. Dit is '+(it.art?'de ':'')+it.name+'. Die onthoud je vast!'; G.fbc='';
    S.fx=[]; S.reveal[it.id]=Date.now()+3200; centerOn(it,Math.min(Math.max(curK(),1.3),3),800);
    setTimeout(function(){ if(G&&G.mode==='oefenen'){ G.i++; nextQuestion(); } },3400);
  }
  G.fbc=G.attempts>=4?'':'bad'; renderPrompt(); dirty=true;
}
function practiceDone(){
  $('#prompt').hidden=true; S.fx=[]; var c=$('#center'); c.hidden=false;
  var max=G.queue.length*3, pct=max?Math.round(G.score/max*100):0;
  var stars=pct>=85?3:pct>=60?2:1, hd=hardIds().length; if(pct>=60) rain(pct>=85?90:50);
  c.innerHTML='<h2>Klaar met oefenen!</h2><div class="stars" aria-label="'+stars+' van 3 sterren">'+'\u2605'.repeat(stars)+'<span>'+'\u2605'.repeat(3-stars)+'</span></div><div class="big">'+G.score+'<small> van '+max+' punten</small></div><p>'+(pct>=80?'Wat een kenner. Je bent klaar voor de toets.':pct>=50?'Goed bezig. Nog een rondje maakt je nog sterker.':'Oefening baart kunst. Probeer het nog een keer, het gaat steeds beter.')+'</p><div class="btns">'+(hd?'<button class="btn cta" data-act="trainhard">Oefen lastige begrippen ('+hd+')</button><button class="btn" data-act="again">Nog een keer</button>':'<button class="btn cta" data-act="again">Nog een keer</button>')+'<button class="btn" data-act="gotoets">Doe de toets</button><button class="btn" data-act="kaart">Mijn kaart</button></div>';
}

/* Toets */
var timeChoice=0;
function showToetsSetup(){
  var c=$('#center'); c.hidden=false; $('#prompt').hidden=true;
  var n=pool().length;
  c.innerHTML='<h2>Toets</h2><p>'+n+' vragen over '+filterLabel()+'. Je hebt één kans per vraag en krijgt geen hints. Na afloop zie je precies wat je nog moet oefenen.</p>'+
    '<div><strong>Tijd per vraag</strong><div class="seg" id="seg" style="margin-top:8px">'+[0,10,20,30].map(function(t){return '<button data-t="'+t+'" aria-pressed="'+(timeChoice===t)+'">'+(t?t+' s':'Uit')+'</button>';}).join('')+'</div></div>'+
    '<div class="btns"><button class="btn cta" data-act="starttoets">Start de toets</button></div>';
}
function startToets(){
  G={mode:'toets',queue:shuffle(pool().map(function(i){return i.id;})),i:0,answers:[],limit:timeChoice,running:true,locked:false,fb:'',t0:0};
  S.review=null; $('#center').hidden=true; renderRail(); toetsQuestion();
}
function toetsQuestion(){
  if(G.i>=G.queue.length){ finishToets(); return; }
  G.locked=false; G.fb=''; S.fx=[]; S.reveal={}; G.t0=Date.now(); renderPrompt(); dirty=true;
  stopTimer();
  if(G.limit){
    var bar=$('#tbar'), tl=$('#tl');
    timer=setInterval(function(){
      var left=G.limit*1000-(Date.now()-G.t0), u=Math.max(0,left/(G.limit*1000));
      if(bar) bar.style.transform='scaleX('+u+')'; if(tl) tl.textContent=Math.ceil(left/1000);
      if(left<=0){ stopTimer(); answerToets(null,null); }
    },100);
  }
}
function onTapToets(lon,lat){ if(G.locked) return; answerToets(lon,lat); }
function answerToets(lon,lat){
  if(!G||G.locked) return; G.locked=true; stopTimer();
  var it=curItem(), ok=false, clicked=null;
  if(lon!==null){ ok=G0.isHit(it,lon,lat,tolF(),minDeg()); var w=whatIs(lon,lat); clicked=w?w.name:'open water of een andere plek'; S.fx=[{pt:[lon,lat],kind:'pick',t0:Date.now(),dur:450}]; G.fb='Antwoord genoteerd.'; }
  else { G.fb='De tijd is om.'; clicked='geen antwoord'; }
  G.answers.push({id:it.id,ok:ok,clicked:clicked}); record(it.id,ok); renderPrompt(); dirty=true;
  setTimeout(function(){ if(G&&G.mode==='toets'){ G.i++; toetsQuestion(); } },lon!==null?500:900);
}
function finishToets(){
  G.running=false; stopTimer(); $('#prompt').hidden=true; S.fx=[]; renderRail();
  var A=G.answers, okn=A.filter(function(a){return a.ok;}).length;
  if(A.length>=5&&okn===A.length){ P.flags.foutloos=true; saveP(); }
  if(A.length&&okn/A.length>=.9) rain(90); else if(A.length&&okn/A.length>=.7) rain(40);
  checkBadges(); showReport();
}
function showReport(){
  var c=$('#center'); c.hidden=false; $('#prompt').hidden=true;
  var A=G.answers, ok=A.filter(function(a){return a.ok;}).length, n=A.length, pct=n?Math.round(ok/n*100):0;
  var msg=pct>=90?'Geweldig! Je kent de wereld op je duimpje.':pct>=70?'Goed bezig! Nog een paar gebieden en je bent er.':pct>=50?'Je bent op de goede weg. Met wat oefenen haal je het.':'Dit is een begin. Oefen de gebieden hieronder, dan gaat het de volgende keer beter.';
  var bars=CATS.map(function(cat){
    var xs=A.filter(function(a){return byId[a.id].cat===cat;}); if(!xs.length) return '';
    var g=xs.filter(function(a){return a.ok;}).length;
    return '<div class="catbar"><span>'+cat+'</span><div class="t"><i style="width:'+(g/xs.length*100)+'%;background:'+CAT_COL[cat]+'"></i></div><span>'+g+'/'+xs.length+'</span></div>';
  }).join('');
  var rows=A.map(function(a){ var it=byId[a.id];
    return '<div class="rowi '+(a.ok?'ok':'no')+'"><span class="m">'+(a.ok?'✓':'✗')+'</span><span>'+it.name+'</span><em>'+(a.ok?'':'jij: '+a.clicked)+'</em></div>'; }).join('');
  G.wrong=A.filter(function(a){return !a.ok;}).map(function(a){return a.id;});
  c.innerHTML='<h2>Je rapport</h2><div class="big">'+ok+'<small> van '+n+' goed ('+pct+'%)</small></div><p>'+msg+'</p><div class="catbars">'+bars+'</div>'+
    (G.wrong.length?'<div><strong>Extra aandacht voor:</strong> '+G.wrong.map(function(id){return byId[id].name;}).join(', ')+'</div>':'')+
    '<div class="rows">'+rows+'</div><div class="btns">'+
    (G.wrong.length?'<button class="btn cta" data-act="trainwrong">Oefen de fouten</button><button class="btn" data-act="showwrong">Zie ze op de kaart</button>':'')+
    '<button class="btn" data-act="starttoets">Opnieuw</button><button class="btn" data-act="kaart">Mijn kaart</button></div>';
}

/* ---------- tikken op de kaart ---------- */
function onTap(x,y){
  var p=ptFromEvent(x,y); if(!p) return;
  var lon=p[0], lat=p[1];
  if(S.mode==='verkennen'){
    if(S.review) return;
    var allowed=new Set(visibleItems().map(function(i){return i.id;}));
    var it=G0.identify(lon,lat,allowed,tolF(),minDeg());
    if(it){ S.selected=it.id; showInfo(it); centerOn(it,Math.max(curK(),1.2),600); }
    else { S.selected=null; showInfoDefault(); toast('Daar staat niets van jouw lijst'); }
    dirty=true; return;
  }
  if(S.mode==='kaart'){
    var kal=new Set(visibleItems().map(function(i){return i.id;})), kit=G0.identify(lon,lat,kal,tolF(),minDeg());
    S.selected=kit?kit.id:null; showKaart(); dirty=true; return;
  }
  if(!G) return;
  if(G.mode==='oefenen') onTapPractice(lon,lat); else if(G.mode==='toets'&&G.running) onTapToets(lon,lat);
}

/* ---------- knoppen op de kaarten ---------- */
stage.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]'); if(!b) return;
  var a=b.getAttribute('data-act');
  if(a==='closeinfo'){ S.selected=null; showInfoDefault(); dirty=true; }
  else if(a==='skip'){ if(G&&!G.locked){ G.locked=true; var it=curItem(); record(it.id,false); G.fb='Dit is '+(it.art?'de ':'')+it.name+'.'; S.reveal[it.id]=Date.now()+2600; centerOn(it,Math.max(curK(),1.3),800); renderPrompt(); setTimeout(function(){ if(G&&G.mode==='oefenen'){ G.i++; nextQuestion(); } },2700); } }
  else if(a==='stop'||a==='goverkennen') enterMode('verkennen');
  else if(a==='again') startPractice();
  else if(a==='gotoets') enterMode('toets');
  else if(a==='starttoets') startToets();
  else if(a==='kaart') enterMode('kaart');
  else if(a==='goto'){ var gi=byId[b.getAttribute('data-id')]; S.selected=gi.id; showKaart(); centerOn(gi,Math.max(curK(),1.2),600); dirty=true; }
  else if(a==='trainhard'){ var hid=hardIds(); if(hid.length) switchToPractice(hid); }
  else if(a==='reset'){ if(!S.confirmReset){ S.confirmReset=true; } else { P={items:{},badges:{},best:0,flags:{}}; saveP(); S.confirmReset=false; S.selected=null; toast('Voortgang gewist'); dirty=true; } showKaart(); }
  else if(a==='trainwrong'){ var w=G.wrong; S.mode='oefenen'; [].forEach.call(document.querySelectorAll('#modes button'),function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-mode')==='oefenen'));}); $('#center').hidden=true; S.review=null; startPractice(w); renderRail(); }
  else if(a==='showwrong'){ S.review=new Set(G.wrong); $('#center').hidden=true; var p=$('#prompt'); p.hidden=false; p.innerHTML='<div class="q">Hier moet je nog op letten</div><div class="fb">Gekleurde gebieden zijn de vragen die je fout had. Tik niet, kijk goed en onthoud ze.</div><div class="acts"><button class="btn sm" data-act="backreport">Terug naar rapport</button></div>'; dirty=true; goHome(); }
  else if(a==='backreport'){ S.review=null; showReport(); dirty=true; }
});
stage.addEventListener('click',function(e){
  var b=e.target.closest('#seg button'); if(!b) return;
  timeChoice=parseInt(b.getAttribute('data-t'),10); showToetsSetup();
});


/* ---------- start ---------- */
loadP(); renderRail(); layout(); showInfoDefault();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){dirty=true;});
requestAnimationFrame(frame);
})();

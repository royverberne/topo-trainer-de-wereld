
/**
 * GEO: alle kaartgegevens en treflogica, los van het scherm.
 * Coördinaten zijn [lengtegraad, breedtegraad] en bewust grof: genoeg voor groep 8.
 */
var GEO=(function(){
  var RAD=Math.PI/180;

  /** Maakt een sferische polygoon met de goede windrichting voor d3. */
  function poly(ring){
    var r=ring.slice(); r.push(r[0]);
    var f={type:'Polygon',coordinates:[r]};
    if(d3.geoArea(f)>2*Math.PI){ r.reverse(); f={type:'Polygon',coordinates:[r]}; }
    return f;
  }

  var WORLD=(typeof window!=='undefined'&&window.WORLD)||WORLD_DATA;
  var LANDIDS=Object.keys(WORLD.land), LANDP={}, LANDBOX={}, LANDGEO={};
  LANDIDS.forEach(function(id){
    LANDP[id]=WORLD.land[id].map(function(c){return {type:'Polygon',coordinates:c};});
    LANDBOX[id]=WORLD.land[id].map(function(c){ var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; c[0].forEach(function(q){ if(q[0]<x0)x0=q[0]; if(q[0]>x1)x1=q[0]; if(q[1]<y0)y0=q[1]; if(q[1]>y1)y1=q[1]; }); return [x0,y0,x1,y1]; });
    LANDGEO[id]={type:'MultiPolygon',coordinates:WORLD.land[id]};
  });
  var allCoords=[]; LANDIDS.forEach(function(id){ allCoords=allCoords.concat(WORLD.land[id]); });
  var LANDMULTI={type:'MultiPolygon',coordinates:allCoords};
  var ICEMULTI={type:'MultiPolygon',coordinates:WORLD.land['antarctica'].concat(WORLD.greenland)};
  var LAKES=[];
  /** Punten langs een parallel of meridiaan, zodat grote cirkels de grens niet verbuigen. */
  function par(lat,a,b){ var o=[],s=a<=b?1:-1,l=a; while(s>0?l<b:l>b){ o.push([l,lat]); l+=s*10; } o.push([b,lat]); return o; }
  function mer(lon,a,b){ var o=[],s=a<=b?1:-1,l=a; while(s>0?l<b:l>b){ o.push([lon,l]); l+=s*10; } o.push([lon,b]); return o; }
  var cat=function(){ var o=[]; for(var i=0;i<arguments.length;i++) o=o.concat(arguments[i]); return o; };
  /** Randzeeën zonder eigen naam in dit werkblad: tikken hierop telt nergens voor. */
  var NULLSEAS=[
    poly([[-5.6,35.8],[-5.6,36.4],[-3,41],[4,44.5],[12,46],[20,45],[27,41.5],[30,41],[37,38],[37,31],[32,30],[25,30],[10,30],[-5,34]]),
    poly([[27.5,41],[27.5,44],[30,46.5],[34,46.6],[38,47.5],[41.5,44],[42,41.5],[36,41],[31,41.2]]),
    poly([[46,45],[53,47],[55,41],[54,37],[49.5,37],[48,41]]),
    poly([[32.4,30.2],[35.2,28.5],[38,24],[41.5,18],[44,13.5],[43.5,12.3],[42.8,12.7],[39,15],[36.5,20],[33.5,26],[32.2,29.5]]),
    poly([[47.8,29.8],[50.2,30.3],[54,27.8],[57,27],[56.6,25.9],[54.5,24],[51.2,24],[50.6,25.8],[49.2,27],[47.9,28.8]]),
    poly([[10.5,53.5],[10.5,57.8],[13,59],[16,60.5],[17.5,66],[26,66],[31,60.5],[31,53.5]]),
    poly([[105,-6.5],[116,-8.8],[131,-8.8],[141,-9.5],[141,2],[128,6.5],[119,5.5],[115,5.5],[111,3],[109,1],[104,1.5]])
  ];
  var OCEANGEO={
    'noordelijke-ijszee':poly(cat([[-170,66]],par(66,-170,-100),[[-80,70]],par(70,-75,20),[[20,68]],par(68,20,28),[[32,64],[46,64]],par(66,46,165),par(66,165,190))),
    'zuidelijke-ijszee':poly(par(-60,-180,180)),
    'noordzee':poly([[1.4,51.0],[-1.5,53],[-2,55.8],[-3.5,58.7],[-1,61],[5,61.2],[8.5,60],[10.3,59],[10.6,57.9],[9.5,57.2],[9,55],[8,53.4],[5,53.0],[4.6,52.1],[4.0,51.5],[3.6,51.1],[2.6,50.9],[1.9,50.8]]),
    'atlantische-oceaan':poly(cat(par(70,-75,20),[[10,63],[6,61.4],[-1,61],[-3.5,58.7],[-4,57],[-3,55],[-2,53],[-1,51.5],[1.6,51.0],[2.4,50.6],[2,49],[0,47],[-2,41],[-5.6,36.1],[-5.5,35.6],[-4,33],[2,20],[8,9],[12,2],[14,-8],[17,-17],[19,-27],[20,-34.8]],mer(20,-35,-60),par(-60,20,-68),[[-68,-56],[-67,-42],[-66,-22],[-70,-8],[-75,0],[-75,6],[-77.5,8.5],[-80,8.6],[-83,9.5],[-84.5,11],[-87,13],[-90,15],[-95,17],[-100,17.5]],mer(-100,17.5,66),[[-80,70]])),
    'indische-oceaan':poly(cat(mer(20,-35,-60),par(-60,20,147),mer(147,-60,-20),[[142,-10.5],[141,-9.5],[131,-8.8],[116,-8.8],[105,-6.5],[101,-1.5],[99,3],[99,10.5],[98.5,13],[98,16],[96,22],[92,24],[85,25],[78,25],[70,26],[62,27],[57.5,27.3],[56.2,24],[54,21],[49,16],[44,16],[42.8,11.8],[38,8],[34,-5],[33,-20],[28,-32],[21,-33.5]])),
    'grote-of-stille-oceaan':poly(cat([[-95,17],[-100,17.5],[-104,20],[-106,26],[-108,30],[-112,34],[-118,38],[-120,48],[-123,52],[-130,57],[-140,60],[-150,63],[-157,65.5],[-155,66.2]],par(66.2,-155,-195),[[165,62],[150,62],[140,60.5],[135,56],[134,50],[131,46],[129,44],[126,42],[121.5,41.5],[118,41],[115,38],[116,34],[115,30],[112,26],[110,22.5],[106.5,21],[105,16],[104,12.5],[102,15],[99.5,14],[99,11],[100.5,6],[101.8,3],[103.6,1.6],[104,1.5],[109,1],[111,3],[115,5.5],[119,5.5],[128,6.5],[141,2],[141,-9.5],[142,-10.5],[147,-20]],mer(147,-20,-60),par(-60,147,292),[[-68,-56],[-67,-42],[-66,-22],[-70,-8],[-75,0],[-75,6],[-77.5,8.5],[-80,8.6],[-83,9.5],[-84.5,11],[-87,13],[-90,15]]))
  };
  var OCEANLINES=Object.keys(OCEANGEO).map(function(k){ return {type:'LineString',coordinates:OCEANGEO[k].coordinates[0]}; });
  var OCEAN_ORDER=['zuidelijke-ijszee','noordelijke-ijszee','noordzee','atlantische-oceaan','indische-oceaan','grote-of-stille-oceaan'];

  /** Decoratieve bergruggen en kleurvlekken voor een natuurlijker uiterlijk. */
  var RIDGES=[
    [[-84,34],[-80,38],[-75,41],[-70,45]], [[59,52],[60,60],[64,66]], [[38,44],[42,42.8],[47,41.5]],
    [[-9,31],[-4,33],[2,35],[9,36.5]], [[6,59.5],[8,62],[14,66],[20,69]], [[145,-16],[148,-25],[150,-34],[147,-37.5]],
    [[36,12],[39,8],[37,3]], [[100,36],[96,32],[100,28]]
  ];
  var D='#d9bf86',S='#b5a560',F='#4a8148',B='#456d46',T='#a7b19a',RF='#2a6a3a';
  var PATCHES=[
    [10,24,16,D],[-5,22,12,D],[25,24,12,D],[46,24,10,D],[62,38,9,S],[102,42,11,D],[134,-25,16,D],[125,-24,10,D],[22,-23,8,S],[5,13,10,S],[30,10,10,S],[-70,-24,4,D],[-69,-44,7,S],
    [-100,40,10,S],[-112,38,7,D],[-105,28,6,D],[78,22,8,S],[-48,-18,8,S],[-60,-32,8,F],
    [-62,-5,12,RF],[22,0,9,RF],[113,0,5,RF],[103,-1,3,RF],[137,-5,4,RF],[102,16,6,F],[-85,13,3,RF],[47,-19,3,F],
    [-85,36,9,F],[10,50,9,F],[25,52,9,F],[112,30,8,F],
    [-100,57,14,B],[-125,60,6,B],[95,62,20,B],[60,60,10,B],[18,63,5,B],
    [-100,70,10,T],[100,72,12,T],[60,68,6,T],[-20,66,3,T]
  ];

  var PICKS=function(a){return a;};
  var ITEMS=[
    {id:'noord-amerika',name:'Noord-Amerika',cat:'Werelddelen',kind:'land',art:'',label:[-100,45],alias:['noord amerika','noordamerika','north america'],fact:'Het op twee na grootste werelddeel. Hier liggen onder andere Canada, de Verenigde Staten en Mexico.'},
    {id:'zuid-amerika',name:'Zuid-Amerika',cat:'Werelddelen',kind:'land',art:'',label:[-60,-12],alias:['zuid amerika','zuidamerika','south america'],fact:'Hier stroomt de Amazone en liggen de Andes. Brazilië is het grootste land.'},
    {id:'europa',name:'Europa',cat:'Werelddelen',kind:'land',art:'',label:[15,50],alias:['europa','europe'],fact:'Ons eigen werelddeel. Het is klein, maar er wonen ruim 700 miljoen mensen.'},
    {id:'afrika',name:'Afrika',cat:'Werelddelen',kind:'land',art:'',label:[20,4],alias:['afrika','africa'],fact:'Het op een na grootste werelddeel. De Nijl en de Sahara liggen hier.'},
    {id:'azie',name:'Azië',cat:'Werelddelen',kind:'land',art:'',label:[90,48],alias:['azie','asia'],fact:'Het grootste werelddeel, met de meeste mensen. De Himalaya ligt hier.'},
    {id:'oceanie',name:'Oceanië',cat:'Werelddelen',kind:'land',art:'',label:[134,-25],alias:['oceanie','australie','oceania'],fact:'Hieronder vallen Australië, Nieuw-Zeeland en heel veel eilanden in de Grote Oceaan.'},
    {id:'antarctica',name:'Antarctica',cat:'Werelddelen',kind:'land',art:'',label:[30,-80],alias:['antarctica','zuidpool'],fact:'Het koudste werelddeel, bijna helemaal bedekt met ijs. Er wonen geen vaste bewoners.'},
    {id:'noordelijke-ijszee',name:'Noordelijke IJszee',cat:'Wateren',kind:'ocean',art:'de',gr:14,label:[-150,82],alias:['noordelijke ijszee','noordelijke ijsoceaan','arctische oceaan'],fact:'De kleinste en ondiepste oceaan, rond de Noordpool. Een groot deel is bevroren.'},
    {id:'grote-of-stille-oceaan',name:'Grote of Stille Oceaan',cat:'Wateren',kind:'ocean',art:'de',gr:30,label:[-150,5],alias:['grote of stille oceaan','stille oceaan','grote oceaan','pacific'],fact:'De grootste en diepste oceaan van de wereld. Hij beslaat bijna de helft van al het water op aarde.'},
    {id:'atlantische-oceaan',name:'Atlantische Oceaan',cat:'Wateren',kind:'ocean',art:'de',gr:17,label:[-35,15],alias:['atlantische oceaan','atlantische','atlantic'],fact:'Ligt tussen Amerika aan de ene kant en Europa en Afrika aan de andere kant.'},
    {id:'noordzee',name:'Noordzee',cat:'Wateren',kind:'ocean',art:'de',gr:4.5,label:[3,56],alias:['noordzee','noord zee'],fact:'De zee voor onze eigen kust, tussen Nederland en Engeland.'},
    {id:'indische-oceaan',name:'Indische Oceaan',cat:'Wateren',kind:'ocean',art:'de',gr:17,label:[80,-20],alias:['indische oceaan','indische'],fact:'Ligt tussen Afrika, Azië en Australië. Het is de op twee na grootste oceaan.'},
    {id:'zuidelijke-ijszee',name:'Zuidelijke IJszee',cat:'Wateren',kind:'ocean',art:'de',gr:12,label:[-100,-66],alias:['zuidelijke ijszee','zuidelijke oceaan'],fact:'De oceaan rondom Antarctica. Het water is ijskoud.'},
    {id:'amazone',name:'Amazone',cat:'Wateren',kind:'line',art:'de',tol:3,label:[-62,-3.3],line:[[-79,-5],[-73,-4],[-67,-3],[-60,-3.3],[-55,-2],[-50,-1.5]],alias:['amazone','amazonerivier','amazon'],fact:'Een rivier door Zuid-Amerika met meer water dan welke rivier ook ter wereld.'},
    {id:'nijl',name:'Nijl',cat:'Wateren',kind:'line',art:'de',tol:3,label:[32.7,24],line:[[31,31.5],[31.2,27],[32.7,24],[32.5,19],[33.5,15.6],[32.5,13],[31.5,9],[31,5],[32,2]],alias:['nijl','nile'],fact:'Een van de langste rivieren ter wereld, ruim 6.500 kilometer. Hij stroomt door onder andere Egypte.'},
    {id:'ganges',name:'Ganges',cat:'Wateren',kind:'line',art:'de',tol:2.6,label:[83,25.5],line:[[78.5,30.5],[79.5,27],[81,26],[83,25.5],[85,25.5],[87.5,24.5],[89,23.5],[90.5,23]],alias:['ganges'],fact:'Een heilige rivier voor hindoes. Hij begint in de Himalaya en stroomt door India en Bangladesh.'},
    {id:'rocky-mountains',name:'Rocky Mountains',cat:'Gebergtes',kind:'line',art:'de',tol:4,label:[-112,47],line:[[-118,58],[-120,52],[-113,48],[-110,42],[-107,37],[-106,33]],alias:['rocky mountains','rockies','rocky'],fact:'Een lang gebergte in het westen van Noord-Amerika, door Canada en de Verenigde Staten.'},
    {id:'andes',name:'Andes',cat:'Gebergtes',kind:'line',art:'de',tol:4,label:[-72,-15],line:[[-72,10],[-75,5],[-78,-2],[-77,-10],[-72,-15],[-69,-22],[-70,-30],[-71,-40],[-73,-50]],alias:['andes'],fact:'Het langste gebergte op het land, ruim 7.000 kilometer langs de westkant van Zuid-Amerika.'},
    {id:'alpen',name:'Alpen',cat:'Gebergtes',kind:'line',art:'de',tol:3,label:[10,46.6],line:[[6.5,44.2],[7,46],[9,46.5],[12,46.8],[14.5,47],[16,48]],alias:['alpen','alps'],fact:'Een gebergte in onder andere Zwitserland, Oostenrijk en Frankrijk. Hier ga je skiën.'},
    {id:'himalaya',name:'Himalaya',cat:'Gebergtes',kind:'line',art:'de',tol:3.5,label:[85,28.5],line:[[73,36],[77,34.5],[81,30],[85,28],[89,27.7],[92,28],[95,29]],alias:['himalaya','himalaja'],fact:'Het hoogste gebergte ter wereld, met de Mount Everest van 8.849 meter.'}
  ];
  var byId={}; ITEMS.forEach(function(it){ byId[it.id]=it; });

  function densify(c){
    var out=[c[0]];
    for(var i=1;i<c.length;i++){
      var a=c[i-1],b=c[i],d=d3.geoDistance(a,b),n=Math.max(1,Math.ceil(d/0.01)),ip=d3.geoInterpolate(a,b);
      for(var j=1;j<=n;j++) out.push(ip(j/n));
    }
    return out;
  }
  ITEMS.forEach(function(it){
    if(it.kind==='line'){
      it.pts=densify(it.line);
      it.geo={type:'LineString',coordinates:it.line};
      it.dist=function(lon,lat){ var m=1e9,q=[lon,lat]; for(var i=0;i<it.pts.length;i++){ var d=d3.geoDistance(it.pts[i],q); if(d<m)m=d; } return m/RAD; };
    }
  });
  var RIDGEGEO=RIDGES.map(function(r){return {type:'LineString',coordinates:r};});

  function inLake(p){ for(var i=0;i<LAKES.length;i++){ if(d3.geoContains(LAKES[i],p)) return true; } return false; }
  /** Welk werelddeel ligt op dit punt? (null = water) */
  function landAt(lon,lat){
    var p=[lon,lat];
    for(var i=0;i<LANDIDS.length;i++){
      var id=LANDIDS[i], ps=LANDP[id], bx=LANDBOX[id];
      for(var j=0;j<ps.length;j++){
        var b=bx[j]; if(lat<b[1]||lat>b[3]) continue; if(!((lon>=b[0]&&lon<=b[2])||(lon+360>=b[0]&&lon+360<=b[2]))) continue;
        if(d3.geoContains(ps[j],p)) return id;
      }
    }
    return null;
  }
  /** Welke oceaan of zee ligt op dit (waterige) punt? (null = andere zee) */
  function oceanAt(lon,lat){
    var p=[lon,lat], i;
    for(i=0;i<NULLSEAS.length;i++){ if(d3.geoContains(NULLSEAS[i],p)) return null; }
    for(i=0;i<OCEAN_ORDER.length;i++){ if(d3.geoContains(OCEANGEO[OCEAN_ORDER[i]],p)) return OCEAN_ORDER[i]; }
    return null;
  }
  /** f = schaalfactor voor de tolerantie (groter bij uitzoomen). */
  function isHit(it,lon,lat,f,minDeg){
    if(it.kind==='line') return it.dist(lon,lat)<Math.max(it.tol*f,minDeg||0);
    if(it.kind==='land') return landAt(lon,lat)===it.id;
    return !landAt(lon,lat) && oceanAt(lon,lat)===it.id;
  }
  /** Wat zit er op dit punt? Alleen binnen de toegestane begrippen (Set van id's). */
  function identify(lon,lat,allowed,f,minDeg){
    var best=null,bd=1e9;
    ITEMS.forEach(function(it){
      if(it.kind==='line'&&allowed.has(it.id)){
        var d=it.dist(lon,lat);
        if(d<Math.max(it.tol*f,minDeg||0)&&d<bd){best=it;bd=d;}
      }
    });
    if(best) return best;
    var l=landAt(lon,lat);
    if(l) return allowed.has(l)?byId[l]:null;
    var o=oceanAt(lon,lat);
    return (o&&allowed.has(o))?byId[o]:null;
  }
  return {RAD:RAD,ITEMS:ITEMS,byId:byId,landAt:landAt,oceanAt:oceanAt,isHit:isHit,identify:identify,
    OCEANGEO:OCEANGEO,OCEANLINES:OCEANLINES,LANDP:LANDP,LANDMULTI:LANDMULTI,ICEMULTI:ICEMULTI,LANDGEO:LANDGEO,LAKES:LAKES,RIDGEGEO:RIDGEGEO,PATCHES:PATCHES};
})();
if(typeof window!=='undefined') window.GEO=GEO;

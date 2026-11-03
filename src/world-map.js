import * as THREE from './vendor/three.module.js';
let stop=()=>{},pending=null;
function mount(){pending?.disconnect();stop();stop=()=>{};const host=document.querySelector('[data-adventure-model]');if(!host)return;pending=new IntersectionObserver(entries=>{if(host.isConnected&&entries.some(e=>e.isIntersecting)){pending.disconnect();pending=null;create(host);}},{rootMargin:'100px'});pending.observe(host);}
function create(host){
 const A=window.TangoAdventure,model=JSON.parse(host.dataset.adventureModel),saved=A.normalize(model.state),preview=host.dataset.preview==='true',view=host.querySelector('.adventure-viewport'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch(e){host.classList.add('adventure-fallback');host.querySelector('.adventure-status').textContent='3D表示を利用できません。「今日の学習」から同じ学習を進められます。';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1:1.25));renderer.setClearColor(0xc7d9d5);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;view.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xc7d9d5,65,145);scene.add(new THREE.HemisphereLight(0xfff6e4,0x617b85,2.1));const light=new THREE.DirectionalLight(0xffedce,2.6);light.position.set(-20,40,15);scene.add(light);
 const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,220),geos=[],mats=new Map(),batches=new Map(),groups=[];
 const box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,6),ball=new THREE.IcosahedronGeometry(1,0),cylinder=new THREE.CylinderGeometry(1,1,1,8),roof=new THREE.ConeGeometry(1,1,4);geos.push(box,cone,ball,cylinder,roof);
 const mat=color=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));return mats.get(color);};
 function put(g,color,x,y,z,sx=1,sy=1,sz=1,rotation=0,zone=-1){const material=mat(color),key=g.uuid+material.uuid+':'+zone;if(!batches.has(key))batches.set(key,{g,material,entries:[],zone});const dummy=new THREE.Object3D();dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.y=rotation;dummy.updateMatrix();batches.get(key).entries.push(dummy.matrix.clone());}
 put(box,0x9dbcc5,0,-2,-48,200,1,300);
 for(const zone of A.ZONES){const shape=new THREE.Shape();const left=[],right=[];for(let z=zone.south;z>=zone.north;z-=2){const width=zone.width+Math.sin(z*.24)*1.2;left.push([zone.center-width,-z]);right.push([zone.center+width,-z]);}if(left.at(-1)[1]!==-zone.north){const width=zone.width+Math.sin(zone.north*.24)*1.2;left.push([zone.center-width,-zone.north]);right.push([zone.center+width,-zone.north]);}const outline=[...left,...right.reverse()];shape.moveTo(...outline[0]);outline.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geos.push(geometry);const land=new THREE.Mesh(geometry,mat(zone.color));land.position.y=-1.2;scene.add(land);
  // The main trail has irregular stepping stones, not lesson tiles.
  for(let z=zone.north+3;z<zone.south-1;z+=2.4)put(cylinder,0xd7c9a4,Math.sin(z*.17)*2,-.01,z,1.7,.08,1.2,Math.sin(z),zone.id);
  if(zone.id===2){put(box,0x8bbcc5,-9,-.05,-47,7,.15,5);for(let i=0;i<4;i++)put(ball,0xcbd5ce,-9.8+i*.55,.6+i*.22,-47,.45,.7,.5,0,2);}
  if(zone.id===3){for(let i=0;i<6;i++){const x=8+(i%3)*2.5,z=-72-Math.floor(i/3)*5;put(cylinder,0xb6b7a3,x,2,z,.5,4,.5,0,3);put(box,0xc8c6b3,x,4.1,z,1.3,.4,1.3,0,3);}put(box,0xb1b2a0,10,4.5,-72,7,.5,1.4,0,3);put(box,0x8db4bb,-9,-.06,-73,9,.1,13,0,3);}
  if(zone.id===0||zone.id===4){const x=zone.id===0?10:-7,z=zone.id===0?15:-94;put(box,0xd8cbb0,x,1.3,z,5,2.6,3,0,zone.id);put(roof,zone.id===4?0xdde7e4:0x536d70,x,3.3,z,4.1,1.8,2.9,Math.PI/4,zone.id);put(box,0x665b4e,x,1,z+1.52,.8,1.9,.08,0,zone.id);}
 }
 for(const o of A.OBSTACLES){if(['interaction','chest','building'].includes(o.kind))continue;const zone=A.ZONES[o.zone];if(o.kind==='rock'){put(ball,0x8b9690,o.x,.8,o.z,1.2,1.5,1.2,0,o.zone);continue;}put(cylinder,0x856b52,o.x,1,o.z,.18,2,.18,0,o.zone);if([1,4].includes(o.zone)){for(let j=0;j<3;j++)put(cone,o.zone===4&&j===2?0xe5ede9:zone.tree,o.x,1.8+j*.6,o.z,1.3-j*.25,2.2,1.3-j*.25,0,o.zone);}else{put(ball,zone.tree,o.x,2.7,o.z,1.25,1.7,1.2,.4,o.zone);put(ball,zone.tree,o.x+.6,2.2,o.z+.3,.95,1.15,1,0,o.zone);}}
 // Solid rocky ridges lead to a real timber gate; no transparent world barrier.
 for(const gate of A.ZONES.slice(1)){
  const open=saved.completed>=gate.need,z=gate.south;
  for(const side of [-1,1])for(let i=0;i<13;i++){
   const x=side*(6+i*3.9),height=3.8+Math.sin(i*1.8+gate.id)*.7;
   put(ball,gate.id===4?0xc3cecb:0x839489,x,height*.42,z,2.8,height,2.5,.3*i);
   put(ball,gate.id===4?0xe0e7e2:0x9baa92,x+.5,height*.86,z-.3,2.1,1.1,1.9,.7*i);
  }
  put(box,0xd7c9a4,0,.04,z,5,.12,5);
  for(const side of [-1,1]){
   const x=side*3.2;
   put(box,0x7e8c80,x,2.1,z,1.2,4.2,1.25);
   put(box,0xb8bca1,x,4.25,z,1.7,.45,1.7);
   put(ball,open?0xb1e3c0:0xd3b478,x,4.8,z,.43,.6,.43);
   // Each leaf is hinged on the pillar; opened leaves stand along the passage.
   const angle=open?side*Math.PI/2:0;
   const pivot=new THREE.Group();pivot.position.set(side*2.6,0,z);pivot.rotation.y=angle;
   const leaf=new THREE.Group();leaf.position.x=-side*1.3;
   for(let j=0;j<5;j++){const plank=new THREE.Mesh(box,mat(0x8d6849));plank.position.set(-1.04+j*.52,1.9,0);plank.scale.set(.46,3.5,.25);leaf.add(plank);}
   for(const y of [.7,2.9]){const brace=new THREE.Mesh(box,mat(0x58695f));brace.position.set(0,y,.16);brace.scale.set(2.65,.16,.12);leaf.add(brace);}
   pivot.add(leaf);scene.add(pivot);
  }
  put(box,0xa5ad95,0,4.55,z,7.8,.55,1.5);
 }

 function person(x,z,color,hair,hero=false){const g=new THREE.Group();function piece(geometry,c,px,py,pz,sx,sy,sz){const mesh=new THREE.Mesh(geometry,mat(c));mesh.position.set(px,py,pz);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;}for(const side of [-1,1]){piece(box,color,side*.53,1.22,.02,.22,.68,.24);piece(ball,0xedd2b4,side*.54,.83,.03,.14,.15,.14);}
 const legs=[piece(box,0x49545f,-.23,.42,0,.28,.8,.32),piece(box,0x49545f,.23,.42,0,.28,.8,.32)];piece(box,color,0,1.2,0,.8,.95,.52);piece(cone,color,0,1.15,-.23,.72,1.2,.52);piece(ball,0xedd2b4,0,2,0,.52,.57,.49);piece(ball,hair,0,2.3,-.05,.56,.32,.52);piece(box,hair,-.2,2.17,.33,.25,.28,.22);for(const side of [-1,1]){piece(ball,0xedd2b4,side*.5,1.98,0,.1,.15,.12);piece(box,0xba8c37,side*.18,2.03,.447,.07,.07,.05);}piece(box,0x94785f,.48,1.02,-.12,.32,.44,.3);if(hero){const gem=piece(ball,0x9be3cf,.5,1.35,-.31,.13,.2,.13);gem.material.emissive.set(0x437665);gem.material.emissiveIntensity=.5;piece(box,0x9be3cf,.54,.89,.18,.08,.06,.02);}g.position.set(x,0,z);scene.add(g);return {root:g,legs};}
 const hero=person(saved.position.x,saved.position.z,0x334d72,0x83b5ae,true);
 for(const point of A.POINTS){if(point.kind==='shrine'){put(cylinder,0x7a8690,point.x,.15,point.z,2.3,.3,2.3,0,point.zone);put(box,0x536378,point.x,.85,point.z,2.3,1.4,1.5,0,point.zone);put(cone,0xe6c687,point.x,2.4,point.z,1,1.7,1,Math.PI/4,point.zone);for(const side of [-1,1])put(box,0xaebcb3,point.x+side*2,1.7,point.z,.4,3.4,.4,0,point.zone);put(roof,0x3c5269,point.x,3.8,point.z,3.4,1.2,2.3,Math.PI/4,point.zone);continue;}if(point.kind==='npc'){person(point.x,point.z,point.id==='keeper'?0xb69160:0x6e8586,0x555c60);continue;}if(point.kind==='stone'){put(box,0x8e9e98,point.x,1.25,point.z,1.3,2.5,.7,.1,point.zone);for(let i=0;i<3;i++)put(box,0xb0dccb,point.x,1+i*.45,point.z+.36,.5,.09,.03,0,point.zone);}else{put(cylinder,0x898e7a,point.x,.1,point.z,1.2,.2,1.2,0,point.zone);put(box,0x7e644b,point.x,.25,point.z,1.2,.2,.3,.7,point.zone);put(cone,0xe4b46a,point.x,.7,point.z,.5,1.1,.5,0,point.zone);}}
 for(const chest of A.CHESTS){const claimed=saved.chests.includes(chest.id),color=claimed?0x8b9a8c:0xbf9059;put(box,color,chest.x,.55,chest.z,1.25,1,1,0,chest.zone);put(box,0xe0c78f,chest.x,.56,chest.z,.15,1.04,1.04,0,chest.zone);put(box,color,chest.x,1.1,chest.z,1.4,.22,1.15,0,chest.zone);}
 for(const batch of batches.values()){const mesh=new THREE.InstancedMesh(batch.g,batch.material,batch.entries.length);batch.entries.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));scene.add(mesh);groups.push({mesh,zone:batch.zone});}
 // Small readable markers are projected over volumetric objects.
 const annotations=document.createElement('div');annotations.className='adventure-annotations';view.append(annotations);const markers=A.POINTS.map(point=>{const el=document.createElement('span');el.className='adventure-marker';el.textContent=point.kind==='npc'?'話す':point.kind==='stone'?'石碑':point.kind==='shrine'?'祈願':'焚き火';annotations.append(el);return {el,point,vector:new THREE.Vector3(point.x,3.3,point.z)};});
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','旅の世界。WASDまたは矢印キーで歩き、Eキーで調べます。');
 const input={x:0,y:0},keys=new Set(),cameraTarget=new THREE.Vector3(hero.root.position.x,0,hero.root.position.z);let alive=true,visible=true,raf=0,lastTime=0,dirty=true,walkTime=0,wasWalking=false,lastSave=0,currentZone=-1,near=null,dialogOpen=false,span=preview?31:28;
 const action=host.querySelector('[data-adventure-interact]'),status=host.querySelector('.adventure-status'),dialog=host.querySelector('.adventure-dialog'),label=host.querySelector('[data-adventure-action-label]');
 function save(){if(preview)return;const position={x:hero.root.position.x,z:hero.root.position.z};window.dispatchEvent(new CustomEvent('tango-adventure-position',{detail:position}));}
 function updateLocation(){const zone=A.zoneAt(hero.root.position.z);if(zone&&zone.id!==currentZone){currentZone=zone.id;groups.forEach(g=>{g.mesh.visible=g.zone<0||Math.abs(g.zone-currentZone)<=1;});host.querySelector('.adventure-location').textContent=zone.name;}const point=A.nearby({x:hero.root.position.x,z:hero.root.position.z},saved);if(point?.id!==near?.id){near=point;if(action){action.disabled=!point;label.textContent=point?(point.kind==='npc'?'話す':point.kind==='chest'?'開ける':point.kind==='shrine'?'祈願':'調べる'):'調べる';host.querySelector('.adventure-nearby').textContent=point?point.title:'石碑や人物に近づくと調べられます';}}}
 function interaction(){if(preview||dialogOpen||!near)return;keys.clear();input.x=input.y=0;save();if(near.kind==='shrine'){window.dispatchEvent(new CustomEvent('tango-adventure-shrine',{detail:{position:{x:hero.root.position.x,z:hero.root.position.z}}}));return;}if(near.kind==='chest'){window.dispatchEvent(new CustomEvent('tango-adventure-chest',{detail:{id:near.id,position:{x:hero.root.position.x,z:hero.root.position.z}}}));return;}dialogOpen=true;dialog.hidden=false;host.querySelector('[data-dialog-title]').textContent=near.title;host.querySelector('[data-dialog-text]').textContent=near.text;host.querySelector('[data-adventure-learn]').focus();draw();}
 function closeDialog(){dialogOpen=false;dialog.hidden=true;action?.focus();draw();}
 function draw(){dirty=true;if(alive&&visible&&!document.hidden&&!raf)raf=requestAnimationFrame(tick);}
 function vector(){let x=input.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),y=input.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}return {x,y};}
 function tick(time){raf=0;if(!alive||!visible||document.hidden)return;if(time-lastTime<33){draw();return;}const dt=Math.min(.05,(time-lastTime)/1000||.033);lastTime=time;const v=vector(),walking=!preview&&!dialogOpen&&Math.hypot(v.x,v.y)>.05;
  if(walking){const dx=(v.x*.8525+v.y*.5227)*6*dt,dz=(-v.x*.5227+v.y*.8525)*6*dt;const p=A.move({x:hero.root.position.x,z:hero.root.position.z},dx,dz,saved.completed);const moved=Math.hypot(p.x-hero.root.position.x,p.z-hero.root.position.z)>.001;hero.root.position.x=p.x;hero.root.position.z=p.z;if(moved){hero.root.rotation.y=Math.atan2(dx,dz);walkTime+=dt*9;hero.legs[0].rotation.x=Math.sin(walkTime)*.4;hero.legs[1].rotation.x=-Math.sin(walkTime)*.4;}dirty=true;if(time-lastSave>8000){save();lastSave=time;}}
  if(wasWalking&&!walking){hero.legs.forEach(leg=>leg.rotation.x=0);save();dirty=true;}if(!preview&&wasWalking!==walking)window.dispatchEvent(new CustomEvent("kotomia-walking",{detail:walking}));wasWalking=walking;
  const goal=new THREE.Vector3(hero.root.position.x,0,hero.root.position.z),following=cameraTarget.distanceTo(goal)>.015;if(following){cameraTarget.lerp(goal,reduced?1:1-Math.exp(-dt*12));dirty=true;}
  if(dirty){updateLocation();render();dirty=false;}if(walking||following)draw();
 }
 function render(){const aspect=view.clientWidth/Math.max(1,view.clientHeight),vertical=span/Math.min(1,aspect);camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();camera.position.set(cameraTarget.x+21,32,cameraTarget.z+34);camera.lookAt(cameraTarget.x,0,cameraTarget.z-3);renderer.render(scene,camera);const vector=new THREE.Vector3();for(const marker of markers){const v=vector.copy(marker.vector).project(camera);marker.el.hidden=marker.point.zone>A.highest(saved.completed)||Math.hypot(marker.point.x-hero.root.position.x,marker.point.z-hero.root.position.z)>14||Math.abs(v.x)>.95||Math.abs(v.y)>.9;marker.el.style.left=(v.x*.5+.5)*100+'%';marker.el.style.top=(-v.y*.5+.5)*100+'%';}}
 function resize(){renderer.setSize(view.clientWidth,view.clientHeight,false);draw();}
 function down(e){if(preview)return;if(dialogOpen){if(e.key==='Escape'){e.preventDefault();closeDialog();}if(e.key==='Tab'){const buttons=[...dialog.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}return;}if(e.target.closest('input,textarea,select')||e.target.isContentEditable)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){e.preventDefault();if(!dialogOpen){keys.add(key);draw();}}if(key==='e'&&!e.repeat){e.preventDefault();interaction();}if(key==='Escape'&&dialogOpen)closeDialog();}
 function up(e){keys.delete(e.key.length===1?e.key.toLowerCase():e.key);draw();}
 function release(){keys.clear();input.x=input.y=0;if(knob)knob.style.transform='translate(0,0)';draw();}
 const stick=host.querySelector('.adventure-stick'),knob=host.querySelector('.adventure-stick-knob');let stickPointer=null;
 function steer(e){const rect=stick.getBoundingClientRect(),radius=rect.width*.32;let x=(e.clientX-rect.left-rect.width/2)/radius,y=(e.clientY-rect.top-rect.height/2)/radius;const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;input.x=x;input.y=y;knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;draw();}
 function stickDown(e){if(stickPointer!==null)return;stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);steer(e);}
 function stickMove(e){if(e.pointerId===stickPointer)steer(e);}
 function stickUp(e){if(e.pointerId!==stickPointer)return;stickPointer=null;release();save();}
 function click(e){if(e.target.closest('[data-adventure-interact]'))interaction();if(e.target.closest('[data-adventure-later]'))closeDialog();if(e.target.closest('[data-adventure-learn]')&&near&&!preview){save();window.dispatchEvent(new CustomEvent('tango-adventure-study',{detail:{source:near.id}}));}const zoom=e.target.closest('[data-adventure-zoom]');if(zoom){span=Math.max(21,Math.min(40,span+Number(zoom.dataset.adventureZoom)));draw();}}
 function visibility(){if(document.hidden){release();save();cancelAnimationFrame(raf);raf=0;}else draw();}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);host.addEventListener('click',click);if(stick){stick.addEventListener('pointerdown',stickDown);stick.addEventListener('pointermove',stickMove);stick.addEventListener('pointerup',stickUp);stick.addEventListener('pointercancel',stickUp);}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(view);const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw();else{release();save();cancelAnimationFrame(raf);raf=0;}});observer.observe(view);host.classList.add('adventure-ready');status.textContent=preview?'探索の続きは「旅に出る」から。':'WASD・矢印キーで移動 / Eで調べる。スマホはスティックと右のボタンで操作できます。';resize();draw();
 stop=()=>{save();alive=false;cancelAnimationFrame(raf);resizeObserver.disconnect();observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);host.removeEventListener('click',click);scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();annotations.remove();};
}
window.TangoWorld={mount,dispose(){pending?.disconnect();pending=null;stop();stop=()=>{};}};mount();

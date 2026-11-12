/** Original layered illustration for Utsav. Run: node tools/render-landscape.mjs */
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../assets/landscape/', import.meta.url);
await mkdir(out, { recursive: true });
const svg = (body, width = 1600) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 1000" fill="none">${body}</svg>\n`;
const save = (name, body, width) => writeFile(new URL(name + '.svg', out), svg(body, width));
let seed = 2083;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const number = (min,max) => min + random() * (max-min);
const n = value => Math.round(value * 10) / 10;
const choose = values => values[Math.floor(random()*values.length)];
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, stroke, width = 1, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="none" ${extra}/>`;

await save('atmosphere', `
  <g fill="#fffdf1" opacity=".55">
    <path d="M-70 221c50-10 72-4 107-12 41-10 82-8 105 4 24 12 51 5 81 10 34 6 66 7 88 14H-70Z"/>
    <path d="M1196 161c28-10 58-1 81-9 26-9 53-12 74 1 29-2 41 12 62 9 21-3 53 4 67 10h-284Z"/>
    <path d="M1060 238c39-12 81-2 113-11 44-11 79-4 106 7 40-5 73 1 107 12h-326Z"/>
  </g>
  <g fill="#e8efdf" opacity=".4"><path d="M230 443c77-11 117 3 183-1s135-12 195 3 114-6 165 1v12H230Z"/></g>
`);

await save('himalayas', `
  <path fill="#b9ccda" d="m-40 570 44-27 21 5 28-38 13 5 34-52 15 6 32-26 16 7 31-48 10 3 26-31 14 7 37-54 21 34 18-9 31 44 16-6 34 41 23-14 41 44 31-21 34 31 26-7 35 33 31-28 18 11 45-52 24 14 27-35 14 9 45-56 21 9 32-43 15 7 23-27 23 29 21-3 26 35 14-9 39 47 28-20 36 40 21-10 32 36 26-11 42 43 30-29 22 8 37-41 15 3 22-34 15 7 34-45 12 7 27-37 14 12 34-51 22 24 15-4 30 48 21-9 46 60 21-10 40 49 30-24 20 6 44-56 17 12 30-39 25 32 15-6 39 46 20-7 41 48 22-19 22 13 43-28 37 16v330H-40Z"/>
  <path fill="#fffdf8" d="m-20 621 44-51 18 6 24-23 20 5 29-30 11 5 31-42 10 6 33-48 10 4 30-45 9 7 26-48 11 7 20-37 13 9 21-40 17 30 10-3 19 32 10-5 28 34 11-3 29 38 22-12 32 37 18-5 34 31 24-14 32 35 26-17 37 26 20-7 32 27 33-29 11 5 37-43 12 5 31-38 13 6 26-35 11 5 34-47 10 3 27-42 10 6 26-39 21 25 12-3 27 35 12-4 29 38 11-4 34 37 17-12 30 34 15-6 32 36 20-8 35 39 21-18 29 22 18-9 38 27 17-8 34 25 23-25 13 5 32-39 12 4 27-38 13 5 32-48 10 6 34-49 11 10 36-56 18 31 12-3 25 38 12-6 32 47 15-5 27 37 17-6 38 37 21-20 18 7 27-34 12 5 30-42 14 17 10-4 34 40 12-4 24 31 17-6 36 39 23-13 35 23 31-16 36 22v253H-20Z"/>
  <g fill="#b8c9d8">
    <path d="m277 367-12 54 11 21-25 34 13 16-40 49 21 30 61-57-16-33 30-37-18-37Z"/>
    <path d="m474 490-33 55-8 27 33-16 30-43Z"/>
    <path d="m753 366-9 44-30 29 13 17-27 42 8 18-44 65 23-3 51-70-12-28 32-39-10-18 28-25Z"/>
    <path d="m812 340-9 55 23 38-7 29 29 25 9 40 45 33-16-55-22-28-2-42-24-27 7-30Z"/>
    <path d="m1136 361-15 46-24 22 7 20-30 42-1 26-28 27 29-5 36-37-2-26 31-34-9-20 25-28Z"/>
    <path d="m1180 316 10 58 34 37-5 24 38 37 10 36 34 20-18-45-26-22 3-30-29-31 1-29Z"/>
    <path d="m1414 434-18 43 10 14-30 43 25-9 31-30-8-14 14-23Z"/>
  </g>
  <g fill="#8396a7" opacity=".8"><path d="m259 495-34 47 20 29 25-27-15-11 17-24Zm451 21-46 65 23-3 26-35-8-10Zm149 26 40 49-9 32-51-72Zm218-23-31 25 29-5 25-23Zm205-36 19 45-22-16-12-27Z"/></g>
  <g stroke="#e3e9ed" stroke-width="1.5" stroke-linecap="round" opacity=".9">
    <path d="m249 416-16 34-20 16m21 2-25 37-23 12m113-41 24 27 14 6m-28 13 24 21m392-151-17 31-19 14m8 9-29 30-15 29m85-46 27 27 17 35m-17-99 20 34 29 23m-63 20 22 28m304-85-19 25-8 31m56-61 29 38 22 9m-44 30 28 26 5 20m-109-21-22 17-18 32m277-87-21 31-9 31"/>
  </g>
  <path fill="#d8e3e7" opacity=".4" d="M0 620c241-22 363 30 590 2 214-26 352-2 569 9 187 9 292-31 441-11v95H0Z"/>
`);

function ridge(anchors, color, treeColor, roughness = 4) {
  let points = [];
  for(let i=0;i<anchors.length-1;i++) {
    const [x1,y1]=anchors[i], [x2,y2]=anchors[i+1];
    for(let x=x1;x<x2;x+=7) {
      const t=(x-x1)/(x2-x1), ease=(1-Math.cos(t*Math.PI))/2;
      points.push([x,y1+(y2-y1)*ease+number(-roughness,roughness)]);
    }
  }
  points.push(anchors.at(-1));
  let body=path('M'+points.map(p=>p.map(n).join(' ')).join('L')+'V1000H-40Z',color);
  body+='<g fill="'+treeColor+'">';
  for(const [x,y] of points) {
    const h=number(3,11), w=h*.46;
    body+=path(`M${n(x-w)} ${n(y+2)}q${n(w*.15)} ${n(-h*.5)} ${n(w*.65)} ${n(-h*.65)}q${n(-w*.3)} ${n(-h*.5)} ${n(w*.35)} ${n(-h*.6)}q${n(w*.7)} 0 ${n(w*.6)} ${n(h*.55)}q${n(w*.7)} 0 ${n(w*.4)} ${n(h*.7)}Z`,treeColor);
  }
  return body+'</g>';
}
await save('distant-hills',ridge([[-40,615],[160,560],[420,628],[660,604],[820,651],[1050,560],[1290,606],[1460,547],[1640,600]],'#73957a','#73957a',2)+
  path('M-30 654c127-56 223-43 355-11s232-22 355 14 214-11 332-3 235-24 332-5 208-20 286-44v395H-30Z','#85a287')+
  line('M7 640c123-37 167-35 254-9m739 18c83-23 148-15 208-8','#a5b899',2,'opacity=".5"'));
await save('near-hills',ridge([[-40,689],[85,637],[240,661],[385,707],[590,699],[760,733],[942,687],[1120,666],[1295,625],[1440,655],[1640,606]],'#497653','#497653',3)+
  path('M-20 716c150-49 258 37 397 28 132-8 229 24 348 21 100-2 178-38 278-28 127 13 202-49 315-43 104 6 189-43 302-29v335H-20Z','#5d845b')+
  line('M74 682c88 5 121 26 178 28m5 12c48 11 76 7 110 22m790-42c56-12 83-37 129-36m-98 48c53-12 100-31 155-30','#8d9b67',2,'opacity=".65"'));

function building(x,base,w,h,palette,details=true) {
  const fill=choose(palette), side=w*.2;
  let b=path(`M${n(x)} ${n(base)}v${n(-h)}h${n(w)}v${n(h)}Z`,fill);
  b+=path(`M${n(x+w-side)} ${n(base)}v${n(-h)}h${n(side)}v${n(h)}Z`,'#4d4a4b','opacity=".18"');
  b+=path(`M${n(x-1)} ${n(base-h)}v-3h${n(w+2)}v3Z`,'#68696b');
  if(details) {
    const cols=Math.max(2,Math.floor(w/7)), floors=Math.max(2,Math.floor(h/10));
    for(let row=0;row<floors;row++)for(let col=0;col<cols;col++) {
      const wx=x+3+col*(w-5)/cols, wy=base-h+6+row*(h-5)/floors;
      b+=`<rect x="${n(wx)}" y="${n(wy)}" width="${n(Math.max(1.5,w/cols*.4))}" height="${n(Math.max(2,h/floors*.42))}" fill="${choose(['#515e68','#5e6267','#ecd8af','#7a7774'])}"/>`;
    }
    if(random()>.42) {
      const tx=x+w*.6, ty=base-h-7;
      b+=`<rect x="${n(tx)}" y="${n(ty)}" width="${n(w*.25)}" height="6" rx="1" fill="#393e43"/><ellipse cx="${n(tx+w*.125)}" cy="${n(ty)}" rx="${n(w*.125)}" ry="1.2" fill="#555b61"/>`;
    }
    if(random()>.6)b+=line(`M${n(x+3)} ${n(base-h-3)}v-8m-4 2h8`,'#67666a',.7);
    if(h>35)b+=line(`M${n(x)} ${n(base-h*.45)}h${n(w)}`,'#f4e7c6',1,'opacity=".4"');
  }
  return b;
}
const urbanBase = (row, x) => row + Math.sin(x / 230) * 7 + 26 * (1 - Math.abs(x - 800) / 800);
function rowTerrain(row, color) {
  // Carry every row's ground to the bottom: no transparent strips beneath facades.
  const points = [];
  for (let x = -40; x <= 1640; x += 8) points.push(`${x} ${n(urbanBase(row, x) - 2)}`);
  return path('M' + points.join('L') + 'V1000H-40Z', color);
}
let urban=path('M-20 734c199-36 321 13 496 23 224 13 339-8 524-17 212-10 390-58 620-36v296H-20Z','#b4aea4');
for(const [row,step,minW,maxW,minH,maxH,palette,alpha] of [
  [697,13,8,15,8,23,['#adb7bd','#babbb7','#b6b2ab','#a4afb8'],.8],
  [740,20,12,23,14,35,['#cac3b5','#a8b0b6','#bbb6af','#c9b39b','#b4bec3','#b9c7d0'],.95],
  [790,30,20,36,22,48,['#d5bd8b','#c9c5be','#b57960','#cfbe9e','#e1cfaa','#b5b6b2','#8da8b8','#c19a8a'],1],
  [848,42,28,47,29,66,['#c6c2bd','#d0ac88','#b16d50','#dfcfac','#a6aeb3','#d6d1c9','#8fa8b9','#c59c88','#c6b47b'],1]
]) {
  urban+=rowTerrain(row, ['#b8b8b0','#bbb7aa','#b9ae9e','#b1a594'][Math.min(3,Math.floor((row-697)/45))]);
  urban+=`<g opacity="${alpha}">`;
  for(let x=-25;x<1640;x+=step) {
    const base=urbanBase(row, x);
    urban+=building(x+number(-4,4),base,number(minW,maxW),number(minH,maxH),palette);
  }
  urban+='</g>';
}
urban+=path('M-40 894c178-25 261-17 415-3s229 0 335-1 207-21 334-16c191 8 307-30 596-19v145H-40Z','#9d978e');
urban+=line('M-10 865c151 17 268-6 391 1s204 25 325 7 192-11 292-14 234-44 361-30 188-6 259-19','#d8c7a2',5,'opacity=".55"');
await save('valley',urban);

const templeDefs=`<defs>
 <pattern id="brick" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 0h16M0 8h16M8 0v4M0 4h16M3 4v4m9-4v4" stroke="#794d35" stroke-width=".7" opacity=".45"/></pattern>
 <pattern id="lattice" width="5" height="5" patternUnits="userSpaceOnUse"><path d="m0 0 5 5m0-5L0 5" stroke="#ac8250" stroke-width=".7"/></pattern>
 <g id="pagoda">
  <path fill="#aa6845" d="M-53 0H53v-71H43v-74H32v-69H22v-57H12v-48h-24v48h-10v57h-10v69h-11v74h-10Z"/>
  <path fill="#784c35" d="M22-271h-5v57h9v69h11v74h10V0h6v-71H43v-74H32v-69H22Z"/>
  <path fill="url(#brick)" d="M-53 0H53v-71H43v-74H32v-69H22v-57H12v-48h-24v48h-10v57h-10v69h-11v74h-10Z"/>
  <path fill="#38333a" d="M-107-63c14 3 21 0 31-4l31-25h90l31 25c10 4 17 7 31 4l-8 11H-99ZM-83-139c11 2 18 1 25-3l24-22h68l24 22c7 4 14 5 25 3l-7 9H-76ZM-61-209c9 2 15 1 22-3l18-19h42l18 19c7 4 13 5 22 3l-6 8H-55ZM-43-266c8 1 12-1 17-4l16-18h20l16 18c5 3 9 5 17 4l-5 7H-38ZM-28-314c7 0 13-3 18-10l10-9 10 9c5 7 11 10 18 10l-4 6H-24Z"/>
  <g stroke="#bb8b55" stroke-width="2"><path d="M-101-60H101m-178-77H77m-132-70H55m-94-57H39m-64-48H24"/></g>
  <g stroke="#9b7146" stroke-width=".8" opacity=".8"><path d="m-70-66 30-23m-22 23 27-23m-18 23 25-23m-15 23 22-23m-12 23 20-23m-8 23 18-23m-5 23 16-23m-1 23 13-23m3 23 9-23m8 23 5-23m12 23v-23m16 23-5-23m22 23-9-23m26 23-13-23m30 23-16-23"/></g>
  <g stroke="#382d22" stroke-width="3"><path d="m-75-52 25 35m-4-35 16 35m76-35-16 35m53-35-25 35m-106-113 18 28m8-28 10 28m30-28-10 28m36-28-18 28m-57-99 13 24m37-24-13 24m-28-82 10 21m16-21-10 21"/></g>
  <path fill="#302f26" d="M-13 0v-38a13 13 0 0 1 26 0V0Zm-30-12v-28h12v28Zm74 0v-28h12v28Zm-47-76v-27h32v27Zm-10-66v-32h13v32Zm13 0v-32h13v32Zm-6-72v-18h12v18Zm3-53v-17h6v17Z"/>
  <path fill="url(#lattice)" d="M-13 0v-38a13 13 0 0 1 26 0V0Zm-30-12v-28h12v28Zm74 0v-28h12v28Zm-47-76v-27h32v27Zm-10-66v-32h26v32Z"/>
  <g stroke="#ca9a62" stroke-width="1.3"><path d="M-20 0v-46h40V0m-64-79H44m-75-68H31m-53-69H21m-33-57h24m-12-60v-27"/></g>
  <path fill="#c69f6c" d="M-65 0H65v7H-65Zm-8 7H73v8H-73Zm-9 8H82v8H-82Zm-10 8H92v9H-92Z"/>
  <path fill="#c6a14f" d="M-4-337h8l-2-13H-2Zm1-13h2l-1-10Z"/>
 </g>
 <g id="stupa">
  <path fill="#cbc1b4" d="M-85 0H85v-11H72v-12H60v-13H-60v13H-72v12H-85Z"/>
  <path fill="#fff9ec" d="M-63-33c0-38 23-65 63-65s63 27 63 65Z"/>
  <path fill="#e4e2d8" d="M0-98c39 0 63 27 63 65H33c0-34-9-53-33-65Z"/>
  <path fill="#e5be57" d="M-16-98v-24h32v24Zm3-24 3-33h20l3 33Zm3-33 3-28H7l3 28Zm3-28 7-39 7 39Z"/>
  <path stroke="#98752f" stroke-width="1.4" d="M-13-127h26m-25-7h24m-23-7h22m-21-7h20m-18-7H9m-17-7H8m-15-7H7m-13-7H6m-12-7H6m-11-7H5m-9-7H4m-7-7H3"/>
  <path stroke="#34483c" stroke-width="1.6" d="M-12-110q5-6 10 0m4 0q5-6 10 0m-12 0 2 7-4 5m-1-11h2m7 0h2m-21 0h2"/>
  <path stroke="#806a36" stroke-width="2" d="M0-222v-15"/>
 </g>
</defs>`;
function flags(x1,y1,x2,y2,count) {
 let s=line(`M${x1} ${y1}Q${n((x1+x2)/2)} ${Math.max(y1,y2)+95} ${x2} ${y2}`,'#6d7053',1.3);
 for(let i=1;i<count;i++) {
  const t=i/count, x=(1-t)*(1-t)*x1+2*(1-t)*t*(x1+x2)/2+t*t*x2;
  const y=(1-t)*(1-t)*y1+2*(1-t)*t*(Math.max(y1,y2)+95)+t*t*y2;
  s+=path(`M${n(x)} ${n(y)}l${n(number(9,16))} ${n(number(1,6))} -2 ${n(number(14,23))} -13 -4Z`,['#d7bb60','#a5573e','#608c9b','#d9ddbd','#527b58'][i%5]);
 }
 return s;
}
let city=templeDefs;
city+=path('M-20 902c145-37 234-29 371-7 126 21 240 18 357 13 142-7 221-24 350-24 186 1 355-25 562-12v128H-20Z','#a69a8b');
for(const [x,y,scale]of [[259,842,.98],[606,902,.36],[1370,865,.69]]) city+=`<g transform="translate(${x} ${y}) scale(${scale})"><use href="#pagoda"/></g>`;
city+=`<g transform="translate(1087 872) scale(.83)"><use href="#stupa"/></g>`;
for(let x=-30;x<1640;x+=65) {
 if((x>120&&x<380)||(x>985&&x<1175)||(x>1280&&x<1455)) continue;
 city+=building(x,898+Math.sin(x/120)*8,number(38,61),number(55,91),['#b97552','#c1b395','#e0d4b5','#8ea6b6','#bdbdb7','#b9b8b3']);
}
city+=flags(259,489,607,772,20)+flags(1370,619,1087,679,18);
city+=`<g fill="#334f43"><path d="m716 399 10-3 8 4-9-1Zm31-21 7-3 8 3-8-1Zm34 38 6-2 8 3-8-1Z"/></g>`;
await save('kathmandu',city);
let mobile=templeDefs+path('M-20 893c100-15 200 29 307 6 100-22 225-21 333-2v103H-20Z','#a49c90');
for(let x=-10;x<620;x+=39)mobile+=building(x,870+Math.sin(x/90)*10,number(25,40),number(28,57),['#b77d58','#d4c7a7','#ceccc7','#d5b590','#8da5b7','#c59a86']);
mobile+=`<g transform="translate(136 838) scale(.72)"><use href="#pagoda"/></g><g transform="translate(460 885) scale(.76)"><use href="#stupa"/></g><g transform="translate(329 910) scale(.32)"><use href="#pagoda"/></g>`;
mobile+=flags(136,579,460,705,20);
await save('kathmandu-mobile',mobile,600);

function pine(x,y,h,color) {
 let s=path(`M${n(x-2)} ${y}l2 ${-h} 2 ${h}Z`,color);
 for(let i=0;i<7;i++) {
  const t=i/7, py=y-h+h*t*.87, w=h*(.035+t*.19);
  s+=path(`M${n(x)} ${n(py-h*.03)}c${n(-w*.2)} ${n(h*.07)} ${n(-w*.6)} ${n(h*.12)} ${n(-w)} ${n(h*.15)}q${n(w*.55)} 1 ${n(w)} ${n(-h*.018)}q${n(w*.5)} ${n(h*.018)} ${n(w)} ${n(h*.008)}c${n(-w*.45)} ${n(-h*.025)} ${n(-w*.8)} ${n(-h*.07)} ${n(-w)} ${n(-h*.14)}Z`,color);
 }
 return s;
}
function foreground(width) {
 const ratio=width/1600;
 let b=path(`M-10 900C${n(width*.16)} 841 ${n(width*.29)} 952 ${n(width*.49)} 937S${n(width*.79)} 903 ${width+10} 862V1000H-10Z`,'#203e2c');
 b+=path(`M-10 944C${n(width*.16)} 899 ${n(width*.34)} 982 ${n(width*.53)} 961S${n(width*.8)} 958 ${width+10} 913V1000H-10Z`,'#15382c');
 for(const [x,y,h] of [[-8,933,370],[64,925,254],[width-5,936,412],[width-67,936,237]]) b+=pine(x,y,h*(width===600?.7:1),'#193a2a');
 for(let i=0;i<100;i++) {
  const x=number(0,width), y=950+Math.sin(x/90)*13;
  b+=path(`M${n(x)} ${n(y)}q${n(number(-8,5))} -15 ${n(number(-7,7))} ${n(number(-25,-10))}q${n(number(0,5))} 6 5 14q3-13 10-18l-6 25Z`,'#15382c');
 }
 return b;
}
await save('foreground',foreground(1600));
await save('foreground-mobile',foreground(600),600);
console.log('Rendered nine original landscape assets, including mobile compositions.');

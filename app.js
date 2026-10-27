const NS = 'http://www.w3.org/2000/svg';

const state = {
  step: 'scan',
  solid: 'prism',
  scan: 0.35,
  classifyAnswers: new Map(),
  bases: new Set(),
  namingIndex: 0
};

const cases = [
  {type:'prism', title:'三角柱', subtitle:'橫切面保持相同', answer:true, reason:'由前至後的橫切面形狀及大小保持不變。'},
  {type:'pyramid', title:'三棱錐', subtitle:'只有底面相似', answer:false, reason:'切面愈接近頂點愈小，不是均勻橫切面。'},
  {type:'oblique', title:'傾斜的三角柱', subtitle:'只改變擺放方向', answer:true, reason:'傾斜不影響分類；橫切面仍保持相同。'},
  {type:'pinched', title:'兩端相同但中間收窄', subtitle:'只改變中段闊度', answer:false, reason:'兩端相同並不足夠；中間的橫切面已經變小。'}
];

const nameRounds = [5,3,4,6];
const prismNames = {3:'三角柱',4:'四角柱',5:'五角柱',6:'六角柱'};

document.querySelectorAll('.step-button').forEach(button => {
  button.addEventListener('click', () => showStep(button.dataset.step));
});

function showStep(step) {
  state.step = step;
  document.querySelectorAll('.step-button').forEach(b => b.classList.toggle('active', b.dataset.step === step));
  document.querySelectorAll('.learning-step').forEach(panel => panel.classList.toggle('active', panel.id === `step-${step}`));
  document.querySelector('.workspace').scrollIntoView({behavior:'smooth', block:'start'});
}

document.querySelector('#language-button').addEventListener('click', e => {
  e.currentTarget.textContent = e.currentTarget.textContent === '中 / EN' ? '雙語 ✓' : '中 / EN';
});

// ---------- Scanner ----------
const scannerSvg = document.querySelector('#scanner-svg');
const previewSvg = document.querySelector('#section-preview');
const scanSlider = document.querySelector('#scan-slider');

document.querySelectorAll('[data-solid]').forEach(button => {
  button.addEventListener('click', () => {
    state.solid = button.dataset.solid;
    document.querySelectorAll('[data-solid]').forEach(b => b.classList.toggle('active', b === button));
    drawScanner();
  });
});

scanSlider.addEventListener('input', () => {
  state.scan = Number(scanSlider.value) / 100;
  drawScanner();
});

function drawScanner() {
  const front = [[80,300],[165,80],[275,300]];
  const back = [[350,325],[455,115],[565,325]];
  const t = state.scan;
  let layers;

  if (state.solid === 'prism') {
    layers = [front, back];
    renderPolyhedron(layers, false);
  } else if (state.solid === 'pyramid') {
    const apex = [[465,215],[465,215],[465,215]];
    layers = [front, apex];
    renderPolyhedron(layers, true);
  } else {
    const middleCenter = [326,218];
    const middle = scalePolygon(interpolatePolygon(front, back, .5), .45, middleCenter);
    layers = [front, middle, back];
    renderPinched(front, middle, back);
  }

  const section = crossSectionAt(front, back, t, state.solid);
  scannerSvg.appendChild(svgPolygon(section, 'scan-plane'));
  renderPreview(section, state.solid, t);
  updateScanText(t);
}

function renderPolyhedron(layers, pyramid) {
  scannerSvg.innerHTML = '';
  const [a,b] = layers;
  scannerSvg.appendChild(svgPolygon(a, 'solid-fill'));
  if (!pyramid) scannerSvg.appendChild(svgPolygon(b, 'solid-back'));
  for (let i=0;i<3;i++) scannerSvg.appendChild(svgLine(a[i], b[i], 'solid-line'));
}

function renderPinched(front, middle, back) {
  scannerSvg.innerHTML = '';
  scannerSvg.appendChild(svgPolygon(front,'solid-fill'));
  scannerSvg.appendChild(svgPolygon(back,'solid-back'));
  for(let i=0;i<3;i++) {
    scannerSvg.appendChild(svgLine(front[i],middle[i],'solid-line'));
    scannerSvg.appendChild(svgLine(middle[i],back[i],'solid-line'));
  }
  const mid = svgPolygon(middle,'solid-fill');
  mid.style.fill = '#c9b6ef';
  scannerSvg.appendChild(mid);
}

function crossSectionAt(front, back, t, type) {
  if (type === 'prism') return interpolatePolygon(front,back,t);
  if (type === 'pyramid') {
    const apex=[465,215];
    return front.map(p => interpolatePoint(p,apex,t));
  }
  const base = interpolatePolygon(front,back,t);
  const factor = .45 + 1.1 * Math.abs(t-.5);
  const center = polygonCenter(base);
  return scalePolygon(base,Math.min(1,factor),center);
}

function renderPreview(section,type,t) {
  previewSvg.innerHTML='';
  const center=polygonCenter(section);
  const normalized=section.map(([x,y])=>[(x-center[0])*.32+60,(y-center[1])*.32+46]);
  previewSvg.appendChild(svgPolygon(normalized,'preview-shape'));
  const status=document.querySelector('#section-status');
  if(type==='prism') status.textContent='形狀及大小保持不變';
  if(type==='pyramid') status.textContent=`切面縮小至 ${Math.round((1-t)*100)}%`;
  if(type==='pinched') status.textContent=t>.38&&t<.62?'中間切面明顯縮小':'切面大小正在改變';
}

function updateScanText(t) {
  const obs=document.querySelector('#scan-observation');
  const question=document.querySelector('#scan-question');
  if(state.solid==='prism') {
    question.textContent='切面移動時，形狀和大小有沒有改變？';
    obs.innerHTML='<span>✓</span><p><b>稜柱：</b>垂直於柱體方向的橫切面保持相同。</p>';
    obs.style.background='#e9f8ee';
  } else if(state.solid==='pyramid') {
    question.textContent='切面接近頂點時，大小發生甚麼變化？';
    obs.innerHTML='<span>!</span><p><b>不是稜柱：</b>橫切面逐漸縮小，並不均勻。</p>';
    obs.style.background='#fff0eb';
  } else {
    question.textContent='兩端相同，是否已足以判定是稜柱？';
    obs.innerHTML='<span>!</span><p><b>不是稜柱：</b>兩端雖然相同，中間的橫切面卻變小。</p>';
    obs.style.background='#fff0eb';
  }
}

// ---------- Classification ----------
function buildCases() {
  const grid=document.querySelector('#case-grid');
  grid.innerHTML=cases.map((item,index)=>`
    <article class="case-card" data-case="${index}">
      <div class="mini-solid"><svg viewBox="0 0 260 180">${miniSolid(item.type)}</svg></div>
      <div class="case-copy"><h3>${index+1}. ${item.title}</h3><p>${item.subtitle}</p>
        <div class="binary-buttons"><button type="button" data-value="true">是稜柱</button><button type="button" data-value="false">不是稜柱</button></div>
        <div class="case-feedback">選擇後顯示判斷證據。</div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.binary-buttons button').forEach(button=>button.addEventListener('click',handleCase));
}

function handleCase(e) {
  const card=e.target.closest('.case-card');
  const index=Number(card.dataset.case);
  const choice=e.target.dataset.value==='true';
  const correct=choice===cases[index].answer;
  state.classifyAnswers.set(index,correct);
  card.classList.toggle('correct',correct);card.classList.toggle('wrong',!correct);
  card.querySelector('.case-feedback').innerHTML=`<b>${correct?'✓ 判斷正確':'再觀察一次'}</b><br>${cases[index].reason}`;
  document.querySelector('#classify-score').textContent=`${[...state.classifyAnswers.values()].filter(Boolean).length} / 4`;
}

document.querySelector('#reset-cases').addEventListener('click',()=>{state.classifyAnswers.clear();buildCases();document.querySelector('#classify-score').textContent='0 / 4';});

function miniSolid(type) {
  if(type==='pyramid') return `<polygon points="35,145 85,30 140,145" fill="#b9f4d5" stroke="#263d5c" stroke-width="3"/><line x1="35" y1="145" x2="225" y2="90" stroke="#263d5c" stroke-width="3"/><line x1="85" y1="30" x2="225" y2="90" stroke="#263d5c" stroke-width="3"/><line x1="140" y1="145" x2="225" y2="90" stroke="#263d5c" stroke-width="3"/>`;
  if(type==='pinched') return `<polygon points="20,145 60,35 105,145" fill="#b9f4d5" stroke="#263d5c" stroke-width="3"/><polygon points="205,145 225,90 245,145" fill="#d9ff67" stroke="#263d5c" stroke-width="3"/><line x1="20" y1="145" x2="130" y2="120" stroke="#263d5c" stroke-width="3"/><line x1="60" y1="35" x2="130" y2="90" stroke="#263d5c" stroke-width="3"/><line x1="105" y1="145" x2="130" y2="120" stroke="#263d5c" stroke-width="3"/><line x1="130" y1="120" x2="205" y2="145" stroke="#263d5c" stroke-width="3"/><line x1="130" y1="90" x2="225" y2="90" stroke="#263d5c" stroke-width="3"/>`;
  const dx=type==='oblique'?100:120,dy=type==='oblique'?-12:15;
  return `<polygon points="25,145 70,35 120,145" fill="#b9f4d5" stroke="#263d5c" stroke-width="3"/><polygon points="${25+dx},${145+dy} ${70+dx},${35+dy} ${120+dx},${145+dy}" fill="#d9ff67" fill-opacity=".55" stroke="#263d5c" stroke-width="3"/><line x1="25" y1="145" x2="${25+dx}" y2="${145+dy}" stroke="#263d5c" stroke-width="3"/><line x1="70" y1="35" x2="${70+dx}" y2="${35+dy}" stroke="#263d5c" stroke-width="3"/><line x1="120" y1="145" x2="${120+dx}" y2="${145+dy}" stroke="#263d5c" stroke-width="3"/>`;
}

// ---------- Base and height ----------
document.querySelectorAll('.base-face').forEach(face=>face.addEventListener('click',()=>{
  state.bases.add(face.dataset.base);face.classList.add('selected');
  if(state.bases.size===2){
    document.querySelector('#height-options').classList.remove('hidden');
    document.querySelector('#label-task').innerHTML='<span>任務 2</span>選擇柱高：A、B 還是 C？';
    document.querySelector('#label-feedback').textContent='兩個底面已找出。現在找它們之間的垂直距離。';
  }
}));
document.querySelectorAll('.side-face').forEach(face=>face.addEventListener('click',()=>{document.querySelector('#label-feedback').textContent='這是側面。請找出兩個互相平行而且全等的三角形端面。';}));
document.querySelectorAll('.height-choice').forEach(line=>line.addEventListener('click',()=>{
  const correct=line.dataset.height==='correct';
  document.querySelectorAll('.height-choice').forEach(l=>l.classList.remove('correct-selected','wrong-selected'));
  line.classList.add(correct?'correct-selected':'wrong-selected');
  document.querySelector('#label-feedback').innerHTML=correct?'✓ <b>B 是柱高：</b>它表示兩底面之間的垂直距離。':'再想一想：柱高不取決於畫面方向，也不一定是斜棱。尋找直角記號。';
}));
document.querySelector('#reset-label').addEventListener('click',resetLabel);
function resetLabel(){state.bases.clear();document.querySelectorAll('.base-face').forEach(f=>f.classList.remove('selected'));document.querySelector('#height-options').classList.add('hidden');document.querySelector('#label-task').innerHTML='<span>任務 1</span>點擊兩個底面';document.querySelector('#label-feedback').textContent='提示：底面是一對互相平行而且全等的端面。';}

// ---------- Naming ----------
function drawNaming() {
  const sides=nameRounds[state.namingIndex%nameRounds.length];
  document.querySelector('#side-count').textContent=sides;
  const svg=document.querySelector('#naming-svg');
  const front=regularPolygon(170,185,86,sides,-Math.PI/2);
  const back=front.map(([x,y])=>[x+220,y-35]);
  let html=`<polygon points="${points(front)}" fill="#ff7657" fill-opacity=".72" stroke="#263d5c" stroke-width="4"/>`;
  html+=`<polygon points="${points(back)}" fill="#d9ff67" fill-opacity=".48" stroke="#263d5c" stroke-width="4"/>`;
  front.forEach((p,i)=>html+=`<line x1="${p[0]}" y1="${p[1]}" x2="${back[i][0]}" y2="${back[i][1]}" stroke="#263d5c" stroke-width="4"/>`);
  svg.innerHTML=html;
  const distractors=[...new Set([sides, sides+2, sides===3?4:sides-1])].slice(0,3).sort(()=>.5-Math.random());
  const options=document.querySelector('#name-options');
  options.innerHTML=distractors.map(n=>`<button type="button" data-sides="${n}">${prismNames[n]||`${n}角柱`}</button>`).join('');
  options.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const correct=Number(b.dataset.sides)===sides;
    options.querySelectorAll('button').forEach(x=>x.classList.remove('correct','wrong'));
    b.classList.add(correct?'correct':'wrong');
    document.querySelector('#name-feedback').innerHTML=correct?`✓ 底面有 ${sides} 條邊，所以是<b>${prismNames[sides]}</b>。`:'不要數所有面；只數着色底面的邊。';
  }));
  document.querySelector('#name-feedback').textContent='先觀察着色的底面。';
}
document.querySelector('#next-name').addEventListener('click',()=>{state.namingIndex=(state.namingIndex+1)%nameRounds.length;drawNaming();});
['regular-base','right-prism'].forEach(id=>document.querySelector(`#${id}`).addEventListener('change',updateRegular));
function updateRegular(){const yes=document.querySelector('#regular-base').checked&&document.querySelector('#right-prism').checked;const box=document.querySelector('#regular-result');box.className=`regular-result ${yes?'yes':'no'}`;box.innerHTML=yes?'<b>正角柱</b><span>兩個條件同時成立</span>':'<b>不是正角柱</b><span>必須同時是直稜柱，而且底面是正多邊形</span>';}

// ---------- Exit ticket ----------
document.querySelector('#exit-quiz').addEventListener('submit',e=>{
  e.preventDefault();let score=0;const missed=[];
  document.querySelectorAll('.quiz-item').forEach((item,index)=>{
    const chosen=item.querySelector('input:checked')?.value;
    const correct=chosen===item.dataset.answer;
    item.classList.toggle('correct',correct);item.classList.toggle('wrong',!correct);
    if(correct)score++;else missed.push(index+1);
  });
  const result=document.querySelector('#quiz-result');result.classList.remove('hidden');
  result.innerHTML=`<strong>${score} / 4</strong><p>${score===4?'你已掌握稜柱的關鍵特徵，可以進入 5.3 稜柱體積。':`建議重溫第 ${missed.join('、')} 題對應的活動，再重新提交。`}</p>`;
  result.scrollIntoView({behavior:'smooth',block:'center'});
});

// ---------- SVG helpers ----------
function svgPolygon(poly,className){const el=document.createElementNS(NS,'polygon');el.setAttribute('points',points(poly));el.setAttribute('class',className);return el;}
function svgLine(a,b,className){const el=document.createElementNS(NS,'line');el.setAttribute('x1',a[0]);el.setAttribute('y1',a[1]);el.setAttribute('x2',b[0]);el.setAttribute('y2',b[1]);el.setAttribute('class',className);return el;}
function points(poly){return poly.map(p=>p.join(',')).join(' ')}
function interpolatePoint(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function interpolatePolygon(a,b,t){return a.map((p,i)=>interpolatePoint(p,b[i],t))}
function polygonCenter(poly){return[poly.reduce((s,p)=>s+p[0],0)/poly.length,poly.reduce((s,p)=>s+p[1],0)/poly.length]}
function scalePolygon(poly,factor,center=polygonCenter(poly)){return poly.map(([x,y])=>[center[0]+(x-center[0])*factor,center[1]+(y-center[1])*factor])}
function regularPolygon(cx,cy,r,n,start=0){return Array.from({length:n},(_,i)=>[cx+r*Math.cos(start+i*2*Math.PI/n),cy+r*Math.sin(start+i*2*Math.PI/n)])}

drawScanner();
buildCases();
drawNaming();

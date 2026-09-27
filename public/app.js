
const DATA={
  en:[
    ["Pronouns","I am Royyan.","That helmet is mine."],
    ["am / is / are","I am ready.","They are busy."],
    ["do / does / did","Do you work here?","Does she drive?"],
    ["Present & past","I work every day.","I worked yesterday."]
  ],
  zh:[
    ["Pinyin & tones","mā 妈 = ibu","mǎ 马 = kuda"],
    ["Introductions","你好 nǐ hǎo","我叫 Royyan"],
    ["是 / 有 / 在","我是学生。","我在公司。"],
    ["Numbers & time","三点 sān diǎn","今天 jīntiān"]
  ]
};

const QUESTIONS={
  en:[
    ["My friends ___ at work.",["am","is","are"],"are","My friends = they, jadi gunakan are."],
    ["___ your brother live here?",["Do","Does","Is"],"Does","Your brother = he, jadi gunakan does."],
    ["Yesterday, I ___ home late.",["come","came","have come"],"came","Yesterday memakai past simple."]
  ],
  zh:[
    ["两 ___ 书",["个","本","杯"],"本","Buku memakai measure word 本."],
    ["Saya ada di perusahaan.",["我在公司。","我是公司。","我有公司。"],"我在公司。","在 menunjukkan lokasi."]
  ]
};

let state={nav:"home",lang:"en",done:[],correct:0,answered:0,mistakes:[],chat:[]};
try{state=Object.assign(state,JSON.parse(localStorage.getItem("lm")||"{}"));}catch(e){}
const app=document.getElementById("app");

function save(){localStorage.setItem("lm",JSON.stringify(state));}
function setNav(n){state.nav=n;save();render();}
function setLang(l){state.lang=l;save();render();}
window.setNav=setNav;window.setLang=setLang;

function layout(title,sub,body){
  const items=[["home","⌂","Home"],["learn","▤","Learn"],["practice","✓","Practice"],["talk","◉","Talk"],["profile","◎","Profile"]];
  let nav="";
  for(const it of items){
    nav+='<button class="'+(state.nav===it[0]?'active':'')+'" onclick="setNav(\''+it[0]+'\')"><span class="icon">'+it[1]+'</span>'+it[2]+'</button>';
  }
  return '<div class="desktop-shell">'+
    '<aside class="sidebar"><div class="brand"><div class="brand-mark">L</div>LingoMate</div><div class="nav">'+nav+'</div>'+
    '<div class="sidebar-footer"><div class="mini-profile"><div class="avatar">R</div><div><b>Royyan</b><div class="small muted">Daily learner</div></div></div></div></aside>'+
    '<main class="content"><div class="topbar"><div class="title"><h1>'+title+'</h1><p>'+sub+'</p></div>'+
    '<div class="seg"><button class="'+(state.lang==="en"?'active':'')+'" onclick="setLang(\'en\')">English</button>'+
    '<button class="'+(state.lang==="zh"?'active':'')+'" onclick="setLang(\'zh\')">中文</button></div></div>'+body+'</main></div>';
}

function home(){
  const acc=state.answered?Math.round(state.correct/state.answered*100):0;
  return layout("Welcome back, Royyan","Ready for today’s language session?",
    '<section class="card hero"><h2>'+(state.lang==="en"?"Speak with confidence.":"从今天开始说中文。")+'</h2>'+
    '<p>'+(state.lang==="en"?"Learn grammar, speaking and conversation in one place.":"从拼音、声调、汉字到日常会话，一步一步学习。")+'</p>'+
    '<button class="btn" onclick="setNav(\'learn\')">Continue learning →</button></section>'+
    '<div class="section-head"><div><h2>Your progress</h2></div></div>'+
    '<div class="grid grid-4">'+
    '<div class="card stat"><strong>1🔥</strong><small>day streak</small></div>'+
    '<div class="card stat"><strong>'+state.done.length+'</strong><small>lessons completed</small></div>'+
    '<div class="card stat"><strong>'+acc+'%</strong><small>practice accuracy</small></div>'+
    '<div class="card stat"><strong>'+state.mistakes.length+'</strong><small>mistakes to review</small></div></div>'
  );
}

function learn(){
  const list=DATA[state.lang];
  let html='<div class="lesson-list">';
  list.forEach(function(x,i){
    const key=state.lang+i;
    html+='<button class="lesson-item" onclick="openLesson('+i+')"><div class="lesson-number">'+(i+1)+'</div>'+
      '<div class="lesson-meta"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div>'+
      '<span class="pill '+(state.done.includes(key)?'ok':'')+'">'+(state.done.includes(key)?'Done':'Study')+'</span></button>';
  });
  html+='</div>';
  return layout("Learn","Build strong foundations before chasing fluency.",html);
}

function openLesson(i){
  const x=DATA[state.lang][i];
  app.innerHTML=layout("Lesson","Study the pattern and say the examples aloud.",
    '<button class="btn btn-secondary" onclick="render()">← Back</button>'+
    '<section class="card" style="max-width:760px;margin-top:16px"><h2>'+x[0]+'</h2>'+
    '<div class="correction-block"><label>Example 1</label><p>'+x[1]+'</p></div>'+
    '<div class="correction-block" style="margin-top:10px"><label>Example 2</label><p>'+x[2]+'</p></div>'+
    '<div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-secondary" onclick="speakText('+JSON.stringify(x[1])+')">🔊 Listen</button>'+
    '<button class="btn btn-primary" onclick="completeLesson('+i+')">✓ Complete lesson</button></div></section>'
  );
}
window.openLesson=openLesson;

function completeLesson(i){
  const key=state.lang+i;
  if(!state.done.includes(key))state.done.push(key);
  save();render();
}
window.completeLesson=completeLesson;

function practice(){
  const q=QUESTIONS[state.lang][0];
  let opts="";
  q[1].forEach(function(o,i){opts+='<button class="option" onclick="answerQuestion('+i+')">'+o+'</button>';});
  return layout("Practice","Test your grammar and structure.",
    '<section class="card question"><span class="pill">Grammar</span><h2>'+q[0]+'</h2><div class="options">'+opts+'</div><div id="feedback"></div></section>'
  );
}

function answerQuestion(i){
  const q=QUESTIONS[state.lang][0];
  const ok=q[1][i]===q[2];
  state.answered++;
  if(ok)state.correct++;
  else state.mistakes.push({bad:q[0],good:q[2],why:q[3]});
  save();
  document.getElementById("feedback").innerHTML='<div class="feedback '+(ok?'correct':'wrong')+'"><h4>'+(ok?'Correct ✓':'Not quite')+'</h4><p>'+q[3]+'</p></div>';
}
window.answerQuestion=answerQuestion;

function talk(){
  if(!state.chat.length)state.chat=[{r:"t",t:state.lang==="en"?"Hi! Tell me about your day.":"你好！跟我说说你今天怎么样？"}];
  let msgs="";
  state.chat.forEach(function(m){msgs+='<div class="bubble '+(m.r==="u"?'user':'tutor')+'">'+escapeHtml(m.t)+'</div>';});
  return layout("Talk","Practice naturally.",
    '<div class="talk-layout"><section class="card chat"><div class="chat-messages">'+msgs+'</div>'+
    '<div class="composer"><input class="input" id="talkInput" placeholder="Type here..."><button class="btn btn-secondary" onclick="startMic()">🎙</button>'+
    '<button class="btn btn-primary" onclick="sendChat()">Send</button></div></section>'+
    '<aside class="card correction"><h3>Live correction</h3><p class="muted small">Your corrections will appear here.</p></aside></div>'
  );
}

function sendChat(){
  const el=document.getElementById("talkInput");
  if(!el)return;
  const t=el.value.trim();
  if(!t)return;
  state.chat.push({r:"u",t:t});
  let reply=state.lang==="en"?"Good. Tell me one more detail.":"很好！Hěn hǎo!";
  if(state.lang==="en" && /\bI is\b/i.test(t)){
    const fixed=t.replace(/\bI is\b/ig,"I am");
    state.mistakes.push({bad:t,good:fixed,why:"I memakai am."});
    reply='A better version is: "'+fixed+'"';
  }
  state.chat.push({r:"t",t:reply});
  save();render();
}
window.sendChat=sendChat;

function startMic(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R)return alert("Voice input membutuhkan Chrome/Edge dan HTTPS.");
  const r=new R();
  r.lang=state.lang==="zh"?"zh-CN":"en-US";
  r.onresult=function(e){
    const el=document.getElementById("talkInput");
    if(el)el.value=e.results[0][0].transcript;
  };
  r.start();
}
window.startMic=startMic;

function speakText(t){
  const u=new SpeechSynthesisUtterance(t);
  u.lang=state.lang==="zh"?"zh-CN":"en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
window.speakText=speakText;

function profile(){
  let mistakes=state.mistakes.length?"":"<div class=\"empty\">Your mistakes will appear here.</div>";
  state.mistakes.forEach(function(m){
    mistakes+='<div class="mistake"><div><p class="bad">'+escapeHtml(m.bad)+'</p><p class="good">'+escapeHtml(m.good)+'</p><p class="small muted">'+escapeHtml(m.why)+'</p></div></div>';
  });
  return layout("Profile & Review","Progress and mistakes in one place.",
    '<div class="grid grid-2"><section class="card"><h2>Learning profile</h2><p>Language: '+(state.lang==="en"?'English':'Chinese')+'</p><p>Lessons completed: '+state.done.length+'</p></section>'+
    '<section class="card"><h2>Personal Error Notebook</h2>'+mistakes+'</section></div>'
  );
}

function escapeHtml(v){
  return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});
}

function render(){
  const pages={home:home,learn:learn,practice:practice,talk:talk,profile:profile};
  app.innerHTML=(pages[state.nav]||home)();
}
window.render=render;
render();

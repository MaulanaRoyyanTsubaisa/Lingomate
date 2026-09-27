"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lang = "en" | "zh";
type View = "home" | "learn" | "practice" | "talk" | "review" | "dictionary";
type Mode = "grammar" | "vocab" | "reading" | "listening" | "writing";

type Lesson = { id:string; level:string; title:string; sub:string; explain:string; examples:string[]; tip:string };
type Question = { id:string; type:Mode; level:string; prompt:string; choices?:string[]; answer?:string; why:string; audio?:string };
type Mistake = { id:string; source:string; correction:string; reason:string; category:string; mastered:boolean };
type Chat = { id:string; role:"user"|"tutor"; text:string; correction?:{original:string;corrected:string;reason:string} };

type State = {
  lang:Lang; view:View; enLevel:string; zhLevel:string; done:string[]; xp:number; streak:number;
  answered:number; correct:number; mistakes:Mistake[]; saved:string[]; chat:Chat[];
  convo:"daily"|"work"|"travel"|"interview";
};

const DEFAULT:State={lang:"en",view:"home",enLevel:"A1",zhLevel:"Starter",done:[],xp:0,streak:1,answered:0,correct:0,mistakes:[],saved:[],chat:[],convo:"daily"};

const EN_LEVELS=[["A1","Beginner"],["A2","Elementary"],["B1","Intermediate"],["B2","Upper intermediate"],["C1","Advanced"]];
const ZH_LEVELS=[["Starter","Absolute beginner"],["HSK1","Foundation"],["HSK2","Elementary"],["HSK3","Intermediate"],["HSK4","Upper intermediate"]];

const LESSONS:Record<Lang,Lesson[]>={
 en:[
  {id:"en-pronouns",level:"A1",title:"I, me, my, mine",sub:"Subject, object, and ownership",explain:"Use I as the subject, me as the object, my before a noun, and mine when the noun is already understood.",examples:["I work in Karawang.","She called me.","This is my helmet.","That helmet is mine."],tip:"First decide whether the word is doing the action, receiving it, or showing ownership."},
  {id:"en-be",level:"A1",title:"am, is, are",sub:"The verb be in the present",explain:"Use am with I, is with he/she/it and singular nouns, and are with you/we/they and plural nouns.",examples:["I am ready.","She is busy.","They are at work.","The tools are clean."],tip:"I → am · one person/thing → is · you or plural → are."},
  {id:"en-do",level:"A1",title:"do, does, did",sub:"Questions and negatives",explain:"Use do with I/you/we/they, does with he/she/it, and did in the past. After do/does/did, use the base verb.",examples:["Do you work here?","Does she drive?","He does not know.","Did they arrive?"],tip:"Say Does she work? not Does she works?"},
  {id:"en-present",level:"A2",title:"Present simple vs continuous",sub:"Routine versus happening now",explain:"Present simple describes habits and facts. Present continuous describes something happening now or around now.",examples:["I work Monday to Friday.","I am studying English now.","He drives a forklift.","They are checking stock."],tip:"Every day often signals simple present; now often signals continuous."},
  {id:"en-past",level:"A2",title:"Past simple",sub:"Finished actions",explain:"Use past simple for finished events at a known past time. After did or didn't, return to the base verb.",examples:["I worked yesterday.","She went home early.","We checked the machine.","They did not come."],tip:"didn't go, not didn't went."},
  {id:"en-perfect",level:"B1",title:"Present perfect",sub:"Past connected to now",explain:"Use have/has + past participle for experience or a situation that still matters now.",examples:["I have worked here for three years.","She has never been to China.","We have finished the report."],tip:"Use for with a duration and since with a starting point."},
  {id:"en-future",level:"B1",title:"Future forms",sub:"will, going to, present continuous",explain:"Use will for spontaneous decisions or predictions, going to for plans/evidence, and present continuous for arrangements.",examples:["I will call you.","I am going to study tonight.","I am meeting him tomorrow."],tip:"Choose the form by meaning, not only by the time word."},
  {id:"en-conditionals",level:"B2",title:"Conditionals",sub:"Real and hypothetical situations",explain:"First conditional is realistic future possibility. Second conditional is hypothetical.",examples:["If I have time, I will study.","If I had more time, I would practice."],tip:"First conditional normally uses present after if, not will."},
  {id:"en-native",level:"B2",title:"Sound more natural",sub:"Chunks and collocations",explain:"Fluency improves when you learn common word groups instead of translating word by word.",examples:["That makes sense.","I am not really sure yet.","Let me check.","It depends on the situation."],tip:"Reuse complete chunks until they become automatic."},
  {id:"en-academic",level:"C1",title:"Academic & test English",sub:"TOEFL/IELTS-style structure",explain:"Train clause structure, transitions, reference words, inference, paraphrase, and precise vocabulary.",examples:["Although demand increased, output remained stable.","The evidence suggests that...","In contrast, the second study found..."],tip:"For reading, prove the answer from the passage."}
 ],
 zh:[
  {id:"zh-pinyin",level:"Starter",title:"Pinyin & four tones",sub:"Pronunciation from zero",explain:"Mandarin uses four main tones plus a neutral tone. Tone changes meaning, so learn sound and tone together.",examples:["mā 妈 — mother","má 麻 — hemp","mǎ 马 — horse","mà 骂 — scold"],tip:"Never memorize Hanzi without pronunciation and tone."},
  {id:"zh-greetings",level:"Starter",title:"Greetings & introductions",sub:"Your first conversation",explain:"Learn short chunks for greeting, introducing yourself, and asking a name.",examples:["你好。Nǐ hǎo.","我叫 Royyan。Wǒ jiào Royyan.","你叫什么名字？Nǐ jiào shénme míngzi?"],tip:"Practice the whole sentence aloud."},
  {id:"zh-shi",level:"HSK1",title:"是, 有, 在",sub:"Be, have, be located",explain:"是 links nouns, 有 means have/exist, and 在 marks location. Adjectives normally do not need 是.",examples:["我是学生。","我有时间。","我在公司。","我很忙。"],tip:"Say 我很忙, not 我是很忙."},
  {id:"zh-negation",level:"HSK1",title:"不 and 没有",sub:"Two common negatives",explain:"不 often negates habits, states, or future actions. 没(有) often negates possession or completed actions.",examples:["我不喝咖啡。","我没有时间。","我昨天没去。"],tip:"有 is normally negated as 没有, not 不有."},
  {id:"zh-time",level:"HSK1",title:"Numbers, dates & time",sub:"Everyday Mandarin",explain:"Build dates and time from number words plus simple time units.",examples:["三点 — sān diǎn","今天 — jīntiān","星期五 — xīngqīwǔ","九月 — jiǔ yuè"],tip:"Say time from larger unit to smaller unit."},
  {id:"zh-measure",level:"HSK2",title:"Measure words",sub:"个, 本, 杯 and more",explain:"A number usually needs a measure word before a noun.",examples:["一个人","两本书","三杯水","一辆车"],tip:"Learn nouns together with their common measure word."},
  {id:"zh-le",level:"HSK2",title:"了",sub:"Completion and change",explain:"了 can mark a completed event or a changed situation. It is not simply a past-tense ending.",examples:["我吃了。","下雨了。","我买了两本书。"],tip:"Think completion or change, not simply past."},
  {id:"zh-compare",level:"HSK3",title:"Comparisons with 比",sub:"A is more ... than B",explain:"Use A + 比 + B + adjective for a basic comparison.",examples:["今天比昨天热。","他比我高。","中文比以前容易一点。"],tip:"The basic 比 pattern does not need 很 after the adjective."},
  {id:"zh-ba",level:"HSK3",title:"把 sentences",sub:"What happens to an object",explain:"把 moves a specific object before the verb when you emphasize how it is handled or changed.",examples:["请把门关上。","我把作业做完了。","把手机放在桌上。"],tip:"The object after 把 is usually specific or already known."},
  {id:"zh-natural",level:"HSK4",title:"Natural conversation",sub:"Reusable native-like chunks",explain:"Natural Mandarin relies on common sentence frames, particles, and context.",examples:["没问题。","真的吗？","我觉得可以。","等一下。"],tip:"Shadow short chunks and reuse them in conversation."}
 ]
};

const QUESTIONS:Record<Lang,Question[]>={
 en:[
  {id:"e1",type:"grammar",level:"A1",prompt:"My friends ___ at work.",choices:["am","is","are"],answer:"are",why:"Friends is plural, so use are."},
  {id:"e2",type:"grammar",level:"A1",prompt:"___ your brother live here?",choices:["Do","Does","Is"],answer:"Does",why:"Your brother = he, so use does + base verb."},
  {id:"e3",type:"grammar",level:"A2",prompt:"Yesterday, I ___ home late.",choices:["come","came","have come"],answer:"came",why:"Yesterday signals a finished past time."},
  {id:"e4",type:"grammar",level:"B1",prompt:"I ___ here for three years.",choices:["work","worked","have worked"],answer:"have worked",why:"The situation began in the past and continues now."},
  {id:"e5",type:"vocab",level:"A2",prompt:"Choose the closest meaning of improve.",choices:["make better","make slower","remove"],answer:"make better",why:"Improve means to make or become better."},
  {id:"e6",type:"reading",level:"B1",prompt:"Remote work can improve focus, but spontaneous collaboration may decline. What may decrease?",choices:["Internet speed","Casual collaboration","Focus"],answer:"Casual collaboration",why:"The passage says spontaneous collaboration may decline."},
  {id:"e7",type:"listening",level:"A2",prompt:"Listen and choose tonight's plan.",choices:["Study English","Go to the factory","Buy a motorcycle"],answer:"Study English",why:"The speaker says: I am going to study English tonight.",audio:"I am going to study English tonight."},
  {id:"e8",type:"writing",level:"A1",prompt:"Write one sentence about your job or daily routine.",why:"I will check common grammar patterns and save useful corrections."}
 ],
 zh:[
  {id:"z1",type:"grammar",level:"HSK1",prompt:"两 ___ 书",choices:["个","本","杯"],answer:"本",why:"本 is a common measure word for books."},
  {id:"z2",type:"grammar",level:"HSK1",prompt:"Choose: I am at the company.",choices:["我在公司。","我是公司。","我有公司。"],answer:"我在公司。",why:"在 marks location."},
  {id:"z3",type:"grammar",level:"HSK1",prompt:"Choose: I don't have time.",choices:["我不有时间。","我没有时间。","我不是时间。"],answer:"我没有时间。",why:"有 is normally negated with 没有."},
  {id:"z4",type:"vocab",level:"HSK1",prompt:"工作 (gōngzuò) means…",choices:["study","work","eat"],answer:"work",why:"工作 means work/to work."},
  {id:"z5",type:"reading",level:"HSK2",prompt:"我今天很忙，但是晚上有时间。When does the speaker have time?",choices:["Morning","Evening","All day"],answer:"Evening",why:"晚上 means evening."},
  {id:"z6",type:"listening",level:"HSK1",prompt:"Listen and choose the meaning.",choices:["I study Chinese","I work in China","I like Chinese food"],answer:"I study Chinese",why:"我学习中文 means I study Chinese.",audio:"我学习中文。"},
  {id:"z7",type:"writing",level:"HSK1",prompt:"Write a short Chinese sentence about yourself.",why:"I will check several common beginner patterns."}
 ]
};

const WORDS:Record<Lang,{word:string;reading?:string;meaning:string;example:string;level:string}[]>={
 en:[
  {word:"work",meaning:"bekerja; pekerjaan",example:"I work every weekday.",level:"A1"},
  {word:"busy",meaning:"sibuk",example:"She is busy right now.",level:"A1"},
  {word:"improve",meaning:"meningkatkan",example:"I want to improve my speaking.",level:"A2"},
  {word:"confident",meaning:"percaya diri",example:"I want to sound more confident.",level:"A2"},
  {word:"reliable",meaning:"dapat diandalkan",example:"We need a reliable system.",level:"B1"},
  {word:"maintain",meaning:"memelihara; mempertahankan",example:"We maintain the equipment regularly.",level:"B1"},
  {word:"nevertheless",meaning:"meskipun demikian",example:"It was difficult; nevertheless, we finished.",level:"B2"},
  {word:"significant",meaning:"signifikan; penting",example:"There was a significant improvement.",level:"B2"}
 ],
 zh:[
  {word:"你好",reading:"nǐ hǎo",meaning:"halo",example:"你好，很高兴认识你。",level:"Starter"},
  {word:"谢谢",reading:"xièxie",meaning:"terima kasih",example:"谢谢你的帮助。",level:"Starter"},
  {word:"学习",reading:"xuéxí",meaning:"belajar",example:"我学习中文。",level:"HSK1"},
  {word:"工作",reading:"gōngzuò",meaning:"bekerja; pekerjaan",example:"我在公司工作。",level:"HSK1"},
  {word:"时间",reading:"shíjiān",meaning:"waktu",example:"我今天没有时间。",level:"HSK1"},
  {word:"觉得",reading:"juéde",meaning:"merasa; berpikir",example:"我觉得可以。",level:"HSK2"},
  {word:"因为",reading:"yīnwèi",meaning:"karena",example:"因为下雨，所以我没去。",level:"HSK2"},
  {word:"经验",reading:"jīngyàn",meaning:"pengalaman",example:"我有三年的工作经验。",level:"HSK3"}
 ]
};

const GUIDE:Record<Lang,{title:string;body:string;mini:string}[]>={
 en:[
  {title:"Subject map",body:"I/you/we/they use do. He/she/it uses does. Everyone uses did for past questions.",mini:"Do you...? · Does she...? · Did they...?"},
  {title:"Verb map",body:"After do, does, did, can, will, would, and should, use the base verb.",mini:"Does he work? · Did she go? · She can drive."},
  {title:"Tense map",body:"Simple present = routine. Continuous = now. Past simple = finished past. Present perfect = past connected to now.",mini:"I work · I am working · I worked · I have worked"},
  {title:"Ownership",body:"my/your/his/her come before nouns. mine/yours/his/hers stand alone.",mini:"my phone · this phone is mine"}
 ],
 zh:[
  {title:"Basic order",body:"A common order is Subject + Time + Place + Verb + Object.",mini:"我今天在公司工作。"},
  {title:"是 vs 很",body:"是 usually links nouns. Adjectives often use 很 or stand as predicates.",mini:"我是学生。· 我很忙。"},
  {title:"不 vs 没",body:"不 often negates habits/states; 没 often negates possession or completed actions.",mini:"我不喝咖啡。· 我没有时间。"},
  {title:"Measure words",body:"Numbers usually need a measure word before nouns.",mini:"一个人 · 两本书 · 三杯水"}
 ]
};

const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function correctEnglish(input:string){
 let c=input.trim().replace(/\s+/g," "), reasons:string[]=[];
 const rules:Array<[RegExp,string,string]>=[
  [/\bI is\b/gi,"I am","Use am with I."],
  [/\bI are\b/gi,"I am","Use am with I."],
  [/\bshe don't\b/gi,"she doesn't","Use doesn't with she/he/it."],
  [/\bhe don't\b/gi,"he doesn't","Use doesn't with she/he/it."],
  [/\bdoesn't has\b/gi,"doesn't have","After doesn't, use the base verb."],
  [/\bdidn't went\b/gi,"didn't go","After didn't, use the base verb."],
  [/\bdidn't came\b/gi,"didn't come","After didn't, use the base verb."],
  [/\bshe have\b/gi,"she has","Use has with she/he/it."],
  [/\bhe have\b/gi,"he has","Use has with she/he/it."],
  [/\bI have went\b/gi,"I have gone","Present perfect uses the past participle gone."],
  [/\bmore better\b/gi,"better","Better is already comparative."]
 ];
 for(const [rx,to,why] of rules){if(rx.test(c)){rx.lastIndex=0;c=c.replace(rx,to);reasons.push(why);}}
 if(c && !/[.!?]$/.test(c))c+=".";
 if(c)c=c[0].toUpperCase()+c.slice(1);
 return {corrected:c,reason:reasons.join(" ")};
}
function correctChinese(input:string){
 let c=input.trim(),reasons:string[]=[];
 const rules:Array<[string,string,string]>=[
  ["我是很忙","我很忙","Adjectives like 忙 normally do not use 是 here."],
  ["我不有时间","我没有时间","Use 没有 to negate 有."],
  ["我不有","我没有","Use 没有 rather than 不有."],
  ["我在公司是工作","我在公司工作","Do not put 是 before a normal action verb."]
 ];
 for(const [from,to,why] of rules){if(c.includes(from)){c=c.replace(from,to);reasons.push(why);}}
 return {corrected:c,reason:reasons.join(" ")};
}
function follow(lang:Lang,mode:State["convo"]){
 const en={daily:["What was the best part of your day?","What are you doing tonight?","Tell me one thing that annoyed you today."],work:["What was your most important task today?","What problem did you solve at work?","How would you explain your job to a new coworker?"],travel:["Where would you like to travel next?","How would you ask hotel staff for help?","What do you prepare before a trip?"],interview:["Tell me about yourself in three sentences.","What strength can you prove with an example?","Describe a problem you solved at work."]};
 const zh={daily:["你今天做了什么？ Nǐ jīntiān zuò le shénme?","明天你想做什么？ Míngtiān nǐ xiǎng zuò shénme?"],work:["你今天工作忙吗？ Nǐ jīntiān gōngzuò máng ma?","你在公司做什么工作？"],travel:["你想去哪个城市？","你喜欢坐火车还是飞机？"],interview:["请介绍一下你的工作经验。","你的优点是什么？"]};
 const a=(lang==="en"?en:zh)[mode]; return a[Math.floor(Math.random()*a.length)];
}

export default function Page(){
 const [s,setS]=useState<State>(DEFAULT),[ready,setReady]=useState(false);
 const [lesson,setLesson]=useState<Lesson|null>(null),[learnTab,setLearnTab]=useState<"path"|"guide">("path");
 const [mode,setMode]=useState<Mode>("grammar"),[qi,setQi]=useState(0),[picked,setPicked]=useState<string|null>(null);
 const [writing,setWriting]=useState(""),[writingResult,setWritingResult]=useState<{corrected:string;reason:string}|null>(null);
 const [input,setInput]=useState(""),[mic,setMic]=useState(false),[search,setSearch]=useState("");\n const [aiBusy,setAiBusy]=useState(false),[aiProvider,setAiProvider]=useState("local");
 const end=useRef<HTMLDivElement|null>(null);

 useEffect(()=>{try{const raw=localStorage.getItem("lingomate-v2");if(raw)setS({...DEFAULT,...JSON.parse(raw)});}catch{};if("serviceWorker"in navigator)navigator.serviceWorker.getRegistrations().then(x=>x.forEach(r=>r.unregister())).catch(()=>{});setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem("lingomate-v2",JSON.stringify(s))},[s,ready]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"})},[s.chat]);

 const levels=s.lang==="en"?EN_LEVELS:ZH_LEVELS, level=s.lang==="en"?s.enLevel:s.zhLevel;
 const levelIndex=Math.max(0,levels.findIndex(x=>x[0]===level)), allowed=new Set(levels.slice(0,levelIndex+1).map(x=>x[0]));
 const lessons=LESSONS[s.lang].filter(x=>allowed.has(x.level));
 const qs=useMemo(()=>{const a=QUESTIONS[s.lang].filter(x=>x.type===mode);return a.length?a:QUESTIONS[s.lang].filter(x=>x.type==="grammar")},[s.lang,mode]);
 const q=qs[qi%qs.length],accuracy=s.answered?Math.round(s.correct/s.answered*100):0,done=s.done.filter(x=>x.startsWith(s.lang+"-")).length;
 const progress=Math.round(done/LESSONS[s.lang].length*100);
 const update=(p:Partial<State>)=>setS(v=>({...v,...p}));
 const nav=(view:View)=>{setLesson(null);setPicked(null);update({view})};
 const addMistake=(source:string,correction:string,reason:string,category:string)=>setS(v=>v.mistakes.some(m=>m.source===source&&m.correction===correction)?v:{...v,mistakes:[{id:id(),source,correction,reason,category,mastered:false},...v.mistakes].slice(0,80)});

 function speak(text:string,lang=s.lang){if(!("speechSynthesis"in window))return;const u=new SpeechSynthesisUtterance(text);u.lang=lang==="zh"?"zh-CN":"en-US";u.rate=lang==="zh"?.82:.9;speechSynthesis.cancel();speechSynthesis.speak(u)}
 function listen(){const W=window as any,R=W.SpeechRecognition||W.webkitSpeechRecognition;if(!R)return alert("Gunakan Chrome/Edge untuk voice input.");const r=new R();r.lang=s.lang==="zh"?"zh-CN":"en-US";setMic(true);r.onresult=(e:any)=>{setInput(e.results[0][0].transcript);setMic(false)};r.onerror=()=>setMic(false);r.onend=()=>setMic(false);r.start()}
 function answer(choice:string){if(picked)return;setPicked(choice);const ok=choice===q.answer;setS(v=>({...v,answered:v.answered+1,correct:v.correct+(ok?1:0),xp:v.xp+(ok?10:3)}));if(!ok)addMistake(q.prompt,q.answer||"",q.why,"Practice · "+mode)}
 async function checkWriting(){
  const text=writing.trim();if(!text||aiBusy)return;setAiBusy(true);
  try{
   const res=await fetch("/api/tutor",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:"writing",lang:s.lang,level,mode:"writing",message:text,history:[]})});
   if(!res.ok)throw new Error("ai_unavailable");
   const data=await res.json();setAiProvider(data.provider||"ai");
   const c=data.correction,result={corrected:c?.needed?c.corrected:text,reason:c?.needed?c.reason:""};
   setWritingResult(result);if(c?.needed)addMistake(text,c.corrected,c.reason,"Writing · "+(c.category||"Correction"));
  }catch{
   const r=s.lang==="en"?correctEnglish(text):correctChinese(text);setWritingResult(r);
   if(r.reason&&r.corrected.trim()!==text)addMistake(text,r.corrected,r.reason,"Writing · local");setAiProvider("local");
  }finally{setS(v=>({...v,xp:v.xp+5}));setAiBusy(false)}
 }
 async function send(){
  const text=input.trim();if(!text||aiBusy)return;
  const history=s.chat.slice(-10).map(x=>({role:x.role,text:x.text})),user:Chat={id:id(),role:"user",text};
  setS(v=>({...v,chat:[...v.chat,user],xp:v.xp+5}));setInput("");setAiBusy(true);
  try{
   const res=await fetch("/api/tutor",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task:"conversation",lang:s.lang,level,mode:s.convo,message:text,history})});
   if(!res.ok)throw new Error("ai_unavailable");
   const data=await res.json();setAiProvider(data.provider||"ai");
   const c=data.correction,changed=Boolean(c?.needed&&c.corrected);
   if(changed)addMistake(text,c.corrected,c.reason,"Conversation · "+(c.category||"Correction"));
   const tutor:Chat={id:id(),role:"tutor",text:data.reply||follow(s.lang,s.convo),correction:changed?{original:c.original||text,corrected:c.corrected,reason:c.reason}:undefined};
   setS(v=>({...v,chat:[...v.chat,tutor]}));setTimeout(()=>speak(tutor.text),100);
  }catch{
   const r=s.lang==="en"?correctEnglish(text):correctChinese(text),changed=!!r.reason&&r.corrected.trim()!==text;
   if(changed)addMistake(text,r.corrected,r.reason,"Conversation · local");
   const tutorText=changed?(s.lang==="en"?"A more natural version is: "+r.corrected+" ":"更自然可以说："+r.corrected+"。 ")+follow(s.lang,s.convo):follow(s.lang,s.convo);
   const tutor:Chat={id:id(),role:"tutor",text:tutorText,correction:changed?{original:text,corrected:r.corrected,reason:r.reason}:undefined};
   setS(v=>({...v,chat:[...v.chat,tutor]}));setAiProvider("local");setTimeout(()=>speak(tutorText),100);
  }finally{setAiBusy(false)}
 }
 function ensureChat(){if(s.chat.length)return;const text=s.lang==="en"?"Hi Royyan. Speak naturally. I will correct useful mistakes, not interrupt every sentence. "+follow("en",s.convo):"你好 Royyan。自然地说就可以，我会帮你改重要的错误。 "+follow("zh",s.convo);setS(v=>({...v,chat:[{id:id(),role:"tutor",text}]}))}
 useEffect(()=>{if(s.view==="talk")ensureChat()},[s.view,s.lang,s.convo]);

 if(!ready)return <main className="loading"><div className="logo">L</div><p>Preparing LingoMate…</p></main>;
 const menu:Array<[View,string,string]>=[["home","⌂","Home"],["learn","▤","Learn"],["practice","✓","Practice"],["talk","◉","Talk"],["review","↺","Review"],["dictionary","Aa","Dictionary"]];

 return <div className="shell">
  <aside className="side"><div className="brand"><div className="logo">L</div><div><b>LingoMate</b><small>English · 中文</small></div></div>
   <nav>{menu.map(x=><button key={x[0]} className={s.view===x[0]?"active":""} onClick={()=>nav(x[0])}><span>{x[1]}</span>{x[2]}</button>)}</nav>
   <div className="sideFoot"><div><span>LV</span><p><b>{Math.floor(s.xp/100)+1}</b><small>{s.xp} XP</small></p></div><div><span className="avatar">R</span><p><b>Royyan</b><small>{s.streak} day streak 🔥</small></p></div></div>
  </aside>
  <main className="main">
   <header><div><small>{s.lang==="en"?"ENGLISH":"MANDARIN CHINESE"}</small><h1>{s.view==="home"?"Build real language skills.":menu.find(x=>x[0]===s.view)?.[2]}</h1></div>
    <div className="controls"><select value={level} onChange={e=>s.lang==="en"?update({enLevel:e.target.value}):update({zhLevel:e.target.value})}>{levels.map(x=><option key={x[0]} value={x[0]}>{x[0]} · {x[1]}</option>)}</select><div><button className={s.lang==="en"?"active":""} onClick={()=>update({lang:"en",chat:[]})}>English</button><button className={s.lang==="zh"?"active red":""} onClick={()=>update({lang:"zh",chat:[]})}>中文</button></div></div>
   </header>

   {s.view==="home"&&<section className="page">
    <div className="hero"><div><span>{level} · PERSONALIZED PATH</span><h2>{s.lang==="en"?"Stop translating. Start thinking in English.":"从零开始，真正开口说中文。"}</h2><p>{s.lang==="en"?"Grammar, TOEFL/IELTS-style tasks, listening, writing, speaking and natural conversation in one loop.":"从拼音和声调开始，到词汇、语法、听力、写作和自然对话。每次错误都会变成你的复习材料。"}</p><div><button onClick={()=>nav("learn")}>Continue learning →</button><button onClick={()=>nav("talk")}>🎙 Start conversation</button></div></div><aside><b>{progress}%</b><small>course progress</small></aside></div>
    <div className="stats"><article>🔥<div><b>{s.streak}</b><small>day streak</small></div></article><article>✦<div><b>{s.xp}</b><small>total XP</small></div></article><article>✓<div><b>{accuracy}%</b><small>accuracy</small></div></article><article>↺<div><b>{s.mistakes.filter(m=>!m.mastered).length}</b><small>review cards</small></div></article></div>
    <div className="sectionTitle"><small>TODAY</small><h2>What should you do next?</h2></div><div className="next"><button onClick={()=>nav("learn")}><i>01</i><p><b>Continue your path</b><span>{lessons.find(x=>!s.done.includes(x.id))?.title||"Review lessons"}</span></p>→</button><button onClick={()=>nav("practice")}><i>02</i><p><b>Quick practice</b><span>Grammar, reading, listening, writing</span></p>→</button><button onClick={()=>nav("talk")}><i>03</i><p><b>Natural conversation</b><span>Speak or type, get corrections</span></p>→</button></div>
   </section>}

   {s.view==="learn"&&<section className="page">
    <div className="tabs"><button className={learnTab==="path"?"active":""} onClick={()=>setLearnTab("path")}>Learning path</button><button className={learnTab==="guide"?"active":""} onClick={()=>setLearnTab("guide")}>Grammar guide</button></div>
    {lesson?<article className="lessonDetail"><button className="back" onClick={()=>setLesson(null)}>← Back to lessons</button><span className="pill">{lesson.level}</span><h2>{lesson.title}</h2><p className="lead">{lesson.sub}</p><div className="concept"><small>CONCEPT</small><p>{lesson.explain}</p></div><div className="examples">{lesson.examples.map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><p>{x}</p><button onClick={()=>speak(x)}>🔊</button></div>)}</div><div className="tip"><b>Remember</b><p>{lesson.tip}</p></div><button className="primary full" onClick={()=>{if(!s.done.includes(lesson.id))setS(v=>({...v,done:[...v.done,lesson.id],xp:v.xp+25}));setLesson(null)}}>{s.done.includes(lesson.id)?"Completed ✓":"Mark complete · +25 XP"}</button></article>
    :learnTab==="path"?<><div className="pathHead"><div><small>YOUR LEVEL · {level}</small><h2>{s.lang==="en"?"English learning path":"中文学习路线"}</h2><p>Change your level anytime. Lessons below include everything up to your selected level.</p></div><aside><b>{done}/{LESSONS[s.lang].length}</b><span>lessons complete</span><div><i style={{width:progress+"%"}}/></div></aside></div><div className="lessonGrid">{lessons.map((x,i)=><button key={x.id} onClick={()=>setLesson(x)}><span className={s.done.includes(x.id)?"done":""}>{s.done.includes(x.id)?"✓":String(i+1).padStart(2,"0")}</span><p><small>{x.level}</small><b>{x.title}</b><em>{x.sub}</em></p>→</button>)}</div></>
    :<div className="guide">{GUIDE[s.lang].map((x,i)=><article key={x.title}><small>0{i+1}</small><h3>{x.title}</h3><p>{x.body}</p><code>{x.mini}</code></article>)}</div>}
   </section>}

   {s.view==="practice"&&q&&<section className="page">
    <div className="tabs modes">{(["grammar","vocab","reading","listening","writing"] as Mode[]).map(x=><button key={x} className={mode===x?"active":""} onClick={()=>{setMode(x);setQi(0);setPicked(null);setWritingResult(null)}}>{x}</button>)}</div>
    <div className="practice"><article className="question"><div className="meta"><span>{q.level}</span><span>{mode.toUpperCase()}</span><span>{(qi%qs.length)+1}/{qs.length}</span></div>{mode==="listening"&&<button className="listen" onClick={()=>speak(q.audio||"")}>▶ Listen to prompt</button>}<h2>{q.prompt}</h2>
     {mode==="writing"?<><textarea value={writing} onChange={e=>setWriting(e.target.value)} placeholder={s.lang==="en"?"Example: I is work in Karawang every day":"例如：我是很忙，但是我学习中文"}/><button className="primary" disabled={aiBusy} onClick={checkWriting}>{aiBusy?"AI checking…":"Check my writing"}</button>{writingResult&&<div className={"feedback "+(writingResult.reason?"bad":"good")}><b>{writingResult.reason?"Correction":"Looks good ✓"}</b><p>{writingResult.corrected}</p>{writingResult.reason&&<small>{writingResult.reason}</small>}</div>}</>
     :<><div className="choices">{q.choices?.map((x,i)=>{const cls=picked?(x===q.answer?"correct":x===picked?"wrong":""):"";return <button className={cls} disabled={!!picked} key={x} onClick={()=>answer(x)}><span>{String.fromCharCode(65+i)}</span>{x}</button>})}</div>{picked&&<div className={"feedback "+(picked===q.answer?"good":"bad")}><div><b>{picked===q.answer?"Correct ✓":"Not quite"}</b><p>{q.why}</p></div><button onClick={()=>{setQi(v=>v+1);setPicked(null)}}>Next →</button></div>}</>}
    </article><aside className="practiceSide"><div><small>SESSION ACCURACY</small><b>{accuracy}%</b><p>{s.correct} correct from {s.answered} answered</p></div><div><small>WHY THIS MATTERS</small><p>{s.lang==="en"?"Test-style questions build recognition; explanations build understanding.":"先理解句型，再反复练习。错误会自动进入复习本。"}</p></div></aside></div>
   </section>}

   {s.view==="talk"&&<section className="page talkPage">
    <div className="tabs modes">{(["daily","work","travel","interview"] as State["convo"][]).map(x=><button key={x} className={s.convo===x?"active":""} onClick={()=>update({convo:x,chat:[]})}>{x}</button>)}</div><div className="talk"><article className="chat"><div className="chatHead"><span>LM</span><p><b>Conversation Tutor</b><small>Natural corrections · {s.convo}</small></p><i>● {aiBusy?"thinking":aiProvider}</i></div><div className="messages">{s.chat.map(m=><div key={m.id} className={"message "+m.role}><p>{m.text}</p>{m.correction&&<div className="correction"><small>CORRECTION</small><s>{m.correction.original}</s><b>{m.correction.corrected}</b><em>{m.correction.reason}</em></div>}</div>)}<div ref={end}/></div><div className="composer"><button className={mic?"on":""} onClick={listen}>{mic?"●":"🎙"}</button><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={s.lang==="en"?"Type or speak naturally…":"输入中文或点击麦克风说话…"}/><button disabled={aiBusy} onClick={send}>{aiBusy?"…":"Send"}</button></div></article><aside className="coach"><small>LIVE COACH</small><h3>Speak first. Study the correction second.</h3><p>The tutor keeps the conversation moving and saves useful mistakes.</p><div><span>Conversation mistakes</span><b>{s.mistakes.filter(m=>m.category==="Conversation").length}</b></div><button onClick={()=>nav("review")}>Open error notebook →</button></aside></div>
   </section>}

   {s.view==="review"&&<section className="page"><div className="reviewHead"><div><small>PERSONAL ERROR NOTEBOOK</small><h2>Your mistakes are your syllabus.</h2><p>Wrong answers, writing corrections, and conversation mistakes collect here automatically.</p></div><aside><b>{s.mistakes.filter(m=>!m.mastered).length}</b><span>active cards</span></aside></div>{s.mistakes.length===0?<div className="empty"><b>✓</b><h3>No mistakes yet</h3><p>Practice or talk with the tutor. Corrections will appear here.</p><button className="primary" onClick={()=>nav("practice")}>Start practice</button></div>:<div className="mistakes">{s.mistakes.map(m=><article className={m.mastered?"mastered":""} key={m.id}><header><span>{m.category}</span><small>{m.mastered?"MASTERED":"REVIEW"}</small></header><s>{m.source}</s><b>→ {m.correction}</b><p>{m.reason}</p><footer><button onClick={()=>speak(m.correction)}>🔊 Listen</button><button onClick={()=>setS(v=>({...v,mistakes:v.mistakes.map(x=>x.id===m.id?{...x,mastered:!x.mastered}:x)}))}>{m.mastered?"Return to review":"Mark mastered ✓"}</button></footer></article>)}</div>}</section>}

   {s.view==="dictionary"&&<section className="page"><div className="dictHead"><div><small>VOCABULARY & WORDBOOK</small><h2>Search, listen, save, reuse.</h2></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={s.lang==="en"?"Search word or meaning…":"搜索汉字、拼音或意思…"}/></div><div className="words">{WORDS[s.lang].filter(x=>!search||(x.word+" "+(x.reading||"")+" "+x.meaning).toLowerCase().includes(search.toLowerCase())).map(x=>{const saved=s.saved.includes(x.word);return <article key={x.word}><header><span>{x.level}</span><button className={saved?"saved":""} onClick={()=>setS(v=>({...v,saved:saved?v.saved.filter(w=>w!==x.word):[...v.saved,x.word]}))}>{saved?"★ Saved":"☆ Save"}</button></header><h3>{x.word}</h3>{x.reading&&<b className="reading">{x.reading}</b>}<p>{x.meaning}</p><footer><span>{x.example}</span><button onClick={()=>speak(x.word+". "+x.example)}>🔊</button></footer></article>})}</div><div className="savedBar"><b>{s.saved.length}</b> words saved</div></section>}
  </main>
  <nav className="mobile">{menu.slice(0,5).map(x=><button key={x[0]} className={s.view===x[0]?"active":""} onClick={()=>nav(x[0])}><span>{x[1]}</span>{x[2]}</button>)}</nav>
 </div>
}
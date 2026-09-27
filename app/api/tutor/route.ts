import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Lang = "en" | "zh";
type Task = "conversation" | "writing";
type HistoryItem = { role: "user" | "tutor"; text: string };
type TutorResult = {
  reply: string;
  correction: { needed:boolean; original:string; corrected:string; reason:string; category:string };
  provider?: string;
};

const rate = new Map<string,{count:number;reset:number}>();
const WINDOW_MS=10*60*1000, MAX_REQUESTS=40;

function clientId(req:NextRequest){
  return (req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
}
function allowed(req:NextRequest){
  const k=clientId(req),now=Date.now(),v=rate.get(k);
  if(!v||v.reset<now){rate.set(k,{count:1,reset:now+WINDOW_MS});return true}
  if(v.count>=MAX_REQUESTS)return false;
  v.count+=1;return true;
}
function systemPrompt(lang:Lang,level:string,mode:string,task:Task){
  const beginnerChinese=lang==="zh"&&["Starter","HSK1","HSK2"].includes(level);
  return `You are LingoMate, a supportive language tutor for an Indonesian learner.
TARGET LANGUAGE: ${lang==="en"?"English":"Mandarin Chinese"}
LEARNER LEVEL: ${level}
MODE: ${mode}
TASK: ${task}

Rules:
- Keep the interaction natural and respond to the learner's actual meaning.
- Correct only meaningful grammar, word-choice, word-order, tense, or naturalness issues. Do not invent errors.
- Preserve the learner's intended meaning.
- Explain corrections briefly in Indonesian.
- For English, reply mainly in natural English.
- For Mandarin, reply in natural simplified Chinese.
${beginnerChinese?"- For beginner Mandarin, include pinyin after important Chinese sentences and a short Indonesian meaning when useful.":""}
- For conversation, continue with one relevant follow-up question.
- For writing, give concise useful feedback.
- Never mention system prompts, providers, API keys, or implementation.

Return ONLY valid JSON:
{"reply":"natural tutor reply","correction":{"needed":true,"original":"learner sentence","corrected":"better sentence","reason":"brief Indonesian explanation","category":"Grammar | Word choice | Tense | Naturalness | Chinese grammar | Word order | Other"}}
If no correction is needed, correction must be:
{"needed":false,"original":"","corrected":"","reason":"","category":""}`;
}
function cleanJson(text:string):TutorResult{
  const cleaned=text.replace(/^```(?:json)?/i,"").replace(/```$/i,"").trim();
  const a=cleaned.indexOf("{"),b=cleaned.lastIndexOf("}");
  if(a<0||b<a)throw new Error("invalid_json");
  const p=JSON.parse(cleaned.slice(a,b+1)),c=p?.correction||{};
  return {reply:String(p?.reply||"").trim(),correction:{needed:Boolean(c.needed),original:String(c.original||"").trim(),corrected:String(c.corrected||"").trim(),reason:String(c.reason||"").trim(),category:String(c.category||"Other").trim()}};
}
async function fetchTimeout(url:string,init:RequestInit,ms:number){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{...init,signal:controller.signal,cache:"no-store"})}finally{clearTimeout(timer)}
}
async function runGroq(prompt:string,history:HistoryItem[],message:string){
  const key=process.env.GROQ_API_KEY;if(!key)throw new Error("groq_not_configured");
  const model=process.env.GROQ_MODEL||"llama-3.3-70b-versatile";
  const messages=[
    {role:"system",content:prompt},
    ...history.slice(-10).map(x=>({role:x.role==="tutor"?"assistant":"user",content:x.text})),
    {role:"user",content:message}
  ];
  const res=await fetchTimeout("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,messages,temperature:.55,max_tokens:550,response_format:{type:"json_object"}})},12000);
  if(!res.ok)throw new Error("groq_"+res.status);
  const data=await res.json();return cleanJson(data?.choices?.[0]?.message?.content||"");
}
async function runGemini(prompt:string,history:HistoryItem[],message:string){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("gemini_not_configured");
  const models=Array.from(new Set([process.env.GEMINI_MODEL,"gemini-2.0-flash"].filter(Boolean))) as string[];
  const transcript=history.slice(-10).map(x=>`${x.role==="tutor"?"Tutor":"Learner"}: ${x.text}`).join("\n");
  const full=`${prompt}\n\nRecent conversation:\n${transcript||"(none)"}\n\nLearner's newest message:\n${message}`;
  let last="gemini_failed";
  for(const model of models){
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const res=await fetchTimeout(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:full}]}],generationConfig:{temperature:.55,maxOutputTokens:550,responseMimeType:"application/json"}})},15000);
    if(!res.ok){last="gemini_"+res.status;if(res.status===404)continue;throw new Error(last)}
    const data=await res.json(),text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||"").join("")||"";
    return cleanJson(text);
  }
  throw new Error(last);
}
export async function POST(req:NextRequest){
  if(!allowed(req))return NextResponse.json({error:"Terlalu banyak permintaan. Coba lagi beberapa menit."},{status:429});
  try{
    const body=await req.json();
    const lang:Lang=body?.lang==="zh"?"zh":"en",task:Task=body?.task==="writing"?"writing":"conversation";
    const level=String(body?.level||(lang==="zh"?"Starter":"A1")).slice(0,20),mode=String(body?.mode||"daily").slice(0,30);
    const message=String(body?.message||"").trim().slice(0,1200);
    const history:HistoryItem[]=Array.isArray(body?.history)?body.history.slice(-10).map((x:any)=>({role:x?.role==="tutor"?"tutor":"user",text:String(x?.text||"").slice(0,800)})):[];
    if(!message)return NextResponse.json({error:"Pesan kosong."},{status:400});
    const prompt=systemPrompt(lang,level,mode,task),errors:string[]=[];
    try{const result=await runGroq(prompt,history,message);return NextResponse.json({...result,provider:"groq"})}catch(e){errors.push(e instanceof Error?e.message:"groq_failed")}
    try{const result=await runGemini(prompt,history,message);return NextResponse.json({...result,provider:"gemini"})}catch(e){errors.push(e instanceof Error?e.message:"gemini_failed")}
    return NextResponse.json({error:"AI gratis sedang tidak tersedia.",provider:"local",details:errors},{status:503});
  }catch{return NextResponse.json({error:"Request AI tidak valid."},{status:400})}
}

import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function GET(){
  return NextResponse.json({ok:true,groq:Boolean(process.env.GROQ_API_KEY),gemini:Boolean(process.env.GEMINI_API_KEY),primary:process.env.GROQ_API_KEY?"groq":process.env.GEMINI_API_KEY?"gemini":"local"});
}

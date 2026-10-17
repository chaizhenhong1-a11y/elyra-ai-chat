import {NextResponse} from "next/server";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "../..");
const configPath = path.join(root, "packages/shared/runtime-site-config.json");
const uploadDir = path.join(root, "apps/web/public/uploads");

export async function GET(){
  try { return NextResponse.json(JSON.parse(await readFile(configPath,"utf8"))); }
  catch { return NextResponse.json({error:"Appearance config unavailable"},{status:500}); }
}

export async function POST(request:Request){
  try {
    const form=await request.formData();
    const type=String(form.get("type")||"image");
    const overlayOpacity=Math.max(0,Math.min(0.8,Number(form.get("overlayOpacity")||0.38)));
    const glassOpacity=Math.max(0.2,Math.min(0.9,Number(form.get("glassOpacity")||0.52)));
    const accent=String(form.get("accent")||"#8daeff");
    let imageUrl=String(form.get("imageUrl")||"");
    const file=form.get("image");
    if(file instanceof File && file.size>0){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)) return NextResponse.json({error:"Use JPG, PNG or WEBP"},{status:400});
      if(file.size>8*1024*1024) return NextResponse.json({error:"Image must be 8 MB or smaller"},{status:400});
      await mkdir(uploadDir,{recursive:true});
      const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
      const name=`background-${Date.now()}.${ext}`;
      await writeFile(path.join(uploadDir,name),Buffer.from(await file.arrayBuffer()));
      imageUrl=`/uploads/${name}`;
    }
    const current=JSON.parse(await readFile(configPath,"utf8"));
    const next={...current,background:{...current.background,type,imageUrl,overlayOpacity},glassOpacity,accent};
    await writeFile(configPath,JSON.stringify(next,null,2));
    return NextResponse.json(next,{headers:{"Access-Control-Allow-Origin":"http://localhost:3001"}});
  } catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Save failed"},{status:500}); }
}
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:{"Access-Control-Allow-Origin":"http://localhost:3001","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}})}

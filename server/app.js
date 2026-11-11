import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { hashPassword, verifyPassword, hashToken, makeToken, newId } from "./auth.js";
import { accountSchema, postSchema } from "./validation.js";
import { originGuard, safeUser } from "./security.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);
const sessionDays = Math.max(1, Math.min(30, Number(process.env.SESSION_DAYS || 7)));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./server/uploads");
await mkdir(uploadDir, { recursive: true });
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.APP_ORIGIN?.startsWith("https://"))) {
  throw new Error("Production requires a 32+ character SESSION_SECRET and an HTTPS APP_ORIGIN.");
}
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(express.json({ limit: "32kb" }));
app.use(originGuard);

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const submitLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
const cookieName = "qp_session";
const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: sessionDays * 86400000 };
const statements = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email=? COLLATE NOCASE"),
  sessionUser: db.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?"),
  insertSession: db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash=?")
};
function requireUser(req,res,next){
  const token=req.cookies?.[cookieName] || parseCookie(req.headers.cookie,cookieName);
  if(!token)return res.status(401).json({error:"Authentication required."});
  const user=statements.sessionUser.get(hashToken(token),Date.now());
  if(!user || user.status!=="active")return res.status(401).json({error:"Session is invalid or account is not active."});
  req.user=user;req.sessionToken=token;next();
}
function requireAdmin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({error:"Administrator access required."});next();}
function parseCookie(header,name){for(const part of (header||"").split(";")){const [key,...value]=part.trim().split("=");if(key===name)return decodeURIComponent(value.join("="));}return null;}
function setSession(res,userId){const token=makeToken();statements.insertSession.run(hashToken(token),userId,Date.now()+sessionDays*86400000,new Date().toISOString());res.cookie(cookieName,token,cookieOptions);}
function cleanFiles(files=[]){return Promise.all(files.map(file=>unlink(file.path).catch(()=>{})));}
const storage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,uploadDir),filename:(_req,file,cb)=>cb(null,randomUUID()+path.extname(file.originalname).toLowerCase())});
const upload=multer({storage,limits:{files:6,fileSize:Number(process.env.MAX_VIDEO_BYTES||20971520)},fileFilter:(_req,file,cb)=>{
 const images=["image/jpeg","image/png","image/webp","image/gif"],videos=["video/mp4","video/webm","video/ogg"];
 if(images.includes(file.mimetype)||videos.includes(file.mimetype))return cb(null,true);
 cb(new Error("Unsupported media type."));
}});
async function hasValidSignature(file){
 const {open}=await import("node:fs/promises");const handle=await open(file.path,"r");const b=Buffer.alloc(16);try{await handle.read(b,0,16,0)}finally{await handle.close()}
 if(file.mimetype==="image/jpeg")return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
 if(file.mimetype==="image/png")return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(file.mimetype==="image/gif")return b.subarray(0,6).toString()==="GIF87a"||b.subarray(0,6).toString()==="GIF89a";
 if(file.mimetype==="image/webp")return b.subarray(0,4).toString()==="RIFF"&&b.subarray(8,12).toString()==="WEBP";
 if(file.mimetype==="video/mp4")return b.subarray(4,8).toString()==="ftyp";
 if(file.mimetype==="video/webm")return b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(file.mimetype==="video/ogg")return b.subarray(0,4).toString()==="OggS";
 return false;
}
function postView(row){return {...row,media:db.prepare("SELECT id,mime_type AS mimeType,media_kind AS kind,original_name AS name,size_bytes AS size FROM media WHERE post_id=?").all(row.id).map(m=>({...m,url:"/api/media/"+m.id}))};}
app.get("/api/health",(_req,res)=>res.json({ok:true,service:"QuestPulse API",version:"0.2.0"}));

app.post("/api/auth/register",authLimit,async(req,res)=>{
 const parsed=accountSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:"Invalid registration details.",details:parsed.error.issues.map(x=>({field:x.path.join("."),message:x.message}))});
 const d=parsed.data;const email=d.email.toLowerCase();
 if(statements.userByEmail.get(email))return res.status(409).json({error:"An account with this email already exists."});
 const id=newId(),passwordHash=await hashPassword(d.password);
 try{db.prepare("INSERT INTO users(id,display_name,account_type,email,password_hash,created_at) VALUES(?,?,?,?,?,?)").run(id,d.displayName,d.accountType,email,passwordHash,new Date().toISOString())}
 catch{return res.status(409).json({error:"Could not create account."})}
 res.status(202).json({message:"Registration received. An administrator must activate the account before sign-in.",accountId:id,status:"pending"});
});
app.post("/api/auth/login",authLimit,async(req,res)=>{
 const email=String(req.body?.email||"").trim().toLowerCase(),password=String(req.body?.password||"");
 const user=statements.userByEmail.get(email);
 if(!user||!(await verifyPassword(password,user.password_hash)))return res.status(401).json({error:"Email or password is incorrect."});
 if(user.status!=="active")return res.status(403).json({error:"Account is awaiting activation or is suspended.",status:user.status});
 setSession(res,user.id);res.json({user:safeUser(user)});
});
app.post("/api/auth/logout",(req,res)=>{const token=parseCookie(req.headers.cookie,cookieName);if(token)statements.deleteSession.run(hashToken(token));res.clearCookie(cookieName,{...cookieOptions,maxAge:undefined});res.status(204).end()});
app.get("/api/auth/me",requireUser,(req,res)=>res.json({user:safeUser(req.user)}));

app.get("/api/posts",(_req,res)=>{
 const rows=db.prepare("SELECT * FROM posts WHERE status='published' AND (expires_at IS NULL OR expires_at='' OR expires_at>=date('now')) ORDER BY created_at DESC LIMIT 100").all();
 res.json({posts:rows.map(postView)});
});
app.post("/api/posts",requireUser,submitLimit,upload.array("media",6),async(req,res)=>{
 const files=req.files||[];
 try{
  const parsed=postSchema.safeParse(req.body);if(!parsed.success){await cleanFiles(files);return res.status(400).json({error:"Invalid post details.",details:parsed.error.issues.map(x=>({field:x.path.join("."),message:x.message}))})}
  const images=files.filter(f=>f.mimetype.startsWith("image/")),videos=files.filter(f=>f.mimetype.startsWith("video/"));
  if(images.length>5||videos.length>1){await cleanFiles(files);return res.status(400).json({error:"Maximum five images and one video per post."})}
  for(const f of files){const max=f.mimetype.startsWith("image/")?Number(process.env.MAX_IMAGE_BYTES||5242880):Number(process.env.MAX_VIDEO_BYTES||20971520);if(f.size>max||!(await hasValidSignature(f))){await cleanFiles(files);return res.status(400).json({error:"A media file is too large or its content does not match its declared type."})}}
  const d=parsed.data,id=newId(),now=new Date().toISOString();
  const tx=db.transaction(()=>{
   db.prepare("INSERT INTO posts(id,user_id,publisher_type,publisher_name,post_type,title,description,website,offer_url,countries,expires_at,reward_value,product_price,disclosure,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)")
    .run(id,req.user.id,req.user.account_type,d.publisherName,d.postType,d.title,d.description,d.website,d.offerUrl,d.countries,d.expiresAt,d.rewardValue,d.productPrice,d.disclosure,now,now);
   const insert=db.prepare("INSERT INTO media(id,post_id,storage_name,original_name,mime_type,media_kind,size_bytes,created_at) VALUES(?,?,?,?,?,?,?,?)");
   for(const f of files)insert.run(newId(),id,path.basename(f.filename),f.originalname,f.mimetype,f.mimetype.startsWith("image/")?"image":"video",f.size,now);
  });tx();
  res.status(202).json({message:"Post submitted for moderation.",postId:id,status:"pending"});
 }catch(error){await cleanFiles(files);throw error}
});
app.get("/api/media/:id",(req,res)=>{
 const m=db.prepare("SELECT m.*,p.status FROM media m JOIN posts p ON p.id=m.post_id WHERE m.id=?").get(req.params.id);
 if(!m||m.status!=="published")return res.status(404).end();
 res.type(m.mime_type).set("X-Content-Type-Options","nosniff").sendFile(path.join(uploadDir,m.storage_name));
});
app.get("/api/admin/submissions",requireUser,requireAdmin,(req,res)=>{
 const status=String(req.query.status||"pending");
 if(!["pending","under_review","changes_requested","published","rejected","paused","expired"].includes(status))return res.status(400).json({error:"Invalid status filter."});
 const rows=db.prepare("SELECT p.*,u.email AS publisher_email FROM posts p JOIN users u ON u.id=p.user_id WHERE p.status=? ORDER BY p.created_at ASC LIMIT 200").all(status);
 res.json({submissions:rows.map(postView)});
});
app.patch("/api/admin/posts/:id/review",requireUser,requireAdmin,(req,res)=>{
 const action=req.body?.action,note=String(req.body?.note||"").slice(0,2000);
 const statusMap={approve:"published",reject:"rejected",request_changes:"changes_requested",pause:"paused"};
 if(!statusMap[action])return res.status(400).json({error:"Unsupported moderation action."});
 const result=db.prepare("UPDATE posts SET status=?,moderation_note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=? AND status IN ('pending','under_review','changes_requested','published','paused')")
 .run(statusMap[action],note,req.user.id,new Date().toISOString(),new Date().toISOString(),req.params.id);
 if(!result.changes)return res.status(404).json({error:"Submission not found or not reviewable."});
 res.json({ok:true,status:statusMap[action]});
});
app.patch("/api/admin/users/:id/activate",requireUser,requireAdmin,(req,res)=>{
 const status=req.body?.status;if(!["active","suspended"].includes(status))return res.status(400).json({error:"Status must be active or suspended."});
 const result=db.prepare("UPDATE users SET status=? WHERE id=? AND role='publisher'").run(status,req.params.id);
 if(!result.changes)return res.status(404).json({error:"Publisher not found."});
 res.json({ok:true,status});
});

app.use((err,_req,res,_next)=>{
 if(err instanceof multer.MulterError)return res.status(400).json({error:"Upload rejected.",detail:err.code});
 if(err.message==="Unsupported media type.")return res.status(400).json({error:err.message});
 console.error(err);res.status(500).json({error:"Internal server error."});
});
app.listen(port,()=>console.log("QuestPulse API listening on port "+port));

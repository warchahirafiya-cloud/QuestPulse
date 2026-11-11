import test from "node:test";
import assert from "node:assert/strict";
import { postSchema, accountSchema } from "../validation.js";

test("accepts the three approved post types",()=>{
 for(const postType of ["opportunity","direct_reward","new_product"]){
  const result=postSchema.safeParse({publisherName:"Example",postType,title:"A valid title",description:"This is a sufficiently long description.",countries:"Global",disclosure:"no"});
  assert.equal(result.success,true,postType);
 }
});
test("rejects unapproved post types",()=>{
 const result=postSchema.safeParse({publisherName:"Example",postType:"crypto",title:"A valid title",description:"This is a sufficiently long description.",countries:"Global",disclosure:"no"});
 assert.equal(result.success,false);
});
test("rejects non-HTTPS links",()=>{
 const result=postSchema.safeParse({publisherName:"Example",postType:"opportunity",title:"A valid title",description:"This is a sufficiently long description.",countries:"Global",disclosure:"no",offerUrl:"http://unsafe.example"});
 assert.equal(result.success,false);
});
test("requires strong registration password and known publisher type",()=>{
 const weak=accountSchema.safeParse({displayName:"Test User",accountType:"individual",email:"a@example.com",password:"short"});
 const wrong=accountSchema.safeParse({displayName:"Test User",accountType:"admin",email:"a@example.com",password:"a-very-long-password"});
 assert.equal(weak.success,false);assert.equal(wrong.success,false);
});

test("accepts a valid ISO expiry date and rejects malformed dates",()=>{
 const base={publisherName:"Example",postType:"opportunity",title:"A valid title",description:"This is a sufficiently long description.",countries:"Global",disclosure:"no"};
 assert.equal(postSchema.safeParse({...base,expiresAt:"2026-12-31"}).success,true);
 assert.equal(postSchema.safeParse({...base,expiresAt:"31-12-2026"}).success,false);
});

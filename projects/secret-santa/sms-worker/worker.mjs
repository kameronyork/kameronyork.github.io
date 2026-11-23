// Cloudflare Worker: deploy separately from GitHub Pages. Set secrets in Cloudflare.
const origins=new Set(['https://kameronyork.com','https://www.kameronyork.com','https://kameronyork.github.io']);
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    if(origins.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type, Authorization';}
    const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(!origins.has(origin))return reply(403,{error:'Origin not allowed.'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,{error:'Method not allowed.'});
    if(!env.SMS_ACCESS_KEY||env.SMS_ACCESS_KEY.length<32||!env.TWILIO_ACCOUNT_SID||!env.TWILIO_AUTH_TOKEN||!env.TWILIO_FROM)return reply(503,{error:'SMS service is not configured.'});
    // Hash both strings before comparison so the compared length is constant.
    const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
    const auth=request.headers.get('Authorization')||'';
    const [a,b]=await Promise.all([hash(auth),hash('Bearer '+env.SMS_ACCESS_KEY)]);
    let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)return reply(401,{error:'Invalid SMS access key.'});
    if(!env.SMS_RATE_LIMIT)return reply(503,{error:'SMS rate limit is not configured.'});
    const {success}=await env.SMS_RATE_LIMIT.limit({key:'secret-santa'});
    if(!success)return reply(429,{error:'SMS limit reached. Wait a minute before trying again.'});
    let data;
    try{const raw=await request.text();if(raw.length>4096)return reply(413,{error:'Request too large.'});data=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON.'});}
    const {to,body}=data||{};
    if(typeof to!=='string'||!/^\+[1-9]\d{7,14}$/.test(to)||typeof body!=='string'||!body.trim()||body.length>600)return reply(400,{error:'Invalid phone or message.'});
    try{
      const result=await fetch('https://api.twilio.com/2010-04-01/Accounts/'+encodeURIComponent(env.TWILIO_ACCOUNT_SID)+'/Messages.json',{
        method:'POST',
        headers:{Authorization:'Basic '+btoa(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN),'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({To:to,From:env.TWILIO_FROM,Body:body}),
        signal:AbortSignal.timeout(15000)
      });
      const data=await result.json();
      if(!result.ok||!data.sid)return reply(502,{error:'SMS provider rejected the message'+(Number.isInteger(data.code)?' (code '+data.code+')':'')+'.'});
      return reply(200,{ok:true});
    }catch{return reply(502,{error:'SMS provider response unavailable.'});}
  }
};

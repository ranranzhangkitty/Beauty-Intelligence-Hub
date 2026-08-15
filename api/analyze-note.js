export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const token=req.headers.authorization?.replace('Bearer ','');
  const {noteId}=req.body||{},url=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY,anon=process.env.SUPABASE_ANON_KEY;
  if(!token||!noteId||!url||!service||!anon||!process.env.OPENROUTER_API_KEY)return res.status(400).json({error:'Missing Vercel configuration. Check the OpenRouter and Supabase Environment Variables.'});
  const headers={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
  try{
    const userRes=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});
    if(!userRes.ok)return res.status(401).json({error:'Your Supabase session is not valid. Enable Anonymous Sign-Ins in Supabase, then try again.'});
    const noteRes=await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}&select=*`,{headers});
    if(!noteRes.ok)throw Error('Supabase could not read this find.');
    const [note]=await noteRes.json();if(!note)throw Error('This find no longer exists.');
    const signed=await Promise.all((note.image_paths||[]).slice(0,8).map(async path=>{const r=await fetch(`${url}/storage/v1/object/sign/screenshots/${path}`,{method:'POST',headers,body:JSON.stringify({expiresIn:300})});const d=await r.json();if(!d.signedURL)throw Error('Supabase could not read one of the images.');return `${url}/storage/v1${d.signedURL}`}));
    const prompt='Analyze these shared market images as one product or topic. Return JSON only with keys: category (New Launch, Trend Insight, Ingredient Intelligence, Packaging Design, Pricing Strategy, Channel & Marketing, Other), title, brand, source, price, launch_date, market, core_highlight, core_benefit, consumer_insight, ocr_text. Keep facts grounded in the images. Core Benefit must preserve claim wording with “Claims” when appropriate. Write concise direct insights; do not use “not X but Y” phrasing.';
    const aiRes=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://ranran-beauty-hub.vercel.app','X-Title':'New Finds'},body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content:[{type:'text',text:prompt+' Output one JSON object only. Do not add headings, safety labels, Markdown, or commentary.'},...signed.map(x=>({type:'image_url',image_url:{url:x}}))]}]})});
    if(!aiRes.ok)throw Error('OpenRouter rejected the request: '+await aiRes.text());
    const ai=await aiRes.json(),raw=String(ai.choices?.[0]?.message?.content||'').replace(/^```json|```$/g,'').trim(),match=raw.match(/\{[\s\S]*\}/);
    let result;try{result=JSON.parse(match?match[0]:raw)}catch{result={core_highlight:raw||'Image analysis completed.'}}
    const fields=['category','title','brand','source','price','launch_date','market','core_highlight','core_benefit','consumer_insight','ocr_text'];
    const update=Object.fromEntries(fields.filter(k=>typeof result[k]==='string').map(k=>[k,result[k].slice(0,8000)]));update.status='Ready';update.last_edited_by_name='New Finds';update.last_edited_at=new Date().toISOString();
    const saved=await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(update)});if(!saved.ok)throw Error('Supabase could not save the analysis.');return res.status(200).json({note:(await saved.json())[0]});
  }catch(error){console.error('New Finds analysis error:',error);await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}`,{method:'PATCH',headers,body:JSON.stringify({status:'Pending Analysis'})}).catch(()=>{});return res.status(500).json({error:error.message||'Analysis failed'});}
}

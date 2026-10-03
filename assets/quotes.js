if(embeddedPanel==='quotes'){
 let quotes=[],last='',changedAt=0,fetchedAt=0,busy=false;
 async function rotateQuote(force=false){
  if(document.hidden||busy||(!force&&Date.now()-changedAt<120000))return;
  busy=true;$('quote-refresh').disabled=true;
  try{
   if(!quotes.length||Date.now()-fetchedAt>=3600000){
    try{const response=await fetch('/api/quotes',{cache:'no-store'});if(!response.ok)throw Error();const feed=await response.json();if(!feed.data?.length)throw Error();quotes=feed.data;fetchedAt=Date.now();$('quote-status').textContent=feed.stale?'CACHED · EVERY 2 MIN':'EVERY 2 MIN';}
    catch{if(!quotes.length)throw Error();$('quote-status').textContent='CACHED · EVERY 2 MIN';}
   }
   if(document.hidden)return;
   const choices=quotes.filter(q=>q.text!==last),quote=(choices.length?choices:quotes)[Math.floor(Math.random()*(choices.length||quotes.length))];
   $('quote-text').textContent='“'+quote.text+'”';$('quote-author').textContent='— '+quote.author;last=quote.text;changedAt=Date.now();
  }catch{$('quote-text').textContent='Quotes temporarily unavailable.';$('quote-author').textContent='';$('quote-status').textContent='RETRYING';changedAt=Date.now();}
  finally{busy=false;$('quote-refresh').disabled=false;}
 }
 $('quote-refresh').onclick=()=>rotateQuote(true);
 setInterval(()=>rotateQuote(),120000);document.addEventListener('visibilitychange',()=>rotateQuote());rotateQuote();
}

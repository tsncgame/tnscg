(function(){
  const gate=document.getElementById('authGate'), userEl=document.getElementById('webUser');
  async function check(){
    try{const r=await fetch('/api/me',{cache:'no-store'});if(!r.ok){gate?.classList.remove('hidden');document.body.classList.add('auth-required');return false;}const d=await r.json();if(userEl)userEl.textContent='KONTO: '+d.user.username;return true}catch(_){gate?.classList.remove('hidden');document.body.classList.add('auth-required');return false;}
  }
  document.getElementById('webLogout')?.addEventListener('click',async()=>{await fetch('/api/logout',{method:'POST'});location.href='index.html#konto'});
  window.tsncgWebAuthReady=check();
})();

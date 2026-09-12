(function(){
  const $=id=>document.getElementById(id);
  const status=$('authStatus');
  const user=$('authUser');
  const loginForm=$('loginForm'), registerForm=$('registerForm');
  const loginTab=$('loginTab'), registerTab=$('registerTab');
  function msg(t,ok=false){if(status){status.textContent=t;status.className='auth-status '+(ok?'ok':'')}}
  async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Błąd');return d}
  loginForm?.addEventListener('submit',async e=>{e.preventDefault();try{const d=await post('/api/login',{username:$('loginUsername').value,password:$('loginPassword').value});msg('ZALOGOWANO ✓',true);setTimeout(()=>location.href='game.html',250)}catch(err){msg(err.message)}});
  registerForm?.addEventListener('submit',async e=>{e.preventDefault();try{const d=await post('/api/register',{username:$('registerUsername').value,password:$('registerPassword').value});msg('KONTO UTWORZONE ✓',true);setTimeout(()=>location.href='game.html',250)}catch(err){msg(err.message)}});
  loginTab?.addEventListener('click',()=>{loginForm?.classList.remove('hidden');registerForm?.classList.add('hidden');loginTab.classList.add('active');registerTab?.classList.remove('active')});
  registerTab?.addEventListener('click',()=>{registerForm?.classList.remove('hidden');loginForm?.classList.add('hidden');registerTab.classList.add('active');loginTab?.classList.remove('active')});
  async function refresh(){try{const r=await fetch('/api/me',{cache:'no-store'});if(r.ok){const d=await r.json();if(user)user.textContent='ZALOGOWANY: '+d.user.username}}catch(_){} }
  $('logoutButton')?.addEventListener('click',async()=>{await fetch('/api/logout',{method:'POST'});location.reload()});
  refresh();
})();

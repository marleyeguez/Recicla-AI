(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  if(toggle && nav){
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    };

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', event => {
      if(nav.classList.contains('open') && !nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
  }

  const token = localStorage.getItem('recicla_token') || sessionStorage.getItem('recicla_token');
  if(token){
    document.querySelectorAll('a[href="login.html"]').forEach(link => {
      if(link.textContent.trim().toLowerCase().includes('entrar')){
        link.href = 'dashboard.html';
        link.textContent = link.textContent.replace(/Entrar( na plataforma)?/i, 'Abrir painel');
      }
    });
  }
})();

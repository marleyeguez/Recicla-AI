const AUTH_TOKEN_KEY = "recicla_token";
const AUTH_USER_KEY = "recicla_user";
const LOCAL_PHOTO_KEY = "recicla_profile_photo";

function getAuthToken(){
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthStorage(){
  if(localStorage.getItem(AUTH_TOKEN_KEY)) return localStorage;
  if(sessionStorage.getItem(AUTH_TOKEN_KEY)) return sessionStorage;
  return null;
}

function getCachedUser(){
  const storage = getAuthStorage();
  if(!storage) return null;

  try {
    return JSON.parse(storage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveAuth(token, user, remember){
  clearAuth();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function updateCachedUser(user){
  const storage = getAuthStorage();
  if(storage) storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuth(){
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function currentPage(){
  return (location.pathname.split("/").pop() || "index.html").toLowerCase();
}

function isPublicPage(){
  return ["", "index.html", "cadastro.html"].includes(currentPage());
}

function redirectToLogin(){
  clearAuth();
  location.replace("index.html");
}

async function parseResponse(response){
  const text = await response.text();
  if(!text) return {};
  try { return JSON.parse(text); }
  catch { return { message: text }; }
}

function apiMessage(data, fallback){
  if(Array.isArray(data?.message)) return data.message.join(" · ");
  return data?.message || data?.mensagem || fallback;
}

async function apiFetch(url, options = {}, authenticated = false){
  const headers = new Headers(options.headers || {});

  if(options.body && !headers.has("Content-Type")){
    headers.set("Content-Type", "application/json");
  }

  if(authenticated){
    const token = getAuthToken();
    if(!token) throw new Error("Sessão não encontrada");
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {...options, headers});
}

const cachedUser = getCachedUser();

const state = {
  points: Number(cachedUser?.pontos ?? 0),
  history: [],
  historyFilter: "todos",
};

const ecopoints = [
  {name:"Ecoponto Recicla Mais", address:"Av. Mutinga, 123 · Perus, SP", materials:"PET, Papel, Plástico, Vidro, Metal", distance:"2,3 km"},
  {name:"CoopRecicla", address:"R. dos Flores, 456 · Perus, SP", materials:"Papel, Plástico, Metal", distance:"3,1 km"},
  {name:"Green Park", address:"Av. Torres, 789 · Jaraguá, SP", materials:"Vidro, Metal, Eletrônicos", distance:"4,8 km"}
];

const rewards = [
  {icon:"🎟️", name:"Vale Presente", label:"Cupom de parceiro", points:500},
  {icon:"🎧", name:"Fone de ouvido", label:"Produto parceiro", points:1000},
  {icon:"👕", name:"Camiseta sustentável", label:"Produto sustentável", points:800},
  {icon:"☕", name:"Kit caneca + squeeze", label:"Kit sustentável", points:600},
  {icon:"🍿", name:"Voucher cinema", label:"Ingresso para 1 pessoa", points:700},
  {icon:"🏷️", name:"Desconto em lojas parceiras", label:"Cupom de desconto", points:300}
];

function toast(message){
  let el = document.getElementById("toast");
  if(!el){
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove("show"), 2600);
}

function initials(name){
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "US";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function getProfilePhoto(user){
  return user?.foto || localStorage.getItem(LOCAL_PHOTO_KEY) || "";
}

function applyUserToUI(user){
  if(!user) return;

  state.points = Number(user.pontos ?? 0);
  const userInitials = initials(user.nome);
  const photo = getProfilePhoto(user);

  document.querySelectorAll(".sidebar-user strong").forEach(el => el.textContent = user.nome);
  document.querySelectorAll(".top-user > span").forEach(el => el.textContent = user.nome + "⌄");
  document.querySelectorAll("[data-profile-name]").forEach(el => el.textContent = user.nome);
  document.querySelectorAll("[data-profile-email]").forEach(el => el.textContent = user.email);

  const nameInput = document.getElementById("profileName");
  const emailInput = document.getElementById("profileEmail");
  if(nameInput) nameInput.value = user.nome || "";
  if(emailInput) emailInput.value = user.email || "";

  document.querySelectorAll("[data-setting]").forEach(btn => {
    if(!(btn.dataset.setting in user)) return;
    const enabled = Boolean(user[btn.dataset.setting]);
    btn.classList.toggle("on", enabled);
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
  });

  document.querySelectorAll(".sidebar-user .avatar, .top-user .avatar, [data-profile-avatar]").forEach(el => {
    if(photo){
      el.textContent = "";
      el.style.backgroundImage = `url("${photo}")`;
      el.classList.add("has-photo");
    } else {
      el.style.backgroundImage = "";
      el.textContent = userInitials;
      el.classList.remove("has-photo");
    }
  });

  updatePointLabels();
}

function updatePointLabels(){
  document.querySelectorAll("[data-points]").forEach(el => {
    el.textContent = state.points + (el.dataset.points === "full" ? " pontos" : "");
  });
}

async function loadCurrentUser({redirectOnUnauthorized = true} = {}){
  try {
    const response = await apiFetch("/usuarios/me", {method:"GET"}, true);
    const data = await parseResponse(response);

    if(response.status === 401){
      if(redirectOnUnauthorized) redirectToLogin();
      return null;
    }

    if(!response.ok){
      throw new Error(apiMessage(data, "Não foi possível carregar o usuário"));
    }

    updateCachedUser(data);
    applyUserToUI(data);
    return data;
  } catch(error){
    if(error.message === "Sessão não encontrada"){
      if(redirectOnUnauthorized) redirectToLogin();
      return null;
    }
    console.error(error);
    toast(error.message || "Erro ao carregar os dados da conta.");
    return null;
  }
}

async function updateProfileApi(payload){
  const response = await apiFetch("/usuarios/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);

  const data = await parseResponse(response);

  if(response.status === 401){
    redirectToLogin();
    throw new Error("Sua sessão expirou");
  }

  if(!response.ok){
    throw new Error(apiMessage(data, "Não foi possível atualizar o perfil"));
  }

  const user = data.usuario || data;
  updateCachedUser(user);
  applyUserToUI(user);
  return data;
}

function formatApiDate(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return String(value || "");

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(",", " às");
}

function normalizedHistoryItem(item){
  return {
    id: item.id,
    icon: Number(item.pontos) >= 0 ? "♻" : "🎁",
    title: item.descricao || "Movimentação de pontos",
    date: formatApiDate(item.data_registro),
    points: Number(item.pontos || 0),
    type: item.tipo || (Number(item.pontos) >= 0 ? "ganho" : "resgate"),
  };
}

function historyEmptyMarkup(message = "Nenhuma movimentação encontrada."){
  return `<div class="history-empty">${message}</div>`;
}

function historyMarkup(limit){
  const items = typeof limit === "number" ? state.history.slice(0, limit) : state.history;
  if(!items.length) return historyEmptyMarkup("Seu histórico ainda está vazio.");

  return items.map(item => `
    <div class="activity-row">
      <div class="activity-icon">${item.icon}</div>
      <div class="activity-main">
        <strong>${item.title}</strong>
        <small>${item.date}</small>
      </div>
      <div class="activity-value ${item.points >= 0 ? "plus" : "minus"}">
        ${item.points >= 0 ? "+" : ""}${item.points} pontos
      </div>
    </div>`).join("");
}

function filteredHistory(){
  if(state.historyFilter === "ganhos") return state.history.filter(item => item.points >= 0);
  if(state.historyFilter === "resgates") return state.history.filter(item => item.points < 0);
  return state.history;
}

function fullHistoryMarkup(){
  const items = filteredHistory();
  if(!items.length) return historyEmptyMarkup();

  return items.map(item => `
    <div class="history-row">
      <div class="history-icon">${item.icon}</div>
      <div class="history-main"><strong>${item.title}</strong><small>${item.date}</small></div>
      <div class="activity-value ${item.points >= 0 ? "plus" : "minus"}">${item.points >= 0 ? "+" : ""}${item.points} pontos</div>
    </div>`).join("");
}

async function loadHistoryApi(){
  const response = await apiFetch("/historico", {method:"GET"}, true);
  const data = await parseResponse(response);

  if(response.status === 401){
    redirectToLogin();
    return [];
  }

  if(!response.ok){
    throw new Error(apiMessage(data, "Não foi possível carregar o histórico"));
  }

  state.history = Array.isArray(data) ? data.map(normalizedHistoryItem) : [];

  const home = document.getElementById("recentActivities");
  if(home) home.innerHTML = historyMarkup(3);

  const list = document.getElementById("historyList");
  if(list) list.innerHTML = fullHistoryMarkup();

  return state.history;
}

async function loadPointsSummary(){
  if(!document.getElementById("recyclingCount")) return null;

  const response = await apiFetch("/pontos/resumo", {method:"GET"}, true);
  const data = await parseResponse(response);

  if(response.status === 401){
    redirectToLogin();
    return null;
  }

  if(!response.ok){
    throw new Error(apiMessage(data, "Não foi possível carregar o resumo de pontos"));
  }

  state.points = Number(data.pontosAtuais ?? state.points);
  updatePointLabels();

  const recyclingCount = document.getElementById("recyclingCount");
  const pointsThisMonth = document.getElementById("pointsThisMonth");
  const redemptionsCount = document.getElementById("redemptionsCount");

  if(recyclingCount) recyclingCount.textContent = Number(data.reciclagensRealizadas || 0);
  if(pointsThisMonth) pointsThisMonth.textContent = Number(data.pontosGanhosMes || 0);
  if(redemptionsCount) redemptionsCount.textContent = Number(data.resgatesRealizados || 0);

  return data;
}

function bindToggles(){
  document.querySelectorAll("[data-toggle]").forEach(btn => {
    if(btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
      btn.setAttribute("aria-pressed", btn.classList.contains("on") ? "true" : "false");
    });
  });
}

function renderCommon(){
  const user = getCachedUser();
  if(user) applyUserToUI(user);
  updatePointLabels();
  bindToggles();

  const home = document.getElementById("recentActivities");
  if(home) home.innerHTML = historyMarkup(1);

  const list = document.getElementById("historyList");
  if(list) list.innerHTML = fullHistoryMarkup();
}

function renderEcopoints(list = ecopoints){
  const wrap = document.getElementById("ecoList");
  if(!wrap) return;

  wrap.innerHTML = list.map(e => `
    <article class="eco-card card">
      <div class="eco-pin">⌖</div>
      <div><strong>${e.name}</strong><small>${e.address}</small><small>Materiais: ${e.materials}</small></div>
      <div><div class="eco-distance">${e.distance}</div><button class="mini-btn" onclick="toast('Detalhes de ${e.name}')">Ver detalhes</button></div>
    </article>`).join("");
}

function renderRewards(){
  const wrap = document.getElementById("rewardGrid");
  if(!wrap) return;

  wrap.innerHTML = rewards.map((r, i) => `
    <article class="reward-card card">
      <div class="reward-visual">${r.icon}</div>
      <strong>${r.name}</strong><small>${r.label}</small>
      <div class="reward-points">${r.points.toLocaleString("pt-BR")} pontos</div>
      <button class="primary" onclick="redeem(${i})">Resgatar</button>
    </article>`).join("");
}

function redeem(i){
  const reward = rewards[i];
  if(state.points < reward.points){
    toast("Você ainda precisa de " + (reward.points - state.points) + " pontos.");
    return;
  }
  toast("O resgate será concluído pelo aplicativo.");
}

async function useQrCode(codigo){
  const normalized = String(codigo || "").trim();
  if(!normalized){
    toast("Digite ou leia um código QR primeiro.");
    return;
  }

  const button = document.getElementById("useQrCode");
  setButtonLoading(button, true, "Validando...");

  try {
    const response = await apiFetch("/qrcodes/usar", {
      method: "POST",
      body: JSON.stringify({codigo: normalized}),
    }, true);

    const data = await parseResponse(response);

    if(response.status === 401){
      redirectToLogin();
      return;
    }

    if(!response.ok){
      throw new Error(apiMessage(data, "Não foi possível utilizar o QR Code"));
    }

    state.points = Number(data.pontosAtuais ?? state.points);

    const cached = getCachedUser();
    if(cached){
      const updated = {...cached, pontos: state.points};
      updateCachedUser(updated);
      applyUserToUI(updated);
    } else {
      updatePointLabels();
    }

    const status = document.getElementById("qrStatus");
    if(status){
      status.textContent = `${data.reciclagem?.material || "Material reciclado"}: +${data.reciclagem?.pontosGanhos || 0} pontos`;
      status.classList.add("success");
    }

    toast(`QR Code validado! +${data.reciclagem?.pontosGanhos || 0} pontos.`);
    await loadHistoryApi().catch(console.error);
    await loadPointsSummary().catch(console.error);
  } catch(error){
    const status = document.getElementById("qrStatus");
    if(status){
      status.textContent = error.message || "Erro ao validar o QR Code";
      status.classList.remove("success");
    }
    toast(error.message || "Não foi possível validar o QR Code.");
  } finally {
    setButtonLoading(button, false);
  }
}

let qrCameraStream = null;
let qrCameraTimer = null;

function stopQrCamera(){
  if(qrCameraTimer){
    clearInterval(qrCameraTimer);
    qrCameraTimer = null;
  }

  if(qrCameraStream){
    qrCameraStream.getTracks().forEach(track => track.stop());
    qrCameraStream = null;
  }

  const video = document.getElementById("qrVideo");
  if(video){
    video.srcObject = null;
    video.hidden = true;
  }

  const placeholder = document.getElementById("qrPlaceholder");
  if(placeholder) placeholder.hidden = false;
}

async function startQrCamera(){
  if(!("BarcodeDetector" in window)){
    toast("Leitura automática não é suportada neste navegador. Digite o código abaixo.");
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia){
    toast("A câmera não está disponível neste navegador.");
    return;
  }

  try {
    stopQrCamera();

    qrCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: {ideal: "environment"}},
      audio: false,
    });

    const video = document.getElementById("qrVideo");
    const placeholder = document.getElementById("qrPlaceholder");
    if(!video) return;

    video.srcObject = qrCameraStream;
    video.hidden = false;
    if(placeholder) placeholder.hidden = true;
    await video.play();

    const detector = new BarcodeDetector({formats:["qr_code"]});

    qrCameraTimer = setInterval(async () => {
      try {
        const codes = await detector.detect(video);
        const code = codes?.[0]?.rawValue;
        if(!code) return;

        stopQrCamera();
        const input = document.getElementById("qrCodeInput");
        if(input) input.value = code;
        await useQrCode(code);
      } catch {
        // O próximo ciclo tenta novamente.
      }
    }, 600);
  } catch {
    stopQrCamera();
    toast("Não foi possível acessar a câmera. Você pode digitar o código manualmente.");
  }
}

function setButtonLoading(button, loading, loadingText){
  if(!button) return;
  if(loading){
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function requestLogin(email, senha){
  const response = await apiFetch("/usuarios/login", {
    method: "POST",
    body: JSON.stringify({email, senha}),
  });
  const data = await parseResponse(response);

  if(!response.ok){
    throw new Error(apiMessage(data, "E-mail ou senha inválidos"));
  }

  if(!data.token || !data.usuario){
    throw new Error("A API não retornou o token de autenticação");
  }

  return data;
}

function initLogin(){
  const form = document.getElementById("loginForm");
  if(!form) return;

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("rememberMe");
  const submit = form.querySelector('button[type="submit"]');

  const params = new URLSearchParams(location.search);
  if(params.get("email") && emailInput) emailInput.value = params.get("email");
  if(params.get("cadastro") === "ok") toast("Conta criada com sucesso. Faça seu login.");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    setButtonLoading(submit, true, "Entrando...");

    try {
      const data = await requestLogin(emailInput.value.trim(), passwordInput.value);
      saveAuth(data.token, data.usuario, Boolean(rememberInput?.checked));
      location.href = "dashboard.html";
    } catch(error){
      toast(error.message || "Não foi possível realizar o login.");
    } finally {
      setButtonLoading(submit, false);
    }
  });
}

function initRegister(){
  const form = document.getElementById("registerForm");
  if(!form) return;

  const nameInput = document.getElementById("registerName");
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const confirmInput = document.getElementById("registerConfirmPassword");
  const submit = document.getElementById("registerSubmit");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if(passwordInput.value !== confirmInput.value){
      toast("As senhas não coincidem.");
      confirmInput.focus();
      return;
    }

    setButtonLoading(submit, true, "Criando conta...");

    try {
      const response = await apiFetch("/usuarios/cadastro", {
        method: "POST",
        body: JSON.stringify({
          nome: nameInput.value.trim(),
          email: emailInput.value.trim(),
          senha: passwordInput.value,
        }),
      });

      const data = await parseResponse(response);
      if(!response.ok){
        throw new Error(apiMessage(data, "Não foi possível criar a conta"));
      }

      // Depois do cadastro, faz login automaticamente usando as mesmas credenciais.
      const loginData = await requestLogin(emailInput.value.trim(), passwordInput.value);
      saveAuth(loginData.token, loginData.usuario, false);
      toast("Conta criada com sucesso!");
      setTimeout(() => location.href = "dashboard.html", 450);
    } catch(error){
      toast(error.message || "Não foi possível criar a conta.");
    } finally {
      setButtonLoading(submit, false);
    }
  });
}

function initProfilePage(){
  const nameInput = document.getElementById("profileName");
  const emailInput = document.getElementById("profileEmail");
  const saveProfileButton = document.getElementById("saveProfile");
  const photoInput = document.getElementById("profilePhotoInput");
  const changePhotoButton = document.getElementById("changeProfilePhoto");
  const removePhotoButton = document.getElementById("removeProfilePhoto");
  const savePreferencesButton = document.getElementById("savePreferences");

  if(!nameInput && !emailInput && !savePreferencesButton) return;

  saveProfileButton?.addEventListener("click", async () => {
    const nome = (nameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim();

    if(nome.length < 2){
      toast("Digite um nome válido.");
      nameInput?.focus();
      return;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      toast("Digite um e-mail válido.");
      emailInput?.focus();
      return;
    }

    setButtonLoading(saveProfileButton, true, "Salvando...");
    try {
      await updateProfileApi({nome, email});
      toast("Informações do perfil salvas no banco.");
    } catch(error){
      toast(error.message || "Não foi possível salvar o perfil.");
    } finally {
      setButtonLoading(saveProfileButton, false);
    }
  });

  savePreferencesButton?.addEventListener("click", async () => {
    const notificacoes = document.querySelector('[data-setting="notificacoes"]')?.classList.contains("on") ?? true;
    const localizacao = document.querySelector('[data-setting="localizacao"]')?.classList.contains("on") ?? true;

    setButtonLoading(savePreferencesButton, true, "Salvando...");
    try {
      await updateProfileApi({notificacoes, localizacao});
      toast("Preferências salvas no banco.");
    } catch(error){
      toast(error.message || "Não foi possível salvar as preferências.");
    } finally {
      setButtonLoading(savePreferencesButton, false);
    }
  });

  changePhotoButton?.addEventListener("click", () => photoInput?.click());

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if(!file) return;

    const accepted = ["image/jpeg", "image/png", "image/webp"];
    if(!accepted.includes(file.type)){
      toast("Use uma imagem PNG, JPG ou WEBP.");
      photoInput.value = "";
      return;
    }

    if(file.size > 3 * 1024 * 1024){
      toast("Escolha uma imagem de até 3 MB.");
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(LOCAL_PHOTO_KEY, String(reader.result || ""));
        applyUserToUI(getCachedUser());
        toast("Foto atualizada neste navegador.");
      } catch {
        toast("A imagem é grande demais para ser salva neste navegador.");
      }
    };
    reader.readAsDataURL(file);
  });

  removePhotoButton?.addEventListener("click", () => {
    localStorage.removeItem(LOCAL_PHOTO_KEY);
    if(photoInput) photoInput.value = "";
    applyUserToUI(getCachedUser());
    toast("Foto removida deste navegador.");
  });
}

function initHistoryFilters(){
  document.querySelectorAll("[data-history-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      const parent = chip.parentElement;
      parent?.querySelectorAll("[data-history-filter]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.historyFilter = chip.dataset.historyFilter || "todos";
      const list = document.getElementById("historyList");
      if(list) list.innerHTML = fullHistoryMarkup();
    });
  });
}

function initPasswordToggles(){
  const loginToggle = document.getElementById("togglePassword");
  if(loginToggle){
    loginToggle.addEventListener("click", () => {
      const input = document.getElementById("password");
      if(input) input.type = input.type === "password" ? "text" : "password";
    });
  }

  document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if(input) input.type = input.type === "password" ? "text" : "password";
    });
  });
}

function initLogout(){
  document.addEventListener("click", event => {
    const link = event.target.closest(".logout-link, .mobile-more-link.logout");
    if(!link) return;
    event.preventDefault();
    clearAuth();
    location.href = "index.html";
  });
}

function initMobileMoreMenu(){
  const nav = document.querySelector(".sidebar-nav");
  if(!nav || nav.querySelector(".mobile-more-button")) return;

  const current = currentPage() || "dashboard.html";
  const secondaryPages = ["perfil.html", "pontos.html", "historico.html"];

  const moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.className = "nav-link mobile-more-button" + (secondaryPages.includes(current) ? " active" : "");
  moreButton.setAttribute("aria-label", "Abrir mais opções");
  moreButton.setAttribute("aria-expanded", "false");
  moreButton.innerHTML = '<span class="ico">•••</span>Mais';
  nav.appendChild(moreButton);

  const overlay = document.createElement("div");
  overlay.className = "mobile-more-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const sheet = document.createElement("div");
  sheet.className = "mobile-more-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Mais opções");

  const items = [
    ["perfil.html", "♙", "Meu Perfil"],
    ["pontos.html", "★", "Meus Pontos"],
    ["historico.html", "◴", "Histórico"]
  ];

  sheet.innerHTML = `
    <div class="mobile-more-head">
      <strong>Mais opções</strong>
      <button class="mobile-more-close" type="button" aria-label="Fechar">×</button>
    </div>
    <div class="mobile-more-links">
      ${items.map(([href, icon, label]) => `
        <a class="mobile-more-link ${current === href ? "active" : ""}" href="${href}">
          <span class="ico">${icon}</span>${label}
        </a>`).join("")}
      <a class="mobile-more-link logout" href="index.html"><span class="ico">↪</span>Sair</a>
    </div>`;

  document.body.append(overlay, sheet);

  const closeButton = sheet.querySelector(".mobile-more-close");

  function setOpen(open){
    overlay.classList.toggle("open", open);
    sheet.classList.toggle("open", open);
    document.body.classList.toggle("mobile-menu-open", open);
    moreButton.setAttribute("aria-expanded", open ? "true" : "false");
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    if(open) closeButton?.focus();
  }

  moreButton.addEventListener("click", () => setOpen(!sheet.classList.contains("open")));
  closeButton?.addEventListener("click", () => setOpen(false));
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && sheet.classList.contains("open")) setOpen(false);
  });
}

async function initAuthentication(){
  const token = getAuthToken();

  if(!isPublicPage()){
    if(!token){
      location.replace("index.html");
      return false;
    }

    await loadCurrentUser();
    return true;
  }

  // Se já estiver autenticado e abrir login/cadastro, volta para o dashboard.
  if(token){
    const user = await loadCurrentUser({redirectOnUnauthorized:false});
    if(user){
      location.replace("dashboard.html");
      return false;
    }
    clearAuth();
  }

  return true;
}

document.addEventListener("DOMContentLoaded", async () => {
  const canContinue = await initAuthentication();
  if(!canContinue) return;

  renderCommon();
  renderEcopoints();
  renderRewards();
  initProfilePage();
  initMobileMoreMenu();
  initLogin();
  initRegister();
  initHistoryFilters();
  initPasswordToggles();
  initLogout();

  if(document.getElementById("recentActivities") || document.getElementById("historyList")){
    loadHistoryApi().catch(error => toast(error.message || "Erro ao carregar histórico."));
  }

  if(document.getElementById("recyclingCount")){
    loadPointsSummary().catch(error => toast(error.message || "Erro ao carregar os pontos."));
  }

  const search = document.getElementById("ecoSearch");
  if(search){
    search.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      renderEcopoints(ecopoints.filter(x => (x.name + " " + x.address + " " + x.materials).toLowerCase().includes(q)));
    });
  }

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const parent = chip.parentElement;
      parent?.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  const useQr = document.getElementById("useQrCode");
  const qrInput = document.getElementById("qrCodeInput");
  if(useQr) useQr.addEventListener("click", () => useQrCode(qrInput?.value));
  if(qrInput){
    qrInput.addEventListener("keydown", event => {
      if(event.key === "Enter") useQrCode(qrInput.value);
    });
  }

  const cameraButton = document.getElementById("startQrCamera");
  if(cameraButton) cameraButton.addEventListener("click", startQrCamera);
  window.addEventListener("pagehide", stopQrCamera);
});

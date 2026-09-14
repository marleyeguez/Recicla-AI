const AUTH_TOKEN_KEY = "recicla_token";
const AUTH_USER_KEY = "recicla_user";

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
  return ["", "index.html", "login.html", "cadastro.html"].includes(currentPage());
}

function redirectToLogin(){
  clearAuth();
  location.replace("login.html");
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
};

let ecopoints = [];
let ecoUserLocation = null;
let ecoMap = null;
let ecoMarkersLayer = null;

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

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProfilePhoto(user){
  return user?.foto || "";
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
  document.querySelectorAll("[data-dashboard-greeting]").forEach(el => {
    const firstName = String(user.nome || "").trim().split(/\s+/)[0] || "Usuário";
    el.textContent = `Olá, ${firstName}!`;
  });
  document.querySelectorAll("[data-user-menu-name]").forEach(el => el.textContent = user.nome);
  document.querySelectorAll("[data-user-menu-email]").forEach(el => el.textContent = user.email);

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

function fullHistoryMarkup(){
  const items = state.history;
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

function formatDistance(distanceKm){
  const value = Number(distanceKm || 0);

  if(value < 1){
    return `${Math.max(1, Math.round(value * 1000))} m`;
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

function renderEcopoints(list = ecopoints){
  const wrap = document.getElementById("ecoList");
  if(!wrap) return;

  if(!list.length){
    wrap.innerHTML = `
      <div class="eco-empty card">
        <strong>Nenhum ponto de coleta encontrado.</strong>
        <small>Tente novamente ou permita que o navegador use sua localização.</small>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map((e, index) => {
    const materials = Array.isArray(e.materiais) && e.materiais.length
      ? `Materiais: ${escapeHtml(e.materiais.join(", "))}`
      : "Materiais aceitos não informados";

    return `
      <article class="eco-card card ${index === 0 ? "eco-nearest" : ""}">
        <div class="eco-pin">⌖</div>
        <div>
          <strong>${escapeHtml(e.nome)}</strong>
          <small>${escapeHtml(e.endereco)}</small>
          <small>${materials}</small>
        </div>
        <div class="eco-distance-wrap">
          ${index === 0 ? '<span class="nearest-badge">Mais próximo</span>' : ''}
          <div class="eco-distance">${formatDistance(e.distanciaKm)}</div>
        </div>
      </article>`;
  }).join("");
}

function getBrowserLocation(){
  return new Promise((resolve, reject) => {
    if(!window.isSecureContext && location.hostname !== "localhost"){
      reject(new Error("A localização exige HTTPS. Abra a versão segura do site."));
      return;
    }

    if(!navigator.geolocation){
      reject(new Error("Seu navegador não oferece suporte à localização."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      error => {
        if(error.code === error.PERMISSION_DENIED){
          reject(new Error("Permita o acesso à localização para encontrar ecopontos próximos."));
          return;
        }

        if(error.code === error.TIMEOUT){
          reject(new Error("Não foi possível obter sua localização a tempo. Tente novamente."));
          return;
        }

        reject(new Error("Não foi possível obter sua localização atual."));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  });
}

function updateEcoMap(userLocation, list){
  const mapElement = document.getElementById("ecoMap");
  const L = window.L;

  if(!mapElement || !L) return;

  if(!ecoMap){
    ecoMap = L.map(mapElement, {
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(ecoMap);
  }

  if(ecoMarkersLayer){
    ecoMarkersLayer.remove();
  }

  ecoMarkersLayer = L.layerGroup().addTo(ecoMap);

  const bounds = [];
  const userLatLng = [userLocation.latitude, userLocation.longitude];
  bounds.push(userLatLng);

  L.circleMarker(userLatLng, {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#1687e8",
    fillOpacity: 1,
  })
    .bindTooltip("Sua localização")
    .addTo(ecoMarkersLayer);

  list.forEach((e, index) => {
    const point = [e.latitude, e.longitude];
    bounds.push(point);

    L.circleMarker(point, {
      radius: index === 0 ? 9 : 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#087a4b",
      fillOpacity: 1,
    })
      .bindTooltip(
        `<strong>${escapeHtml(e.nome)}</strong><br>${formatDistance(e.distanciaKm)}`,
      )
      .addTo(ecoMarkersLayer);
  });

  if(bounds.length > 1){
    ecoMap.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    });
  } else {
    ecoMap.setView(userLatLng, 14);
  }

  setTimeout(() => ecoMap.invalidateSize(), 100);
}

async function loadNearbyEcopoints(){
  const wrap = document.getElementById("ecoList");
  if(!wrap) return;

  const locationStatus = document.getElementById("locationStatus");
  const user = getCachedUser();

  // Respeita de verdade a preferência salva no perfil.
  if(user && user.localizacao === false){
    ecopoints = [];
    ecoUserLocation = null;
    if(locationStatus){
      locationStatus.textContent = "⌖ Localização desativada";
    }
    wrap.innerHTML = `
      <div class="eco-empty card">
        <strong>Localização desativada nas suas preferências.</strong>
        <small>Ative “Usar minha localização” no Meu Perfil para encontrar pontos de coleta próximos.</small>
        <a class="outline eco-retry" href="perfil.html">Ir para Meu Perfil</a>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="eco-loading card">
      <span class="eco-loading-dot"></span>
      Buscando pontos de coleta próximos...
    </div>`;

  if(locationStatus){
    locationStatus.textContent = "⌖ Obtendo localização...";
  }

  try {
    const location = await getBrowserLocation();
    ecoUserLocation = location;

    if(locationStatus){
      locationStatus.textContent = "⌖ Localização atual";
    }

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      limite: "5",
    });

    const response = await apiFetch(
      `/ecopontos/proximos?${params.toString()}`,
      {},
      true,
    );

    const data = await parseResponse(response);

    if(response.status === 401){
      redirectToLogin();
      return;
    }

    if(!response.ok){
      throw new Error(apiMessage(data, "Erro ao buscar ecopontos."));
    }

    ecopoints = Array.isArray(data.ecopontos)
      ? data.ecopontos
      : [];

    renderEcopoints(ecopoints);
    updateEcoMap(location, ecopoints);
  } catch(error) {
    ecopoints = [];
    ecoUserLocation = null;

    if(locationStatus){
      locationStatus.textContent = "⌖ Localização indisponível";
    }

    wrap.innerHTML = `
      <div class="eco-empty card">
        <strong>Não foi possível mostrar os ecopontos próximos.</strong>
        <small>${escapeHtml(error.message || "Tente novamente.")}</small>
        <button id="retryEcoLocation" class="outline eco-retry" type="button">Tentar novamente</button>
      </div>`;

    document.getElementById("retryEcoLocation")?.addEventListener(
      "click",
      loadNearbyEcopoints,
      { once: true },
    );
  }
}

function renderRewards(){
  const wrap = document.getElementById("rewardGrid");
  if(!wrap) return;

  wrap.innerHTML = rewards.map((r) => `
    <article class="reward-card card">
      <div class="reward-visual">${r.icon}</div>
      <strong>${r.name}</strong><small>${r.label}</small>
      <div class="reward-points">${r.points.toLocaleString("pt-BR")} pontos</div>
      <div class="reward-app-only" role="note" aria-label="Resgate disponível somente pelo aplicativo">
        Resgate pelo aplicativo
      </div>
    </article>`).join("");
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
let html5QrScanner = null;

async function stopQrCamera(){
  if(qrCameraTimer){
    clearInterval(qrCameraTimer);
    qrCameraTimer = null;
  }

  if(qrCameraStream){
    qrCameraStream.getTracks().forEach(track => track.stop());
    qrCameraStream = null;
  }

  if(html5QrScanner){
    try {
      await html5QrScanner.stop();
    } catch {
      // Scanner já estava parado.
    }
    try {
      html5QrScanner.clear();
    } catch {}
    html5QrScanner = null;
  }

  const video = document.getElementById("qrVideo");
  if(video){
    video.srcObject = null;
    video.hidden = true;
  }

  const reader = document.getElementById("qrHtml5Reader");
  if(reader){
    reader.innerHTML = "";
    reader.hidden = true;
  }

  const placeholder = document.getElementById("qrPlaceholder");
  if(placeholder) placeholder.hidden = false;
}

async function finishQrCameraRead(code){
  const normalized = String(code || "").trim();
  if(!normalized) return;

  await stopQrCamera();
  const input = document.getElementById("qrCodeInput");
  if(input) input.value = normalized;
  await useQrCode(normalized);
}

async function startQrWithHtml5(){
  if(typeof window.Html5Qrcode !== "function") return false;

  const reader = document.getElementById("qrHtml5Reader");
  const placeholder = document.getElementById("qrPlaceholder");
  if(!reader) return false;

  reader.hidden = false;
  if(placeholder) placeholder.hidden = true;

  html5QrScanner = new window.Html5Qrcode("qrHtml5Reader");

  await html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
    decodedText => finishQrCameraRead(decodedText),
    () => {},
  );

  return true;
}

async function startQrWithBarcodeDetector(){
  if(!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia){
    return false;
  }

  qrCameraStream = await navigator.mediaDevices.getUserMedia({
    video: {facingMode: {ideal: "environment"}},
    audio: false,
  });

  const video = document.getElementById("qrVideo");
  const placeholder = document.getElementById("qrPlaceholder");
  if(!video) return false;

  video.srcObject = qrCameraStream;
  video.hidden = false;
  if(placeholder) placeholder.hidden = true;
  await video.play();

  const detector = new BarcodeDetector({formats:["qr_code"]});

  qrCameraTimer = setInterval(async () => {
    try {
      const codes = await detector.detect(video);
      const code = codes?.[0]?.rawValue;
      if(code) await finishQrCameraRead(code);
    } catch {
      // O próximo ciclo tenta novamente.
    }
  }, 550);

  return true;
}

async function startQrCamera(){
  if(!window.isSecureContext && location.hostname !== "localhost"){
    toast("A câmera exige HTTPS. Abra a versão segura do site.");
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia){
    toast("A câmera não está disponível neste navegador.");
    return;
  }

  const button = document.getElementById("startQrCamera");
  setButtonLoading(button, true, "Abrindo câmera...");

  try {
    await stopQrCamera();

    // html5-qrcode cobre melhor Safari/iPhone e Android.
    let started = false;
    try {
      started = await startQrWithHtml5();
    } catch {
      await stopQrCamera();
    }

    if(!started){
      started = await startQrWithBarcodeDetector();
    }

    if(!started){
      throw new Error("Seu navegador não oferece leitura automática de QR Code.");
    }
  } catch(error){
    await stopQrCamera();
    toast(error.message || "Não foi possível acessar a câmera. Você pode digitar o código manualmente.");
  } finally {
    setButtonLoading(button, false);
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

async function prepararFotoPerfil(file){
  const imagem = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const limite = 300;
  const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if(!ctx) throw new Error("Não foi possível preparar a imagem.");

  ctx.drawImage(imagem, 0, 0, largura, altura);

  // JPEG reduz bastante o tamanho para caber com folga no PATCH JSON.
  return canvas.toDataURL("image/jpeg", 0.72);
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
    const localizacao = document.querySelector('[data-setting="localizacao"]')?.classList.contains("on") ?? true;

    setButtonLoading(savePreferencesButton, true, "Salvando...");
    try {
      await updateProfileApi({localizacao});
      toast("Preferências salvas no banco.");
    } catch(error){
      toast(error.message || "Não foi possível salvar as preferências.");
    } finally {
      setButtonLoading(savePreferencesButton, false);
    }
  });

  changePhotoButton?.addEventListener("click", () => photoInput?.click());

  photoInput?.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if(!file) return;

    const accepted = ["image/jpeg", "image/png", "image/webp"];
    if(!accepted.includes(file.type)){
      toast("Use uma imagem PNG, JPG ou WEBP.");
      photoInput.value = "";
      return;
    }

    if(file.size > 5 * 1024 * 1024){
      toast("Escolha uma imagem de até 5 MB.");
      photoInput.value = "";
      return;
    }

    setButtonLoading(changePhotoButton, true, "Salvando...");

    try {
      const foto = await prepararFotoPerfil(file);
      await updateProfileApi({foto});
      toast("Foto salva no seu perfil.");
    } catch(error){
      toast(error.message || "Não foi possível atualizar a foto.");
    } finally {
      setButtonLoading(changePhotoButton, false);
      photoInput.value = "";
    }
  });

  removePhotoButton?.addEventListener("click", async () => {
    setButtonLoading(removePhotoButton, true, "Removendo...");

    try {
      await updateProfileApi({foto: ""});
      toast("Foto removida do seu perfil.");
    } catch(error){
      toast(error.message || "Não foi possível remover a foto.");
    } finally {
      setButtonLoading(removePhotoButton, false);
      if(photoInput) photoInput.value = "";
    }
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

function initTopUserMenu(){
  const topUser = document.querySelector(".top-user");
  const topActions = topUser?.closest(".top-actions");

  if(!topUser || !topActions || topActions.querySelector(".user-dropdown")) return;

  const cached = getCachedUser();

  topUser.setAttribute("role", "button");
  topUser.setAttribute("tabindex", "0");
  topUser.setAttribute("aria-haspopup", "menu");
  topUser.setAttribute("aria-expanded", "false");
  topUser.setAttribute("aria-label", "Abrir menu da conta");

  const menu = document.createElement("div");
  menu.className = "user-dropdown";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-hidden", "true");

  menu.innerHTML = `
    <div class="user-dropdown-head">
      <strong data-user-menu-name>${escapeHtml(cached?.nome || "Usuário")}</strong>
      <small data-user-menu-email>${escapeHtml(cached?.email || "")}</small>
    </div>

    <a class="user-dropdown-item" href="perfil.html" role="menuitem">
      <span class="user-dropdown-icon">♙</span>
      <span>Meu Perfil</span>
    </a>

    <a class="user-dropdown-item" href="pontos.html" role="menuitem">
      <span class="user-dropdown-icon">★</span>
      <span>Meus Pontos</span>
    </a>

    <div class="user-dropdown-separator"></div>

    <button class="user-dropdown-item user-dropdown-logout logout-link" type="button" role="menuitem">
      <span class="user-dropdown-icon">↪</span>
      <span>Sair</span>
    </button>
  `;

  topActions.appendChild(menu);

  function setOpen(open){
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    topUser.setAttribute("aria-expanded", open ? "true" : "false");

    if(open){
      const firstItem = menu.querySelector(".user-dropdown-item");
      window.setTimeout(() => firstItem?.focus(), 0);
    }
  }

  function toggleMenu(){
    setOpen(!menu.classList.contains("open"));
  }

  topUser.addEventListener("click", event => {
    event.stopPropagation();
    toggleMenu();
  });

  topUser.addEventListener("keydown", event => {
    if(event.key === "Enter" || event.key === " " || event.key === "ArrowDown"){
      event.preventDefault();
      setOpen(true);
    }
  });

  menu.addEventListener("click", event => {
    event.stopPropagation();
    if(event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", event => {
    if(!menu.classList.contains("open")) return;
    if(topActions.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && menu.classList.contains("open")){
      setOpen(false);
      topUser.focus();
    }
  });
}

function initLogout(){
  document.addEventListener("click", event => {
    const link = event.target.closest(".logout-link, .mobile-more-link.logout");
    if(!link) return;
    event.preventDefault();
    clearAuth();
    location.href = "login.html";
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
      <a class="mobile-more-link logout" href="login.html"><span class="ico">↪</span>Sair</a>
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
      location.replace("login.html");
      return false;
    }

    await loadCurrentUser();
    return true;
  }

  // Login e cadastro redirecionam usuários já autenticados para o painel.
  // O index institucional continua acessível mesmo com sessão ativa.
  if(token && ["login.html", "cadastro.html"].includes(currentPage())){
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
  renderRewards();
  await loadNearbyEcopoints();
  initProfilePage();
  initMobileMoreMenu();
  initLogin();
  initRegister();
  initPasswordToggles();
  initTopUserMenu();
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
      const filtered = ecopoints.filter(x => (`${x.nome} ${x.endereco} ${(x.materiais || []).join(" ")}`).toLowerCase().includes(q));
      renderEcopoints(filtered);
      if(ecoUserLocation) updateEcoMap(ecoUserLocation, filtered);
    });
  }


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

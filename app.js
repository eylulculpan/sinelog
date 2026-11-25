(() => {
  "use strict";

  const STORAGE_KEY = "sinelog-films-v1";
  const FIREBASE_URL = "https://sinelog-2d99d-default-rtdb.firebaseio.com/movies.json";
  const MOODS = ["Beyin Yakan", "Kafa Dağıtmalık", "Ağlatan Dram", "Gece Gerilimi", "Görsel Şölen"];
  const COMPANIES = ["Tek Başına", "Arkadaşlarla", "Sevgiliyle", "Aileyle"];
  const DEFAULT_FILMS = [
    { id: "default-interstellar", title: "Interstellar", meta: "2014 • Bilim Kurgu", mood: "Görsel Şölen", company: "Tek Başına", rating: 5, note: "Sonunda jenerik akarken bir süre tavana bakıp yıldızları düşündüm.", person: "Deniz", editor: true, published: true, art: "linear-gradient(125deg,#243447,#101624 68%,#5e422c)", symbol: "◉", createdAt: "2026-03-16T18:20:00.000Z" },
    { id: "default-whiplash", title: "Whiplash", meta: "2014 • Dram / Müzik", mood: "Beyin Yakan", company: "Arkadaşlarla", rating: 5, note: "Finalinde fark etmeden nefesimi tutmuşum; müzik hâlâ kulağımda.", person: "Mert", editor: true, published: true, art: "linear-gradient(125deg,#744832,#251b1b 68%,#a76a36)", symbol: "♪", createdAt: "2026-03-14T20:05:00.000Z" },
    { id: "default-truman", title: "The Truman Show", meta: "1998 • Dram / Bilim Kurgu", mood: "Kafa Dağıtmalık", company: "Aileyle", rating: 5, note: "Hem gülümsetiyor hem de dünyaya başka gözle baktırıyor; birlikte izleyin.", person: "Aylin", editor: false, published: true, art: "linear-gradient(125deg,#37635f,#1c3038 68%,#ba9653)", symbol: "☼", createdAt: "2026-03-12T15:40:00.000Z" },
    { id: "default-parasite", title: "Parazit", meta: "2019 • Gerilim / Dram", mood: "Gece Gerilimi", company: "Arkadaşlarla", rating: 5, note: "Hiçbir şey bilmeden izleyin derim, film bittikten sonra konuşması da ayrı güzel.", person: "Ece", editor: true, published: true, art: "linear-gradient(125deg,#36462e,#19201a 68%,#9a9562)", symbol: "⌂", createdAt: "2026-03-10T21:15:00.000Z" },
    { id: "default-sunrise", title: "Before Sunrise", meta: "1995 • Romantik / Dram", mood: "Ağlatan Dram", company: "Sevgiliyle", rating: 4, note: "Bir gece yürüyüşüne çıkmışsınız gibi hissettiriyor; yavaşlığı çok iyi geliyor.", person: "Can", editor: false, published: true, art: "linear-gradient(125deg,#8a543e,#352329 68%,#d19b61)", symbol: "☾", createdAt: "2026-03-08T19:30:00.000Z" },
    { id: "default-shutter", title: "Zindan Adası", meta: "2010 • Gizem / Gerilim", mood: "Beyin Yakan", company: "Tek Başına", rating: 5, note: "Bittiği an başa sarıp ipuçlarını yeniden aramak isteyeceğin türden.", person: "Bora", editor: false, published: true, art: "linear-gradient(125deg,#39485a,#17202d 68%,#6a7377)", symbol: "◌", createdAt: "2026-03-06T22:10:00.000Z" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { films: loadLocalFilms(), mood: "all", company: "all", query: "", rating: 0, selectedMood: "", selectedCompany: "", adminQuery: "", adminMood: "all", previousFocus: null, toastTimer: null, firebaseReady: false, firebaseDirty: false, pendingWrites: 0 };
  let writeQueue = Promise.resolve();
  let writeRevision = 0;
  let refreshInProgress = false;

  function cloneDefaultFilms() {
    return DEFAULT_FILMS.map(film => ({ ...film }));
  }

  function openQrModal() {
    const currentUrl = window.location.href;
    $("#shareQr").src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}`;
    $("#shareUrl").textContent = currentUrl;
    showModal("qrModal");
  }

  async function copyCurrentLink() {
    const currentUrl = window.location.href;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard API kullanılamıyor.");
      await navigator.clipboard.writeText(currentUrl);
      showToast("Sayfa bağlantısı panoya kopyalandı.");
      return;
    } catch (error) {
      console.warn("Clipboard API kullanılamadı; yedek kopyalama deneniyor:", error);
    }
    const input = document.createElement("textarea");
    input.value = currentUrl;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    try {
      if (!document.execCommand("copy")) throw new Error("Tarayıcı kopyalama isteğini kabul etmedi.");
      showToast("Sayfa bağlantısı panoya kopyalandı.");
    } catch (error) {
      console.error("Sayfa bağlantısı panoya kopyalanamadı:", error);
      showToast("Kopyalama başarısız oldu. Bağlantıyı seçip elle kopyalayabilirsin.");
    } finally {
      input.remove();
    }
  }

  function loadLocalFilms() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        saveLocalBackup(cloneDefaultFilms());
        return cloneDefaultFilms();
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Film verisi bir liste değil.");
      const films = parsed.filter(isValidFilm);
      if (films.length !== parsed.length) throw new Error("Film verisinde geçersiz kayıt var.");
      return films;
    } catch (error) {
      console.error("SineLog film verisi okunamadı:", error);
      return cloneDefaultFilms();
    }
  }

  function isValidFilm(film) {
    return film && typeof film.id === "string" && typeof film.title === "string" &&
      typeof film.person === "string" && MOODS.includes(film.mood) &&
      COMPANIES.includes(film.company) && Number.isFinite(Number(film.rating)) &&
      Number(film.rating) >= 1 && Number(film.rating) <= 5;
  }

  function saveLocalBackup(films = state.films) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(films));
      return true;
    } catch (error) {
      console.error("SineLog film verisi kaydedilemedi:", error);
      showToast("Değişiklikler kaydedilemedi. Tarayıcı depolama alanını kontrol et.");
      return false;
    }
  }

  async function fetchFirebase(options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(FIREBASE_URL, {
        ...options,
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Firebase isteği başarısız oldu (${response.status}).`);
      return response;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function normalizeFirebaseFilms(data) {
    if (data === null) return [];
    let records;
    if (Array.isArray(data)) {
      records = data;
    } else if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (!keys.length) return [];
      if (!keys.every(key => /^\d+$/.test(key))) {
        throw new Error("Firebase film verisi beklenen liste biçiminde değil.");
      }
      records = keys.sort((a, b) => Number(a) - Number(b)).map(key => data[key]);
    } else {
      throw new Error("Firebase film verisi beklenen biçimde değil.");
    }
    if (!records.length) return [];
    const films = records.filter(isValidFilm);
    if (films.length !== records.length) throw new Error("Firebase'de geçersiz film kaydı var.");
    return films;
  }

  async function readFirebaseFilms() {
    const response = await fetchFirebase({ method: "GET" });
    return normalizeFirebaseFilms(await response.json());
  }

  async function writeFirebaseFilms(films) {
    await fetchFirebase({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(films)
    });
  }

  function saveFilms() {
    saveLocalBackup();
    state.firebaseDirty = true;
    state.pendingWrites += 1;
    const revision = ++writeRevision;
    const snapshot = state.films.map(film => ({ ...film }));
    writeQueue = writeQueue.then(async () => {
      try {
        await writeFirebaseFilms(snapshot);
        state.pendingWrites = Math.max(0, state.pendingWrites - 1);
        if (revision === writeRevision) state.firebaseDirty = false;
      } catch (error) {
        state.pendingWrites = Math.max(0, state.pendingWrites - 1);
        console.error("Firebase'e film listesi kaydedilemedi:", error);
        showToast("Firebase'e ulaşılamadı; değişiklik yerel yedekte tutuluyor.");
      }
    });
  }

  async function initializeFirebase() {
    try {
      let films = await readFirebaseFilms();
      if (!films.length) {
        films = cloneDefaultFilms();
        await writeFirebaseFilms(films);
      }
      state.films = films;
      state.firebaseDirty = false;
      saveLocalBackup();
      renderFilms();
      renderAdmin();
    } catch (error) {
      console.error("Firebase verileri yüklenemedi; yerel yedek kullanılacak:", error);
      showToast("Ortak veritabanına ulaşılamadı; yerel yedek gösteriliyor.");
    } finally {
      state.firebaseReady = true;
    }
  }

  async function refreshFirebase() {
    if (!state.firebaseReady || state.pendingWrites > 0) return;
    if (state.firebaseDirty) {
      saveFilms();
      return;
    }
    if (refreshInProgress) return;
    refreshInProgress = true;
    const revision = writeRevision;
    try {
      const films = await readFirebaseFilms();
      if (state.pendingWrites > 0 || state.firebaseDirty || revision !== writeRevision || !films.length) return;
      if (JSON.stringify(films) === JSON.stringify(state.films)) return;
      state.films = films;
      saveLocalBackup();
      renderFilms();
      renderAdmin();
    } catch (error) {
      console.warn("SineLog canlı verileri yenilenemedi:", error);
    } finally {
      refreshInProgress = false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function filmArt(film, compact = false) {
    const title = escapeHtml(film.title);
    const symbol = escapeHtml(film.symbol || "✦");
    const badge = film.editor ? '<span class="editor-badge">★ Editörün Seçimi</span>' : "";
    const art = typeof film.art === "string" && /^linear-gradient\(125deg,(?:#[\da-f]{3,8}|hsl\(\d{1,3}\s+\d{1,3}%\s+\d{1,3}%\))(?:\s+\d{1,3}%)?,(?:#[\da-f]{3,8}|hsl\(\d{1,3}\s+\d{1,3}%\s+\d{1,3}%\))(?:\s+\d{1,3}%)?,(?:#[\da-f]{3,8}|hsl\(\d{1,3}\s+\d{1,3}%\s+\d{1,3}%\))(?:\s+\d{1,3}%)?\)$/i.test(film.art)
      ? film.art
      : "linear-gradient(125deg,#354354,#17202d)";
    return `<div class="card-art" style="--art:${escapeHtml(art)}">${badge}<span class="art-label">${title}</span><span class="art-symbol" aria-hidden="true">${symbol}</span></div>`;
  }

  function visibleFilms() {
    const query = state.query.trim().toLocaleLowerCase("tr");
    return state.films.filter(film => film.published !== false &&
      (state.mood === "all" || film.mood === state.mood) &&
      (state.company === "all" || film.company === state.company) &&
      (!query || `${film.title} ${film.meta} ${film.person} ${film.note}`.toLocaleLowerCase("tr").includes(query)));
  }

  function renderFilms() {
    const films = visibleFilms();
    $("#filmCount").textContent = String(state.films.filter(film => film.published !== false).length);
    $("#movieGrid").innerHTML = films.map(film => `
      <article class="movie-card">
        ${filmArt(film)}
        <div class="movie-card-body">
          <div class="movie-title-line"><div><h3>${escapeHtml(film.title)}</h3><p class="movie-meta">${escapeHtml(film.meta)}</p></div><span class="rating-pill"><span>★</span>${Number(film.rating).toFixed(1)}</span></div>
          <p class="movie-note">“${escapeHtml(film.note || "Bir SineLog dostundan film önerisi.")}”</p>
          <div class="card-tags"><span class="card-tag mood-tag">${escapeHtml(film.mood)}</span><span class="card-tag">${escapeHtml(film.company)}</span></div>
          <div class="card-footer"><span class="card-author"><span class="author-dot">${escapeHtml(film.person.charAt(0).toLocaleUpperCase("tr"))}</span>${escapeHtml(film.person)} öneriyor</span><span>${escapeHtml(film.meta.split("•")[0].trim())}</span></div>
        </div>
      </article>`).join("");
    $("#emptyState").hidden = films.length > 0;
  }

  function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    state.previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const focusTarget = $("input, button:not([data-close]), select", modal);
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 30);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if ($$(".modal-backdrop:not([hidden])").length === 0) document.body.classList.remove("modal-open");
    if (state.previousFocus && typeof state.previousFocus.focus === "function") state.previousFocus.focus();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function makeTicketSerial() { return `SL-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

  function makeQrCode() {
    const qr = $("#ticketQr");
    const seed = Math.random().toString(36).slice(2);
    qr.innerHTML = Array.from({ length: 121 }, (_, index) => {
      const row = Math.floor(index / 11), col = index % 11;
      const inFinder = (r, c) => (row >= r && row < r + 3 && col >= c && col < c + 3) &&
        (row === r || row === r + 2 || col === c || col === c + 2 || (row === r + 1 && col === c + 1));
      const finder = inFinder(0, 0) || inFinder(0, 8) || inFinder(8, 0);
      const on = finder || ((seed.charCodeAt(index % seed.length) + index * 13) % 3 !== 0);
      return `<i class="${on ? "on" : ""}"></i>`;
    }).join("");
  }

  function handleRecommendation(event) {
    event.preventDefault();
    if (!state.firebaseReady) {
      showToast("Veritabanı yükleniyor. Birkaç saniye sonra yeniden dene.");
      return;
    }
    const person = $("#personName").value.trim();
    const title = $("#movieTitle").value.trim();
    const meta = $("#movieMeta").value.trim();
    const note = $("#movieNote").value.trim();
    const error = $("#formError");
    if (!state.selectedMood || !state.selectedCompany || !state.rating) {
      error.textContent = "Devam etmek için izleme modunu, kiminle izleyeceğini ve yıldız puanını seç.";
      return;
    }
    error.textContent = "";
    const film = {
      id: `film-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title, meta, mood: state.selectedMood, company: state.selectedCompany, rating: state.rating,
      note: note || "Bu filmi izleyince aklımda güzel bir his kaldı.", person,
      editor: false, published: true, art: `linear-gradient(125deg,hsl(${randomBetween(12, 340)} 30% 34%),#171d27 73%,hsl(${randomBetween(12, 340)} 35% 45%))`,
      symbol: ["✦", "◉", "☾", "⌂", "◇"][randomBetween(0, 4)], createdAt: new Date().toISOString()
    };
    state.films.unshift(film);
    saveFilms();
    renderFilms();
    renderAdmin();
    $("#ticketHeading").textContent = film.title;
    $("#ticketMeta").textContent = film.meta;
    $("#ticketPerson").textContent = film.person;
    $("#ticketMood").textContent = film.mood;
    $("#ticketSeat").textContent = `Salon ${randomBetween(1, 6)} • Sıra ${String.fromCharCode(randomBetween(65, 72))} • Koltuk ${randomBetween(1, 24)}`;
    $("#ticketSerial").textContent = makeTicketSerial();
    makeQrCode();
    $("#recommendForm").reset();
    state.selectedMood = "";
    state.selectedCompany = "";
    state.rating = 0;
    $$(".choice-chip").forEach(chip => chip.classList.remove("selected"));
    updateStars();
    showModal("ticketModal");
  }

  function updateStars(hover = 0) {
    $$("#starPicker button").forEach(button => {
      const rating = Number(button.dataset.rating);
      button.classList.toggle("selected", rating <= state.rating);
      button.classList.toggle("hovered", !state.rating && hover >= rating);
      button.setAttribute("aria-checked", String(rating === state.rating));
    });
    $("#ratingHint").textContent = state.rating ? `${state.rating} / 5 yıldız` : "Puanını seç";
  }

  function chooseRandom() {
    const films = state.films.filter(film => film.published !== false);
    if (!films.length) {
      $("#randomResult").innerHTML = '<div class="empty-state"><p>Şu an yayında film önerisi yok.</p></div>';
      return;
    }
    const film = films[randomBetween(0, films.length - 1)];
    $("#randomResult").innerHTML = `<article class="random-card">${filmArt(film)}<div class="random-card-content"><h3>${escapeHtml(film.title)}</h3><span class="movie-meta">${escapeHtml(film.meta)} · ${Number(film.rating).toFixed(1)} ★</span><p>“${escapeHtml(film.note || "Güzel bir film akşamı için topluluktan öneri.")}”</p><div class="card-tags"><span class="card-tag mood-tag">${escapeHtml(film.mood)}</span><span class="card-tag">${escapeHtml(film.company)}</span></div><div class="card-footer"><span>${escapeHtml(film.person)} öneriyor</span></div></div></article>`;
  }

  function adminFilteredFilms() {
    const query = state.adminQuery.trim().toLocaleLowerCase("tr");
    return state.films.filter(film => (state.adminMood === "all" || film.mood === state.adminMood) &&
      (!query || `${film.title} ${film.person} ${film.meta}`.toLocaleLowerCase("tr").includes(query)));
  }

  function renderAdmin() {
    const films = state.films;
    const avg = films.length ? films.reduce((sum, film) => sum + Number(film.rating), 0) / films.length : 0;
    const moodCounts = MOODS.map(mood => ({ mood, count: films.filter(film => film.mood === mood).length }));
    const topMood = moodCounts.reduce((top, item) => item.count > top.count ? item : top, { mood: "—", count: 0 });
    $("#kpiGrid").innerHTML = [
      ["Toplam Film Sayısı", films.length, "tüm öneriler"],
      ["Ortalama Puan", avg.toFixed(1), "★ / 5"],
      ["En Popüler Ruh Hali", topMood.count ? topMood.mood : "—", `${topMood.count} öneri`],
      ["Editörün Seçimi Sayısı", films.filter(film => film.editor).length, "öne çıkarılan"]
    ].map(([label, value, note]) => `<div class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`).join("");
    $("#moodChart").innerHTML = moodCounts.map(({ mood, count }) => {
      const percent = films.length ? Math.round(count / films.length * 100) : 0;
      return `<div class="mood-bar-row"><span>${escapeHtml(mood)}</span><div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div><strong>${percent}%</strong></div>`;
    }).join("");
    $("#adminMoodFilter").innerHTML = '<option value="all">Tüm ruh halleri</option>' + MOODS.map(mood => `<option value="${escapeHtml(mood)}">${escapeHtml(mood)}</option>`).join("");
    $("#adminMoodFilter").value = state.adminMood;
    const filtered = adminFilteredFilms();
    $("#adminTableCount").textContent = `${filtered.length} / ${films.length} film`;
    $("#adminTableBody").innerHTML = filtered.length ? filtered.map(film => `
      <tr>
        <td><span class="table-film">${escapeHtml(film.title)}</span><span class="table-person">${escapeHtml(film.person)} · ${escapeHtml(film.meta)}</span></td>
        <td>${escapeHtml(film.mood)}</td>
        <td class="table-rating">★ ${Number(film.rating).toFixed(1)}</td>
        <td><span class="status-badge ${film.published === false ? "hidden-status" : ""}">${film.published === false ? "Gizli" : "Yayında"}</span></td>
        <td><div class="table-actions"><button type="button" class="table-action ${film.editor ? "editor-on" : ""}" data-action="editor" data-id="${escapeHtml(film.id)}" title="Editör seçimini değiştir">★ Editör</button><button type="button" class="table-action" data-action="publish" data-id="${escapeHtml(film.id)}">${film.published === false ? "Yayınla" : "Gizle"}</button><button type="button" class="table-action delete-action" data-action="delete" data-id="${escapeHtml(film.id)}">Sil</button></div></td>
      </tr>`).join("") : '<tr><td colspan="5">Bu filtreyle eşleşen film bulunamadı.</td></tr>';
  }

  function exportCsv() {
    const headers = ["Film Adı", "Yapım Yılı ve Tür", "Ruh Hali", "Kiminle", "Puan", "Not", "Öneren", "Editörün Seçimi", "Yayın Durumu", "Önerilme Tarihi"];
    const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = state.films.map(film => [film.title, film.meta, film.mood, film.company, film.rating, film.note, film.person, film.editor ? "Evet" : "Hayır", film.published === false ? "Gizli" : "Yayında", film.createdAt]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sinelog-film-listesi.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Film listesi CSV olarak indirildi.");
  }

  function handleAdminAction(event) {
    if (!state.firebaseReady) {
      showToast("Veritabanı yükleniyor. Birkaç saniye sonra yeniden dene.");
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const film = state.films.find(item => item.id === button.dataset.id);
    if (!film) return;
    if (button.dataset.action === "editor") film.editor = !film.editor;
    if (button.dataset.action === "publish") film.published = film.published === false;
    if (button.dataset.action === "delete") {
      if (!window.confirm(`“${film.title}” önerisini kalıcı olarak silmek istiyor musun?`)) return;
      state.films = state.films.filter(item => item.id !== film.id);
    }
    saveFilms();
    renderFilms();
    renderAdmin();
  }

  $("#recommendForm").addEventListener("submit", handleRecommendation);
  $("#moodChips").addEventListener("click", event => {
    const button = event.target.closest(".choice-chip");
    if (!button) return;
    state.selectedMood = button.dataset.value;
    $$("#moodChips .choice-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
  });
  $("#companyChips").addEventListener("click", event => {
    const button = event.target.closest(".choice-chip");
    if (!button) return;
    state.selectedCompany = button.dataset.value;
    $$("#companyChips .choice-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
  });
  $("#starPicker").addEventListener("click", event => {
    const button = event.target.closest("button[data-rating]");
    if (!button) return;
    state.rating = Number(button.dataset.rating);
    updateStars();
  });
  $("#starPicker").addEventListener("mouseover", event => {
    const button = event.target.closest("button[data-rating]");
    updateStars(button ? Number(button.dataset.rating) : 0);
  });
  $("#starPicker").addEventListener("mouseleave", () => updateStars());
  $("#starPicker").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    state.rating = Math.min(5, Math.max(1, state.rating + (event.key === "ArrowRight" ? 1 : -1)));
    updateStars();
    $(`#starPicker button[data-rating="${state.rating}"]`).focus();
  });
  $("#moodFilters").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.mood = button.dataset.filter;
    $$("#moodFilters .filter-chip").forEach(chip => chip.classList.toggle("active", chip === button));
    renderFilms();
  });
  $("#companyFilter").addEventListener("change", event => { state.company = event.target.value; renderFilms(); });
  $("#searchInput").addEventListener("input", event => { state.query = event.target.value; renderFilms(); });
  $("#randomOpen").addEventListener("click", () => { chooseRandom(); showModal("randomModal"); });
  $("#randomAgain").addEventListener("click", chooseRandom);
  $("#qrOpen").addEventListener("click", openQrModal);
  $("#copyLink").addEventListener("click", copyCurrentLink);
  $("#adminOpen").addEventListener("click", () => showModal("adminModal"));
  $("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    if ($("#adminPassword").value !== "sinema2026") {
      $("#loginError").textContent = "Şifre doğru değil. Demo şifre bilgisini kontrol et.";
      $("#adminPassword").focus();
      return;
    }
    $("#loginError").textContent = "";
    $("#adminPassword").value = "";
    $("#adminLogin").hidden = true;
    $("#adminDashboard").hidden = false;
    renderAdmin();
  });
  $("#adminLogout").addEventListener("click", () => {
    $("#adminDashboard").hidden = true;
    $("#adminLogin").hidden = false;
    $("#adminPassword").value = "";
    $("#loginError").textContent = "";
    $("#adminPassword").focus();
  });
  $("#adminSearch").addEventListener("input", event => { state.adminQuery = event.target.value; renderAdmin(); });
  $("#adminMoodFilter").addEventListener("change", event => { state.adminMood = event.target.value; renderAdmin(); });
  $("#adminTableBody").addEventListener("click", handleAdminAction);
  $("#exportCsv").addEventListener("click", exportCsv);
  $("#resetData").addEventListener("click", () => {
    if (!state.firebaseReady) {
      showToast("Veritabanı yükleniyor. Birkaç saniye sonra yeniden dene.");
      return;
    }
    if (!window.confirm("Tüm öneriler başlangıçtaki 6 filmle değiştirilsin mi? Bu işlem geri alınamaz.")) return;
    state.films = cloneDefaultFilms();
    state.adminQuery = "";
    state.adminMood = "all";
    $("#adminSearch").value = "";
    saveFilms();
    renderFilms();
    renderAdmin();
    showToast("Başlangıçtaki film listesi geri yüklendi.");
  });
  $$(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop || event.target.closest("[data-close]")) closeModal(backdrop);
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal($(".modal-backdrop:not([hidden])"));
  });

  initializeFirebase();
  renderFilms();
  renderAdmin();
  window.setInterval(refreshFirebase, 15000);
})();

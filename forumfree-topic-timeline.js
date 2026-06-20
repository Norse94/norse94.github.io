(() => {
  const SUPABASE_URL = "https://mycvmmlezpxdoamecrhb.supabase.co";
  const FUNCTION_NAME = "topic-timeline";
  const TOPIC_PARAM = "t";
  const POSTS_PER_PAGE = 15;
  const CLIENT_FETCH_CONCURRENCY = 4;
  const CLIENT_FETCH_RETRIES = 2;

  const pageUrl = new URL(window.location.href);
  const topicId = pageUrl.searchParams.get(TOPIC_PARAM);
  if (!topicId || !/^\d+$/.test(topicId)) return;

  const storageKey = `fftl:${topicId}:read`;
  const currentSt = Number(pageUrl.searchParams.get("st") ?? 0) || 0;
  const endpoint = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}?t=${topicId}`;

  const formatMonth = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric"
  });

  const formatDay = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  function isMobileTimeline() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "null");
    } catch {
      return null;
    }
  }

  function writeState(state) {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function showLoadingStatus(message) {
    let status = document.getElementById("fftl-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "fftl-status";
      status.setAttribute("role", "status");
      status.style.cssText = [
        "position:fixed",
        "z-index:99999",
        "top:96px",
        "right:18px",
        "max-width:220px",
        "box-sizing:border-box",
        "border:1px solid rgba(90,167,255,.34)",
        "border-radius:8px",
        "padding:9px 11px",
        "background:rgba(8,26,52,.96)",
        "color:#f4f8ff",
        "font:13px/1.25 Arial,Helvetica,sans-serif",
        "box-shadow:0 8px 24px rgba(0,0,0,.28)"
      ].join(";");
      document.body.appendChild(status);
    }

    if (isMobileTimeline()) {
      status.style.top = "";
      status.style.right = "14px";
      status.style.bottom = "14px";
      status.style.left = "14px";
      status.style.maxWidth = "";
      status.style.textAlign = "center";
    } else {
      status.style.top = "96px";
      status.style.right = "18px";
      status.style.bottom = "";
      status.style.left = "";
      status.style.maxWidth = "220px";
      status.style.textAlign = "";
    }

    status.textContent = message;
  }

  function hideLoadingStatus() {
    document.getElementById("fftl-status")?.remove();
  }

  function navigateToCheckpoint(timeline, checkpoint) {
    const url = timeline.urlTemplate
      .replace("{st}", String(checkpoint.st))
      .replace("{postId}", String(checkpoint.firstPostId));
    window.location.href = url;
  }

  function checkpointFromRatio(timeline, ratio) {
    const days = timeline.days;
    const index = Math.min(
      days.length - 1,
      Math.max(0, Math.round(ratio * Math.max(0, days.length - 1)))
    );

    return days[index];
  }

  function checkpointForPostNumber(timeline, postNumber) {
    const days = timeline.days;
    let low = 0;
    let high = days.length - 1;
    let best = days[0];

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = days[mid];

      if (candidate.firstPostNumber <= postNumber) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best;
  }

  function currentPostNumber() {
    const entries = [...document.querySelectorAll("[id^='entry']")];
    const viewportMiddle = window.innerHeight / 2;
    let visibleIndex = 0;

    entries.forEach((entry, index) => {
      const rect = entry.getBoundingClientRect();
      if (rect.top <= viewportMiddle) visibleIndex = index;
    });

    return currentSt + visibleIndex + 1;
  }

  async function fetchForumfreePage(st, attempt = 0) {
    try {
      const response = await fetch(`/api.php?t=${topicId}&st=${st}&raw=1&cookie=1`, {
        credentials: "include",
        headers: { accept: "application/json" }
      });

      if (!response.ok) throw new Error(`ForumFree API HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt >= CLIENT_FETCH_RETRIES) throw error;

      await delay(350 * (attempt + 1));
      return fetchForumfreePage(st, attempt + 1);
    }
  }

  async function fetchAllForumfreePages(firstPage) {
    const pageCount = Math.max(1, Number(firstPage.info.pages ?? 1));
    const pages = new Array(pageCount);
    let nextPageIndex = 1;
    let fetchedPages = 1;
    pages[0] = firstPage;
    showLoadingStatus(`Timeline: indicizzo ${fetchedPages}/${pageCount} pagine`);

    async function worker() {
      while (nextPageIndex < pageCount) {
        const pageIndex = nextPageIndex;
        nextPageIndex += 1;
        pages[pageIndex] = await fetchForumfreePage(pageIndex * POSTS_PER_PAGE);
        fetchedPages += 1;
        showLoadingStatus(`Timeline: indicizzo ${fetchedPages}/${pageCount} pagine`);
      }
    }

    const workerCount = Math.min(CLIENT_FETCH_CONCURRENCY, Math.max(0, pageCount - 1));
    await Promise.all(Array.from({ length: workerCount }, worker));

    return pages;
  }

  function isTimelineComplete(timeline) {
    if (!timeline?.topic || !timeline?.days?.length) return false;

    const firstCheckpointDay = timeline.days[0].date;
    const lastCheckpointDay = timeline.days[timeline.days.length - 1].date;
    const firstTopicDay = String(timeline.topic.firstPostAt ?? "").slice(0, 10);
    const lastTopicDay = String(timeline.topic.lastPostAt ?? "").slice(0, 10);
    const totalPosts = Number(timeline.topic.totalPosts ?? 0);
    const checkpointPosts = timeline.days.reduce((sum, day) => {
      return sum + Math.max(0, Number(day.count ?? 0));
    }, 0);

    return (
      firstCheckpointDay === firstTopicDay &&
      lastCheckpointDay === lastTopicDay &&
      (!totalPosts || checkpointPosts >= totalPosts)
    );
  }

  function buildTimelineFromPages(pages) {
    const firstPage = pages[0];
    const info = firstPage.info;
    const dayMap = new Map();

    pages.forEach((page, pageIndex) => {
      const st = pageIndex * POSTS_PER_PAGE;
      page.messages.forEach((message, index) => {
        const firstPostAt = message.info.date;
        const date = firstPostAt.slice(0, 10);
        const existing = dayMap.get(date);

        if (existing) {
          existing.count += 1;
          return;
        }

        dayMap.set(date, {
          date,
          firstPostId: Number(message.id),
          firstPostNumber: st + index + 1,
          st,
          firstPostAt,
          count: 1
        });
      });
    });

    return {
      topic: {
        id: Number(topicId),
        forumDomain: "difesa",
        title: info.title ?? null,
        replies: Number(info.replies ?? 0),
        pages: Number(info.pages ?? pages.length),
        totalPosts: Number(info.replies ?? 0) + 1,
        firstPostAt: info.first_post_time,
        lastPostAt: info.last_post_time,
        lastIndexedSt: (Number(info.pages ?? pages.length) - 1) * POSTS_PER_PAGE,
        indexedAt: new Date().toISOString()
      },
      days: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      urlTemplate: `https://difesa.forumfree.it/?t=${topicId}&st={st}#entry{postId}`
    };
  }

  async function buildTimelineFromForumfree() {
    showLoadingStatus("Timeline: leggo la discussione");
    const firstPage = await fetchForumfreePage(0);
    const pages = await fetchAllForumfreePages(firstPage);

    const timeline = buildTimelineFromPages(pages);
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: timeline.topic, days: timeline.days })
    }).catch((error) => {
      console.warn("ForumFree timeline cache write failed", error);
    });

    return timeline;
  }

  async function loadTimeline() {
    const cached = await fetch(endpoint).then((response) => {
      if (!response.ok) return null;
      return response.json();
    }).catch(() => null);

    if (isTimelineComplete(cached)) return cached;
    if (cached) showLoadingStatus("Timeline: aggiorno indice incompleto");
    return buildTimelineFromForumfree();
  }

  function render(timeline) {
    hideLoadingStatus();
    if (!timeline.days.length) return;

    const existing = document.getElementById("fftl-root");
    if (existing) existing.remove();

    const root = document.createElement("aside");
    root.id = "fftl-root";
    root.setAttribute("aria-label", "Timeline discussione");
    root.innerHTML = `
      <div class="fftl-date fftl-start"></div>
      <button class="fftl-back" type="button">Torna</button>
      <div class="fftl-track">
        <div class="fftl-line"></div>
        <div class="fftl-fill"></div>
        <button class="fftl-handle" type="button" aria-label="Vai alla data selezionata">
          <strong></strong>
          <span></span>
        </button>
      </div>
      <div class="fftl-date fftl-end"></div>
    `;

    document.getElementById("fftl-style")?.remove();
    const style = document.createElement("style");
    style.id = "fftl-style";
    style.textContent = `
      #fftl-root {
        --fftl-bg: rgba(6, 18, 36, 0.88);
        --fftl-bg-strong: rgba(8, 26, 52, 0.96);
        --fftl-track: rgba(86, 143, 214, 0.32);
        --fftl-blue: #1d74f5;
        --fftl-blue-soft: #5aa7ff;
        --fftl-blue-pale: #b8d9ff;
        --fftl-text: #f4f8ff;
        --fftl-muted: #9bb0c9;
        position: fixed;
        z-index: 99999;
        top: 96px;
        right: 18px;
        width: 132px;
        height: min(430px, calc(100vh - 140px));
        color: var(--fftl-text);
        font: 15px/1.2 Arial, Helvetica, sans-serif;
        user-select: none;
      }

      #fftl-root .fftl-date {
        position: absolute;
        right: 0;
        left: 0;
        overflow: hidden;
        color: var(--fftl-muted);
        font-size: 14px;
        height: 24px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-start {
        top: 0;
      }

      #fftl-root .fftl-end {
        bottom: 0;
      }

      #fftl-root .fftl-track {
        position: absolute;
        top: 28px;
        bottom: 28px;
        left: 6px;
        width: 112px;
        touch-action: none;
      }

      #fftl-root .fftl-line {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 11px;
        width: 3px;
        border-radius: 999px;
        background: var(--fftl-track);
      }

      #fftl-root .fftl-fill {
        position: absolute;
        top: 0;
        left: 11px;
        width: 3px;
        height: 0;
        border-radius: 999px;
        background: var(--fftl-blue);
        box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.18), 0 0 18px rgba(29, 116, 245, 0.4);
      }

      #fftl-root .fftl-handle {
        position: absolute;
        left: 0;
        width: 102px;
        min-height: 54px;
        box-sizing: border-box;
        border: 1px solid rgba(116, 176, 255, 0.36);
        border-left: 6px solid var(--fftl-blue);
        border-radius: 8px;
        padding: 7px 8px 7px 12px;
        background: var(--fftl-bg);
        color: var(--fftl-text);
        text-align: left;
        cursor: grab;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        outline: none;
        touch-action: none;
      }

      #fftl-root .fftl-handle:active {
        cursor: grabbing;
      }

      #fftl-root .fftl-handle:focus-visible {
        box-shadow: 0 0 0 3px rgba(90, 167, 255, 0.35), 0 8px 24px rgba(0, 0, 0, 0.28);
      }

      #fftl-root .fftl-handle strong {
        display: block;
        overflow: hidden;
        font-size: 17px;
        line-height: 20px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-handle span {
        display: block;
        overflow: hidden;
        color: var(--fftl-blue-pale);
        font-size: 14px;
        line-height: 17px;
        margin-top: 2px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-back {
        display: none;
        position: absolute;
        top: 25px;
        left: 34px;
        border: 1px solid rgba(184, 217, 255, 0.36);
        border-radius: 8px;
        padding: 6px 10px;
        color: #ffffff;
        background: var(--fftl-blue);
        box-shadow: 0 8px 18px rgba(29, 116, 245, 0.28);
        cursor: pointer;
      }

      #fftl-root .fftl-back.is-visible {
        display: block;
      }

      @media (max-width: 900px) {
        #fftl-root {
          top: auto;
          right: 0;
          bottom: 0;
          left: 0;
          width: auto;
          height: calc(82px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-sizing: border-box;
          background: var(--fftl-bg-strong);
          border-top: 1px solid rgba(90, 167, 255, 0.28);
          box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.36);
        }

        body.fftl-mobile-ready {
          padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px)) !important;
        }

        #fftl-root .fftl-date {
          position: absolute;
          top: 9px;
          height: 16px;
          max-width: 42%;
          overflow: hidden;
          color: var(--fftl-muted);
          font-size: 12px;
          line-height: 16px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        #fftl-root .fftl-start {
          left: 14px;
        }

        #fftl-root .fftl-end {
          bottom: auto;
          right: 14px;
          text-align: right;
        }

        #fftl-root .fftl-track {
          top: 36px;
          right: 14px;
          bottom: auto;
          left: 14px;
          width: auto;
          height: 40px;
        }

        #fftl-root .fftl-back.is-visible + .fftl-track {
          right: 88px;
        }

        #fftl-root .fftl-line {
          top: 19px;
          right: 0;
          bottom: auto;
          left: 0;
          width: auto;
          height: 3px;
        }

        #fftl-root .fftl-fill {
          top: 19px;
          left: 0;
          width: 0;
          height: 3px;
        }

        #fftl-root .fftl-handle {
          top: 0;
          left: 0;
          width: 118px;
          min-height: 40px;
          box-sizing: border-box;
          border: 1px solid rgba(116, 176, 255, 0.34);
          border-top: 5px solid var(--fftl-blue);
          border-left: 0;
          border-radius: 8px;
          padding: 6px 8px 0;
          background: rgba(9, 31, 62, 0.96);
          text-align: center;
        }

        #fftl-root .fftl-handle strong {
          overflow: hidden;
          font-size: 14px;
          line-height: 15px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        #fftl-root .fftl-handle span {
          overflow: hidden;
          margin-top: 0;
          font-size: 12px;
          line-height: 14px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        #fftl-root .fftl-back {
          top: 39px;
          right: 14px;
          left: auto;
          min-width: 64px;
          height: 32px;
          padding: 0 8px;
          font-size: 13px;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(root);
    document.body.classList.add("fftl-mobile-ready");

    const start = root.querySelector(".fftl-start");
    const end = root.querySelector(".fftl-end");
    const track = root.querySelector(".fftl-track");
    const fill = root.querySelector(".fftl-fill");
    const handle = root.querySelector(".fftl-handle");
    const handleStrong = handle.querySelector("strong");
    const handleDate = handle.querySelector("span");
    const backButton = root.querySelector(".fftl-back");

    start.textContent = formatMonth.format(new Date(timeline.topic.firstPostAt));
    end.textContent = formatDay.format(new Date(timeline.topic.lastPostAt));

    function setHandlePosition(ratio) {
      fill.style.height = `${ratio * 100}%`;
      fill.style.width = "";

      if (isMobileTimeline()) {
        const x = ratio * Math.max(1, track.clientWidth - handle.clientWidth);
        handle.style.left = `${x}px`;
        handle.style.top = "0";
        fill.style.width = `${ratio * 100}%`;
        fill.style.height = "3px";
        return;
      }

      const y = ratio * Math.max(1, track.clientHeight - handle.clientHeight);
      handle.style.top = `${y}px`;
      handle.style.left = "0";
    }

    function setHandleByPostNumber(postNumber) {
      const total = Math.max(1, Number(timeline.topic.totalPosts));
      const ratio = Math.min(1, Math.max(0, (postNumber - 1) / Math.max(1, total - 1)));
      setHandlePosition(ratio);
      handleStrong.textContent = `${postNumber} / ${total}`;

      const checkpoint = checkpointForPostNumber(timeline, postNumber);
      handleDate.textContent = formatDay.format(new Date(checkpoint.firstPostAt));
    }

    function updateReadState() {
      const postNumber = currentPostNumber();
      const current = readState();
      if (!current || postNumber > current.lastPostNumber) {
        writeState({
          lastPostNumber: postNumber,
          st: currentSt,
          href: window.location.href,
          updatedAt: new Date().toISOString()
        });
      }

      const saved = readState();
      backButton.classList.toggle("is-visible", Boolean(saved && postNumber < saved.lastPostNumber));
      setHandleByPostNumber(postNumber);
    }

    let dragging = false;
    let pendingCheckpoint = null;
    let activePointerId = null;
    let pointerMoved = false;

    function ratioFromPointer(event) {
      const rect = track.getBoundingClientRect();
      if (isMobileTimeline()) {
        return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      }

      return Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    }

    handle.addEventListener("pointerdown", (event) => {
      const ratio = ratioFromPointer(event);
      dragging = true;
      activePointerId = event.pointerId;
      pointerMoved = false;
      pendingCheckpoint = isMobileTimeline() ? checkpointFromRatio(timeline, ratio) : null;
      if (pendingCheckpoint) {
        setHandlePosition(ratio);
        handleStrong.textContent = `${pendingCheckpoint.firstPostNumber} / ${timeline.topic.totalPosts}`;
        handleDate.textContent = formatDay.format(new Date(pendingCheckpoint.firstPostAt));
      }
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragging || activePointerId !== event.pointerId) return;
      const ratio = ratioFromPointer(event);
      pointerMoved = true;
      pendingCheckpoint = checkpointFromRatio(timeline, ratio);
      setHandlePosition(ratio);
      handleStrong.textContent = `${pendingCheckpoint.firstPostNumber} / ${timeline.topic.totalPosts}`;
      handleDate.textContent = formatDay.format(new Date(pendingCheckpoint.firstPostAt));
      event.preventDefault();
    });

    handle.addEventListener("pointerup", (event) => {
      if (activePointerId !== event.pointerId) return;
      dragging = false;
      activePointerId = null;
      if (pendingCheckpoint && (isMobileTimeline() || pointerMoved)) {
        navigateToCheckpoint(timeline, pendingCheckpoint);
      }
      pointerMoved = false;
    });

    handle.addEventListener("pointercancel", () => {
      dragging = false;
      activePointerId = null;
      pointerMoved = false;
      pendingCheckpoint = null;
    });

    track.addEventListener("pointerdown", (event) => {
      if (!isMobileTimeline() || event.target === handle || handle.contains(event.target)) return;
      const ratio = ratioFromPointer(event);
      dragging = true;
      activePointerId = event.pointerId;
      pointerMoved = false;
      pendingCheckpoint = checkpointFromRatio(timeline, ratio);
      setHandlePosition(ratio);
      handleStrong.textContent = `${pendingCheckpoint.firstPostNumber} / ${timeline.topic.totalPosts}`;
      handleDate.textContent = formatDay.format(new Date(pendingCheckpoint.firstPostAt));
      track.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    track.addEventListener("pointermove", (event) => {
      if (!isMobileTimeline() || !dragging || activePointerId !== event.pointerId) return;
      const ratio = ratioFromPointer(event);
      pointerMoved = true;
      pendingCheckpoint = checkpointFromRatio(timeline, ratio);
      setHandlePosition(ratio);
      handleStrong.textContent = `${pendingCheckpoint.firstPostNumber} / ${timeline.topic.totalPosts}`;
      handleDate.textContent = formatDay.format(new Date(pendingCheckpoint.firstPostAt));
      event.preventDefault();
    });

    track.addEventListener("pointerup", (event) => {
      if (!isMobileTimeline() || activePointerId !== event.pointerId) return;
      dragging = false;
      activePointerId = null;
      if (pendingCheckpoint) navigateToCheckpoint(timeline, pendingCheckpoint);
      pointerMoved = false;
    });

    track.addEventListener("pointercancel", () => {
      if (!isMobileTimeline()) return;
      dragging = false;
      activePointerId = null;
      pointerMoved = false;
      pendingCheckpoint = null;
    });

    track.addEventListener("click", (event) => {
      if (isMobileTimeline()) return;
      if (event.target === handle || handle.contains(event.target)) return;
      navigateToCheckpoint(timeline, checkpointFromRatio(timeline, ratioFromPointer(event)));
    });

    backButton.addEventListener("click", () => {
      const saved = readState();
      if (saved?.href) window.location.href = saved.href;
    });

    updateReadState();
    window.addEventListener("scroll", updateReadState, { passive: true });
    window.addEventListener("resize", updateReadState, { passive: true });
  }

  loadTimeline().then(render).catch((error) => {
    console.warn("ForumFree timeline unavailable", error);
    showLoadingStatus("Timeline non disponibile");
    setTimeout(hideLoadingStatus, 6000);
  });
})();

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
        "top:82px",
        "right:16px",
        "max-width:240px",
        "box-sizing:border-box",
        "border:1px solid rgba(149,190,242,.3)",
        "border-radius:8px",
        "padding:10px 12px",
        "background:linear-gradient(135deg,rgba(24,48,78,.96),rgba(7,13,22,.96))",
        "color:#f7fbff",
        "font:700 13px/1.25 Arial,Helvetica,sans-serif",
        "box-shadow:0 18px 46px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08)"
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
      status.style.top = "82px";
      status.style.right = "16px";
      status.style.bottom = "";
      status.style.left = "";
      status.style.maxWidth = "240px";
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

  function timelineTicks(timeline) {
    const byYear = new Map();

    timeline.days.forEach((day) => {
      const year = String(day.date).slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, day);
    });

    const ticks = [...byYear.entries()].map(([year, day]) => ({
      year,
      postNumber: Number(day.firstPostNumber)
    }));

    if (ticks.length <= 6) return ticks;

    const selected = [];
    for (let index = 0; index < 6; index += 1) {
      selected.push(ticks[Math.round(index * (ticks.length - 1) / 5)]);
    }

    return selected.filter((tick, index, list) => {
      return index === 0 || tick.year !== list[index - 1].year;
    });
  }

  function renderTicks(timeline, ticksRoot) {
    const total = Math.max(1, Number(timeline.topic.totalPosts));
    ticksRoot.textContent = "";

    timelineTicks(timeline).forEach((tick) => {
      const ratio = Math.min(1, Math.max(0, (tick.postNumber - 1) / Math.max(1, total - 1)));
      const item = document.createElement("span");
      item.className = "fftl-tick";
      item.style.setProperty("--ratio", `${(ratio * 100).toFixed(2)}%`);
      item.textContent = tick.year;
      ticksRoot.appendChild(item);
    });
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
    const pageCount = Math.max(1, Number(timeline.topic.pages ?? 1));
    const expectedLastSt = (pageCount - 1) * POSTS_PER_PAGE;
    const lastIndexedSt = Number(timeline.topic.lastIndexedSt);
    const hasIndexedLastPage = !Number.isFinite(lastIndexedSt) || lastIndexedSt >= expectedLastSt;

    return (
      firstCheckpointDay === firstTopicDay &&
      lastCheckpointDay === lastTopicDay &&
      hasIndexedLastPage
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
    const cached = await fetch(endpoint, { cache: "no-store" }).then((response) => {
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
      <div class="fftl-shell">
        <div class="fftl-cap">
          <span class="fftl-date fftl-start"></span>
          <span class="fftl-spark" aria-hidden="true"></span>
        </div>
        <button class="fftl-back" type="button" aria-label="Torna all'ultimo letto" title="Torna all'ultimo letto">
          <span aria-hidden="true">&larr;</span>
        </button>
        <div class="fftl-track">
          <div class="fftl-line"></div>
          <div class="fftl-fill"></div>
          <div class="fftl-ticks" aria-hidden="true"></div>
          <button class="fftl-handle" type="button" aria-label="Vai alla data selezionata">
            <span class="fftl-pin" aria-hidden="true"></span>
            <strong></strong>
            <span></span>
          </button>
        </div>
        <div class="fftl-cap fftl-cap-end">
          <span class="fftl-date fftl-end"></span>
        </div>
      </div>
    `;

    document.getElementById("fftl-style")?.remove();
    const style = document.createElement("style");
    style.id = "fftl-style";
    style.textContent = `
      #fftl-root {
        --fftl-panel: rgba(9, 15, 24, 0.9);
        --fftl-panel-strong: rgba(7, 13, 22, 0.96);
        --fftl-stroke: rgba(149, 190, 242, 0.28);
        --fftl-rail: rgba(90, 127, 171, 0.34);
        --fftl-blue: #1677ff;
        --fftl-blue-hot: #44a3ff;
        --fftl-cyan: #55d9ff;
        --fftl-mint: #78e7c6;
        --fftl-ink: #f7fbff;
        --fftl-muted: #9db2c9;
        --fftl-faint: #64758a;
        position: fixed;
        z-index: 99999;
        top: 82px;
        right: 16px;
        width: 184px;
        height: min(560px, calc(100vh - 118px));
        color: var(--fftl-ink);
        font: 14px/1.2 Arial, Helvetica, sans-serif;
        pointer-events: none;
        user-select: none;
      }

      #fftl-root * {
        box-sizing: border-box;
      }

      #fftl-root .fftl-shell {
        position: absolute;
        inset: 0;
        overflow: hidden;
        border: 1px solid var(--fftl-stroke);
        border-radius: 8px;
        background:
          linear-gradient(90deg, rgba(85, 217, 255, 0.13), transparent 32%, rgba(120, 231, 198, 0.08)),
          linear-gradient(180deg, var(--fftl-panel), var(--fftl-panel-strong));
        box-shadow:
          0 18px 46px rgba(0, 0, 0, 0.36),
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 -1px 0 rgba(0, 0, 0, 0.42);
        pointer-events: auto;
      }

      #fftl-root .fftl-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 24%),
          linear-gradient(90deg, rgba(68, 163, 255, 0.16), transparent 18%);
        pointer-events: none;
      }

      #fftl-root .fftl-shell::after {
        content: "";
        position: absolute;
        top: 1px;
        right: 1px;
        bottom: 1px;
        width: 1px;
        background: linear-gradient(180deg, transparent, rgba(85, 217, 255, 0.42), transparent);
        pointer-events: none;
      }

      #fftl-root .fftl-cap {
        position: absolute;
        z-index: 2;
        top: 8px;
        right: 12px;
        left: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 26px;
      }

      #fftl-root .fftl-cap-end {
        top: auto;
        bottom: 8px;
      }

      #fftl-root .fftl-date {
        display: block;
        overflow: hidden;
        color: var(--fftl-muted);
        font-size: 12px;
        font-weight: 700;
        line-height: 16px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-spark {
        width: 8px;
        height: 8px;
        border: 1px solid rgba(120, 231, 198, 0.78);
        border-radius: 3px;
        background: rgba(85, 217, 255, 0.58);
        box-shadow: 0 0 14px rgba(85, 217, 255, 0.55);
        transform: rotate(45deg);
        flex: 0 0 auto;
      }

      #fftl-root .fftl-track {
        position: absolute;
        z-index: 1;
        top: 42px;
        right: 10px;
        bottom: 42px;
        left: 12px;
        touch-action: none;
      }

      #fftl-root .fftl-line {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 31px;
        width: 5px;
        border-radius: 4px;
        background:
          linear-gradient(180deg, rgba(85, 217, 255, 0.18), rgba(86, 119, 156, 0.34)),
          var(--fftl-rail);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.08),
          0 0 0 1px rgba(14, 30, 48, 0.62);
      }

      #fftl-root .fftl-line::after {
        content: "";
        position: absolute;
        top: 4px;
        right: 2px;
        bottom: 4px;
        width: 1px;
        background: rgba(255, 255, 255, 0.28);
      }

      #fftl-root .fftl-fill {
        position: absolute;
        top: 0;
        left: 31px;
        width: 5px;
        height: 0;
        border-radius: 4px;
        background: linear-gradient(180deg, var(--fftl-cyan), var(--fftl-blue) 55%, var(--fftl-mint));
        box-shadow:
          0 0 0 1px rgba(85, 217, 255, 0.24),
          0 0 18px rgba(22, 119, 255, 0.58);
      }

      #fftl-root .fftl-ticks {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      #fftl-root .fftl-tick {
        position: absolute;
        top: var(--ratio);
        left: 40px;
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--fftl-faint);
        font-size: 10px;
        font-weight: 700;
        line-height: 12px;
        transform: translateY(-50%);
      }

      #fftl-root .fftl-tick::before {
        content: "";
        width: 14px;
        height: 1px;
        background: rgba(157, 178, 201, 0.42);
      }

      #fftl-root .fftl-handle {
        position: absolute;
        left: 40px;
        width: 130px;
        min-height: 58px;
        box-sizing: border-box;
        border: 1px solid rgba(116, 176, 255, 0.42);
        border-radius: 8px;
        padding: 8px 9px 8px 34px;
        background:
          linear-gradient(135deg, rgba(24, 48, 78, 0.98), rgba(8, 18, 31, 0.96)),
          var(--fftl-panel-strong);
        color: var(--fftl-ink);
        text-align: left;
        cursor: grab;
        box-shadow:
          0 12px 30px rgba(0, 0, 0, 0.38),
          0 0 0 1px rgba(85, 217, 255, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        outline: none;
        touch-action: none;
      }

      #fftl-root .fftl-handle::before {
        content: "";
        position: absolute;
        top: 7px;
        bottom: 7px;
        left: 26px;
        width: 1px;
        background: linear-gradient(180deg, transparent, rgba(85, 217, 255, 0.52), transparent);
      }

      #fftl-root .fftl-handle:active {
        cursor: grabbing;
      }

      #fftl-root .fftl-handle:focus-visible {
        box-shadow:
          0 0 0 3px rgba(85, 217, 255, 0.28),
          0 12px 30px rgba(0, 0, 0, 0.38);
      }

      #fftl-root .fftl-pin {
        position: absolute;
        top: 50%;
        left: 10px;
        width: 13px;
        height: 13px;
        border: 1px solid rgba(247, 251, 255, 0.72);
        border-radius: 3px;
        background: linear-gradient(135deg, var(--fftl-cyan), var(--fftl-blue));
        box-shadow: 0 0 16px rgba(85, 217, 255, 0.52);
        transform: translateY(-50%) rotate(45deg);
      }

      #fftl-root .fftl-pin::after {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 2px;
        background: #ffffff;
      }

      #fftl-root .fftl-handle strong {
        display: block;
        overflow: hidden;
        font-size: 16px;
        font-weight: 800;
        line-height: 21px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-handle span {
        display: block;
        overflow: hidden;
        color: #b8d9ff;
        font-size: 12px;
        font-weight: 700;
        line-height: 15px;
        margin-top: 2px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      #fftl-root .fftl-back {
        display: none;
        position: absolute;
        z-index: 3;
        top: 38px;
        right: 12px;
        width: 34px;
        height: 34px;
        border: 1px solid rgba(184, 217, 255, 0.34);
        border-radius: 8px;
        padding: 0;
        color: #ffffff;
        background: linear-gradient(135deg, var(--fftl-blue-hot), var(--fftl-blue));
        box-shadow:
          0 10px 22px rgba(22, 119, 255, 0.34),
          inset 0 1px 0 rgba(255, 255, 255, 0.22);
        cursor: pointer;
        font-size: 18px;
        font-weight: 800;
        line-height: 32px;
        text-align: center;
      }

      #fftl-root .fftl-back.is-visible {
        display: block;
      }

      @media (max-width: 900px) {
        #fftl-root {
          top: auto;
          right: 8px;
          bottom: calc(8px + env(safe-area-inset-bottom, 0px));
          left: 8px;
          width: auto;
          height: 96px;
        }

        body.fftl-mobile-ready {
          padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important;
        }

        #fftl-root .fftl-shell {
          border-radius: 8px;
        }

        #fftl-root .fftl-cap {
          position: absolute;
          top: 8px;
          right: auto;
          left: 14px;
          max-width: 43%;
          min-height: 18px;
        }

        #fftl-root .fftl-cap-end {
          right: 14px;
          left: auto;
          justify-content: flex-end;
          text-align: right;
        }

        #fftl-root .fftl-date {
          font-size: 11px;
          line-height: 16px;
          max-width: 100%;
        }

        #fftl-root .fftl-track {
          top: 39px;
          right: 16px;
          bottom: auto;
          left: 16px;
          width: auto;
          height: 44px;
        }

        #fftl-root .fftl-back.is-visible + .fftl-track {
          right: 60px;
        }

        #fftl-root .fftl-line {
          top: 20px;
          right: 0;
          bottom: auto;
          left: 0;
          width: auto;
          height: 5px;
        }

        #fftl-root .fftl-fill {
          top: 20px;
          left: 0;
          width: 0;
          height: 5px;
        }

        #fftl-root .fftl-line::after {
          top: 2px;
          right: 4px;
          bottom: auto;
          left: 4px;
          width: auto;
          height: 1px;
        }

        #fftl-root .fftl-tick {
          top: 34px;
          left: var(--ratio);
          gap: 0;
          font-size: 9px;
          line-height: 10px;
          transform: translateX(-50%);
        }

        #fftl-root .fftl-tick::before {
          position: absolute;
          top: -13px;
          left: 50%;
          width: 1px;
          height: 8px;
          transform: translateX(-50%);
        }

        #fftl-root .fftl-tick:nth-child(n+5) {
          display: none;
        }

        #fftl-root .fftl-handle {
          top: 0;
          left: 0;
          width: 130px;
          min-height: 42px;
          box-sizing: border-box;
          border: 1px solid rgba(116, 176, 255, 0.38);
          border-top: 4px solid var(--fftl-cyan);
          border-radius: 8px;
          padding: 6px 8px 4px;
          text-align: center;
        }

        #fftl-root .fftl-handle::before,
        #fftl-root .fftl-pin {
          display: none;
        }

        #fftl-root .fftl-handle strong {
          overflow: hidden;
          font-size: 14px;
          line-height: 16px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        #fftl-root .fftl-handle span {
          overflow: hidden;
          margin-top: 0;
          font-size: 12px;
          line-height: 15px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        #fftl-root .fftl-back {
          top: 34px;
          right: 14px;
          left: auto;
          width: 34px;
          height: 34px;
          font-size: 18px;
          line-height: 32px;
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
    const ticks = root.querySelector(".fftl-ticks");
    const handle = root.querySelector(".fftl-handle");
    const handleStrong = handle.querySelector("strong");
    const handleDate = handle.querySelector("span");
    const backButton = root.querySelector(".fftl-back");

    start.textContent = formatMonth.format(new Date(timeline.topic.firstPostAt));
    end.textContent = formatDay.format(new Date(timeline.topic.lastPostAt));
    renderTicks(timeline, ticks);

    function setHandlePosition(ratio) {
      fill.style.height = `${ratio * 100}%`;
      fill.style.width = "";

      if (isMobileTimeline()) {
        const x = ratio * Math.max(1, track.clientWidth - handle.clientWidth);
        handle.style.left = `${x}px`;
        handle.style.top = "0";
        fill.style.width = `${ratio * 100}%`;
        fill.style.height = "5px";
        return;
      }

      const y = ratio * Math.max(1, track.clientHeight - handle.clientHeight);
      handle.style.top = `${y}px`;
      handle.style.left = "";
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

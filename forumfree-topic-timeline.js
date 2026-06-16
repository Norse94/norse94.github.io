(() => {
  const SUPABASE_URL = "https://mycvmmlezpxdoamecrhb.supabase.co";
  const FUNCTION_NAME = "topic-timeline";
  const TOPIC_PARAM = "t";
  const POSTS_PER_PAGE = 15;
  const MAX_CLIENT_PAGES = 200;

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

  function navigateToCheckpoint(timeline, checkpoint) {
    const url = timeline.urlTemplate
      .replace("{st}", String(checkpoint.st))
      .replace("{postId}", String(checkpoint.firstPostId));
    window.location.href = url;
  }

  function nearestCheckpoint(timeline, ratio) {
    const days = timeline.days;
    const first = Date.parse(timeline.topic.firstPostAt);
    const last = Date.parse(timeline.topic.lastPostAt);
    const target = first + (last - first) * ratio;

    return days.find((day) => Date.parse(day.firstPostAt) >= target) ?? days[days.length - 1];
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

  async function fetchForumfreePage(st) {
    const response = await fetch(`/api.php?t=${topicId}&st=${st}&raw=1&cookie=1`, {
      credentials: "include",
      headers: { accept: "application/json" }
    });

    if (!response.ok) throw new Error(`ForumFree API HTTP ${response.status}`);
    return response.json();
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
    const pages = [];
    const firstPage = await fetchForumfreePage(0);
    pages.push(firstPage);

    const pageCount = Math.min(Number(firstPage.info.pages ?? 1), MAX_CLIENT_PAGES);
    for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
      pages.push(await fetchForumfreePage(pageIndex * POSTS_PER_PAGE));
    }

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

    if (cached?.days?.length) return cached;
    return buildTimelineFromForumfree();
  }

  function render(timeline) {
    if (!timeline.days.length) return;

    const existing = document.getElementById("fftl-root");
    if (existing) existing.remove();

    const root = document.createElement("aside");
    root.id = "fftl-root";
    root.innerHTML = `
      <div class="fftl-date fftl-start"></div>
      <button class="fftl-back" type="button">Torna</button>
      <div class="fftl-track">
        <div class="fftl-line"></div>
        <button class="fftl-handle" type="button">
          <strong></strong>
          <span></span>
        </button>
      </div>
      <div class="fftl-date fftl-end"></div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #fftl-root {
        position: fixed;
        z-index: 99999;
        top: 96px;
        right: 18px;
        width: 118px;
        height: min(430px, calc(100vh - 140px));
        color: #d9d9df;
        font: 15px/1.2 Arial, Helvetica, sans-serif;
        user-select: none;
      }

      #fftl-root .fftl-date {
        color: #9a9aa2;
        height: 24px;
      }

      #fftl-root .fftl-track {
        position: absolute;
        top: 28px;
        bottom: 28px;
        left: 8px;
        width: 92px;
      }

      #fftl-root .fftl-line {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 8px;
        width: 2px;
        background: #8d70ff;
      }

      #fftl-root .fftl-handle {
        position: absolute;
        left: 4px;
        width: 80px;
        min-height: 48px;
        border: 0;
        border-left: 6px solid #8d70ff;
        padding: 4px 0 4px 10px;
        background: transparent;
        color: #f5f5f7;
        text-align: left;
        cursor: grab;
      }

      #fftl-root .fftl-handle:active {
        cursor: grabbing;
      }

      #fftl-root .fftl-handle strong {
        display: block;
        font-size: 18px;
      }

      #fftl-root .fftl-handle span {
        display: block;
        color: #9a9aa2;
        margin-top: 2px;
      }

      #fftl-root .fftl-back {
        display: none;
        position: absolute;
        top: 24px;
        left: 30px;
        border: 0;
        border-radius: 4px;
        padding: 5px 8px;
        color: #ffffff;
        background: #2484ff;
        cursor: pointer;
      }

      #fftl-root .fftl-back.is-visible {
        display: block;
      }

      @media (max-width: 900px) {
        #fftl-root {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(root);

    const start = root.querySelector(".fftl-start");
    const end = root.querySelector(".fftl-end");
    const track = root.querySelector(".fftl-track");
    const handle = root.querySelector(".fftl-handle");
    const handleStrong = handle.querySelector("strong");
    const handleDate = handle.querySelector("span");
    const backButton = root.querySelector(".fftl-back");

    start.textContent = formatMonth.format(new Date(timeline.topic.firstPostAt));
    end.textContent = formatDay.format(new Date(timeline.topic.lastPostAt));

    function setHandleByPostNumber(postNumber) {
      const total = Math.max(1, Number(timeline.topic.totalPosts));
      const ratio = Math.min(1, Math.max(0, (postNumber - 1) / Math.max(1, total - 1)));
      const y = ratio * Math.max(1, track.clientHeight - handle.clientHeight);
      handle.style.top = `${y}px`;
      handleStrong.textContent = `${postNumber} / ${total}`;

      const checkpoint = nearestCheckpoint(timeline, ratio);
      handleDate.textContent = formatMonth.format(new Date(checkpoint.firstPostAt));
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

    function ratioFromPointer(event) {
      const rect = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    }

    handle.addEventListener("pointerdown", (event) => {
      dragging = true;
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const ratio = ratioFromPointer(event);
      pendingCheckpoint = nearestCheckpoint(timeline, ratio);
      const y = ratio * Math.max(1, track.clientHeight - handle.clientHeight);
      handle.style.top = `${y}px`;
      handleStrong.textContent = `${pendingCheckpoint.firstPostNumber} / ${timeline.topic.totalPosts}`;
      handleDate.textContent = formatMonth.format(new Date(pendingCheckpoint.firstPostAt));
    });

    handle.addEventListener("pointerup", () => {
      dragging = false;
      if (pendingCheckpoint) navigateToCheckpoint(timeline, pendingCheckpoint);
    });

    track.addEventListener("click", (event) => {
      if (event.target === handle || handle.contains(event.target)) return;
      navigateToCheckpoint(timeline, nearestCheckpoint(timeline, ratioFromPointer(event)));
    });

    backButton.addEventListener("click", () => {
      const saved = readState();
      if (saved?.href) window.location.href = saved.href;
    });

    updateReadState();
    window.addEventListener("scroll", updateReadState, { passive: true });
  }

  loadTimeline().then(render).catch((error) => {
    console.warn("ForumFree timeline unavailable", error);
  });
})();


////////////////////
// Main Structure //
////////////////////
const listNew = [];
const listWorking = [];
const listFinish = [];
const lists = {
  listNew: listNew,
  listWorking: listWorking,
  listFinish: listFinish,
};

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

//////////////////
// Quran Player //
//////////////////
const quranPlayer = (() => {
  const playBtn = document.querySelector(".play");
  const pauseBtn = document.querySelector(".pause");
  const restartBtn = document.querySelector(".restart");
  const prevBtn = document.querySelector(".backward");
  const nextBtn = document.querySelector(".forward");
  const selectSurah = document.getElementById("surah-selector");
  const audio = document.getElementById("audio");

  let surahNumber = Number(localStorage.getItem("surahNumber")) || 112;
  let ayahIndex = Number(localStorage.getItem("ayahIndex")) || 0;

  let token = 0;
  let playing = false;

  selectSurah.selectedIndex = surahNumber - 1;

  const persist = () => {
    localStorage.setItem("surahNumber", surahNumber);
    localStorage.setItem("ayahIndex", ayahIndex);
  };

  const setUI = () => {
    playBtn.classList.toggle("hide", playing);
    pauseBtn.classList.toggle("hide", !playing);
  };

  const waitForEnd = () =>
    new Promise((resolve) => {
      const onEnd = () => {
        audio.removeEventListener("ended", onEnd);
        resolve();
      };
      audio.addEventListener("ended", onEnd);
    });

  const fetchAyahs = async (num) => {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${num}/ar.alafasy`,
    );
    const { data } = await res.json();
    return data.ayahs;
  };

  const play = async () => {
    const myToken = ++token;
    playing = true;
    setUI();

    let ayahs;
    try {
      ayahs = await fetchAyahs(surahNumber);
    } catch (err) {
      console.error("Failed to fetch surah:", err);
      if (myToken === token) {
        playing = false;
        setUI();
      }
      return;
    }

    if (myToken !== token) return;
    if (ayahIndex >= ayahs.length) ayahIndex = 0;

    for (let i = ayahIndex; i < ayahs.length; i++) {
      if (myToken !== token) return;

      ayahIndex = i;
      persist();

      let played = false;
      while (!played) {
        if (myToken !== token) return;

        audio.src = ayahs[i].audio;
        audio.currentTime = 0;

        try {
          await audio.play();
        } catch (e) {
          console.warn("audio.play() rejected:", e);
          if (myToken === token) {
            playing = false;
            setUI();
          }
          return;
        }

        await waitForEnd();
        if (myToken !== token) return;

        if (audio.ended) {
          played = true;
        } else {
          console.warn("transient pause, retrying same ayah");
        }
      }
      ayahIndex = i + 1;
      persist();
    }

    if (myToken !== token) return;
    surahNumber = surahNumber < 114 ? surahNumber + 1 : 1;
    ayahIndex = 0;
    persist();
    selectSurah.selectedIndex = surahNumber - 1;

    playing = false;
    setUI();
    play();
  };

  const pause = () => {
    token++;
    audio.pause();
    playing = false;
    setUI();
    persist();
  };

  const restart = () => {
    token++;
    audio.pause();
    audio.currentTime = 0;
    ayahIndex = 0;
    persist();
    playing = false;
    setUI();
    play();
  };

  const next = () => {
    token++;
    audio.pause();
    surahNumber = surahNumber < 114 ? surahNumber + 1 : 1;
    ayahIndex = 0;
    persist();
    selectSurah.selectedIndex = surahNumber - 1;
    playing = false;
    setUI();
    play();
  };

  const prev = () => {
    token++;
    audio.pause();
    surahNumber = surahNumber > 1 ? surahNumber - 1 : 114;
    ayahIndex = 0;
    persist();
    selectSurah.selectedIndex = surahNumber - 1;
    playing = false;
    setUI();
    play();
  };

  selectSurah.addEventListener("change", function () {
    token++;
    audio.pause();
    surahNumber = Number(this.value);
    ayahIndex = 0;
    persist();
    playing = false;
    setUI();
    play();
  });

  playBtn.addEventListener("click", play);
  pauseBtn.addEventListener("click", pause);
  restartBtn.addEventListener("click", restart);
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  return { play, pause, restart, next, prev };
})();

/////////////
// RELAXER //
/////////////
const relaxer = document.querySelector(".relaxer");
const showRelaxer = document.querySelector(".showRelaxer");
const relaxerContainer = document.querySelector(".relaxerContainer");
const relaxerText = document.getElementById("relaxertext");

let relaxerIntervalId = null;
let relaxerTimeouts = [];

const stopRelaxer = () => {
  clearInterval(relaxerIntervalId);
  relaxerIntervalId = null;

  relaxerTimeouts.forEach(clearTimeout);
  relaxerTimeouts = [];

  relaxerText.innerText = "";
  relaxerContainer.className = "relaxerContainer";
};

relaxer.addEventListener("click", () => {
  stopRelaxer();
  showRelaxer.classList.add("show");

  const totalTime = 7500;
  const breatheTime = (totalTime / 5) * 2;
  const holdTime = totalTime / 5;

  const breathAnimation = () => {
    relaxerText.innerText = "Breathe In!";
    relaxerContainer.className = "relaxerContainer congrow";

    relaxerTimeouts.push(
      setTimeout(() => {
        relaxerText.innerText = "Hold";
        relaxerTimeouts.push(
          setTimeout(() => {
            relaxerText.innerText = "Breathe Out!";
            relaxerContainer.className = "relaxerContainer conshrink";
          }, holdTime),
        );
      }, breatheTime),
    );
  };

  breathAnimation();
  relaxerIntervalId = setInterval(breathAnimation, totalTime);
});

relaxerContainer.addEventListener("click", () => {
  showRelaxer.classList.remove("show");
  stopRelaxer();
});

///////////////
// ADD Tasks //
///////////////
const main = document.querySelector("main");

const addTask = (id, value, listType) => {
  const newTaskElement = document.createElement("li");
  newTaskElement.className = "newTask flex";
  newTaskElement.setAttribute("data-id", `${id}`);
  newTaskElement.setAttribute("draggable", true);

  const p = document.createElement("p");
  p.className = "taskInput";
  p.setAttribute("contenteditable", "true");
  p.textContent = value || "Empty Task";

  const persistEdit = debounce((newText) => {
    if (!(listType in lists)) return;
    const updated = readList(listType).map((c) =>
      c.id === id ? { ...c, value: newText } : c,
    );
    writeList(listType, updated);
  }, 300);

  p.addEventListener("input", (e) => persistEdit(e.target.textContent.trim()));

  const iconsCon = document.createElement("div");
  iconsCon.className = "iconsCon";
  iconsCon.innerHTML = `<ion-icon name="close-circle-outline" class="icon deleteIcn"></ion-icon>`;

  newTaskElement.append(p, iconsCon);
  return newTaskElement;
};

main.addEventListener("click", function (e) {
  const clickON = e.target;
  const listContainer = clickON.closest(".listcontainer");
  if (!listContainer) return;

  const currentList = listContainer.querySelector("ul");
  const listType = currentList.classList[1];

  //////////////
  // ADD Task //
  //////////////
  if (clickON.classList.contains("btn-addTask")) {
    e.preventDefault();

    const newTask = {
      id: (Math.random() * 201).toFixed(5),
      value: "New Task",
    };
    const arr = readList(listType);
    arr.push(newTask);
    writeList(listType, arr);
    currentList.appendChild(addTask(newTask.id, newTask.value, listType));
    return;
  }

  /////////////////
  // Delete Task //
  /////////////////
  if (clickON.classList.contains("deleteIcn")) {
    const clickedTask = clickON.closest(".newTask");
    const id = clickedTask.dataset.id;
    writeList(
      listType,
      readList(listType).filter((c) => c.id !== id),
    );
    clickedTask.remove();
  }
});

/////////////////
// Drag & Drop //
/////////////////
let draggedTask;

main.addEventListener("dragstart", function (e) {
  draggedTask = e.target.closest("li");
  draggedTask.classList.add("filmy");
});

main.addEventListener("dragend", function (e) {
  const t = e.target.closest("li");
  if (!t) return;
  t.classList.remove("filmy");
  t.closest(".listcontainer")?.classList.remove("overLi");
});

const listsC = document.querySelectorAll(".listcontainer");
listsC.forEach((list) => {
  list.addEventListener("dragover", function (e) {
    e.preventDefault();
    list.classList.add("overLi");
  });

  list.addEventListener("dragleave", function () {
    list.classList.remove("overLi");
  });
  list.addEventListener("drop", function (e) {
    e.preventDefault();
    list.classList.remove("overLi");
    if (!draggedTask || !draggedTask.isConnected) return;

    const fromList = draggedTask.closest("ul").classList[1];
    const toUL = list.querySelector(".list");
    const toList = toUL.classList[1];

    const afterEl = [...toUL.querySelectorAll("li:not(.filmy)")].find(
      (li) => e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2,
    );

    afterEl
      ? toUL.insertBefore(draggedTask, afterEl)
      : toUL.appendChild(draggedTask);
    draggedTask.classList.remove("filmy");

    const snapshot = (ul) =>
      [...ul.children].map((li) => ({
        id: li.dataset.id,
        value: li.querySelector("p").textContent,
      }));

    if (fromList === toList) {
      writeList(toList, snapshot(toUL));
      return;
    }

    writeList(toList, snapshot(toUL));

    const fromUL = document.querySelector(`.${fromList}`);
    writeList(fromList, snapshot(fromUL));
  });
});

///////////////////
// Local Storage //
///////////////////
const readList = (list) => JSON.parse(localStorage.getItem(list) || "[]");

const writeList = (list, arr) => {
  arr.forEach((card, i) => {
    card.order = i;
  });
  lists[list] = arr;
  arr.length
    ? localStorage.setItem(list, JSON.stringify(arr))
    : localStorage.removeItem(list);
};

const renderList = (list) => {
  const ul = document.querySelector(`.${list}`);
  ul.innerHTML = "";
  readList(list)
    .sort((a, b) => a.order - b.order)
    .forEach((card) => ul.appendChild(addTask(card.id, card.value, list)));
  lists[list] = readList(list);
};

for (const list in lists) renderList(list);

/////////////////
// Time & Date //
/////////////////
function updateDateAndTime() {
  const currentTime = new Date();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1; // mounths index starting from 0 so we have to add 1
  const day = currentTime.getDate();

  // fixing one digit numbers/Dates
  const fixingTD = (digits) => (digits >= 10 ? digits : `0${digits}`);

  // Time Formating
  const formattedTime = `${fixingTD(hours)} : ${fixingTD(minutes)} : ${fixingTD(
    seconds,
  )}`;

  // Date Formating
  const formattedDate = `${fixingTD(day)}/${fixingTD(month)}/${year}`;

  document.getElementById("current-time").textContent = formattedTime;
  document.getElementById("current-date").textContent = formattedDate;
}

// Show for the First Time
updateDateAndTime();
// Updating Every Second
setInterval(updateDateAndTime, 1000);

/////////////////

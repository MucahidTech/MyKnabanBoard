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

//////////////////
// Quran Player //
//////////////////
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const prevBtn = document.querySelector(".backward");
const nextBtn = document.querySelector(".forward");
const selectSurah = document.getElementById("surah-selector");
const audio = document.getElementById("audio");
let surahNumber = Number(localStorage.getItem("surahNumber")) || 112;
selectSurah.selectedIndex = surahNumber - 1;
let isPlaying;

function playPause() {
  if (!isPlaying) {
    playBtn.classList.remove("hide");
    pauseBtn.classList.add("hide");
  } else {
    playBtn.classList.add("hide");
    pauseBtn.classList.remove("hide");
  }
}

selectSurah.addEventListener("change", function () {
  surahNumber = this.value;
  playQuran(surahNumber);
  localStorage.setItem("surahNumber", surahNumber);
});

function nextSurah() {
  isPlaying = true;
  playPause();
  surahNumber = surahNumber < 114 ? surahNumber + 1 : 1;
  selectSurah.selectedIndex = surahNumber - 1;
  localStorage.setItem("surahNumber", surahNumber);
  playQuran(surahNumber);
}

let playbackToken = 0;
async function playQuran(surahNum) {
  const myToken = ++playbackToken; // إلغاء أي تشغيل سابق
  isPlaying = true;
  playPause();

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`,
    );
    const { data } = await res.json();

    for (const ayah of data.ayahs) {
      if (myToken !== playbackToken) return; // أُلغي
      audio.src = ayah.audio;
      await audio.play();
      const evt = await new Promise((resolve) => {
        const clean = () => {
          audio.removeEventListener("ended", onEnd);
          audio.removeEventListener("pause", onPause);
        };
        const onEnd = () => {
          clean();
          resolve("ended");
        };
        const onPause = () => {
          clean();
          resolve("paused");
        };
        audio.addEventListener("ended", onEnd);
        audio.addEventListener("pause", onPause);
      });
      if (evt === "paused" || myToken !== playbackToken) return;
    }
    if (myToken !== playbackToken) return;
    isPlaying = false;
    playPause();
    // ❌ حذف الاستدعاء القديم: nextSurah();
  } catch (err) {
    if (myToken === playbackToken) {
      isPlaying = false;
      playPause();
      console.error("Quran playback failed:", err);
    }
  }
}

prevBtn.addEventListener("click", () => {
  playbackToken++;
  surahNumber = surahNumber > 1 ? surahNumber - 1 : 114;
  selectSurah.selectedIndex = surahNumber - 1;
  localStorage.setItem("surahNumber", surahNumber);
  playQuran(surahNumber);
});

nextBtn.addEventListener("click", nextSurah);

playBtn.addEventListener("click", function () {
  playQuran(surahNumber);
});

pauseBtn.addEventListener("click", () => {
  playbackToken++;
  audio.pause();
  isPlaying = false;
  playPause();
});

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

const addTask = (id, value) => {
  const newTaskElement = document.createElement("li");
  newTaskElement.className = "newTask flex";
  newTaskElement.setAttribute("data-id", `${id}`);
  newTaskElement.setAttribute("draggable", true);

  const p = document.createElement("p");
  p.className = "taskInput";
  p.setAttribute("contenteditable", "true");
  p.textContent = value || "Empty Task";

  p.addEventListener("input", (e) => {
    const updatedText = e.target.textContent.trim();
    const cardId = newTaskElement.dataset.id;
    const listType = newTaskElement.closest("ul").classList[1];

    const stored = JSON.parse(localStorage.getItem(listType) || "[]");
    const updated = stored.map((card) =>
      card.id === cardId ? { ...card, value: updatedText } : card,
    );
    localStorage.setItem(listType, JSON.stringify(updated));
    lists[listType] = updated;
  });

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

    currentList.appendChild(addTask(newTask.id, newTask.value));
    if (listType in lists) {
      lists[listType].push(newTask);
      localStorage.setItem(listType, JSON.stringify(lists[listType]));
    }
    return;
  }

  /////////////////
  // Delete Task //
  /////////////////
  if (clickON.classList.contains("deleteIcn")) {
    const clickedTask = clickON.closest(".newTask");
    const cardId = clickedTask.dataset.id;
    const cardValue = clickedTask.querySelector(".taskInput").innerHTML;

    const storedCardsArray = localStorage.getItem(`${listType}`);
    const cards = storedCardsArray ? JSON.parse(storedCardsArray) : [];
    const Updatedcards = cards.filter((c) => c.id !== cardId);

    lists[listType] = Updatedcards;
    if (Updatedcards.length === 0) {
      localStorage.removeItem(`${listType}`);
    } else {
      localStorage.setItem(`${listType}`, JSON.stringify(Updatedcards));
    }

    clickedTask.remove();
    console.log(
      `Task with id ${cardId} and content of: " ${cardValue} " have been removed successfully`,
    );
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

  list.addEventListener("drop", function () {
    if (!draggedTask) return;
    list.classList.remove("overLi");

    const fromList = draggedTask.closest("ul").classList[1];
    const toList = list.querySelector(".list").classList[1];

    list.querySelector(".list").append(draggedTask);

    if (fromList === toList) return;
    const taskId = draggedTask.dataset.id;
    const taskVal = draggedTask.querySelector("p").textContent;

    const dest = JSON.parse(localStorage.getItem(toList) || "[]");
    dest.push({ id: taskId, value: taskVal });
    lists[toList] = dest;
    localStorage.setItem(toList, JSON.stringify(dest));

    const src = JSON.parse(localStorage.getItem(fromList) || "[]").filter(
      (c) => c.id !== taskId,
    );
    lists[fromList] = src;
    src.length
      ? localStorage.setItem(fromList, JSON.stringify(src))
      : localStorage.removeItem(fromList);
  });
});

///////////////////
// Local Storage //
///////////////////
const storedArray = (list) => {
  const currentList = document.querySelector(`.${list}`);

  const storedCardsArray = localStorage.getItem(list);
  if (storedCardsArray) {
    const parsedCardsArray = JSON.parse(storedCardsArray);
    parsedCardsArray.forEach((card) => {
      let id = card.id;
      let value = card.value;
      currentList.appendChild(addTask(id, value));
      const newTask = {
        id: id,
        value: value,
      };
      lists[list].push(newTask);
    });
  }
};

for (const list in lists) {
  storedArray(list);
  console.log(
    `${list} elements have parsed successfully from your Local Storage`,
  );
}

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

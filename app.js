const canvas = document.querySelector("#posterCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const exportButton = document.querySelector("#exportButton");
const addNoteButton = document.querySelector("#addNoteButton");
const noteList = document.querySelector("#noteList");
const templateGrid = document.querySelector("#templateGrid");
const quickChips = document.querySelector("#quickChips");
const jitterRange = document.querySelector("#jitterRange");
const lineRange = document.querySelector("#lineRange");
const fontRange = document.querySelector("#fontRange");
const handRange = document.querySelector("#handRange");

const handwrittenFontStack = [
  '"Hannotate SC"',
  '"HanziPen SC"',
  '"STXingkai"',
  '"Xingkai SC"',
  '"Kaiti SC"',
  '"STKaiti"',
  '"Yuanti SC"',
  '"Marker Felt"',
  '"Bradley Hand"',
  '"Chalkboard SE"',
  'cursive',
].join(", ");

const templates = [
  {
    id: "cafe",
    title: "咖啡店餐食",
    desc: "沙拉、甜点、饮品、窗边氛围",
    notes: [
      { text: "冰冰的，好清爽", x: 760, y: 350, targetX: 890, targetY: 470, shape: "drink" },
      { text: "奶油蛋糕，有点惊喜", x: 92, y: 455, targetX: 468, targetY: 585, shape: "cake" },
      { text: "牛油果好软", x: 110, y: 980, targetX: 410, targetY: 1080, shape: "avocado" },
      { text: "三文鱼滑滑的", x: 710, y: 850, targetX: 805, targetY: 1000, shape: "salmon" },
      { text: "窗边有点安静", x: 88, y: 175, targetX: 390, targetY: 245, shape: "window" },
      { text: "今天这顿很满足 :))", x: 520, y: 118, targetX: 560, targetY: 300, shape: "overall" },
    ],
  },
  {
    id: "drink",
    title: "饮品种草",
    desc: "冰感、口味、配料、小情绪",
    notes: [
      { text: "入口很清爽", x: 112, y: 280, targetX: 650, targetY: 520, shape: "drink" },
      { text: "果香很明显", x: 650, y: 230, targetX: 750, targetY: 430, shape: "overall" },
      { text: "适合下午摸鱼", x: 120, y: 980, targetX: 530, targetY: 760, shape: "window" },
    ],
  },
  {
    id: "dessert",
    title: "甜品探店",
    desc: "奶油、口感、甜度、拍照点",
    notes: [
      { text: "奶油轻轻的", x: 120, y: 390, targetX: 500, targetY: 610, shape: "cake" },
      { text: "甜度刚刚好", x: 650, y: 450, targetX: 575, targetY: 690, shape: "overall" },
      { text: "拍照也蛮好看", x: 130, y: 980, targetX: 480, targetY: 780, shape: "window" },
    ],
  },
  {
    id: "shop",
    title: "店铺氛围",
    desc: "环境、座位、光线、适合发呆",
    notes: [
      { text: "角落很安静", x: 110, y: 240, targetX: 500, targetY: 280, shape: "window" },
      { text: "光线软软的", x: 660, y: 170, targetX: 745, targetY: 350, shape: "overall" },
      { text: "适合慢慢吃", x: 140, y: 1060, targetX: 530, targetY: 980, shape: "salad" },
    ],
  },
];

const quickTexts = [
  "香香的",
  "软软的",
  "冰冰的",
  "有点惊喜",
  "一口快乐",
  "适合发呆",
  "今天很满足",
  "下次还来",
];

let state = {
  templateId: "cafe",
  image: null,
  notes: structuredClone(templates[0].notes),
  activeNoteIndex: -1,
  dragNoteIndex: -1,
  dragOffset: { x: 0, y: 0 },
  jitter: 6,
  lineWidth: 2,
  fontSize: 36,
  hand: 7,
};

function loadImage(src) {
  const image = new Image();
  image.onload = () => {
    state.image = image;
    draw();
  };
  image.src = src;
}

function seededNoise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function roughPoint(x, y, seed, scale = 1) {
  const amount = state.jitter * scale;
  return [
    x + (seededNoise(seed) - 0.5) * amount,
    y + (seededNoise(seed + 9.7) - 0.5) * amount,
  ];
}

function drawImageCover(image) {
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  ctx.drawImage(image, x, y, width, height);
}

function setupWhitePen(alpha = 0.94) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = state.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function roughOval(cx, cy, rx, ry, seed) {
  setupWhitePen(0.88);
  ctx.beginPath();
  for (let i = 0; i <= 58; i += 1) {
    const angle = (Math.PI * 2 * i) / 58;
    const [x, y] = roughPoint(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, seed + i, 1.2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function roughRect(x, y, w, h, seed) {
  setupWhitePen(0.82);
  ctx.beginPath();
  const points = [
    [x, y],
    [x + w, y + 4],
    [x + w - 6, y + h],
    [x + 5, y + h - 3],
    [x, y],
  ];
  points.forEach(([px, py], index) => {
    const [rx, ry] = roughPoint(px, py, seed + index, 1.4);
    if (index === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  });
  ctx.stroke();
}

function roughLine(x1, y1, x2, y2, seed, dashed = false) {
  setupWhitePen(0.9);
  if (dashed) ctx.setLineDash([12, 11]);
  ctx.beginPath();
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const [rx, ry] = roughPoint(x, y, seed + i, 1);
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function arrowHead(x, y, angle) {
  setupWhitePen(0.9);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(angle - 0.55) * 20, y - Math.sin(angle - 0.55) * 20);
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(angle + 0.55) * 20, y - Math.sin(angle + 0.55) * 20);
  ctx.stroke();
}

function drawArrow(note, seed) {
  const textWidth = Math.min(ctx.measureText(note.text).width, 300);
  const startX = note.x + textWidth * 0.5;
  const startY = note.y + 15;
  roughLine(startX, startY, note.targetX, note.targetY, seed, true);
  arrowHead(note.targetX, note.targetY, Math.atan2(note.targetY - startY, note.targetX - startX));
}

function drawShape(shape, x, y, seed) {
  const shapes = {
    drink: () => roughRect(x - 55, y - 145, 112, 250, seed),
    cake: () => {
      roughOval(x, y, 180, 95, seed);
      roughLine(x - 145, y + 32, x + 150, y + 48, seed + 30, false);
    },
    avocado: () => roughOval(x, y, 210, 110, seed),
    salmon: () => roughOval(x, y, 230, 85, seed),
    salad: () => roughOval(x, y, 320, 190, seed),
    window: () => roughRect(x - 210, y - 86, 420, 172, seed),
    overall: () => roughOval(x, y, 165, 70, seed),
  };
  (shapes[shape] || shapes.overall)();
}

function drawText(note, index) {
  setupWhitePen(0.98);
  ctx.font = `${state.fontSize}px ${handwrittenFontStack}`;
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  const maxWidth = 320;
  const chars = [...note.text];
  const lines = [];
  let line = "";
  chars.forEach((char) => {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);

  lines.forEach((lineText, lineIndex) => {
    const [x, y] = roughPoint(note.x, note.y + lineIndex * (state.fontSize + 6), index * 42 + lineIndex, 0.8);
    drawHandwrittenLine(lineText, x, y, index * 59 + lineIndex * 11);
  });
  ctx.shadowColor = "transparent";
}

function drawHandwrittenLine(text, x, y, seed) {
  let cursorX = x;
  const chars = [...text];
  chars.forEach((char, charIndex) => {
    const wobble = state.hand / 10;
    const charSeed = seed + charIndex * 13;
    const rotate = (seededNoise(charSeed) - 0.5) * 0.16 * wobble;
    const offsetX = (seededNoise(charSeed + 3) - 0.5) * 5 * wobble;
    const offsetY = (seededNoise(charSeed + 7) - 0.5) * 8 * wobble;
    const scaleY = 1 + (seededNoise(charSeed + 12) - 0.5) * 0.09 * wobble;
    const scaleX = 1 + (seededNoise(charSeed + 18) - 0.5) * 0.05 * wobble;

    ctx.save();
    ctx.translate(cursorX + offsetX, y + offsetY);
    ctx.rotate(rotate);
    ctx.scale(scaleX, scaleY);
    ctx.fillText(char, 0, 0);
    ctx.restore();

    const advance = ctx.measureText(char).width;
    const spacing = (seededNoise(charSeed + 24) - 0.45) * 6 * wobble;
    cursorX += advance + spacing;
  });
}

function drawDecorations() {
  setupWhitePen(0.92);
  ctx.font = `38px ${handwrittenFontStack}`;
  drawHandwrittenLine("♡", 930, 255, 301);
  drawHandwrittenLine("✦", 610, 430, 302);
  drawHandwrittenLine("✧", 245, 845, 303);
  ctx.beginPath();
  ctx.moveTo(360, 500);
  ctx.bezierCurveTo(334, 468, 388, 452, 356, 420);
  ctx.moveTo(405, 500);
  ctx.bezierCurveTo(378, 465, 430, 447, 402, 416);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#dbc6ad";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.image) drawImageCover(state.image);

  ctx.save();
  state.notes.forEach((note, index) => {
    const seed = index * 101 + 17;
    drawShape(note.shape, note.targetX, note.targetY, seed);
    drawArrow(note, seed + 50);
    drawText(note, index);
  });
  drawDecorations();
  ctx.restore();
}

function renderTemplates() {
  templateGrid.innerHTML = "";
  templates.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `template-card${template.id === state.templateId ? " active" : ""}`;
    button.innerHTML = `<strong>${template.title}</strong><span>${template.desc}</span>`;
    button.addEventListener("click", () => {
      state.templateId = template.id;
      state.notes = structuredClone(template.notes);
      renderTemplates();
      renderNotes();
      draw();
    });
    templateGrid.appendChild(button);
  });
}

function renderNotes() {
  noteList.innerHTML = "";
  state.notes.forEach((note, index) => {
    const card = document.createElement("article");
    card.className = `note-card${index === state.activeNoteIndex ? " active" : ""}`;
    card.dataset.index = index;
    card.innerHTML = `
      <textarea aria-label="标注文案">${note.text}</textarea>
      <div class="note-row">
        <select aria-label="轮廓类型">
          ${["drink", "cake", "avocado", "salmon", "salad", "window", "overall"]
            .map((shape) => `<option value="${shape}" ${shape === note.shape ? "selected" : ""}>${shape}</option>`)
            .join("")}
        </select>
        <button class="small-action" type="button">复制</button>
        <button class="delete-note" type="button">删除</button>
      </div>
      <div class="position-row">
        <label>文字 X <input type="range" min="20" max="980" value="${note.x}" data-field="x"></label>
        <label>文字 Y <input type="range" min="60" max="1350" value="${note.y}" data-field="y"></label>
        <label>指向 X <input type="range" min="20" max="1040" value="${note.targetX}" data-field="targetX"></label>
        <label>指向 Y <input type="range" min="60" max="1380" value="${note.targetY}" data-field="targetY"></label>
      </div>
    `;

    const textarea = card.querySelector("textarea");
    const select = card.querySelector("select");
    const duplicate = card.querySelector(".small-action");
    const remove = card.querySelector(".delete-note");

    textarea.addEventListener("focus", () => setActiveNote(index));
    select.addEventListener("focus", () => setActiveNote(index));
    textarea.addEventListener("input", () => {
      state.notes[index].text = textarea.value;
      draw();
    });
    select.addEventListener("change", () => {
      state.notes[index].shape = select.value;
      draw();
    });
    duplicate.addEventListener("click", () => {
      const copy = structuredClone(state.notes[index]);
      copy.x = Math.min(980, copy.x + 34);
      copy.y = Math.min(1350, copy.y + 46);
      copy.targetX = Math.min(1040, copy.targetX + 28);
      copy.targetY = Math.min(1380, copy.targetY + 28);
      state.notes.splice(index + 1, 0, copy);
      state.activeNoteIndex = index + 1;
      renderNotes();
      focusNoteEditor(index + 1);
      draw();
    });
    remove.addEventListener("click", () => {
      state.notes.splice(index, 1);
      state.activeNoteIndex = Math.min(state.activeNoteIndex, state.notes.length - 1);
      renderNotes();
      draw();
    });
    card.querySelectorAll("input[type='range']").forEach((input) => {
      input.addEventListener("input", () => {
        state.notes[index][input.dataset.field] = Number(input.value);
        draw();
      });
    });
    noteList.appendChild(card);
  });
}

function focusNoteEditor(index) {
  requestAnimationFrame(() => {
    const card = noteList.querySelector(`[data-index="${index}"]`);
    const textarea = card?.querySelector("textarea");
    if (!textarea) return;
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });
}

function setActiveNote(index) {
  if (state.activeNoteIndex === index) return;
  state.activeNoteIndex = index;
  highlightActiveNote();
  draw();
}

function highlightActiveNote() {
  noteList.querySelectorAll(".note-card").forEach((card) => {
    card.classList.toggle("active", Number(card.dataset.index) === state.activeNoteIndex);
  });
}

function renderQuickChips() {
  quickTexts.forEach((text) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = text;
    chip.addEventListener("click", () => {
      state.notes.push({
        text,
        x: 120 + Math.random() * 500,
        y: 160 + Math.random() * 920,
        targetX: 460 + Math.random() * 320,
        targetY: 520 + Math.random() * 460,
        shape: "overall",
      });
      renderNotes();
      draw();
    });
    quickChips.appendChild(chip);
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const index = state.notes.findIndex((note) => {
    return Math.abs(note.x - point.x) < 130 && Math.abs(note.y - point.y) < 70;
  });
  if (index >= 0) {
    state.activeNoteIndex = index;
    state.dragNoteIndex = index;
    state.dragOffset = {
      x: point.x - state.notes[index].x,
      y: point.y - state.notes[index].y,
    };
    canvas.setPointerCapture(event.pointerId);
    renderNotes();
    focusNoteEditor(index);
    draw();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (state.dragNoteIndex < 0) return;
  const point = canvasPoint(event);
  const note = state.notes[state.dragNoteIndex];
  note.x = Math.max(20, Math.min(980, point.x - state.dragOffset.x));
  note.y = Math.max(60, Math.min(1350, point.y - state.dragOffset.y));
  draw();
});

canvas.addEventListener("pointerup", () => {
  if (state.dragNoteIndex >= 0) renderNotes();
  state.dragNoteIndex = -1;
});

canvas.addEventListener("dblclick", (event) => {
  const point = canvasPoint(event);
  state.notes.push({
    text: "新写一句",
    x: Math.max(20, Math.min(980, point.x)),
    y: Math.max(60, Math.min(1350, point.y)),
    targetX: Math.max(20, Math.min(1040, point.x + 160)),
    targetY: Math.max(60, Math.min(1380, point.y + 120)),
    shape: "overall",
  });
  state.activeNoteIndex = state.notes.length - 1;
  renderNotes();
  focusNoteEditor(state.activeNoteIndex);
  draw();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadImage(reader.result);
  reader.readAsDataURL(file);
});

addNoteButton.addEventListener("click", () => {
  state.notes.push({
    text: "这里也不错",
    x: 140,
    y: 220 + state.notes.length * 80,
    targetX: 560,
    targetY: 640,
    shape: "overall",
  });
  state.activeNoteIndex = state.notes.length - 1;
  renderNotes();
  focusNoteEditor(state.activeNoteIndex);
  draw();
});

jitterRange.addEventListener("input", () => {
  state.jitter = Number(jitterRange.value);
  draw();
});

lineRange.addEventListener("input", () => {
  state.lineWidth = Number(lineRange.value);
  draw();
});

fontRange.addEventListener("input", () => {
  state.fontSize = Number(fontRange.value);
  draw();
});

handRange.addEventListener("input", () => {
  state.hand = Number(handRange.value);
  draw();
});

exportButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `xiaohongshu-note-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

renderTemplates();
renderNotes();
renderQuickChips();
loadImage("./assets/sample-cafe.jpeg");

// Canvas and layout
const canvasWidth = 1265;
const canvasHeight = 940;

const lineStartX = 115;
const lineEndX = 1196;

const dateFontSize = 14;
const keywordFontSize = 13;

const doorWidth = 51;
const doorHeight = 76;

const marginTop = 150;
const marginBottom = 63;

// Data loaded from JSON
let rawDreams = [];
let dreamsByDay = new Map();
let sortedDays = [];
let dreamEntries = [];

// Load JSON data
function preload() {
  rawDreams = loadJSON("daydreams.json");
}

// Normalize data and group by day
function prepareData() {
  dreamsByDay.clear();
  dreamEntries = [];

  const source = Array.isArray(rawDreams) ? rawDreams : Object.values(rawDreams);

  for (const item of source) {
    const [dateStr, timeStr] = item.ts.split(" ");
    const [hour, minute] = timeStr.split(":").map(Number);
    const totalMinutes = hour * 60 + minute;

    const dream = {
      timestamp: item.ts,
      durationMin: item.dur,
      location: item.loc,
      activity: item.act,
      emotion: item.emo,
      daydreamKeywords: item.keys,
      dateStr,
      minutes: totalMinutes
    };

    dreamEntries.push(dream);

    const dayList = dreamsByDay.get(dateStr) || [];
    dayList.push(dream);
    dreamsByDay.set(dateStr, dayList);
  }

  sortedDays = Array.from(dreamsByDay.keys()).sort();
}

// Map time to x position
function timeToX(minutes) {
  return map(minutes, 0, 1440, lineStartX, lineEndX);
}

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  background(250, 242, 230, 230);
  prepareData();
  noLoop();
}

function draw() {
  if (sortedDays.length === 0) return;

  const gapCount = max(1, sortedDays.length - 1);
  const rowGap = (height - marginTop - marginBottom) / gapCount;

  sortedDays.forEach((day, index) => {
    const y = marginTop + index * rowGap;
    drawDayRow(day, y);
  });

  const lastY = marginTop + (sortedDays.length - 1) * rowGap;
  drawTimeTicks(lastY);
}

// Category mappings
const indoorLocations = new Set([
  "kitchen",
  "dorm",
  "bed",
  "desk",
  "library",
  "library window",
  "classroom",
  "grocery",
  "bus"
]);

const moodColors = {
  joy: [255, 187, 80],
  relaxed: [201, 232, 164],
  calm: [120, 190, 255],
  tired: [188, 173, 216],
  curious: [255, 166, 201]
};

const defaultMoodColor = [210, 225, 150];

const activityMap = {
  walking: "move",
  commute: "move",
  reading: "study",
  review: "study",
  class: "study",
  notes: "study",
  meditation: "emotion",
  singing: "emotion",
  cooking: "daily",
  organizing: "daily",
  shopping: "daily",
  phone: "daily",
  rest: "daily"
};

// Helpers
function getMoodColor(emotion) {
  const rgb = moodColors[emotion] || defaultMoodColor;
  return color(rgb[0], rgb[1], rgb[2]);
}

function getActivityType(activity) {
  return activityMap[activity] || "other";
}

// Activity icons
function drawMoveIcon() {
  const size = 14;
  const w = size;
  const h = size * 0.8;

  beginShape();
  vertex(w * 0.6, 0);
  vertex(w * 0.1, -h / 2);
  vertex(w * 0.1, h / 2);
  endShape(CLOSE);

  beginShape();
  vertex(0, 0);
  vertex(-w * 0.5, -h / 2);
  vertex(-w * 0.5, h / 2);
  endShape(CLOSE);
}

function drawStudyIcon() {
  const size = 14;

  rectMode(CENTER);
  rect(0, 0, size, size);
  rect(0, 0, size * 0.55, size * 0.55);
}

function drawEmotionIcon() {
  const size = 14;
  const w = size * 1.6;
  const h = size * 0.5;

  beginShape();
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = lerp(-w / 2, w / 2, t);
    const y = sin(TWO_PI * t * 2) * (h / 2);
    vertex(x, y);
  }
  endShape();
}

function drawDailyIcon() {
  const radius = 2.8;
  const gap = radius * 3;

  fill(40, 40, 40, 235);
  noStroke();
  circle(-gap, 0, radius * 2);
  circle(0, 0, radius * 2);
  circle(gap, 0, radius * 2);
}

const activityIcons = {
  move: drawMoveIcon,
  study: drawStudyIcon,
  emotion: drawEmotionIcon,
  daily: drawDailyIcon
};

// Draw the activity symbol inside a door
function drawActivityMark(type, centerX, centerY) {
  const iconFn = activityIcons[type];
  if (!iconFn) return;

  push();
  translate(centerX, centerY);
  stroke(40, 40, 40, 200);
  strokeWeight(2);
  noFill();
  iconFn();
  pop();
}

// Day row and labels
function drawDayRow(dateStr, y) {
  stroke(220);
  line(lineStartX, y, lineEndX, y);

  fill(150);
  noStroke();
  textSize(dateFontSize);
  textAlign(RIGHT, CENTER);
  text(dateStr.substring(2), lineStartX - 12, y);

  const dayDreams = dreamsByDay.get(dateStr) || [];
  dayDreams.forEach(dream => {
    drawDoor(timeToX(dream.minutes), y, dream);
  });
}

function drawTimeTicks(y) {
  [0, 6, 12, 18, 24].forEach(hour => {
    const x = timeToX(hour * 60);

    stroke(180);
    line(x, y - 3, x, y + 3);

    noStroke();
    fill(140);
    textSize(13);
    textAlign(CENTER, TOP);
    text(nf(hour, 2) + ":00", x, y + 16);
  });
}

// Split keywords into readable lines
function wrapKeywords(keywords) {
  if (!keywords || keywords.length === 0) return [];
  if (keywords.length === 1) return [keywords[0]];
  if (keywords.length === 2) return [keywords[0] + ",", keywords[1]];
  return [...keywords];
}

// Draw one door visualization
function drawDoor(x, y, dream) {
  push();
  translate(x, y);

  const w = doorWidth;
  const h = doorHeight;

  // Door opening angle is based on duration
  const duration = constrain(dream.durationMin, 2, 10);
  const swingX = map(duration, 2, 10, w * 0.75, w * 0.05);
  const swingY = map(duration, 2, 10, 5, 18);
  const moodColor = getMoodColor(dream.emotion);

  // Outer frame changes shape for indoor and outdoor spaces
  stroke(160);
  noFill();

  if (indoorLocations.has(dream.location)) {
    rect(-w / 2 - 5, -h - 5, w + 10, h + 10, 7);
  } else {
    rect(-w / 2 - 5, -h - 5, w + 10, h + 10);
    triangle(-w / 2 - 3, -h - 3, w / 2 + 3, -h - 3, 0, -h - 21);
  }

  // Door frame
  stroke(130);
  rect(-w / 2, -h, w, h);

  // Gradient fill suggests emotional tone
  noStroke();
  for (let i = 0; i < w; i++) {
    const alpha = map(i, 0, w, 220, 90);
    fill(red(moodColor), green(moodColor), blue(moodColor), alpha);
    rect(-w / 2 + i, -h, 1, h);
  }

  // White door panel opens by duration
  fill(255);
  stroke(80);
  quad(
    -w / 2,
    -h,
    -w / 2 + swingX,
    -h - swingY,
    -w / 2 + swingX,
    swingY,
    -w / 2,
    0
  );

  drawActivityMark(getActivityType(dream.activity), -w * 0.1, -h / 2);

  const keywordLines = wrapKeywords(dream.daydreamKeywords);

  fill(50);
  noStroke();
  textSize(keywordFontSize);
  textAlign(CENTER, BOTTOM);

  const lineHeight = keywordFontSize + 3;
  const baseY = -h - swingY - 7;

  keywordLines.forEach((textLine, index) => {
    const textY = baseY - (keywordLines.length - 1 - index) * lineHeight;
    text(textLine, 0, textY);
  });

  pop();
}
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
let lastTouchDist = null;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let offsetX = 0, offsetY = 0;
let isDragging = false;
let startX, startY;
let scale = 2;

let graphData = { nodes: [], edges: [] };

fetch("/data/points.json")
  .then(res => res.json())
  .then(data => {
    graphData = data;
    calculateFuelUsed();
    centerGraph();
    canvas.style.cursor = isGraphLargerThanCanvas() ? "grab" : "default";
    drawGraph();
  });

function calculateFuelUsed() {
  graphData.edges.forEach(edge => {
    edge.fuelUsed = (edge.length / edge.efficiency) * edge.consumption_factor;
  });
}

function centerGraph() {
  const xs = graphData.nodes.map(n => n.x);
  const ys = graphData.nodes.map(n => n.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  offsetX = canvas.width / 2 - centerX * scale;
  offsetY = canvas.height / 2 - centerY * scale;
}

function isGraphLargerThanCanvas() {
  const xs = graphData.nodes.map(n => n.x);
  const ys = graphData.nodes.map(n => n.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return w * scale > canvas.width || h * scale > canvas.height;
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 2;

  graphData.edges.forEach(edge => {
    const from = graphData.nodes.find(n => n.id === edge.from);
    const to = graphData.nodes.find(n => n.id === edge.to);

    ctx.beginPath();
    ctx.moveTo(from.x * scale + offsetX, from.y * scale + offsetY);
    ctx.lineTo(to.x * scale + offsetX, to.y * scale + offsetY);
    ctx.stroke();

    const midX = (from.x + to.x) / 2 * scale + offsetX;
    const midY = (from.y + to.y) / 2 * scale + offsetY;
    ctx.fillStyle = "#FFD700";
    ctx.font = "12px Arial";
    ctx.fillText(edge.fuelUsed.toFixed(2), midX + 5, midY - 5);
  });

  graphData.nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x * scale + offsetX, node.y * scale + offsetY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#03DAC6";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(node.id, node.x * scale + offsetX - 6, node.y * scale + offsetY + 4);
  });
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  const gridSize = 50 * scale;
  const startX = offsetX % gridSize;
  const startY = offsetY % gridSize;

  for (let x = startX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

canvas.addEventListener("mousedown", (e) => {
  isDragging = true;
  canvas.style.cursor = "grabbing";
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
  canvas.style.cursor = isGraphLargerThanCanvas() ? "grab" : "default";
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging) {
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawGraph();
  }
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomAmount = -e.deltaY * 0.001;
  const newScale = Math.min(Math.max(0.5, scale + zoomAmount), 2);

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  offsetX = mouseX - ((mouseX - offsetX) / scale) * newScale;
  offsetY = mouseY - ((mouseY - offsetY) / scale) * newScale;

  scale = newScale;
  drawGraph();
});

function dijkstra(startId, endId) {
  const distances = {}, visited = {}, prev = {}, pq = [];

  graphData.nodes.forEach(n => {
    distances[n.id] = Infinity;
    visited[n.id] = false;
  });

  distances[startId] = 0;
  pq.push({ id: startId, dist: 0 });

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { id } = pq.shift();
    visited[id] = true;

    const edges = graphData.edges.filter(e => e.from === id);
    for (let edge of edges) {
      const neighbor = edge.to;
      if (visited[neighbor]) continue;

      const newDist = distances[id] + edge.fuelUsed;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        prev[neighbor] = id;
        pq.push({ id: neighbor, dist: newDist });
      }
    }
  }

  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }

  return { path, fuelUsed: distances[endId] };
}

function highlightPath(path) {
  drawGraph();

  ctx.strokeStyle = "#FF4081";
  ctx.lineWidth = 4;

  for (let i = 0; i < path.length - 1; i++) {
    const from = graphData.nodes.find(n => n.id === path[i]);
    const to = graphData.nodes.find(n => n.id === path[i + 1]);

    ctx.beginPath();
    ctx.moveTo(from.x * scale + offsetX, from.y * scale + offsetY);
    ctx.lineTo(to.x * scale + offsetX, to.y * scale + offsetY);
    ctx.stroke();
  }
}

document.getElementById("pathForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const start = document.getElementById("startNode").value.trim();
  const end = document.getElementById("endNode").value.trim();
  const result = dijkstra(start, end);

  if (result.path.length > 1) {
    console.log("Best Route:", result.path.join(" → "));
    console.log("Total Fuel Used:", result.fuelUsed.toFixed(2));
    highlightPath(result.path);
  } else {
    alert("No path found!");
  }
});


// Resize handler
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawGraph();
}
window.addEventListener('resize', () => {
  resizeCanvas();
  centerGraph();
});

// Initial canvas sizing
resizeCanvas();

// Update drawGraph to use anti-aliasing
function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  drawGrid();

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5;

  graphData.edges.forEach(edge => {
    const from = graphData.nodes.find(n => n.id === edge.from);
    const to = graphData.nodes.find(n => n.id === edge.to);

    ctx.beginPath();
    ctx.moveTo(from.x * scale + offsetX, from.y * scale + offsetY);
    ctx.lineTo(to.x * scale + offsetX, to.y * scale + offsetY);
    ctx.stroke();

    const midX = (from.x + to.x) / 2 * scale + offsetX;
    const midY = (from.y + to.y) / 2 * scale + offsetY;
    ctx.fillStyle = "#FFD700";
    ctx.font = "12px 'Segoe UI'";
    ctx.fillText(edge.fuelUsed.toFixed(2), midX + 5, midY - 5);
  });

  graphData.nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x * scale + offsetX, node.y * scale + offsetY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#03DAC6";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "12px 'Segoe UI'";
    ctx.fillText(node.id, node.x * scale + offsetX - 6, node.y * scale + offsetY + 4);
  });
}

document.getElementById("pathForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const start = document.getElementById("startNode").value.trim();
  const end = document.getElementById("endNode").value.trim();
  const result = dijkstra(start, end);

  const info = document.getElementById("fuelInfo");

  if (result.path.length > 1) {
    console.log("Best Route:", result.path.join(" → "));
    console.log("Total Fuel Used:", result.fuelUsed.toFixed(2));
    highlightPath(result.path);
    info.innerText = `Best Route: ${result.path.join(" → ")} | Total Fuel Used: ${result.fuelUsed.toFixed(2)}`;
  } else {
    alert("No path found!");
    info.innerText = "";
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  drawGraph();
  document.getElementById("fuelInfo").innerText = "";
});

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - offsetX;
    startY = e.touches[0].clientY - offsetY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    lastTouchDist = getTouchDist(e.touches);
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) {
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    drawGraph();
  } else if (e.touches.length === 2) {
    const newDist = getTouchDist(e.touches);
    const zoomDelta = newDist - lastTouchDist;
    lastTouchDist = newDist;

    const touchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const touchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    const zoomAmount = zoomDelta * 0.005;
    const newScale = Math.min(Math.max(0.5, scale + zoomAmount), 4);

    offsetX = touchMidX - ((touchMidX - offsetX) / scale) * newScale;
    offsetY = touchMidY - ((touchMidY - offsetY) / scale) * newScale;

    scale = newScale;
    drawGraph();
  }
}, { passive: false });

canvas.addEventListener("touchend", () => {
  isDragging = false;
  lastTouchDist = null;
});

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

console.log("Testing script.js");

const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
let lastTouchDist = null;
const fuelPrice = 1; // ₹1 per unit of fuel

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let offsetX = 0, offsetY = 0;
let isDragging = false;
let startX, startY;
let scale = 2;

let graphData = { nodes: [], edges: [] };

fetch("./data/points.json")
  .then(res => res.json())
  .then(data => {
    console.log("fetched graph data:", data);
    graphData = data;
    //toll assignment 
  graphData.edges.forEach(edge => {
    const baseRate = 1; // ₹1 per km
    const efficiencyDiscount = edge.efficiency < 14 ? 0.2 : 0; // 20% discount for low efficiency
    const trafficMultiplier = edge.traffic_weight > 1.2 ? 1.5 : 1; // 1.5x multiplier for high traffic
  
    if (edge.length > 100) {
      edge.toll = (edge.length * baseRate) * (1 - efficiencyDiscount) * trafficMultiplier;
    } else {
      edge.toll = 0; // No toll for short roads
    }
  });
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
  console.log("Drawing graph...");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Draw edges
  ctx.strokeStyle = "#ffffff"; // Black edges
  ctx.lineWidth = 2;
  graphData.edges.forEach(edge => {
    const from = graphData.nodes.find(n => n.id === edge.from);
    const to = graphData.nodes.find(n => n.id === edge.to);
    ctx.beginPath();
    ctx.moveTo(from.x * scale + offsetX, from.y * scale + offsetY);
    ctx.lineTo(to.x * scale + offsetX, to.y * scale + offsetY);
    ctx.stroke();

    // Display fuelUsed on edges
    const midX = (from.x + to.x) / 2 * scale + offsetX;
    const midY = (from.y + to.y) / 2 * scale + offsetY;
    ctx.fillStyle = "#FFD700"; // Yellow text for fuelUsed
    ctx.font = "12px Arial";
    ctx.fillText(edge.fuelUsed.toFixed(2), midX + 5, midY - 5);
  });

  
  graphData.nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x * scale + offsetX, node.y * scale + offsetY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#0000FF"; // Blue nodes
    ctx.fill();
    ctx.strokeStyle = "#000"; // Black outline
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

// MinHeap Implementation
class MinHeap {
  constructor() {
    this.heap = [];
  }

  insert(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].dist <= this.heap[index].dist) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let smallest = index;

      if (leftChildIndex < length && this.heap[leftChildIndex].dist < this.heap[smallest].dist) {
        smallest = leftChildIndex;
      }
      if (rightChildIndex < length && this.heap[rightChildIndex].dist < this.heap[smallest].dist) {
        smallest = rightChildIndex;
      }
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}
// Preprocess graph into adjacency list
function buildAdjacencyList(graph) {
  const adjacencyList = {};
  graph.nodes.forEach(node => {
    adjacencyList[node.id] = [];
  });
  // Add bidirectional edges
  graph.edges.forEach(edge => {
    const fuelUsed = (edge.length / edge.efficiency) * edge.consumption_factor;
    adjacencyList[edge.from].push({ to: edge.to, fuelUsed });
    adjacencyList[edge.to].push({ to: edge.from, fuelUsed });
  });
  return adjacencyList;
}
// Optimized Dijkstra's Algorithm
function dijkstra(graph, startId, endId, adjacencyList) {
  const distances = {};
  const prev = {};
  const pq = new MinHeap();
  graph.nodes.forEach(node => {
    distances[node.id] = Infinity;
    prev[node.id] = null;
  });
  distances[startId] = 0;
  pq.insert({ id: startId, dist: 0 });

  while (!pq.isEmpty()) {
    const { id } = pq.extractMin();
    if (id === endId) break;

    adjacencyList[id].forEach(neighbor => {
      const { to, fuelUsed } = neighbor;
      const edge = graph.edges.find(e => (e.from === id && e.to === to) || (e.from === to && e.to === id));
      const totalCost = (fuelUsed * fuelPrice) + (edge?.toll || 0); // Include fuel price
      const newDist = distances[id] + totalCost;

      if (newDist < distances[to]) {
        distances[to] = newDist;
        prev[to] = id;
        pq.insert({ id: to, dist: newDist });
      }
    });
  }

  const path = [];
  let current = endId;
  while (current !== null) {
    path.unshift(current);
    current = prev[current];
  }

  if (path.length > 1 && distances[endId] !== Infinity) {
    return { path, totalCost: distances[endId] }; // Return total cost including tolls
  } else {
    return { path: [], totalCost: Infinity }; // No path found
  }
}
function highlightPath(path) {
  drawGraph();

  ctx.strokeStyle = "#FF0000";
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
  const result = dijkstra(graphData, start, end, buildAdjacencyList(graphData, false));
  const info = document.getElementById("fuelInfo");

  if (result.path.length > 1) {
    console.log("Best Route:", result.path.join(" → "));
    console.log("Total Cost:", result.totalCost.toFixed(2));

    // Calculate fuel cost and toll separately
    let fuelCost = 0, tollCost = 0;
    for (let i = 0; i < result.path.length - 1; i++) {
      const from = result.path[i];
      const to = result.path[i + 1];
      const edge = graphData.edges.find(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
      const fuelUsed = (edge.length / edge.efficiency) * edge.consumption_factor;
      fuelCost += fuelUsed * fuelPrice;
      tollCost += edge.toll || 0;
    }

    console.log("Fuel Cost:", fuelCost.toFixed(2));
    console.log("Toll Cost:", tollCost.toFixed(2));

    info.innerText = `Best Route: ${result.path.join(" → ")} 
                      | Fuel Cost: ${fuelCost.toFixed(2)} 
                      | Toll Cost: ${tollCost.toFixed(2)} 
                      | Total Cost: ${result.totalCost.toFixed(2)}`;
    highlightPath(result.path);
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
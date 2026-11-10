var fs = require("fs");
var path = require("path");

var d = "M560 1020 C460 950 300 880 100 880 C53 880 15 842 15 795 C15 748 53 710 100 710 C190 710 235 662 320 640 C520 598 690 590 790 540 C890 490 845 390 750 360 C680 338 580 366 545 305 C515 252 580 228 640 222 C750 211 860 225 940 165 C988 129 1020 48 1040 -30";
var tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
var i = 0;
var cmd = "";
var x = 0;
var y = 0;
var curves = [];
while (i < tokens.length) {
  var token = tokens[i];
  if (/[A-Za-z]/.test(token)) {
    cmd = token;
    i += 1;
    continue;
  }
  if (cmd === "M") {
    x = Number(tokens[i]);
    y = Number(tokens[i + 1]);
    i += 2;
  } else if (cmd === "C") {
    var c1x = Number(tokens[i]);
    var c1y = Number(tokens[i + 1]);
    var c2x = Number(tokens[i + 2]);
    var c2y = Number(tokens[i + 3]);
    var ex = Number(tokens[i + 4]);
    var ey = Number(tokens[i + 5]);
    curves.push([x, y, c1x, c1y, c2x, c2y, ex, ey]);
    x = ex;
    y = ey;
    i += 6;
  } else {
    throw new Error("bad " + cmd);
  }
}

function cubic(c, t) {
  var u = 1 - t;
  var a = u * u * u;
  var b = 3 * u * u * t;
  var e = 3 * u * t * t;
  var f = t * t * t;
  return [a * c[0] + b * c[2] + e * c[4] + f * c[6], a * c[1] + b * c[3] + e * c[5] + f * c[7]];
}

var steps = 80;
var table = [{ s: 0, p: [curves[0][0], curves[0][1]] }];
var length = 0;
curves.forEach(function (c) {
  var prev = [c[0], c[1]];
  for (var s = 1; s <= steps; s++) {
    var p = cubic(c, s / steps);
    var dx = p[0] - prev[0];
    var dy = p[1] - prev[1];
    length += Math.hypot(dx, dy);
    table.push({ s: length, p: p });
    prev = p;
  }
});

function pointAt(distance) {
  var target = Math.max(0, Math.min(length, distance));
  var lo = 0;
  var hi = table.length - 1;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (table[mid].s < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return table[0].p;
  var a = table[lo - 1];
  var b = table[lo];
  var span = b.s - a.s || 1;
  var t = (target - a.s) / span;
  return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function pair(p) {
  return [round1(p[0]), round1(p[1])];
}

var width = 118;
function edges(scale) {
  var left = [];
  var right = [];
  for (var n = 0; n <= 260; n++) {
    var distance = (n / 260) * length;
    var point = pointAt(distance);
    var ahead = pointAt(Math.min(distance + 1, length));
    var behind = pointAt(Math.max(distance - 1, 0));
    var dx = ahead[0] - behind[0];
    var dy = ahead[1] - behind[1];
    var mag = Math.hypot(dx, dy) || 1;
    dx /= mag;
    dy /= mag;
    var half = (width * scale) / 2;
    left.push(pair([point[0] - dy * half, point[1] + dx * half]));
    right.push(pair([point[0] + dy * half, point[1] - dx * half]));
  }
  return [left, right];
}

var arrows = [];
for (var distance = 150; distance < length - 60; distance += 110) {
  var point = pointAt(distance);
  var next = pointAt(distance + 2);
  var angle = (Math.atan2(next[1] - point[1], next[0] - point[0]) * 180) / Math.PI;
  arrows.push({
    x: round1(point[0]),
    y: round1(point[1]),
    a: round1(angle),
    d: Number((0.1 + (3.3 * distance) / length).toFixed(2))
  });
}

function nearest(x, y) {
  var best = 0;
  var bestDist = Infinity;
  for (var step = 0; step <= length; step += 3) {
    var sample = pointAt(step);
    var dist = (sample[0] - x) * (sample[0] - x) + (sample[1] - y) * (sample[1] - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return pair(pointAt(best));
}

var tips = [[278, 625], [857, 448], [555, 275], [970, 146]];
var outer = edges(1);
var data = {
  length: round1(length),
  outer: outer,
  mid: edges(0.9),
  inner: edges(0.84),
  arrows: arrows,
  pins: tips.map(function (tip) { return nearest(tip[0], tip[1]); })
};

var out = path.join(__dirname, "..", "js", "road-geometry.js");
fs.writeFileSync(out, "window.ROAD_GEOMETRY=" + JSON.stringify(data) + ";\n");
console.log("length", data.length, "arrows", arrows.length, "bytes", fs.statSync(out).size);

// Offline shortlist evaluation. The installed browser uses the original V5
// model. verify_opening_replay.mjs independently checks each retained opening
// with that model.
#include <algorithm>
#include <cmath>
#include <vector>
using namespace std;
struct P {
  double x, y;
};
static vector<P> candidateGrid[5][28];
static int actorCount;
static P exitEnds[5][8], origin[5], artExtent[5];
static double bounds[5][28][4], w[28], h[28], dx2[28][28], dy2[28][28];
static int gridSize[5][28];
static double sq(double a) { return a * a; }
static double clearanceSq(int i, P a, int j, P b) {
  return sq(a.x - b.x) * dx2[i][j] + sq(a.y - b.y) * dy2[i][j];
}
static int passCount;
static P paintOrigin[5], paintScale[5];
static double threshold;
static vector<P> hull;
static vector<vector<P>> holes, fronts;
static vector<P> nearestGround[5][28];
static bool within(P u, const vector<P> &poly) {
  bool inside = false;
  for (int i = 0, j = poly.size() - 1; i < (int)poly.size(); j = i++) {
    P a = poly[i], b = poly[j];
    if ((a.y > u.y) != (b.y > u.y) &&
        u.x < (b.x - a.x) * (u.y - a.y) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
static bool ground(P p) {
  if (!within(p, hull))
    return false;
  for (auto &h : holes)
    if (within(p, h))
      return false;
  return true;
}
static P painted(int s, P p) {
  return {paintOrigin[s].x + p.x * paintScale[s].x,
          paintOrigin[s].y + p.y * paintScale[s].y};
}
static bool validFoot(int s, P p) {
  P q = {(p.x - origin[s].x) / artExtent[s].x, (p.y - origin[s].y) / artExtent[s].y};
  P u = painted(s, p);
  return ground(q) || (u.y >= threshold && ground(u));
}
static bool visibleBody(int s, int i, P p) {
  for (auto &poly : fronts) {
    for (double f : {.22, .5, .8})
      for (double l : {-.3, 0., .3}) {
        if (within(painted(s, {p.x + w[i] * l, p.y - h[i] * f}), poly))
          return false;
      }
  }
  return true;
}
extern "C" void configure(double *proj, double mz, int *counts, int exc, int fg,
                          double *coords) {
  int offset = 0, ix = 0;
  auto poly = [&]() {
    vector<P> p;
    for (int j = 0; j < counts[ix]; j++) {
      p.push_back({coords[offset], coords[offset + 1]});
      offset += 2;
    }
    ix++;
    return p;
  };
  hull = poly();
  holes.clear();
  fronts.clear();
  for (int i = 0; i < exc; i++)
    holes.push_back(poly());
  for (int i = 0; i < fg; i++)
    fronts.push_back(poly());
  threshold = mz;
  for (int s = 0; s < passCount; s++) {
    paintOrigin[s] = {proj[4 * s], proj[4 * s + 1]};
    paintScale[s] = {proj[4 * s + 2], proj[4 * s + 3]};
    for (int i = 0; i < actorCount; i++) {
      auto &g = nearestGround[s][i];
      g.clear();
      double *b = bounds[s][i];
      double xs = origin[s].x + ceil((b[0] - origin[s].x) / 8) * 8,
             ys = origin[s].y + ceil((b[2] - origin[s].y) / 8) * 8;
      for (double y = ys; y <= b[3]; y += 8)
        for (double x = xs; x <= b[1]; x += 8)
          if (validFoot(s, {x, y}))
            g.push_back({x, y});
    }
  }
}

extern "C" {
void setup(int phases, int nActors, double *sizes, double *o, double *t,
           double *boxes, double *ends, int *gr, double *grid) {
  passCount = phases;
  actorCount = nActors;
  int n = 0;
  for (int i = 0; i < actorCount; i++) {
    w[i] = sizes[i * 2];
    h[i] = sizes[i * 2 + 1];
  }
  for (int i = 0; i < actorCount; i++)
    for (int j = 0; j < actorCount; j++) {
      dx2[i][j] = 1 / sq((w[i] + w[j]) * .5 + 10);
      dy2[i][j] = 1 / sq((h[i] + h[j]) * .38 + 10);
    }
  for (int s = 0; s < passCount; s++) {
    origin[s] = {o[s * 2], o[s * 2 + 1]};
    artExtent[s] = {t[s * 2], t[s * 2 + 1]};
    for (int k = 0; k < 8; k++)
      exitEnds[s][k] = {ends[s * 16 + 2 * k], ends[s * 16 + 2 * k + 1]};
    for (int i = 0; i < actorCount; i++) {
      int id = s * actorCount + i;
      gridSize[s][i] = gr[id];
      candidateGrid[s][i].resize(gr[id]);
      for (int k = 0; k < 4; k++)
        bounds[s][i][k] = boxes[id * 4 + k];
      for (int k = 0; k < gr[id]; k++) {
        candidateGrid[s][i][k] = {grid[n], grid[n + 1]};
        n += 2;
      }
    }
  }
}
void run(double *uv, double *result) {
  P seats[28];
  for (int s = 0; s < passCount; s++) {
    for (int i = 0; i < actorCount; i++) {
      P raw = s == 0 ? P{uv[2 * i], uv[2 * i + 1]}
                     : P{(seats[i].x - origin[s - 1].x) / artExtent[s - 1].x,
                         (seats[i].y - origin[s - 1].y) / artExtent[s - 1].y};
      seats[i] = {clamp(origin[s].x + raw.x * artExtent[s].x, bounds[s][i][0],
                        bounds[s][i][1]),
                  clamp(origin[s].y + raw.y * artExtent[s].y, bounds[s][i][2],
                        bounds[s][i][3])};
      if (!validFoot(s, seats[i])) {
        P chosen = seats[i];
        double nearest = 1e40;
        for (P q : nearestGround[s][i]) {
          double dx = q.x - seats[i].x, dy = q.y - seats[i].y,
                 d = dx * dx + dy * dy;
          if (d < nearest) {
            nearest = d;
            chosen = q;
          }
        }
        seats[i] = chosen;
      }
    }
    P exit[100];
    int exitSamples = 0, bestexit = 29, steps = ceil(max(40., w[0] * 1.2) / 3);
    for (int k = 0; k < 8 && actorCount > 5; k++) {
      P end = exitEnds[s][k];
      if (end.x < -1000)
        continue;
      int cost = 0;
      P tmp[100];
      for (int t = 0; t <= steps; t++)
        tmp[t] = {seats[0].x + (end.x - seats[0].x) * t / steps,
                  seats[0].y + (end.y - seats[0].y) * t / steps};
      for (int i = 1; i < actorCount; i++)
        for (int t = 0; t <= steps; t++)
          if (clearanceSq(0, tmp[t], i, seats[i]) < 1) {
            cost++;
            break;
          }
      if (cost < bestexit) {
        bestexit = cost;
        exitSamples = steps + 1;
        copy(tmp, tmp + exitSamples, exit);
      }
    }
    for (int i = 0; i < actorCount; i++) {
      P desired = seats[i];
      auto blocked = [&](P candidate) {
        if (i == 0)
          return false;
        for (int j = 0; j < exitSamples; j++)
          if (clearanceSq(0, exit[j], i, candidate) < 1)
            return true;
        return false;
      };
      bool ok = !blocked(desired) && validFoot(s, desired) &&
                visibleBody(s, i, desired);
      for (int j = 0; j < i && ok; j++)
        ok = clearanceSq(i, desired, j, seats[j]) >= 1;
      if (ok)
        continue;
      P best = desired;
      double cost = 1e60, dist = 1e60;
      for (int t = 0; t < gridSize[s][i]; t++) {
        P q = candidateGrid[s][i][t];
        if (blocked(q))
          continue;
        double d = sq(q.x - desired.x) + sq(q.y - desired.y), c = 0;
        for (int j = 0; j < i; j++) {
          double cl = clearanceSq(i, q, j, seats[j]);
          if (cl < 1)
            c += sq(1 - sqrt(cl));
          if (c > cost)
            break;
        }
        if ((c == 0 || exitSamples) && (c < cost || (c == cost && d < dist))) {
          cost = c;
          dist = d;
          best = q;
        }
      }
      seats[i] = best;
    }
    for (int i = 0; i < actorCount; i++) {
      result[(s * actorCount + i) * 2] = seats[i].x;
      result[(s * actorCount + i) * 2 + 1] = seats[i].y;
    }
  }
}
}

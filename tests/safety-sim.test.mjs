import assert from "node:assert/strict";
import { test } from "node:test";
import { computeSafetyFrame } from "../lib/safety-sim.ts";

test("computeSafetyFrame returns stable operational metrics", () => {
  const frame = computeSafetyFrame(24);
  assert.equal(typeof frame.alert, "boolean");
  assert.equal(frame.tracks.length, 3);
  assert.equal(frame.zoneCount, frame.tracks.filter((track) => track.inZone).length);
});

test("dwell time is zero for tracks outside the zone", () => {
  const frame = computeSafetyFrame(0);
  for (const track of frame.tracks) {
    if (!track.inZone) {
      assert.equal(track.dwellSeconds, 0);
    }
  }
});

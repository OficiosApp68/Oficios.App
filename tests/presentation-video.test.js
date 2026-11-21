const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const videoPath = 'video-oficial/Oficios-App-tutorial-con-subtitulos-v6.mp4';
const posterPath = 'images/presentation-poster-sin-rostro.jpg';

test('the home tutorial uses the approved subtitled video and matching fallback', () => {
  assert.ok(html.includes(`data-src="${videoPath}"`));
  assert.ok(html.includes(`href="${videoPath}"`));
  assert.ok(!html.includes('Oficios-App-tutorial-completo-v4.mp4'));
  assert.ok(fs.statSync(path.join(root, videoPath)).size > 1000000);
});

test('the trigger and player both show the face-free poster', () => {
  assert.ok(html.includes(`<img src="${posterPath}"`));
  assert.ok(html.includes(`poster="${posterPath}"`));
  assert.ok(!html.includes('images/presentation-poster.jpg'));
  assert.ok(fs.statSync(path.join(root, posterPath)).size > 1000);
});

test('the tutorial remains user-initiated, mobile-compatible, and lazy-loaded', () => {
  const videoTag = html.match(/<video\b[^>]*data-presentation-video[^>]*>/)[0];
  assert.match(videoTag, /\bcontrols\b/);
  assert.match(videoTag, /\bplaysinline\b/);
  assert.match(videoTag, /preload="none"/);
  assert.doesNotMatch(videoTag, /\bautoplay\b/);
});

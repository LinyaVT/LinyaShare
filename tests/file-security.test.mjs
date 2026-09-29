import assert from "node:assert/strict";
import test from "node:test";
import { buildContentDisposition, detectFaviconType } from "../src/lib/file-security.ts";

test("builds a compatible header for a plain ASCII file name", () => {
  assert.equal(
    buildContentDisposition("report.txt", "attachment"),
    "attachment; filename=\"report.txt\"; filename*=UTF-8''report.txt"
  );
});

test("keeps Unicode only in the RFC 5987 parameter", () => {
  const header = buildContentDisposition("Grüße 📄.txt", "inline");

  assert.equal(
    header,
    "inline; filename=\"Gr__e _.txt\"; filename*=UTF-8''Gr%C3%BC%C3%9Fe%20%F0%9F%93%84.txt"
  );
  assert.match(header, /^[\x20-\x7e]+$/);
});

test("escapes quotes and backslashes in the quoted fallback", () => {
  assert.equal(
    buildContentDisposition('quote"; path\\file.txt', "attachment"),
    "attachment; filename=\"quote\\\"; path\\\\file.txt\"; filename*=UTF-8''quote%22%3B%20path%5Cfile.txt"
  );
});

test("removes control characters from both parameters", () => {
  const header = buildContentDisposition("line\r\nbreak\u0000\u0085.txt", "attachment");

  assert.equal(
    header,
    "attachment; filename=\"linebreak.txt\"; filename*=UTF-8''linebreak.txt"
  );
  assert.doesNotMatch(header, /[\u0000-\u001f\u007f-\u009f]/);
});

test("encodes RFC 5987 special characters", () => {
  assert.equal(
    buildContentDisposition("a'b(c)*.txt", "attachment"),
    "attachment; filename=\"a'b(c)*.txt\"; filename*=UTF-8''a%27b%28c%29%2A.txt"
  );
});

test("handles malformed Unicode and an otherwise empty name", () => {
  assert.doesNotThrow(() => buildContentDisposition("bad\ud800.txt", "attachment"));
  assert.equal(
    buildContentDisposition("bad\ud800.txt", "attachment"),
    "attachment; filename=\"bad_.txt\"; filename*=UTF-8''bad%EF%BF%BD.txt"
  );
  assert.equal(
    buildContentDisposition("\r\n\u0000", "attachment"),
    "attachment; filename=\"download\"; filename*=UTF-8''download"
  );
});

test("handles long names without introducing invalid header characters", () => {
  const header = buildContentDisposition(`${"ä".repeat(255)}.txt`, "attachment");

  assert.match(header, /^attachment; filename="_+\.txt"; filename\*=UTF-8''/);
  assert.match(header, /^[\x20-\x7e]+$/);
});

test("all problematic names remain valid HTTP header values", () => {
  const names = [
    "Grüße 📄.txt",
    'quote"; path\\file.txt',
    "line\r\nbreak\u0000\u0085.txt",
    "bad\ud800.txt",
    `${"ä".repeat(255)}.txt`,
  ];

  for (const name of names) {
    assert.doesNotThrow(() => {
      new Headers({
        "Content-Disposition": buildContentDisposition(name, "attachment"),
      });
    });
  }
});

test("accepts real raster and ICO favicon signatures only", () => {
  assert.deepEqual(
    detectFaviconType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(4).fill(0)])),
    { mimeType: "image/png", ext: ".png" }
  );
  assert.deepEqual(
    detectFaviconType(Buffer.from([0x00, 0x00, 0x01, 0x00])),
    { mimeType: "image/x-icon", ext: ".ico" }
  );
  assert.equal(detectFaviconType(Buffer.from("<svg></svg>")), null);
});

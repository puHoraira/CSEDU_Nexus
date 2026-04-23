const crypto = require("crypto");

function randomIvString() {
  let iv = Math.random().toString().slice(2, 18);
  while (iv.length < 16) {
    iv += iv.slice(0, 16 - iv.length);
  }
  return iv.slice(0, 16);
}

function encryptPayload(serverSecret, payload, iv) {
  const key = Buffer.from(serverSecret, "utf8");
  const ivBuffer = Buffer.from(iv, "utf8");

  const algorithm = key.length >= 32 ? "aes-256-cbc" : key.length >= 24 ? "aes-192-cbc" : "aes-128-cbc";
  const normalizedKey = key.length >= 32 ? key.subarray(0, 32) : key.length >= 24 ? key.subarray(0, 24) : key.subarray(0, 16);

  const cipher = crypto.createCipheriv(algorithm, normalizedKey, ivBuffer);
  return Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
}

function buildKitToken(appId, serverSecret, roomId, userId, userName, ttlSeconds = 7200) {
  if (!appId || Number.isNaN(Number(appId))) {
    throw new Error("ZEGO_APP_ID is invalid");
  }
  if (!serverSecret) {
    throw new Error("ZEGO_SERVER_SECRET is missing");
  }
  if (!roomId || !userId || !userName) {
    throw new Error("roomId, userId, and userName are required");
  }

  const now = Math.floor(Date.now() / 1000);
  const expire = now + ttlSeconds;
  const nonce = Math.floor(Math.random() * 2147483647);

  const payload = JSON.stringify({
    app_id: Number(appId),
    user_id: userId,
    nonce,
    ctime: now,
    expire,
  });

  const iv = randomIvString();
  const encrypted = encryptPayload(serverSecret, payload, iv);

  const tokenBytes = Buffer.alloc(28 + encrypted.length);
  tokenBytes.writeUInt32BE(0, 0);
  tokenBytes.writeUInt32BE(expire, 4);
  tokenBytes.writeUInt16BE(iv.length, 8);
  tokenBytes.write(iv, 10, "utf8");
  tokenBytes.writeUInt16BE(encrypted.length, 26);
  encrypted.copy(tokenBytes, 28);

  const roomInfo = Buffer.from(
    JSON.stringify({
      userID: userId,
      roomID: roomId,
      userName: encodeURIComponent(userName),
      appID: Number(appId),
    }),
    "utf8"
  ).toString("base64");

  return `04${tokenBytes.toString("base64")}#${roomInfo}`;
}

module.exports = { buildKitToken };

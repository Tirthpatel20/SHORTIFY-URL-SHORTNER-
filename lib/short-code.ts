import crypto from "crypto";

const characters =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateShortCode(): string {
  let shortCode = "";

  for (let i = 0; i < 7; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    shortCode += characters[randomIndex];
  }

  return shortCode;
}

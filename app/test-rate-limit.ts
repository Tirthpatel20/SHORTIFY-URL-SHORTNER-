import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { checkRateLimit } = await import("@/lib/rate-limit");

  for (let i = 1; i <= 22; i++) {
    const result = await checkRateLimit(999);

    console.log(i, result);
  }
}

main().catch(console.error);
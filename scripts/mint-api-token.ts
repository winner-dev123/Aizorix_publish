/**
 * Mint a public-API token for a clinic and print the raw value.
 *
 * Usage:
 *   tsx scripts/mint-api-token.ts                              # uses "bellem"
 *   CLINIC_SLUG=bellem TOKEN_NAME="HubSpot prod" tsx scripts/mint-api-token.ts
 *
 * The raw token is shown ONCE on stdout. Store it somewhere safe (1Password,
 * `.env`, etc.) — only its SHA-256 hash is kept in the DB; it isn't
 * recoverable. To revoke, delete the row from `ApiToken`.
 */
import { prisma } from "../src/server/db";
import {
  generateRawToken,
  hashToken,
  tokenPrefix,
} from "../src/server/api-auth";

async function main() {
  const slug = process.env.CLINIC_SLUG ?? "bellem";
  const name = process.env.TOKEN_NAME ?? "Local dev token";

  const clinic = await prisma.clinic.findUnique({ where: { slug } });
  if (!clinic) {
    throw new Error(
      `Clinic "${slug}" not found — run \`npm run db:seed\` or set CLINIC_SLUG.`,
    );
  }

  const raw = generateRawToken();
  const created = await prisma.apiToken.create({
    data: {
      clinicId: clinic.id,
      tokenHash: hashToken(raw),
      prefix: tokenPrefix(raw),
      name,
      scopes: ["full"],
    },
    select: { id: true, prefix: true, name: true, createdAt: true },
  });

  console.log("");
  console.log("✓ API token created");
  console.log("  clinic:    ", clinic.slug, `(${clinic.id})`);
  console.log("  name:      ", created.name);
  console.log("  id:        ", created.id);
  console.log("  prefix:    ", created.prefix);
  console.log("  createdAt: ", created.createdAt.toISOString());
  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  RAW TOKEN (shown ONCE — copy now):");
  console.log("");
  console.log("    " + raw);
  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  console.log("Test it:");
  console.log(
    `  curl -X POST http://localhost:3000/api/v1/patients \\\n` +
      `    -H "Authorization: Bearer ${raw}" \\\n` +
      `    -H "Content-Type: application/json" \\\n` +
      `    -d '{"firstName":"Laura","phone":"+34611000099"}'`,
  );
  console.log("");
  console.log("Revoke when done:");
  console.log(`  npx prisma studio   # delete the row with id=${created.id}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

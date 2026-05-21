/**
 * CLI to create a new clinic + initial OWNER user in one transaction.
 *
 * Usage:
 *   npx tsx scripts/create-clinic.ts \
 *     --slug bellem-norte \
 *     --name "Bellem Norte" \
 *     --owner-email owner@bellem-norte.es \
 *     [--timezone Europe/Madrid] \
 *     [--locale es-ES] \
 *     [--whatsapp +34911111111] \
 *     [--owner-name "Cristina G."]
 *
 * Replaces the "open a REPL and hand-write prisma.clinic.create() + a User
 * row" steps from PRODUCTION_DEPLOY.md §8. Validates uniqueness on slug +
 * whatsappNumber + per-clinic email so a re-run with the wrong arg gives
 * you a clear error instead of a Prisma P2002 stack trace.
 */
import { prisma } from "../src/server/db";

type Args = {
  slug?: string;
  name?: string;
  ownerEmail?: string;
  ownerName?: string;
  timezone?: string;
  locale?: string;
  whatsapp?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) continue;
    if (key === "slug") out.slug = value;
    else if (key === "name") out.name = value;
    else if (key === "owner-email") out.ownerEmail = value;
    else if (key === "owner-name") out.ownerName = value;
    else if (key === "timezone") out.timezone = value;
    else if (key === "locale") out.locale = value;
    else if (key === "whatsapp") out.whatsapp = value;
    i++;
  }
  return out;
}

function usage(): never {
  console.error(
    `usage: npx tsx scripts/create-clinic.ts --slug <slug> --name <name> --owner-email <email>
       [--owner-name <name>] [--timezone <iana-tz>] [--locale <bcp47>] [--whatsapp <e164>]`,
  );
  process.exit(1);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const E164_RE = /^\+\d{8,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.name || !args.ownerEmail) usage();

  const slug = args.slug;
  const name = args.name;
  const ownerEmail = args.ownerEmail.trim().toLowerCase();
  const ownerName = args.ownerName ?? null;
  const timezone = args.timezone ?? "Europe/Madrid";
  const locale = args.locale ?? "es-ES";
  const whatsappNumber = args.whatsapp ?? null;

  if (!SLUG_RE.test(slug)) {
    console.error(`! slug "${slug}" must be kebab-case (lowercase letters, digits, hyphens).`);
    process.exit(1);
  }
  if (!EMAIL_RE.test(ownerEmail)) {
    console.error(`! owner-email "${ownerEmail}" is not a valid email.`);
    process.exit(1);
  }
  if (whatsappNumber && !E164_RE.test(whatsappNumber)) {
    console.error(`! whatsapp "${whatsappNumber}" must be E.164, e.g. +34911000000.`);
    process.exit(1);
  }

  // Pre-flight uniqueness checks so we fail with helpful messages instead
  // of raw Prisma constraint errors.
  const slugTaken = await prisma.clinic.findUnique({ where: { slug } });
  if (slugTaken) {
    console.error(`! slug "${slug}" is already used by clinic "${slugTaken.name}".`);
    process.exit(1);
  }
  if (whatsappNumber) {
    const numberTaken = await prisma.clinic.findUnique({ where: { whatsappNumber } });
    if (numberTaken) {
      console.error(
        `! whatsapp "${whatsappNumber}" is already used by clinic "${numberTaken.name}".`,
      );
      process.exit(1);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        slug,
        name,
        timezone,
        locale,
        whatsappNumber,
      },
    });
    const owner = await tx.user.create({
      data: {
        clinicId: clinic.id,
        email: ownerEmail,
        name: ownerName,
        role: "OWNER",
        active: true,
      },
    });
    return { clinic, owner };
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        clinicId: result.clinic.id,
        slug: result.clinic.slug,
        name: result.clinic.name,
        whatsappNumber: result.clinic.whatsappNumber,
        ownerUserId: result.owner.id,
        ownerEmail: result.owner.email,
      },
      null,
      2,
    ),
  );

  console.log(`\n→ Next steps:`);
  console.log(`  1. Give the owner the URL to sign in: <YOUR_DEPLOY_HOST>/signin`);
  console.log(`  2. They enter ${ownerEmail} — they'll receive a magic-link email`);
  console.log(`     (or it logs to the dev terminal if SMTP_HOST is unset).`);
  console.log(`  3. Once logged in, seed treatments + technicians from`);
  console.log(`     /app/settings (or extend prisma/seed.ts for them).`);
  if (whatsappNumber) {
    console.log(
      `  4. Configure the Twilio webhook for ${whatsappNumber} to POST`,
    );
    console.log(`     <YOUR_DEPLOY_HOST>/api/webhooks/whatsapp.`);
  }
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

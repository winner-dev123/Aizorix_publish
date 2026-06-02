/**
 * Create or update a platform-admin account.
 *
 * Usage:
 *   ADMIN_EMAIL=you@aizorix.ai ADMIN_PASSWORD='S3cr3t!password' tsx scripts/create-platform-admin.ts
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_NAME='Diego' tsx scripts/create-platform-admin.ts
 *
 * If the email already exists, the password is rotated to the new value
 * and the row is reactivated (active=true). Safe to re-run for password
 * rotations or to bring a disabled account back online.
 *
 * Designed to be the ONLY way to mint the first admin — there is no
 * signup UI, by design. Subsequent admins should be added via a future
 * `/admin/admins` page, or by re-running this script.
 */
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/server/admin/auth";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || null;

  if (!email || !password) {
    console.error(
      "Both ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.\n" +
        "Example:\n" +
        "  ADMIN_EMAIL=you@aizorix.ai ADMIN_PASSWORD='S3cr3t!password' npm run admin:create",
    );
    process.exitCode = 1;
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`ADMIN_EMAIL is not a valid email: ${email}`);
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: { passwordHash, name, active: true },
    create: { email, passwordHash, name, active: true },
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });

  const isNew =
    admin.createdAt.getTime() === admin.updatedAt.getTime();

  console.log("");
  console.log(isNew ? "✓ Platform admin created" : "✓ Platform admin updated");
  console.log("  id:        ", admin.id);
  console.log("  email:     ", admin.email);
  console.log("  name:      ", admin.name ?? "—");
  console.log("");
  console.log("Sign in at: http://localhost:3000/admin/signin");
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

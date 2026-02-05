import prisma from '../src/configs/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
    const args = process.argv.slice(2);

    if (args.length !== 2) {
        console.error('\n❌ Error: Missing arguments.');
        console.error('Usage: npm run seed -- <email> <password>');
        console.error('Example: npm run seed -- admin@photovault.com securePassword123\n');
        process.exit(1);
    }

    const [email, password] = args;

    if (!email || !password) {
        console.error('Error: Invalid arguments.');
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'ADMIN' // Ensure role is enforced even on update
        },
        create: {
            email,
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log(`\n✅ Admin user upserted successfully: ${admin.email}`);
    console.log(`Password set to provided argument.\n`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

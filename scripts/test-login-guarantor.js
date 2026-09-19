const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  const phone = '0201112233';
  const password = 'Guarantor123!';

  console.log(`Testing login for phone: ${phone}`);

  const user = await prisma.user.findFirst({
    where: { phone: phone },
    include: { organization: true }
  });

  if (!user) {
    console.log('Login Failed: User not found');
    return;
  }

  console.log(`User found: ${user.name}, Role: ${user.role}, Org: ${user.organization?.name}`);

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  
  if (isPasswordValid) {
    console.log('Login Success: Password is valid!');
  } else {
    console.log('Login Failed: Invalid password');
    
    // Let's check what the hash actually is
    console.log(`Current DB hash: ${user.passwordHash}`);
    
    // Let's create a new hash to see if there's a salt rounds mismatch or something
    const newHash = await bcrypt.hash(password, 10);
    console.log(`New generated hash for '${password}': ${newHash}`);
  }
}

testLogin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

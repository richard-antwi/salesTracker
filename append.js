const fs = require('fs');

const contentToAppend = `

model WalletChangeRequest {
  id               String       @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])
  requestedBy      String
  newNetwork       String
  newAccountName   String
  newAccountNumber String
  status           WalletChangeStatus @default(PENDING)
  createdAt        DateTime     @default(now())
  resolvedAt       DateTime?
}

enum WalletChangeStatus {
  PENDING
  APPROVED
  REJECTED
}
`;

fs.appendFileSync('prisma/schema.prisma', contentToAppend);
console.log('Appended to schema.prisma successfully');

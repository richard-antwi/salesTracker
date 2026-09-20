import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';

// This is a GET route that the user is redirected to when they click the "Pay Now" button in STUB mode
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('reference');

  if (!reference) {
    return NextResponse.redirect(new URL('/rider', request.url));
  }

  // Trigger the webhook simulation in the background
  setTimeout(async () => {
    try {
      console.log(`\n🤖 [PAYSTACK STUB MODE] Simulating successful payment webhook...`);
      
      // Amount is encoded in reference? We don't have it here. Let's just assume a hardcoded amount for stub testing,
      // or we can just fetch the agreement and pay the exact installment amount to simulate perfectly.
      const parts = reference.split('_');
      const agreementId = parts[1];
      
      // We will just fetch the agreement to get the installment amount to simulate
      const { prisma } = await import('@/lib/db');
      const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
      
      if (agreement) {
        const amountInPesewas = Number(agreement.installmentAmount) * 100;
        
        await fetch(`${CONFIG.APP_URL}/api/webhooks/paystack`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-paystack-signature': 'mock-signature'
          },
          body: JSON.stringify({
            event: 'charge.success',
            data: {
              reference,
              amount: amountInPesewas,
              status: 'success',
            }
          }),
        });
        console.log(`✅ [PAYSTACK STUB MODE] Simulated webhook delivered for Ref: ${reference}`);
      }
    } catch (e) {
      console.error('Failed to deliver simulated webhook', e);
    }
  }, 1000);

  // Return a simple HTML page that auto-redirects back to the rider dashboard
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Processing Payment...</title>
        <meta http-equiv="refresh" content="3;url=/rider">
        <style>
          body { font-family: sans-serif; background: #020617; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .spinner { border: 4px solid rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #10b981; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2 style="margin-top: 20px;">Processing Paystack Payment (Stub Mode)...</h2>
        <p style="color: #94a3b8;">You will be redirected back in a moment.</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

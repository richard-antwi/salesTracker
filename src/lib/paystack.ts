import { CONFIG } from './config';

interface PaystackInitializeParams {
  amount: number; // in GHS, will be converted to pesewas
  email: string;
  reference: string;
}

export class PaystackService {
  private static BASE_URL = 'https://api.paystack.co';

  public async initializeTransaction(params: PaystackInitializeParams): Promise<{ success: boolean; authorizationUrl?: string; accessCode?: string; error?: string }> {
    if (!CONFIG.PAYSTACK_SECRET_KEY) {
      // -----------------------------------------------------
      // STUB MODE: Runs when API keys are not provided
      // -----------------------------------------------------
      console.log(`\n💳 [PAYSTACK STUB MODE] Initialize Initiated`);
      console.log(`   Payer: ${params.email}`);
      console.log(`   Amount: ${params.amount} ${CONFIG.CURRENCY_CODE}`);
      console.log(`   Ref ID: ${params.reference}`);
      console.log(`--------------------------------------------------\n`);
      
      return { 
        success: true, 
        authorizationUrl: `${CONFIG.APP_URL}/api/webhooks/paystack/stub?reference=${params.reference}`, 
        accessCode: 'STUB_ACCESS_CODE' 
      };
    }

    // -----------------------------------------------------
    // LIVE MODE: Connects to Paystack API
    // -----------------------------------------------------
    try {
      const response = await fetch(`${PaystackService.BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // Convert to pesewas
          email: params.email,
          reference: params.reference,
          currency: CONFIG.CURRENCY_CODE,
          callback_url: `${CONFIG.APP_URL}/rider`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(`Paystack API Error: ${data.message || response.statusText}`);
      }

      return { 
        success: true, 
        authorizationUrl: data.data.authorization_url, 
        accessCode: data.data.access_code 
      };
    } catch (error: any) {
      console.error('Paystack Initialize Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const paystackService = new PaystackService();

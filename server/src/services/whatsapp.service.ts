import { env } from '../config/env';

export const sendWhatsAppTemplate = async (to: string, parameters: string[]): Promise<boolean> => {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANGUAGE } = env;
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TEMPLATE_NAME) return false;
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/v22.0/${encodeURIComponent(WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: {
        name: WHATSAPP_TEMPLATE_NAME,
        language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
        ...(WHATSAPP_TEMPLATE_NAME.toLowerCase() === 'hello_world'
          ? {}
          : { components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text })) }] }),
      } }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error('[WhatsApp Cloud API] Template delivery failed before receiving a response.');
    return false;
  }
  if (!response.ok) {
    console.error(`[WhatsApp Cloud API] Template delivery failed (${response.status}).`);
    return false;
  }
  return true;
};

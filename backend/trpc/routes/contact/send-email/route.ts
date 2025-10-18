import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const sendEmailProcedure = publicProcedure
  .input(
    z.object({
      subject: z.string().min(1),
      message: z.string().min(1),
      senderEmail: z.string().email().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY || process.env.EXPO_PUBLIC_SMTP2GO_API_KEY;
    const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'programmerscourt@gmail.com';
    const FROM_EMAIL = process.env.FROM_EMAIL || 'fredcater101@gmail.com';

    if (!SMTP2GO_API_KEY || SMTP2GO_API_KEY === '') {
      console.warn('[SendEmail] SMTP2GO_API_KEY not configured. Email functionality is disabled.');
      return { 
        success: false, 
        message: 'Email service is not configured. Please contact support directly at ' + CONTACT_EMAIL 
      };
    }

    try {
      console.log('[SendEmail] Sending email via SMTP2GO...');
      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: SMTP2GO_API_KEY,
          to: [CONTACT_EMAIL],
          sender: FROM_EMAIL,
          subject: `PlantsGenius Contact: ${input.subject}`,
          text_body: `From: ${input.senderEmail || 'Anonymous'}\n\n${input.message}`,
          html_body: `<p><strong>From:</strong> ${input.senderEmail || 'Anonymous'}</p><p>${input.message.replace(/\n/g, '<br>')}</p>`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[SendEmail] API error:', data);
        throw new Error(data.message || 'Failed to send email');
      }

      console.log('[SendEmail] Email sent successfully');
      return { success: true, message: 'Email sent successfully' };
    } catch (error: any) {
      console.error('[SendEmail] Error:', error);
      throw new Error(error.message || 'Failed to send email');
    }
  });

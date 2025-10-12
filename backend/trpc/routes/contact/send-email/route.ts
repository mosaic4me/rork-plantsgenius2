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
    try {
      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: 'api-key-placeholder',
          to: ['programmerscourt@gmail.com'],
          sender: 'fredcater101@gmail.com',
          subject: `PlantsGenius Contact: ${input.subject}`,
          text_body: `From: ${input.senderEmail || 'Anonymous'}\n\n${input.message}`,
          html_body: `<p><strong>From:</strong> ${input.senderEmail || 'Anonymous'}</p><p>${input.message.replace(/\n/g, '<br>')}</p>`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return { success: true, message: 'Email sent successfully' };
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error(error.message || 'Failed to send email');
    }
  });

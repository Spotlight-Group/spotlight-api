import Mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { generateToken } from '#auth/services/email_tokens_service'

import User from '#auth/models/user'

export class EmailsService {
  /**
   * Envoie un email avec du contenu HTML.
   * @param to - L'adresse email du destinataire.
   * @param subject - Le sujet de l'email.
   * @param htmlContent - Le contenu HTML de l'email.
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    await Mail.send((message) => {
      message.to(to)
      message.from(env.get('MAIL_FROM') as string, 'Support')
      message.subject(subject)
      message.html(htmlContent)
    })
  }

  /**
   * Génère le contenu HTML pour l'email de réinitialisation de mot de passe.
   * @param fullName - Le nom complet de l'utilisateur.
   * @param resetLink - Le lien de réinitialisation.
   * @returns Le contenu HTML de l'email.
   */
  private generatePasswordResetHtml(fullName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de votre mot de passe</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #ffffff;
            padding: 30px;
            border: 1px solid #e9ecef;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-radius: 0 0 8px 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Réinitialisation de votre mot de passe</h1>
    </div>

    <div class="content">
        <p>Bonjour ${fullName},</p>

        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>

        <p style="text-align: center;">
            <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
        </p>

        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
        <p style="word-break: break-all; color: #007bff;">${resetLink}</p>

        <p><strong>Important :</strong> Ce lien est valide pendant 15 minutes seulement.</p>

        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>

        <p>Cordialement,<br>L'équipe Support</p>
    </div>

    <div class="footer">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
</body>
</html>
    `.trim()
  }

  /**
   * Envoie un email de réinitialisation de mot de passe à l'utilisateur.
   * @param user - L'utilisateur concerné.
   */
  async sendPasswordReset(user: Pick<User, 'id' | 'email' | 'full_name'>): Promise<void> {
    const token = generateToken({ userId: user.id, email: user.email }, 900)
    const resetLink = `${env.get('APP_URL')}/reset-password/${encodeURIComponent(token)}`

    const htmlContent = this.generatePasswordResetHtml(user.full_name, resetLink)

    await this.sendEmail(user.email, 'Réinitialisation de votre mot de passe', htmlContent)
  }
}

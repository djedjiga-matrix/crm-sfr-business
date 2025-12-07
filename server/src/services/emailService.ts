import nodemailer from 'nodemailer';

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Templates email
const templates = {
    // Confirmation de RDV
    appointmentConfirmation: (data: {
        contactName: string;
        companyName: string;
        appointmentDate: string;
        appointmentTime: string;
        commercialName: string;
        commercialEmail: string;
        commercialPhone?: string;
        address?: string;
    }) => ({
        subject: `Confirmation de rendez-vous - ${data.companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-box { background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; align-items: center; margin: 10px 0; }
        .info-label { font-weight: 600; color: #666; width: 120px; }
        .info-value { color: #333; }
        .highlight { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Rendez-vous Confirmé</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>${data.contactName}</strong>,</p>
            <p>Nous vous confirmons votre rendez-vous avec notre conseiller commercial.</p>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">📅 Date :</span>
                    <span class="info-value"><strong>${data.appointmentDate}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">⏰ Heure :</span>
                    <span class="info-value"><strong>${data.appointmentTime}</strong></span>
                </div>
                ${data.address ? `
                <div class="info-row">
                    <span class="info-label">📍 Lieu :</span>
                    <span class="info-value">${data.address}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="highlight">
                <strong>Votre conseiller :</strong><br>
                ${data.commercialName}<br>
                📧 ${data.commercialEmail}
                ${data.commercialPhone ? `<br>📞 ${data.commercialPhone}` : ''}
            </div>
            
            <p>En cas d'empêchement, merci de nous prévenir au plus tôt.</p>
            
            <p>Cordialement,<br><strong>L'équipe commerciale</strong></p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement par le CRM SFR Business.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Rappel J-1
    appointmentReminder: (data: {
        contactName: string;
        appointmentDate: string;
        appointmentTime: string;
        commercialName: string;
    }) => ({
        subject: `Rappel : votre rendez-vous de demain`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .date-box { background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .date-box .day { font-size: 48px; font-weight: bold; color: #1e40af; }
        .date-box .time { font-size: 24px; color: #3b82f6; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Rappel de Rendez-vous</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>${data.contactName}</strong>,</p>
            <p>Nous vous rappelons votre rendez-vous prévu <strong>demain</strong> :</p>
            
            <div class="date-box">
                <div class="day">${data.appointmentDate}</div>
                <div class="time">à ${data.appointmentTime}</div>
            </div>
            
            <p>Votre conseiller <strong>${data.commercialName}</strong> sera ravi de vous rencontrer.</p>
            
            <p>À demain !<br><strong>L'équipe commerciale</strong></p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement par le CRM SFR Business.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Invitation utilisateur
    userInvitation: (data: {
        name: string;
        email: string;
        role: string;
        loginUrl: string;
        tempPassword?: string;
    }) => ({
        subject: `Bienvenue sur le CRM SFR Business`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .credentials { background: #1f2937; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: monospace; }
        .credentials p { margin: 5px 0; }
        .btn { display: inline-block; background: #dc2626; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bienvenue ${data.name} !</h1>
            <p>Votre compte CRM a été créé</p>
        </div>
        <div class="content">
            <p>Bonjour <strong>${data.name}</strong>,</p>
            <p>Un compte a été créé pour vous sur le CRM SFR Business avec le rôle <strong>${data.role}</strong>.</p>
            
            <div class="credentials">
                <p><strong>Email :</strong> ${data.email}</p>
                ${data.tempPassword ? `<p><strong>Mot de passe temporaire :</strong> ${data.tempPassword}</p>` : ''}
            </div>
            
            <center>
                <a href="${data.loginUrl}" class="btn">Accéder au CRM</a>
            </center>
            
            <p style="color: #dc2626; font-weight: 600;">⚠️ Changez votre mot de passe lors de votre première connexion.</p>
            
            <p>Cordialement,<br><strong>L'équipe CRM</strong></p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement. Ne répondez pas à cet email.</p>
        </div>
    </div>
</body>
</html>
        `
    }),

    // Suivi post-RDV
    appointmentFollowUp: (data: {
        contactName: string;
        companyName: string;
        appointmentDate: string;
        commercialName: string;
    }) => ({
        subject: `Suite à notre rendez-vous - ${data.companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: #16a34a; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤝 Merci pour votre accueil</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>${data.contactName}</strong>,</p>
            <p>Je tenais à vous remercier pour le temps que vous m'avez accordé le <strong>${data.appointmentDate}</strong>.</p>
            
            <p>Suite à notre entretien, je reste à votre disposition pour toute question ou précision concernant les solutions que nous avons évoquées.</p>
            
            <p>N'hésitez pas à me contacter directement si vous souhaitez avancer sur ce projet.</p>
            
            <p>Bien cordialement,<br><strong>${data.commercialName}</strong></p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé par le CRM SFR Business.</p>
        </div>
    </div>
</body>
</html>
        `
    })
};

// Fonction d'envoi d'email générique
export const sendEmail = async (to: string, template: keyof typeof templates, data: any) => {
    try {
        const emailContent = templates[template](data);

        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"CRM SFR Business" <noreply@crm.com>',
            to,
            subject: emailContent.subject,
            html: emailContent.html
        });

        console.log(`[EMAIL] Email "${template}" envoyé à ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Erreur envoi email:', error);
        return false;
    }
};

// Fonctions d'envoi spécifiques
export const sendAppointmentConfirmation = (to: string, data: Parameters<typeof templates.appointmentConfirmation>[0]) =>
    sendEmail(to, 'appointmentConfirmation', data);

export const sendAppointmentReminder = (to: string, data: Parameters<typeof templates.appointmentReminder>[0]) =>
    sendEmail(to, 'appointmentReminder', data);

export const sendInvitationEmail = async (email: string, name: string, role: string, loginUrl: string) =>
    sendEmail(email, 'userInvitation', { name, email, role, loginUrl });

export const sendAppointmentFollowUp = (to: string, data: Parameters<typeof templates.appointmentFollowUp>[0]) =>
    sendEmail(to, 'appointmentFollowUp', data);

export default { sendEmail, sendAppointmentConfirmation, sendAppointmentReminder, sendInvitationEmail, sendAppointmentFollowUp };

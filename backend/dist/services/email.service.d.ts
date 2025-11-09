interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    constructor();
    /**
     * Initialize nodemailer transporter
     */
    private initializeTransporter;
    /**
     * Send email
     */
    sendEmail(options: EmailOptions): Promise<boolean>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean>;
    /**
     * Send verification email
     */
    sendVerificationEmail(email: string, verificationToken: string): Promise<boolean>;
    /**
     * Get password reset email HTML template
     */
    private getPasswordResetEmailTemplate;
    /**
     * Get email verification HTML template
     */
    private getVerificationEmailTemplate;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map
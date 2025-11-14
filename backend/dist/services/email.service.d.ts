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
     * Send welcome email (without verification)
     */
    sendWelcomeEmail(email: string, userName?: string): Promise<boolean>;
    /**
     * Send payment receipt email
     */
    sendPaymentReceiptEmail(email: string, paymentDetails: {
        plan: string;
        amount: string;
        currency: string;
        transactionId: string;
        billingDate: string;
        nextBillingDate: string;
    }): Promise<boolean>;
    /**
     * Send subscription cancellation email
     */
    sendSubscriptionCancelledEmail(email: string, cancellationDetails: {
        plan: string;
        cancellationDate: string;
        accessUntil: string;
    }): Promise<boolean>;
    /**
     * Get email verification HTML template
     */
    private getVerificationEmailTemplate;
    /**
     * Get welcome email HTML template
     */
    private getWelcomeEmailTemplate;
    /**
     * Get payment receipt HTML template
     */
    private getPaymentReceiptTemplate;
    /**
     * Get subscription cancelled HTML template
     */
    private getSubscriptionCancelledTemplate;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map
export declare const PAYGENIUS_RESPONSE_CODES: {
    APPROVED: number;
    PENDING_3DS: number;
    ERROR: number;
    FAILURE: number;
    PENDING_REFUND: number;
    PAGE_NOT_CONFIGURED: number;
};
export declare enum PayGeniusTransactionStatus {
    AUTHORIZED = "AUTHORIZED",
    SETTLED = "SETTLED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
    THREE_D_SECURE = "THREE_D_SECURE",
    FAILED = "FAILED",
    REVERSED = "REVERSED",
    NEW = "NEW"
}
interface Consumer {
    name: string;
    surname: string;
    email: string;
    consumerAddress?: {
        addressLineOne?: string;
        city?: string;
        postCode?: string;
        country?: string;
    };
}
interface Transaction {
    reference: string;
    currency: string;
    amount: number;
    source?: string;
    displayCurrency?: string;
}
interface SubscriptionData {
    reference: string;
    interval: 'MONTHLY' | 'DAILY' | 'YEARLY';
    trialDays?: number;
    firstname: string;
    lastname: string;
    email: string;
}
interface RedirectUrls {
    success: string;
    cancel: string;
    error: string;
    notify: string;
}
interface CreateRedirectPaymentParams {
    transaction: Transaction;
    consumer: Consumer;
    urls: RedirectUrls;
    subscription?: SubscriptionData;
}
interface PaymentLookupResult {
    reference: string;
    amount: number;
    currency: string;
    status: PayGeniusTransactionStatus;
    pending: boolean;
}
interface RefundResult {
    success: boolean;
    code: number;
    message?: string;
    pending?: boolean;
}
/**
 * Generate HMAC-SHA256 signature for PayGenius API requests
 *
 * For GET requests: Sign the full request URI
 * For POST requests: Sign `{full_uri}\n{json_body}`
 */
export declare function generateSignature(method: 'GET' | 'POST', fullUri: string, body?: object): string;
/**
 * Create a redirect payment (hosted payment page)
 * This is the primary payment method - redirects user to PayGenius for payment
 */
export declare function createRedirectPayment(params: CreateRedirectPaymentParams): Promise<{
    redirectUrl: string;
    reference: string;
}>;
/**
 * Lookup payment status by reference
 */
export declare function lookupPayment(reference: string): Promise<PaymentLookupResult>;
/**
 * Get transaction details by reference
 */
export declare function getTransaction(reference: string): Promise<PaymentLookupResult>;
/**
 * Process a full refund
 */
export declare function refundPaymentFull(reference: string): Promise<RefundResult>;
/**
 * Process a partial refund
 */
export declare function refundPaymentPartial(reference: string, amount: number): Promise<RefundResult>;
/**
 * Cancel a subscription
 */
export declare function cancelSubscription(subscriptionReference: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Edit/update a subscription (e.g., link new card)
 */
export declare function editSubscription(subscriptionReference: string, cardToken?: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Register a card for future use (card vaulting)
 */
export declare function registerCard(cardData: {
    number: string;
    cardHolder: string;
    expiryYear: number;
    expiryMonth: number;
    cvv: string;
    type: 'visa' | 'mastercard' | 'amex';
}): Promise<{
    success: boolean;
    token?: string;
    message?: string;
}>;
/**
 * Validate webhook request signature
 * PayGenius sends webhook notifications to the notify URL
 */
export declare function validateWebhookSignature(requestUri: string, body: string, receivedSignature: string): boolean;
/**
 * Test API connection and signature generation
 */
export declare function validateConnection(): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Check if PayGenius is properly configured
 */
export declare function isConfigured(): boolean;
/**
 * Get PayGenius configuration (without sensitive data)
 */
export declare function getConfig(): {
    mode: string;
    baseUrl: string;
    configured: boolean;
    successUrl: string;
    cancelUrl: string;
    errorUrl: string;
    notifyUrl: string;
};
/**
 * Get default URLs from configuration
 */
export declare function getDefaultUrls(): RedirectUrls;
/**
 * Convert dollars to cents (PayGenius uses cents)
 */
export declare function dollarsToCents(dollars: number): number;
/**
 * Convert cents to dollars
 */
export declare function centsToDollars(cents: number): number;
/**
 * Map PayGenius status to our internal status
 */
export declare function mapPayGeniusStatus(pgStatus: PayGeniusTransactionStatus): 'complete' | 'failed' | 'pending' | 'cancelled';
declare const _default: {
    generateSignature: typeof generateSignature;
    createRedirectPayment: typeof createRedirectPayment;
    lookupPayment: typeof lookupPayment;
    getTransaction: typeof getTransaction;
    refundPaymentFull: typeof refundPaymentFull;
    refundPaymentPartial: typeof refundPaymentPartial;
    cancelSubscription: typeof cancelSubscription;
    editSubscription: typeof editSubscription;
    registerCard: typeof registerCard;
    validateWebhookSignature: typeof validateWebhookSignature;
    validateConnection: typeof validateConnection;
    isConfigured: typeof isConfigured;
    getConfig: typeof getConfig;
    getDefaultUrls: typeof getDefaultUrls;
    dollarsToCents: typeof dollarsToCents;
    centsToDollars: typeof centsToDollars;
    mapPayGeniusStatus: typeof mapPayGeniusStatus;
    PAYGENIUS_RESPONSE_CODES: {
        APPROVED: number;
        PENDING_3DS: number;
        ERROR: number;
        FAILURE: number;
        PENDING_REFUND: number;
        PAGE_NOT_CONFIGURED: number;
    };
    PayGeniusTransactionStatus: typeof PayGeniusTransactionStatus;
};
export default _default;
//# sourceMappingURL=paygenius.service.d.ts.map
interface PaymentData {
    merchant_id: string;
    merchant_key: string;
    return_url: string;
    cancel_url: string;
    notify_url: string;
    name_first: string;
    name_last?: string;
    email_address: string;
    m_payment_id: string;
    amount: string;
    item_name: string;
    item_description?: string;
    custom_str1?: string;
    custom_str2?: string;
    custom_str3?: string;
    custom_str4?: string;
    custom_str5?: string;
    custom_int1?: string;
    custom_int2?: string;
    custom_int3?: string;
    custom_int4?: string;
    custom_int5?: string;
    email_confirmation?: string;
    confirmation_address?: string;
    payment_method?: string;
    subscription_type?: string;
    billing_date?: string;
    recurring_amount?: string;
    frequency?: string;
    cycles?: string;
}
interface SubscriptionPaymentData extends PaymentData {
    subscription_type: string;
    billing_date: string;
    recurring_amount: string;
    frequency: string;
    cycles: string;
}
/**
 * Generate MD5 signature for PayFast payment data
 * CRITICAL: Parameters MUST be in PayFast's exact specified order (not alphabetical)
 */
export declare function generateSignature(data: Record<string, any>, passphrase?: string): string;
/**
 * Create payment data for one-time payment
 */
export declare function createPaymentData(params: {
    userId: string;
    userEmail: string;
    userName: string;
    planName: string;
    planPrice: number;
    transactionId: string;
}): PaymentData & {
    signature: string;
};
/**
 * Create subscription payment data for recurring billing
 */
export declare function createSubscriptionPaymentData(params: {
    userId: string;
    userEmail: string;
    userName: string;
    planName: string;
    planPrice: number;
    transactionId: string;
    billingDate?: Date;
}): SubscriptionPaymentData & {
    signature: string;
};
/**
 * Validate PayFast ITN signature
 */
export declare function validateSignature(data: Record<string, any>, receivedSignature: string): boolean;
/**
 * Verify payment with PayFast server
 * Makes a request back to PayFast to confirm the payment is legitimate
 */
export declare function verifyPaymentWithPayFast(data: Record<string, any>): Promise<boolean>;
/**
 * Validate that the request came from PayFast servers
 */
export declare function validatePayFastHost(host: string): boolean;
/**
 * Validate payment amount matches expected amount
 */
export declare function validateAmount(receivedAmount: string, expectedAmount: number): boolean;
/**
 * Get PayFast payment URL
 */
export declare function getPayFastUrl(): string;
/**
 * Check if PayFast is properly configured
 */
export declare function isConfigured(): boolean;
/**
 * Get PayFast configuration (without sensitive data)
 */
export declare function getConfig(): {
    mode: string;
    apiUrl: string;
    configured: boolean;
};
/**
 * Cancel a PayFast subscription
 * Note: PayFast uses token-based subscription cancellation
 */
export declare function cancelSubscription(token: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Pause a PayFast subscription
 * Note: Pausing sets cycles remaining to 0 temporarily
 */
export declare function pauseSubscription(token: string, cycles?: number): Promise<{
    success: boolean;
    message: string;
}>;
declare const _default: {
    generateSignature: typeof generateSignature;
    createPaymentData: typeof createPaymentData;
    createSubscriptionPaymentData: typeof createSubscriptionPaymentData;
    validateSignature: typeof validateSignature;
    verifyPaymentWithPayFast: typeof verifyPaymentWithPayFast;
    validatePayFastHost: typeof validatePayFastHost;
    validateAmount: typeof validateAmount;
    getPayFastUrl: typeof getPayFastUrl;
    isConfigured: typeof isConfigured;
    getConfig: typeof getConfig;
    cancelSubscription: typeof cancelSubscription;
    pauseSubscription: typeof pauseSubscription;
};
export default _default;
//# sourceMappingURL=payfast.service.d.ts.map
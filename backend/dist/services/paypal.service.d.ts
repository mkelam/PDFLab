export declare enum PayPalOrderStatus {
    CREATED = "CREATED",
    SAVED = "SAVED",
    APPROVED = "APPROVED",
    VOIDED = "VOIDED",
    COMPLETED = "COMPLETED",
    PAYER_ACTION_REQUIRED = "PAYER_ACTION_REQUIRED"
}
export declare enum PayPalSubscriptionStatus {
    APPROVAL_PENDING = "APPROVAL_PENDING",
    APPROVED = "APPROVED",
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}
export declare enum PayPalWebhookEvent {
    PAYMENT_CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED",
    PAYMENT_CAPTURE_DENIED = "PAYMENT.CAPTURE.DENIED",
    PAYMENT_CAPTURE_REFUNDED = "PAYMENT.CAPTURE.REFUNDED",
    PAYMENT_CAPTURE_REVERSED = "PAYMENT.CAPTURE.REVERSED",
    PAYMENT_CAPTURE_PENDING = "PAYMENT.CAPTURE.PENDING",
    BILLING_SUBSCRIPTION_CREATED = "BILLING.SUBSCRIPTION.CREATED",
    BILLING_SUBSCRIPTION_ACTIVATED = "BILLING.SUBSCRIPTION.ACTIVATED",
    BILLING_SUBSCRIPTION_UPDATED = "BILLING.SUBSCRIPTION.UPDATED",
    BILLING_SUBSCRIPTION_CANCELLED = "BILLING.SUBSCRIPTION.CANCELLED",
    BILLING_SUBSCRIPTION_SUSPENDED = "BILLING.SUBSCRIPTION.SUSPENDED",
    BILLING_SUBSCRIPTION_EXPIRED = "BILLING.SUBSCRIPTION.EXPIRED",
    BILLING_SUBSCRIPTION_PAYMENT_FAILED = "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
    CHECKOUT_ORDER_APPROVED = "CHECKOUT.ORDER.APPROVED",
    CHECKOUT_ORDER_COMPLETED = "CHECKOUT.ORDER.COMPLETED"
}
interface CreateOrderParams {
    reference: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
}
interface CreateSubscriptionParams {
    planId: string;
    reference: string;
    email: string;
    firstName: string;
    lastName: string;
    returnUrl: string;
    cancelUrl: string;
}
interface OrderResult {
    id: string;
    status: PayPalOrderStatus;
    approveUrl: string;
}
interface SubscriptionResult {
    id: string;
    status: PayPalSubscriptionStatus;
    approveUrl: string;
}
interface CaptureResult {
    id: string;
    status: string;
    captureId?: string;
    amount?: number;
    currency?: string;
}
/**
 * Create a PayPal order for one-time payment
 */
export declare function createOrder(params: CreateOrderParams): Promise<OrderResult>;
/**
 * Capture a PayPal order after approval
 */
export declare function captureOrder(orderId: string): Promise<CaptureResult>;
/**
 * Get order details
 */
export declare function getOrder(orderId: string): Promise<any>;
/**
 * Create a billing plan for subscriptions
 * Call this once during setup to create plans
 */
export declare function createBillingPlan(params: {
    productId: string;
    name: string;
    description: string;
    amount: number;
    currency: string;
    interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}): Promise<{
    planId: string;
}>;
/**
 * Create a subscription for recurring payments
 */
export declare function createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>;
/**
 * Get subscription details
 */
export declare function getSubscription(subscriptionId: string): Promise<any>;
/**
 * Cancel a subscription
 */
export declare function cancelSubscription(subscriptionId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Suspend a subscription (pause billing)
 */
export declare function suspendSubscription(subscriptionId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Activate/resume a suspended subscription
 */
export declare function activateSubscription(subscriptionId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Refund a captured payment
 */
export declare function refundPayment(captureId: string, amount?: number, currency?: string): Promise<{
    success: boolean;
    refundId?: string;
    message?: string;
}>;
/**
 * Verify webhook signature
 * PayPal uses a complex verification process
 */
export declare function verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean>;
/**
 * Check if PayPal is properly configured
 */
export declare function isConfigured(): boolean;
/**
 * Get PayPal configuration (without sensitive data)
 */
export declare function getConfig(): {
    mode: string;
    baseUrl: string;
    configured: boolean;
    successUrl: string;
    cancelUrl: string;
};
/**
 * Get default redirect URLs
 */
export declare function getDefaultUrls(): {
    success: string;
    cancel: string;
    webhook: string;
};
/**
 * Test API connection
 */
export declare function validateConnection(): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Map PayPal subscription status to internal status
 */
export declare function mapPayPalSubscriptionStatus(status: PayPalSubscriptionStatus): 'active' | 'canceled' | 'past_due' | 'pending';
/**
 * Map PayPal order status to internal payment status
 */
export declare function mapPayPalOrderStatus(status: PayPalOrderStatus): 'complete' | 'failed' | 'pending' | 'cancelled';
declare const _default: {
    createOrder: typeof createOrder;
    captureOrder: typeof captureOrder;
    getOrder: typeof getOrder;
    createBillingPlan: typeof createBillingPlan;
    createSubscription: typeof createSubscription;
    getSubscription: typeof getSubscription;
    cancelSubscription: typeof cancelSubscription;
    suspendSubscription: typeof suspendSubscription;
    activateSubscription: typeof activateSubscription;
    refundPayment: typeof refundPayment;
    verifyWebhookSignature: typeof verifyWebhookSignature;
    isConfigured: typeof isConfigured;
    getConfig: typeof getConfig;
    getDefaultUrls: typeof getDefaultUrls;
    validateConnection: typeof validateConnection;
    mapPayPalSubscriptionStatus: typeof mapPayPalSubscriptionStatus;
    mapPayPalOrderStatus: typeof mapPayPalOrderStatus;
    PayPalOrderStatus: typeof PayPalOrderStatus;
    PayPalSubscriptionStatus: typeof PayPalSubscriptionStatus;
    PayPalWebhookEvent: typeof PayPalWebhookEvent;
};
export default _default;
//# sourceMappingURL=paypal.service.d.ts.map
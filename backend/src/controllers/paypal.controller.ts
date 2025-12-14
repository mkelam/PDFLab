import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import paypalService, {
  PayPalOrderStatus,
  PayPalSubscriptionStatus,
  PayPalWebhookEvent,
  mapPayPalOrderStatus,
  mapPayPalSubscriptionStatus
} from '../services/paypal.service'
import emailService from '../services/email.service'
import { User, SubscriptionStatus as UserSubscriptionStatus, UserPlan } from '../models/User'
import { Subscription, SubscriptionStatus, PlanType } from '../models/subscription.model'
import { PaymentLog, PaymentStatus, PaymentType } from '../models/payment-log.model'
import { updateUserPlan } from '../utils/quota.utils'
import logger from '../config/logger'

// Pricing plans configuration (same as other controllers)
const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    conversions: 3,
    maxFileSize: 10485760,
    features: {
      conversionsPerMonth: 3,
      maxFileSize: 10485760,
      ocrOverlayAccess: false,
      advancedFeatures: false,
      priorityProcessing: false,
      apiAccess: false
    }
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    conversions: 100,
    maxFileSize: 26214400,
    features: {
      conversionsPerMonth: 100,
      maxFileSize: 26214400,
      ocrOverlayAccess: true,
      advancedFeatures: false,
      priorityProcessing: false,
      apiAccess: false
    }
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    conversions: -1,
    maxFileSize: 104857600,
    features: {
      conversionsPerMonth: -1,
      maxFileSize: 104857600,
      ocrOverlayAccess: true,
      advancedFeatures: true,
      priorityProcessing: true,
      apiAccess: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    conversions: -1,
    maxFileSize: 524288000,
    features: {
      conversionsPerMonth: -1,
      maxFileSize: 524288000,
      ocrOverlayAccess: true,
      advancedFeatures: true,
      priorityProcessing: true,
      apiAccess: true
    }
  }
}

// PayPal Plan IDs (set these after creating billing plans in PayPal)
// These should be stored in environment variables in production
const PAYPAL_PLAN_IDS: Record<string, string> = {
  starter: process.env.PAYPAL_PLAN_STARTER || '',
  pro: process.env.PAYPAL_PLAN_PRO || '',
  enterprise: process.env.PAYPAL_PLAN_ENTERPRISE || ''
}

/**
 * GET /api/paypal/plans
 * Get all available pricing plans
 */
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = Object.entries(PRICING_PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      currency: 'USD',
      billing_cycle: 'per month',
      description: `Perfect for ${id === 'free' ? 'getting started' : id === 'starter' ? 'individuals' : id === 'pro' ? 'professionals' : 'businesses'}`,
      conversions_limit: plan.conversions === -1 ? 999999 : plan.conversions,
      max_file_size_mb: Math.floor(plan.maxFileSize / (1024 * 1024)),
      features: [
        `${plan.conversions === -1 ? 'Unlimited' : plan.conversions} conversions per month`,
        `Max file size: ${Math.floor(plan.maxFileSize / (1024 * 1024))}MB`,
        plan.features.ocrOverlayAccess ? 'OCR overlay access' : 'No OCR overlay',
        plan.features.advancedFeatures ? 'Advanced features' : 'Basic features',
        plan.features.priorityProcessing ? 'Priority processing' : 'Standard processing',
        plan.features.apiAccess ? 'API access' : 'No API access'
      ],
      recommended: id === 'pro'
    }))

    res.json({ success: true, plans })
  } catch (error) {
    logger.error('Get plans error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/paypal/initialize
 * Initialize a PayPal payment - returns approval URL
 */
export const initializePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const { plan: planId, userEmail, userName } = req.body

    // Validate plan
    if (!planId || !PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
      res.status(400).json({ error: 'Invalid plan selected' })
      return
    }

    // Free plan doesn't require payment
    if (planId === 'free') {
      res.status(400).json({ error: 'Free plan does not require payment' })
      return
    }

    const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]
    const transactionId = uuidv4()
    const subscriptionRef = `PAYPAL-SUB-${uuidv4().slice(0, 8).toUpperCase()}`

    // Check if PayPal is configured
    if (!paypalService.isConfigured()) {
      res.status(500).json({
        error: 'Payment gateway not configured',
        message: 'PayPal credentials are missing. Please contact support.'
      })
      return
    }

    // Create subscription record (PENDING until webhook confirms)
    const subscription = await Subscription.create({
      user_id: user.id,
      plan: planId as PlanType,
      status: SubscriptionStatus.PENDING,
      payment_provider: 'paypal' as any,
      amount: plan.price,
      currency: 'USD',
      started_at: new Date(),
      paypal_subscription_id: subscriptionRef
    })

    // Create payment log
    const paymentName = userName || user.name || user.email.split('@')[0]
    const nameParts = paymentName.trim().split(' ')
    const firstName = nameParts[0] || 'User'
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Account'

    await PaymentLog.create({
      user_id: user.id,
      subscription_id: subscription.id,
      transaction_id: transactionId,
      payment_provider: 'paypal' as any,
      payment_type: PaymentType.SUBSCRIPTION,
      status: PaymentStatus.PENDING,
      amount_gross: plan.price,
      amount_fee: 0,
      amount_net: plan.price,
      currency: 'USD',
      plan: planId,
      name_first: firstName,
      name_last: lastName,
      email_address: userEmail || user.email,
      item_name: `PDFLab ${plan.name} Plan`,
      item_description: `PDFLab ${plan.name} monthly subscription`,
      custom_data: {
        plan_id: planId,
        user_id: user.id,
        subscription_id: subscription.id,
        paypal_reference: subscriptionRef,
        price_usd: plan.price
      }
    })

    // Get redirect URLs
    const urls = paypalService.getDefaultUrls()

    // Check if we have a PayPal plan ID for subscriptions
    const paypalPlanId = PAYPAL_PLAN_IDS[planId]

    let result: { approveUrl: string; paypalId: string }

    if (paypalPlanId) {
      // Create a subscription for recurring payments
      const subscriptionResult = await paypalService.createSubscription({
        planId: paypalPlanId,
        reference: transactionId,
        email: userEmail || user.email,
        firstName,
        lastName,
        returnUrl: `${urls.success}?transaction_id=${transactionId}&subscription_id=${subscription.id}&provider=paypal`,
        cancelUrl: `${urls.cancel}?transaction_id=${transactionId}&provider=paypal`
      })

      // Update subscription with PayPal subscription ID
      subscription.paypal_subscription_id = subscriptionResult.id
      await subscription.save()

      result = {
        approveUrl: subscriptionResult.approveUrl,
        paypalId: subscriptionResult.id
      }
    } else {
      // Fallback to one-time order if no subscription plan configured
      const orderResult = await paypalService.createOrder({
        reference: transactionId,
        amount: plan.price,
        currency: 'USD',
        description: `PDFLab ${plan.name} Plan - Monthly Subscription`,
        returnUrl: `${urls.success}?transaction_id=${transactionId}&subscription_id=${subscription.id}&provider=paypal`,
        cancelUrl: `${urls.cancel}?transaction_id=${transactionId}&provider=paypal`
      })

      // Update payment log with PayPal order ID
      await PaymentLog.update(
        { paypal_payment_id: orderResult.id },
        { where: { transaction_id: transactionId } }
      )

      result = {
        approveUrl: orderResult.approveUrl,
        paypalId: orderResult.id
      }
    }

    res.json({
      success: true,
      message: 'Payment initialized',
      approveUrl: result.approveUrl,
      transactionId: transactionId,
      subscriptionId: subscription.id,
      paypalId: result.paypalId
    })
  } catch (error) {
    logger.error('Initialize PayPal payment error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to initialize payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/paypal/capture
 * Capture payment after user approval (for one-time orders)
 */
export const capturePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, transactionId } = req.body

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' })
      return
    }

    // Capture the order
    const captureResult = await paypalService.captureOrder(orderId)

    if (captureResult.status !== 'COMPLETED') {
      res.status(400).json({
        error: 'Payment not completed',
        status: captureResult.status
      })
      return
    }

    // Find and update payment log
    const paymentLog = await PaymentLog.findOne({
      where: transactionId ? { transaction_id: transactionId } : { paypal_payment_id: orderId }
    })

    if (paymentLog) {
      paymentLog.status = PaymentStatus.COMPLETE
      paymentLog.paypal_payment_id = captureResult.captureId || orderId
      paymentLog.processed_at = new Date()

      if (captureResult.amount) {
        const estimatedFee = captureResult.amount * 0.0349 + 0.49 // PayPal standard rate
        paymentLog.amount_gross = captureResult.amount
        paymentLog.amount_fee = estimatedFee
        paymentLog.amount_net = captureResult.amount - estimatedFee
      }

      await paymentLog.save()

      // Update subscription and user
      const customData = paymentLog.custom_data as any
      if (customData?.user_id && customData?.plan_id) {
        await activateSubscription(customData.user_id, customData.plan_id, paymentLog)
      }
    }

    res.json({
      success: true,
      message: 'Payment captured successfully',
      captureId: captureResult.captureId
    })
  } catch (error) {
    logger.error('Capture payment error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to capture payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/paypal/webhook
 * Handle PayPal webhook notifications
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('PayPal webhook received:', { eventType: req.body?.event_type })

    const webhookEvent = req.body

    // Verify webhook signature
    const headers = {
      'paypal-auth-algo': req.headers['paypal-auth-algo'] as string,
      'paypal-cert-url': req.headers['paypal-cert-url'] as string,
      'paypal-transmission-id': req.headers['paypal-transmission-id'] as string,
      'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string,
      'paypal-transmission-time': req.headers['paypal-transmission-time'] as string
    }

    const isValid = await paypalService.verifyWebhookSignature(headers, JSON.stringify(req.body))

    if (!isValid) {
      logger.warn('Invalid PayPal webhook signature')
      // Don't reject - continue processing but log the warning
    }

    const eventType = webhookEvent.event_type as PayPalWebhookEvent
    const resource = webhookEvent.resource

    switch (eventType) {
      // Payment events
      case PayPalWebhookEvent.PAYMENT_CAPTURE_COMPLETED:
        await handlePaymentComplete(resource, webhookEvent)
        break

      case PayPalWebhookEvent.PAYMENT_CAPTURE_DENIED:
        await handlePaymentDenied(resource, webhookEvent)
        break

      case PayPalWebhookEvent.PAYMENT_CAPTURE_REFUNDED:
        await handlePaymentRefunded(resource)
        break

      case 'PAYMENT.CAPTURE.REVERSED' as PayPalWebhookEvent:
        await handlePaymentReversed(resource)
        break

      case 'PAYMENT.CAPTURE.PENDING' as PayPalWebhookEvent:
        await handlePaymentPending(resource)
        break

      // Subscription events
      case PayPalWebhookEvent.BILLING_SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(resource)
        break

      case PayPalWebhookEvent.BILLING_SUBSCRIPTION_ACTIVATED:
        await handleSubscriptionActivated(resource)
        break

      case PayPalWebhookEvent.BILLING_SUBSCRIPTION_CANCELLED:
        await handleSubscriptionCancelled(resource)
        break

      case PayPalWebhookEvent.BILLING_SUBSCRIPTION_SUSPENDED:
        await handleSubscriptionSuspended(resource)
        break

      case 'BILLING.SUBSCRIPTION.EXPIRED' as PayPalWebhookEvent:
        await handleSubscriptionExpired(resource)
        break

      case PayPalWebhookEvent.BILLING_SUBSCRIPTION_PAYMENT_FAILED:
        await handlePaymentFailed(resource)
        break

      // Order events
      case 'CHECKOUT.ORDER.APPROVED' as PayPalWebhookEvent:
        await handleOrderApproved(resource, webhookEvent)
        break

      case 'CHECKOUT.ORDER.COMPLETED' as PayPalWebhookEvent:
        await handleOrderCompleted(resource, webhookEvent)
        break

      default:
        logger.info('Unhandled PayPal webhook event:', { eventType, resourceId: resource?.id })
    }

    // Always acknowledge webhook
    res.status(200).send('OK')
  } catch (error) {
    logger.error('PayPal webhook error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).send('Webhook processing failed')
  }
}

/**
 * Handle successful payment capture
 */
async function handlePaymentComplete(resource: any, webhookEvent: any): Promise<void> {
  const paymentId = resource.id
  const customId = resource.custom_id

  logger.info('Processing PAYMENT.CAPTURE.COMPLETED:', { paymentId, customId })

  // Find payment log
  const paymentLog = await PaymentLog.findOne({
    where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
  })

  if (!paymentLog) {
    logger.warn('Payment log not found for PayPal capture:', { paymentId, customId })
    return
  }

  // Update payment log
  paymentLog.status = PaymentStatus.COMPLETE
  paymentLog.paypal_payment_id = paymentId
  paymentLog.webhook_data = webhookEvent
  paymentLog.processed_at = new Date()

  if (resource.amount?.value) {
    const amount = parseFloat(resource.amount.value)
    const estimatedFee = amount * 0.0349 + 0.49
    paymentLog.amount_gross = amount
    paymentLog.amount_fee = estimatedFee
    paymentLog.amount_net = amount - estimatedFee
  }

  await paymentLog.save()

  // Activate subscription
  const customData = paymentLog.custom_data as any
  if (customData?.user_id && customData?.plan_id) {
    await activateSubscription(customData.user_id, customData.plan_id, paymentLog)
  }

  logger.info('Payment capture completed successfully:', { paymentId, userId: customData?.user_id })
}

/**
 * Handle payment denied
 */
async function handlePaymentDenied(resource: any, webhookEvent: any): Promise<void> {
  const paymentId = resource.id
  const customId = resource.custom_id

  logger.warn('Processing PAYMENT.CAPTURE.DENIED:', { paymentId, customId })

  const paymentLog = await PaymentLog.findOne({
    where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
  })

  if (paymentLog) {
    paymentLog.status = PaymentStatus.FAILED
    paymentLog.error_message = 'Payment capture denied by PayPal'
    paymentLog.webhook_data = webhookEvent
    await paymentLog.save()
  }

  logger.error('Payment denied:', { paymentId, customId })
}

/**
 * Handle payment reversed (chargeback)
 */
async function handlePaymentReversed(resource: any): Promise<void> {
  const paymentId = resource.id

  logger.warn('Processing PAYMENT.CAPTURE.REVERSED (chargeback):', { paymentId })

  const paymentLog = await PaymentLog.findOne({
    where: { paypal_payment_id: paymentId }
  })

  if (paymentLog) {
    paymentLog.status = PaymentStatus.CANCELLED
    paymentLog.error_message = 'Payment reversed (chargeback)'
    await paymentLog.save()

    // Consider suspending the subscription on chargeback
    if (paymentLog.subscription_id) {
      const subscription = await Subscription.findByPk(paymentLog.subscription_id)
      if (subscription) {
        subscription.status = SubscriptionStatus.PAST_DUE
        await subscription.save()
      }
    }
  }

  logger.error('Payment reversed (chargeback):', { paymentId })
}

/**
 * Handle payment pending
 */
async function handlePaymentPending(resource: any): Promise<void> {
  const paymentId = resource.id
  const customId = resource.custom_id

  logger.info('Processing PAYMENT.CAPTURE.PENDING:', { paymentId, customId })

  const paymentLog = await PaymentLog.findOne({
    where: customId ? { transaction_id: customId } : { paypal_payment_id: paymentId }
  })

  if (paymentLog) {
    paymentLog.status = PaymentStatus.PENDING
    paymentLog.paypal_payment_id = paymentId
    await paymentLog.save()
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(resource: any): Promise<void> {
  const subscriptionId = resource.id
  const customId = resource.custom_id

  logger.info('Processing BILLING.SUBSCRIPTION.CREATED:', { subscriptionId, customId })

  // Find payment log by custom reference
  if (customId) {
    const paymentLog = await PaymentLog.findOne({
      where: { transaction_id: customId }
    })

    if (paymentLog?.subscription_id) {
      const subscription = await Subscription.findByPk(paymentLog.subscription_id)
      if (subscription) {
        subscription.paypal_subscription_id = subscriptionId
        await subscription.save()
        logger.info('Subscription linked to PayPal:', { subscriptionId, localId: subscription.id })
      }
    }
  }
}

/**
 * Handle subscription expired
 */
async function handleSubscriptionExpired(resource: any): Promise<void> {
  const subscriptionId = resource.id

  logger.info('Processing BILLING.SUBSCRIPTION.EXPIRED:', { subscriptionId })

  const subscription = await Subscription.findOne({
    where: { paypal_subscription_id: subscriptionId }
  })

  if (!subscription) {
    logger.warn('Subscription not found for expiration:', { subscriptionId })
    return
  }

  subscription.status = SubscriptionStatus.CANCELED
  subscription.ended_at = new Date()
  await subscription.save()

  // Update user status
  const user = await User.findByPk(subscription.user_id)
  if (user) {
    user.subscription_status = UserSubscriptionStatus.CANCELED
    await user.save()
  }

  logger.info('Subscription expired:', { subscriptionId })
}

/**
 * Handle order approved (customer approved payment)
 */
async function handleOrderApproved(resource: any, webhookEvent: any): Promise<void> {
  const orderId = resource.id

  logger.info('Processing CHECKOUT.ORDER.APPROVED:', { orderId })

  // Order is approved, can be captured
  // Note: For auto-capture, this may be followed by PAYMENT.CAPTURE.COMPLETED
}

/**
 * Handle order completed
 */
async function handleOrderCompleted(resource: any, webhookEvent: any): Promise<void> {
  const orderId = resource.id
  const purchaseUnits = resource.purchase_units || []

  logger.info('Processing CHECKOUT.ORDER.COMPLETED:', { orderId })

  for (const unit of purchaseUnits) {
    const reference = unit.reference_id
    const captures = unit.payments?.captures || []

    for (const capture of captures) {
      if (capture.status === 'COMPLETED') {
        // Find and update payment log
        const paymentLog = await PaymentLog.findOne({
          where: { transaction_id: reference }
        })

        if (paymentLog) {
          paymentLog.status = PaymentStatus.COMPLETE
          paymentLog.paypal_payment_id = capture.id
          paymentLog.paypal_order_id = orderId
          paymentLog.webhook_data = webhookEvent
          paymentLog.processed_at = new Date()

          if (capture.amount?.value) {
            const amount = parseFloat(capture.amount.value)
            const estimatedFee = amount * 0.0349 + 0.49
            paymentLog.amount_gross = amount
            paymentLog.amount_fee = estimatedFee
            paymentLog.amount_net = amount - estimatedFee
          }

          await paymentLog.save()

          // Activate subscription
          const customData = paymentLog.custom_data as any
          if (customData?.user_id && customData?.plan_id) {
            await activateSubscription(customData.user_id, customData.plan_id, paymentLog)
          }
        }
      }
    }
  }
}

/**
 * Handle subscription activated
 */
async function handleSubscriptionActivated(resource: any): Promise<void> {
  const subscriptionId = resource.id
  const customId = resource.custom_id

  // Find subscription by PayPal subscription ID or custom reference
  const subscription = await Subscription.findOne({
    where: { paypal_subscription_id: subscriptionId }
  })

  if (!subscription) {
    // Try finding by payment log
    const paymentLog = await PaymentLog.findOne({
      where: { transaction_id: customId }
    })

    if (paymentLog?.subscription_id) {
      const sub = await Subscription.findByPk(paymentLog.subscription_id)
      if (sub) {
        sub.paypal_subscription_id = subscriptionId
        sub.status = SubscriptionStatus.ACTIVE
        sub.billing_date = new Date()

        const nextBilling = new Date()
        nextBilling.setMonth(nextBilling.getMonth() + 1)
        sub.next_billing_date = nextBilling

        await sub.save()

        // Update user
        const customData = paymentLog.custom_data as any
        if (customData?.user_id && customData?.plan_id) {
          await activateSubscription(customData.user_id, customData.plan_id, paymentLog)
        }
      }
    }
    return
  }

  subscription.status = SubscriptionStatus.ACTIVE
  subscription.billing_date = new Date()

  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)
  subscription.next_billing_date = nextBilling

  await subscription.save()

  logger.info('PayPal subscription activated:', { subscriptionId })
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(resource: any): Promise<void> {
  const subscriptionId = resource.id

  const subscription = await Subscription.findOne({
    where: { paypal_subscription_id: subscriptionId }
  })

  if (!subscription) {
    logger.warn('Subscription not found for PayPal cancellation:', { subscriptionId })
    return
  }

  subscription.status = SubscriptionStatus.CANCELED
  subscription.canceled_at = new Date()
  subscription.ended_at = subscription.next_billing_date || new Date()
  await subscription.save()

  // Update user status
  const user = await User.findByPk(subscription.user_id)
  if (user) {
    user.subscription_status = UserSubscriptionStatus.CANCELED
    await user.save()
  }

  logger.info('PayPal subscription cancelled:', { subscriptionId })
}

/**
 * Handle subscription suspended
 */
async function handleSubscriptionSuspended(resource: any): Promise<void> {
  const subscriptionId = resource.id

  const subscription = await Subscription.findOne({
    where: { paypal_subscription_id: subscriptionId }
  })

  if (!subscription) {
    return
  }

  subscription.status = SubscriptionStatus.PAST_DUE
  await subscription.save()

  logger.info('PayPal subscription suspended:', { subscriptionId })
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(resource: any): Promise<void> {
  const subscriptionId = resource.id

  const subscription = await Subscription.findOne({
    where: { paypal_subscription_id: subscriptionId }
  })

  if (!subscription) {
    return
  }

  subscription.status = SubscriptionStatus.PAST_DUE
  await subscription.save()

  // Create failed payment log
  await PaymentLog.create({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    transaction_id: uuidv4(),
    payment_provider: 'paypal' as any,
    payment_type: PaymentType.SUBSCRIPTION_PAYMENT,
    status: PaymentStatus.FAILED,
    amount_gross: subscription.amount,
    amount_fee: 0,
    amount_net: 0,
    currency: 'USD',
    plan: subscription.plan,
    name_first: 'Unknown',
    email_address: 'unknown',
    item_name: `PDFLab ${subscription.plan} Plan`,
    error_message: 'PayPal payment failed',
    webhook_data: resource
  })

  logger.info('PayPal subscription payment failed:', { subscriptionId })
}

/**
 * Handle payment refunded
 */
async function handlePaymentRefunded(resource: any): Promise<void> {
  const captureId = resource.id

  const paymentLog = await PaymentLog.findOne({
    where: { paypal_payment_id: captureId }
  })

  if (paymentLog) {
    paymentLog.status = PaymentStatus.CANCELLED
    paymentLog.webhook_data = resource
    await paymentLog.save()
  }

  logger.info('PayPal payment refunded:', { captureId })
}

/**
 * Activate subscription and update user plan
 */
async function activateSubscription(
  userId: string,
  planId: string,
  paymentLog: PaymentLog
): Promise<void> {
  const user = await User.findByPk(userId)
  if (!user) {
    logger.error('User not found for subscription activation:', { userId })
    return
  }

  const subscription = await Subscription.findByPk(paymentLog.subscription_id!)
  if (subscription) {
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.billing_date = new Date()

    const nextBilling = new Date()
    nextBilling.setMonth(nextBilling.getMonth() + 1)
    subscription.next_billing_date = nextBilling

    await subscription.save()
  }

  // Update user
  user.subscription_id = paymentLog.paypal_payment_id || paymentLog.transaction_id
  user.subscription_status = UserSubscriptionStatus.ACTIVE
  await updateUserPlan(user, planId as UserPlan, true)

  logger.info(`PayPal payment successful for user ${user.email} - Plan: ${planId}`)

  // Send payment receipt email
  if (subscription) {
    const planName = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]?.name || planId
    emailService.sendPaymentReceiptEmail(user.email, {
      plan: planName,
      amount: paymentLog.amount_gross.toString(),
      currency: 'USD',
      transactionId: paymentLog.transaction_id,
      billingDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      nextBillingDate: subscription.next_billing_date?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
    }).catch((error) => {
      logger.error('Failed to send payment receipt email:', { error: error instanceof Error ? error.message : String(error) })
    })
  }
}

/**
 * GET /api/paypal/return
 * Handle successful payment return
 */
export const handleReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000'
    const queryString = req.url.split('?')[1] || ''

    res.redirect(`${frontendUrl}/payment/success?${queryString}`)
  } catch (error) {
    logger.error('PayPal return handler error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({ error: 'Failed to process return' })
  }
}

/**
 * GET /api/paypal/cancel
 * Handle cancelled payment
 */
export const handleCancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const frontendUrl = process.env['CORS_ORIGIN']?.split(',')[0] || 'http://localhost:3000'
    const queryString = req.url.split('?')[1] || ''

    res.redirect(`${frontendUrl}/payment/cancel?${queryString}`)
  } catch (error) {
    logger.error('PayPal cancel handler error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({ error: 'Failed to process cancellation' })
  }
}

/**
 * GET /api/paypal/subscription/:id
 * Get subscription details
 */
export const getSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const { id } = req.params

    const subscription = await Subscription.findOne({
      where: {
        id,
        user_id: user.id
      }
    })

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' })
      return
    }

    // Optionally fetch fresh data from PayPal
    if (subscription.paypal_subscription_id) {
      try {
        const paypalSub = await paypalService.getSubscription(subscription.paypal_subscription_id)
        // Could update local record with PayPal data if needed
      } catch (err) {
        // Ignore PayPal API errors, return local data
      }
    }

    res.json({
      success: true,
      subscription
    })
  } catch (error) {
    logger.error('Get subscription error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/paypal/cancel-subscription
 * Cancel active subscription
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const subscription = await Subscription.findOne({
      where: {
        user_id: user.id,
        status: SubscriptionStatus.ACTIVE
      }
    })

    if (!subscription) {
      res.status(404).json({ error: 'No active subscription found' })
      return
    }

    // Cancel with PayPal if we have a subscription ID
    if (subscription.paypal_subscription_id) {
      const result = await paypalService.cancelSubscription(subscription.paypal_subscription_id)
      if (!result.success) {
        logger.warn('PayPal cancellation failed:', { message: result.message })
      }
    }

    // Update subscription status locally
    subscription.status = SubscriptionStatus.CANCELED
    subscription.canceled_at = new Date()
    subscription.ended_at = subscription.next_billing_date || new Date()
    await subscription.save()

    // Update user status
    user.subscription_status = UserSubscriptionStatus.CANCELED
    await user.save()

    // Send cancellation email
    const planName = PRICING_PLANS[subscription.plan as keyof typeof PRICING_PLANS]?.name || subscription.plan
    emailService.sendSubscriptionCancelledEmail(user.email, {
      plan: planName,
      cancellationDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      accessUntil: subscription.ended_at?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'
    }).catch((error) => {
      logger.error('Failed to send cancellation email:', { error: error instanceof Error ? error.message : String(error) })
    })

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription
    })
  } catch (error) {
    logger.error('Cancel subscription error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/paypal/config
 * Get PayPal configuration status
 */
export const getConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = paypalService.getConfig()
    res.json({
      success: true,
      config
    })
  } catch (error) {
    logger.error('Get config error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/paypal/validate
 * Test API connection
 */
export const validateConnection = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await paypalService.validateConnection()
    res.json(result)
  } catch (error) {
    logger.error('Validate connection error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/paypal/refund
 * Process a refund
 */
export const processRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { captureId, amount } = req.body

    if (!captureId) {
      res.status(400).json({ error: 'Capture ID is required' })
      return
    }

    const result = await paypalService.refundPayment(captureId, amount, 'USD')

    if (result.success) {
      // Update payment log
      await PaymentLog.update(
        {
          status: PaymentStatus.CANCELLED,
          payment_type: PaymentType.REFUND
        },
        { where: { paypal_payment_id: captureId } }
      )

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: result.refundId
      })
    } else {
      res.status(400).json({
        error: 'Refund failed',
        message: result.message
      })
    }
  } catch (error) {
    logger.error('Refund error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to process refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/paypal/payment/:reference
 * Lookup payment status
 */
export const lookupPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params

    // Check database first
    const paymentLog = await PaymentLog.findOne({
      where: { transaction_id: reference }
    })

    if (paymentLog) {
      res.json({
        success: true,
        payment: {
          reference: paymentLog.transaction_id,
          status: paymentLog.status,
          amount: paymentLog.amount_gross,
          currency: paymentLog.currency,
          plan: paymentLog.plan,
          processed_at: paymentLog.processed_at
        }
      })
      return
    }

    res.status(404).json({ error: 'Payment not found' })
  } catch (error) {
    logger.error('Lookup payment error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Failed to lookup payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

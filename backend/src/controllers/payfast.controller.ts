import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import payfastService from '../services/payfast.service'
import { User } from '../models/User'
import { Subscription, SubscriptionStatus, PlanType } from '../models/subscription.model'
import { PaymentLog, PaymentStatus, PaymentType } from '../models/payment-log.model'

// Pricing plans configuration
const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    conversions: 3,
    maxFileSize: 10485760, // 10MB
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
    price: 9.99, // $9.99/month USD
    conversions: 100,
    maxFileSize: 26214400, // 25MB
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
    price: 29.99, // $29.99/month USD
    conversions: -1, // Unlimited
    maxFileSize: 104857600, // 100MB
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
    price: 99.99, // $99.99/month USD
    conversions: -1, // Unlimited
    maxFileSize: 524288000, // 500MB
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

/**
 * GET /api/payfast/plans
 * Get all available pricing plans
 */
const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = Object.entries(PRICING_PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      currency: 'USD',
      interval: 'month',
      features: plan.features
    }))

    res.json({
      success: true,
      plans
    })
  } catch (error) {
    console.error('Get plans error:', error)
    res.status(500).json({
      error: 'Failed to fetch plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/payfast/initialize
 * Initialize a PayFast payment
 */
const initializePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const { planId, userEmail, userName } = req.body

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

    // Check if PayFast is configured
    if (!payfastService.isConfigured()) {
      res.status(500).json({
        error: 'Payment gateway not configured',
        message: 'PayFast credentials are missing. Please contact support.'
      })
      return
    }

    // Create subscription record
    const subscription = await Subscription.create({
      user_id: user.id,
      plan: planId as PlanType,
      status: SubscriptionStatus.PENDING,
      amount: plan.price,
      currency: 'USD',
      started_at: new Date()
    })

    // Create payment log
    await PaymentLog.create({
      user_id: user.id,
      subscription_id: subscription.id,
      transaction_id: transactionId,
      payment_type: PaymentType.SUBSCRIPTION,
      status: PaymentStatus.PENDING,
      amount_gross: plan.price,
      amount_fee: 0,
      amount_net: plan.price,
      currency: 'USD',
      plan: planId,
      name_first: userName || user.name || user.email.split('@')[0],
      email_address: userEmail || user.email,
      item_name: `PDFLab ${plan.name} Plan`,
      item_description: `PDFLab ${plan.name} monthly subscription`,
      custom_data: {
        plan_id: planId,
        user_id: user.id,
        subscription_id: subscription.id
      }
    })

    // Generate PayFast payment data with subscription
    const paymentData = payfastService.createSubscriptionPaymentData({
      userId: user.id,
      userEmail: userEmail || user.email,
      userName: userName || user.name || user.email.split('@')[0],
      planName: plan.name,
      planPrice: plan.price,
      transactionId
    })

    res.json({
      success: true,
      message: 'Payment initialized',
      payment_url: payfastService.getPayFastUrl(),
      payment_data: paymentData,
      transaction_id: transactionId,
      subscription_id: subscription.id
    })
  } catch (error) {
    console.error('Initialize payment error:', error)
    res.status(500).json({
      error: 'Failed to initialize payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/payfast/webhook
 * Handle PayFast ITN (Instant Transaction Notification)
 */
const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('PayFast ITN received:', req.body)

    const itnData = req.body

    // Step 1: Verify the request came from PayFast
    const host = req.headers['referer'] ? new URL(req.headers['referer'] as string).hostname : ''
    if (!payfastService.validatePayFastHost(host)) {
      console.error('Invalid PayFast host:', host)
      res.status(403).send('Invalid request source')
      return
    }

    // Step 2: Validate signature
    const receivedSignature = itnData.signature
    delete itnData.signature // Remove signature before validation

    if (!payfastService.validateSignature(itnData, receivedSignature)) {
      console.error('Invalid signature')
      res.status(403).send('Invalid signature')
      return
    }

    // Step 3: Verify payment with PayFast server
    const isValid = await payfastService.verifyPaymentWithPayFast(itnData)
    if (!isValid) {
      console.error('Payment verification failed')
      res.status(403).send('Payment verification failed')
      return
    }

    // Step 4: Process the payment
    const { m_payment_id, pf_payment_id, payment_status, amount_gross, amount_fee, amount_net, custom_str1, custom_str2, token } = itnData

    // Find the payment log
    const paymentLog = await PaymentLog.findOne({
      where: { transaction_id: m_payment_id }
    })

    if (!paymentLog) {
      console.error('Payment log not found:', m_payment_id)
      res.status(404).send('Payment not found')
      return
    }

    // Update payment log
    paymentLog.payfast_payment_id = pf_payment_id
    paymentLog.status = payment_status === 'COMPLETE' ? PaymentStatus.COMPLETE : PaymentStatus.FAILED
    paymentLog.amount_gross = parseFloat(amount_gross)
    paymentLog.amount_fee = parseFloat(amount_fee)
    paymentLog.amount_net = parseFloat(amount_net)
    paymentLog.itn_data = itnData
    paymentLog.processed_at = new Date()

    if (payment_status !== 'COMPLETE') {
      paymentLog.error_message = `Payment failed with status: ${payment_status}`
    }

    await paymentLog.save()

    // If payment successful, update subscription and user
    if (payment_status === 'COMPLETE') {
      const userId = custom_str1
      const planId = custom_str2

      // Find user
      const user = await User.findByPk(userId)
      if (!user) {
        console.error('User not found:', userId)
        res.status(404).send('User not found')
        return
      }

      // Find subscription
      const subscription = await Subscription.findByPk(paymentLog.subscription_id!)
      if (subscription) {
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.payfast_token = token
        subscription.payfast_subscription_id = pf_payment_id
        subscription.billing_date = new Date()

        // Set next billing date (30 days from now)
        const nextBilling = new Date()
        nextBilling.setDate(nextBilling.getDate() + 30)
        subscription.next_billing_date = nextBilling

        await subscription.save()
      }

      // Update user plan
      user.plan = planId as any
      user.subscription_id = pf_payment_id
      user.subscription_status = 'active'

      // Update conversion limits based on plan
      const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]
      if (plan) {
        user.conversions_limit = plan.conversions
        user.conversions_used = 0 // Reset usage on new subscription
      }

      await user.save()

      console.log(`✓ Subscription activated for user ${user.email} - Plan: ${planId}`)
    }

    // Send 200 OK response to PayFast
    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).send('Webhook processing failed')
  }
}

/**
 * GET /api/payfast/return
 * Handle successful payment return
 */
const handleReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000'

    // Redirect to success page
    res.redirect(`${frontendUrl}/payment/success?${req.url.split('?')[1] || ''}`)
  } catch (error) {
    console.error('Return handler error:', error)
    res.status(500).json({ error: 'Failed to process return' })
  }
}

/**
 * GET /api/payfast/cancel
 * Handle cancelled payment
 */
const handleCancel = async (req: Request, res: Response): Promise<void> => {
  try {
    const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000'

    // Redirect to cancel page
    res.redirect(`${frontendUrl}/payment/cancel?${req.url.split('?')[1] || ''}`)
  } catch (error) {
    console.error('Cancel handler error:', error)
    res.status(500).json({ error: 'Failed to process cancellation' })
  }
}

/**
 * GET /api/payfast/subscription/:id
 * Get subscription details
 */
const getSubscription = async (req: Request, res: Response): Promise<void> => {
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

    res.json({
      success: true,
      subscription
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * POST /api/payfast/cancel-subscription
 * Cancel active subscription
 */
const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Find active subscription
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

    // Update subscription status
    subscription.status = SubscriptionStatus.CANCELED
    subscription.canceled_at = new Date()
    subscription.ended_at = subscription.next_billing_date || new Date() // Access until next billing
    await subscription.save()

    // Update user status
    user.subscription_status = 'canceled'
    await user.save()

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * GET /api/payfast/config
 * Get PayFast configuration status
 */
const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = payfastService.getConfig()
    res.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('Get config error:', error)
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Export all functions
export {
  getPlans,
  initializePayment,
  handleWebhook,
  handleReturn,
  handleCancel,
  getSubscription,
  cancelSubscription,
  getConfig
}

// Also export as default for compatibility
export default {
  getPlans,
  initializePayment,
  handleWebhook,
  handleReturn,
  handleCancel,
  getSubscription,
  cancelSubscription,
  getConfig
}

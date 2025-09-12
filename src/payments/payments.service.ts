import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.STRIPE_SECRET_KEY);
  private readonly logger = new Logger('PaymentsService');

  constructor(@Inject('NATS_SERVICE') private readonly client: ClientProxy) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.STRIPE_SUCCESS_URL,
      cancel_url: envs.STRIPE_CANCEL_URL,
    });
    // return session;
    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url,
    };
  }

  async stripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const endpointSecret = envs.STRIPE_ENDPOINT_SECRET;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        signature,
        endpointSecret,
      );
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceded = event.data.object;
        const payload = {
          stripePaymentId: chargeSucceded.id,
          orderId: chargeSucceded.metadata.orderId,
          receipUrl: chargeSucceded.receipt_url,
        };
        // this.logger.log({ payload });
        this.client.emit('payment.success', payload);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return res.status(200).json({ signature });
  }
}

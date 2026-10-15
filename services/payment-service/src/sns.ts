import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from './logger';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.SNS_ENDPOINT || undefined;
const clientConfig: { region: string; endpoint?: string } = { region };
if (endpoint) clientConfig.endpoint = endpoint;

const snsClient = new SNSClient(clientConfig);
export const PAYMENT_TOPIC_ARN = process.env.PAYMENT_TOPIC_ARN || '';

export async function publishPaymentEvent(
  eventType: 'PaymentProcessed' | 'PaymentFailed',
  payload: Record<string, unknown>
): Promise<void> {
  if (!PAYMENT_TOPIC_ARN) {
    logger.warn('PAYMENT_TOPIC_ARN not set, skipping SNS publish');
    return;
  }
  const message = JSON.stringify({ eventType, ...payload, timestamp: new Date().toISOString() });
  await snsClient.send(
    new PublishCommand({
      TopicArn: PAYMENT_TOPIC_ARN,
      Message: message,
      MessageAttributes: {
        eventType: { DataType: 'String', StringValue: eventType },
      },
    })
  );
  logger.info(`Published ${eventType} event`, { topicArn: PAYMENT_TOPIC_ARN, payload });
}

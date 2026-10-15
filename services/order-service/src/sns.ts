import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from './logger';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.SNS_ENDPOINT || undefined;

const clientConfig: { region: string; endpoint?: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
  region,
};

if (endpoint) {
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  };
  logger.info(`Configured SNS with custom endpoint: ${endpoint}`);
}

export const snsClient = new SNSClient(clientConfig);
export const ORDER_TOPIC_ARN = process.env.ORDER_TOPIC_ARN || 'arn:aws:sns:us-east-1:000000000000:cloudcart-order-events';

export async function publishOrderEvent(eventType: string, payload: Record<string, unknown>): Promise<string | undefined> {
  try {
    const message = JSON.stringify({
      eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    });

    const command = new PublishCommand({
      TopicArn: ORDER_TOPIC_ARN,
      Message: message,
      Subject: eventType,
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: eventType,
        },
      },
    });

    const response = await snsClient.send(command);
    logger.info(`Published ${eventType} event to SNS`, { messageId: response.MessageId, topicArn: ORDER_TOPIC_ARN });
    return response.MessageId;
  } catch (err) {
    logger.error(`Failed to publish ${eventType} event to SNS`, err);
    throw err;
  }
}

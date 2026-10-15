import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from './logger';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

const clientConfig: { region: string; endpoint?: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
  region,
};

if (endpoint) {
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  };
  logger.info(`Configured DynamoDB with custom endpoint: ${endpoint}`);
}

const rawClient = new DynamoDBClient(clientConfig);

export const ddbDocClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const USERS_TABLE = process.env.USERS_TABLE || 'cloudcart-users';

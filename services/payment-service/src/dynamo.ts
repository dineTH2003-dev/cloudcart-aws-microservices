import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;

const clientConfig: { region: string; endpoint?: string } = { region };
if (endpoint) {
  clientConfig.endpoint = endpoint;
}

const dynamoClient = new DynamoDBClient(clientConfig);
export const ddbDocClient = DynamoDBDocumentClient.from(dynamoClient);
export const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'shopsphere-payments-dev';

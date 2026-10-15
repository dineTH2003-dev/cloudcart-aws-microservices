import { Router, Request, Response } from 'express';
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, USERS_TABLE } from './dynamo';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Health check endpoint
router.get('/healthz', async (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    table: USERS_TABLE,
  });
});

// Register new user
router.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const { email, fullName, shippingAddress } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'email and fullName are required' });
    }

    const userId = `user-${uuidv4().substring(0, 8)}`;
    const createdAt = new Date().toISOString();

    const userProfile = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      id: userId,
      email: email.toLowerCase().trim(),
      fullName,
      shippingAddress: shippingAddress || 'Standard Ground Delivery, USA',
      createdAt,
      updatedAt: createdAt,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: userProfile,
      })
    );

    logger.info('User registered successfully', { userId, email });
    return res.status(201).json({
      id: userId,
      email: userProfile.email,
      fullName: userProfile.fullName,
      shippingAddress: userProfile.shippingAddress,
      createdAt,
    });
  } catch (err) {
    logger.error('Failed to register user', err);
    return res.status(500).json({ error: 'Internal server error registering user' });
  }
});

// Login (mock auth session token)
router.post('/api/users/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // In a microservices architecture, we retrieve by email or user
    const scanResult = await ddbDocClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase().trim(),
        },
      })
    );

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = scanResult.Items[0];
    const mockToken = `mock-jwt-token-for-${user.id}-${Date.now()}`;

    logger.info('User logged in', { userId: user.id });
    return res.json({
      token: mockToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        shippingAddress: user.shippingAddress,
      },
    });
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get user profile by ID
router.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: {
          PK: `USER#${id}`,
          SK: 'PROFILE',
        },
      })
    );

    if (!result.Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: result.Item.id,
      email: result.Item.email,
      fullName: result.Item.fullName,
      shippingAddress: result.Item.shippingAddress,
      createdAt: result.Item.createdAt,
    });
  } catch (err) {
    logger.error('Failed to get user profile', err, { userId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List users (For demo/testing)
router.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
        Limit: 50,
      })
    );

    const users = (result.Items || []).map((item) => ({
      id: item.id,
      email: item.email,
      fullName: item.fullName,
      shippingAddress: item.shippingAddress,
    }));

    return res.json({ count: users.length, users });
  } catch (err) {
    logger.error('Failed to list users', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

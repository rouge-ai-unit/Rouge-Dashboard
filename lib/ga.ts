// app/lib/ga.ts
import { google } from 'googleapis';
import path from 'path';

const keyFilePath = process.env.GA_SERVICE_ACCOUNT_JSON_PATH
  ? path.resolve(process.env.GA_SERVICE_ACCOUNT_JSON_PATH)
  : path.join(process.cwd(), 'config', 'google-analytics-service.json');

export async function getRealtimeUsers(propertyId: string) {
  // Initialize GoogleAuth with the path to your service account JSON key
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  // Initialize the Analytics Data API client
  const analyticsDataClient = google.analyticsdata({
    version: 'v1beta',
    auth,
  });

  // Fetch real-time report data
  const response = await analyticsDataClient.properties.runRealtimeReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
    },
  });

  return response.data;
}

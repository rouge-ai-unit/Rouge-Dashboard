# Cold Connect Automator

Enterprise-grade cold outreach automation tool for the Rouge Dashboard.

## Overview

The Cold Connect Automator is a comprehensive solution for managing and executing cold outreach campaigns. It provides advanced features for contact management, message personalization, CRM integration, and campaign tracking.

## Key Features

### 1. Contact Management
- Import contacts from CSV files
- Sync contacts from Google Sheets and Notion
- Validate and deduplicate contact data
- Store contacts in a PostgreSQL database

### 2. AI-Powered Message Generation
- Generate personalized cold outreach messages using AI
- Create follow-up messages based on previous conversations
- Generate message templates for different campaign types
- Cache AI responses for improved performance

### 3. Email Sending
- Send personalized emails via SendGrid
- Batch processing to avoid rate limiting
- Track email delivery status
- Log all email activities

### 4. CRM Integration
- Sync contacts with Google Sheets
- Sync contacts with Notion databases
- Conflict resolution between local and CRM data
- Duplicate contact cleanup

### 5. Message Personalization
- Advanced template engine with placeholder support
- Conditional content based on recipient data
- Batch personalization for multiple recipients
- Template validation and preview

### 6. Campaign Management
- Create and manage outreach campaigns
- Track campaign progress and statistics
- Monitor email delivery and engagement

## Security Features

### Input Validation
- Strict validation for all user inputs
- Email format validation
- Data type validation using Zod schemas

### Sanitization
- HTML escaping to prevent XSS attacks
- Rich text sanitization for email content
- Input length limits to prevent buffer overflows

### Rate Limiting
- Per-user rate limiting for all API endpoints
- Configurable limits to prevent abuse
- Automatic retry-after headers

### Credential Protection
- Secure credential handling
- Sensitive data removal from logs
- Encrypted storage of API keys

## Architecture

### Core Services
- `ai-service.ts` - AI-powered message generation
- `sendgrid-service.ts` - Email sending via SendGrid
- `csv-service.ts` - CSV processing and validation
- `personalization-engine.ts` - Message personalization
- `cache-utils.ts` - Caching utilities for performance
- `security-utils.ts` - Security and validation utilities

### CRM Integration
- `crm/google-sheets-service.ts` - Google Sheets integration
- `crm/notion-service.ts` - Notion integration
- `crm/sync-service.ts` - CRM sync with conflict resolution

### Data Models
- Contacts - Individual contact information
- Campaigns - Outreach campaign definitions
- Messages - Sent email records
- Templates - Reusable message templates

## API Endpoints

### Contacts
- `GET /api/cold-outreach/contacts` - Fetch all contacts
- `POST /api/cold-outreach/contacts` - Create a new contact
- `PUT /api/cold-outreach/contacts` - Update existing contacts
- `DELETE /api/cold-outreach/contacts` - Delete contacts

### AI Message Generation
- `POST /api/cold-outreach/ai-generate` - Generate personalized message

### Email Sending
- `POST /api/cold-outreach/send` - Send cold outreach emails
- `GET /api/cold-outreach/send` - Get email sending statistics

### CRM Sync
- `POST /api/cold-outreach/sync/google-sheets` - Sync with Google Sheets
- `POST /api/cold-outreach/sync/notion` - Sync with Notion

### Data Import
- `POST /api/cold-outreach/import/google-sheets` - Import from Google Sheets
- `POST /api/cold-outreach/import/notion` - Import from Notion

## Performance Optimizations

### Caching
- AI-generated messages cached for 1 hour
- CSV validation results cached for 30 minutes
- Template processing cached for 1 hour
- Header normalization cached for 1 hour

### Batch Processing
- Email sending in batches to avoid rate limiting
- CRM sync in batches for better performance
- CSV processing in batches for large files

### Database Optimization
- Efficient queries with proper indexing
- Connection pooling for database access
- Prepared statements for repeated operations

## Testing

### Unit Tests
- Security utilities validation
- Rate limiting functionality
- Data validation and sanitization
- Service layer functionality

### Integration Tests
- API endpoint testing
- Database integration testing
- CRM integration testing
- Email sending testing

## Environment Variables

```env
# SendGrid API key for email sending
SENDGRID_API_KEY=your_sendgrid_api_key

# Google OAuth credentials for Google Sheets integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

# Notion API token for Notion integration
NOTION_TOKEN=your_notion_token

# Database connection
DATABASE_URL=your_database_url
```

## Usage

### Setting up a Campaign
1. Import contacts from CSV, Google Sheets, or Notion
2. Create a campaign with a name and description
3. Generate personalized messages using AI
4. Send emails to your contacts
5. Track campaign progress and engagement

### Personalization
Use placeholders in your message templates:
- `{{recipient.name}}` - Recipient's name
- `{{recipient.company}}` - Recipient's company
- `{{sender.name}}` - Your name
- `{{context.valueProposition}}` - Your value proposition

### Conditional Content
```handlebars
{{#if recipient.company}}
I noticed that {{recipient.company}} is in the agricultural technology space.
{{/if}}
```

## Best Practices

### Security
- Always validate and sanitize user inputs
- Use rate limiting to prevent abuse
- Protect sensitive credentials
- Regularly audit access logs

### Performance
- Use caching for expensive operations
- Process data in batches
- Monitor API usage and limits
- Optimize database queries

### Data Quality
- Regularly clean up duplicate contacts
- Validate email addresses before sending
- Keep contact information up to date
- Use conflict resolution for CRM sync

## Error Handling

The service provides comprehensive error handling with:
- Detailed error messages for debugging
- Graceful degradation for partial failures
- Retry mechanisms for transient errors
- Logging for audit and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Submit a pull request

## License

This project is proprietary and confidential. All rights reserved.
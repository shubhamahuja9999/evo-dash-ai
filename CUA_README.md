# CUA (Command User Access) Automation

This integration allows you to manage Google Ads Customer User Access through an AI-powered automation system directly from your dashboard.

## Features

- Execute Python-based automation scripts from the dashboard UI
- Perform security audits on user access
- Optimize user permissions
- Monitor access patterns
- AI-powered recommendations for access control

## Setup

1. Make sure Python 3 is installed on your system
2. Run the setup script:

```bash
npm run setup:cua
```

3. Ensure your OpenAI API key is set in the `.env` file:

```
OPENAI_API_KEY=your_api_key_here
```

## Using the CUA Dashboard

1. Navigate to the Analytics page in the dashboard
2. Click on the "CUA Optimization" button
3. Use the command interface to execute automation tasks:
   - Type a command manually or
   - Click the terminal icon to select from predefined commands

### Available Commands

- `run security audit` - Perform a comprehensive security audit
- `optimize user access` - Analyze and optimize user permissions
- `run cua automation` - Execute the full automation workflow
- `check inactive users` - Identify and manage inactive accounts

## How It Works

The system uses a Python automation script (`cua_automation.py`) that leverages Selenium for browser automation. When you execute a CUA command from the dashboard, the following happens:

1. The command is sent to the server API
2. The server executes the Python script with appropriate parameters
3. The script performs the requested automation tasks
4. Results are returned to the dashboard UI for display

## Troubleshooting

If you encounter issues:

1. Check that Python and required packages are installed
2. Ensure the CUA automation script has executable permissions
3. Verify your OpenAI API key is valid (for AI features)
4. Check the server logs for any errors during script execution

## Security Considerations

- The automation script requires browser access to Google Ads
- User authentication is required for accessing Google Ads
- The system logs all automation actions for audit purposes
- Access to the CUA dashboard should be restricted to authorized personnel
